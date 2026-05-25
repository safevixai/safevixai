from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from services.speech_translation import IndicSeamlessService, speech_result_to_dict


class FakeSettings:
    def __init__(self, model_dir=None):
        self.speech_model_id = "facebook/seamless-m4t-v2"
        self.speech_model_dir = model_dir
        self.speech_default_target_lang = "eng"
        self.speech_device = "cpu"


class TestInit:
    def test_init_with_defaults(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)
        assert service._model is None
        assert service._processor is None
        assert service._tokenizer is None
        assert service._device == "cpu"

    def test_model_source_with_dir(self):
        settings = FakeSettings(model_dir=Path("/fake/model/dir"))
        with patch.object(Path, "exists", return_value=True):
            service = IndicSeamlessService(settings)
            assert service.model_source == str(Path("/fake/model/dir"))

    def test_model_source_without_dir(self):
        settings = FakeSettings(model_dir=None)
        service = IndicSeamlessService(settings)
        assert service.model_source == "facebook/seamless-m4t-v2"


class TestDependenciesAvailable:
    def test_with_deps(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)
        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(MagicMock(), MagicMock(), MagicMock(), MagicMock(), MagicMock())):
            assert service._dependencies_available() is True

    def test_without_deps(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)
        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(None, None, None, None, None)):
            assert service._dependencies_available() is False


class TestStatus:
    def test_status_structure(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)
        status = service.status()
        assert isinstance(status, dict)
        assert status["configured"] is True
        assert status["device"] == "cpu"
        assert status["model_source"] == "facebook/seamless-m4t-v2"
        assert status["model_loaded"] is False
        assert status["default_target_language"] == "eng"
        assert "dependencies_available" in status
        assert "model_dir_exists" in status

    def test_status_model_dir_exists(self):
        settings = FakeSettings(model_dir=Path("/fake/model"))
        with patch.object(Path, "exists", return_value=True):
            service = IndicSeamlessService(settings)
            status = service.status()
            assert status["model_dir_exists"] is True
            assert status["model_source"] == str(Path("/fake/model"))


class TestImportDependencies:
    def test_import_success(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)
        torch_mock = MagicMock()
        torchaudio_mock = MagicMock()
        with patch.dict("sys.modules", {
            "torch": torch_mock,
            "torchaudio": torchaudio_mock,
            "transformers": MagicMock(
                SeamlessM4TFeatureExtractor=MagicMock,
                SeamlessM4TTokenizer=MagicMock,
                SeamlessM4Tv2ForSpeechToText=MagicMock,
            ),
        }):
            result = service._import_dependencies()
            assert result[0] is torch_mock
            assert result[1] is torchaudio_mock

    def test_import_failure(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)
        with patch.dict("sys.modules", {"torch": None}):
            with patch("builtins.__import__", side_effect=ImportError("no module")):
                result = service._import_dependencies()
                assert all(r is None for r in result)


class TestTranslateAudioBytes:
    @pytest.fixture
    def service(self):
        return IndicSeamlessService(FakeSettings())

    def test_empty_audio_raises_value_error(self, service):
        with pytest.raises(ValueError, match="Audio payload is empty"):
            service.translate_audio_bytes(b"")

    def test_import_error_raises_runtime_error(self, service):
        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(None, None, None, None, None)):
            with pytest.raises(RuntimeError, match="dependencies are not installed"):
                service.translate_audio_bytes(b"\x00\x01\x02")

    def test_happy_path(self, service):
        mock_torch = MagicMock()
        mock_torchaudio = MagicMock()
        mock_processor = MagicMock()
        mock_tokenizer = MagicMock()
        mock_model = MagicMock()
        mock_feature_extractor = MagicMock()

        waveform = MagicMock()
        waveform.ndim = 1
        sample_rate = 16000

        mock_torchaudio.load.return_value = (waveform, sample_rate)
        mock_processor.return_value = {"input_values": MagicMock()}
        mock_model.generate.return_value = [MagicMock()]
        mock_model.generate.return_value[0].detach.return_value.cpu.return_value.numpy.return_value.squeeze.return_value = [1, 2, 3]
        mock_tokenizer.decode.return_value = " Hello world "

        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(mock_torch, mock_torchaudio, mock_feature_extractor, mock_tokenizer, mock_model)):
            with patch.object(service, "_ensure_model_loaded") as mock_ensure:
                service._model = mock_model
                service._processor = mock_processor
                service._tokenizer = mock_tokenizer

                result = service.translate_audio_bytes(b"\x00\x01\x02\x03", target_language="hin")

                assert result.text == "Hello world"
                assert result.target_language == "hin"
                assert result.device == "cpu"
                assert result.model_source == "facebook/seamless-m4t-v2"
                assert result.sample_rate == 16000

    def test_stereo_downmix(self, service):
        mock_torch = MagicMock()
        mock_torchaudio = MagicMock()

        # Create a 2D waveform with 2 channels (stereo)
        waveform = MagicMock()
        waveform.ndim = 2
        shape_property = MagicMock()
        shape_property.__getitem__.return_value = 2
        type(waveform).shape = shape_property

        mock_torchaudio.load.return_value = (waveform, 16000)

        mock_model = MagicMock()
        mock_model.generate.return_value = [MagicMock()]
        mock_model.generate.return_value[0].detach.return_value.cpu.return_value.numpy.return_value.squeeze.return_value = [1]
        mock_tokenizer = MagicMock()
        mock_tokenizer.decode.return_value = "downmixed"
        mock_processor = MagicMock()
        mock_processor.return_value = {"input_values": MagicMock()}
        mock_fe = MagicMock()

        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(mock_torch, mock_torchaudio, mock_fe, mock_tokenizer, mock_model)):
            service._model = mock_model
            service._processor = mock_processor
            service._tokenizer = mock_tokenizer

            result = service.translate_audio_bytes(b"audio data", target_language="eng")
            assert result.text == "downmixed"
            waveform.mean.assert_called_once_with(dim=0, keepdim=True)

    def test_resample_non_16khz(self, service):
        mock_torch = MagicMock()
        mock_torchaudio = MagicMock()

        waveform = MagicMock()
        waveform.ndim = 1
        resampled = MagicMock()
        mock_torchaudio.functional.resample.return_value = resampled

        mock_torchaudio.load.return_value = (waveform, 48000)

        mock_model = MagicMock()
        mock_model.generate.return_value = [MagicMock()]
        mock_model.generate.return_value[0].detach.return_value.cpu.return_value.numpy.return_value.squeeze.return_value = [1]
        mock_tokenizer = MagicMock()
        mock_tokenizer.decode.return_value = "resampled"
        mock_processor = MagicMock()
        mock_processor.return_value = {"input_values": MagicMock()}
        mock_fe = MagicMock()

        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(mock_torch, mock_torchaudio, mock_fe, mock_tokenizer, mock_model)):
            service._model = mock_model
            service._processor = mock_processor
            service._tokenizer = mock_tokenizer

            result = service.translate_audio_bytes(b"audio data", target_language="eng")
            assert result.sample_rate == 16000
            mock_torchaudio.functional.resample.assert_called_once_with(
                waveform, orig_freq=48000, new_freq=16000
            )

    def test_default_target_language(self, service):
        mock_torch = MagicMock()
        mock_torchaudio = MagicMock()

        waveform = MagicMock()
        waveform.ndim = 1

        mock_torchaudio.load.return_value = (waveform, 16000)

        mock_model = MagicMock()
        mock_model.generate.return_value = [MagicMock()]
        mock_model.generate.return_value[0].detach.return_value.cpu.return_value.numpy.return_value.squeeze.return_value = [1]
        mock_tokenizer = MagicMock()
        mock_tokenizer.decode.return_value = "default lang"
        mock_processor = MagicMock()
        mock_processor.return_value = {"input_values": MagicMock()}
        mock_fe = MagicMock()

        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(mock_torch, mock_torchaudio, mock_fe, mock_tokenizer, mock_model)):
            service._model = mock_model
            service._processor = mock_processor
            service._tokenizer = mock_tokenizer

            result = service.translate_audio_bytes(b"audio", target_language=None)
            assert result.target_language == "eng"


class TestEnsureModelLoaded:
    def test_already_loaded_returns_immediately(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)
        service._model = MagicMock()
        service._processor = MagicMock()
        service._tokenizer = MagicMock()

        with patch.object(IndicSeamlessService, "_import_dependencies") as mock_import:
            service._ensure_model_loaded()
            mock_import.assert_not_called()

    def test_loads_model_if_not_loaded(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)
        service._model = None
        service._processor = None
        service._tokenizer = None

        mock_model_cls = MagicMock()
        mock_model_on_device = MagicMock()
        mock_model_cls.from_pretrained.return_value.to.return_value = mock_model_on_device

        mock_fe_cls = MagicMock()
        mock_fe_instance = MagicMock()
        mock_fe_cls.from_pretrained.return_value = mock_fe_instance

        mock_tokenizer_cls = MagicMock()
        mock_tokenizer_instance = MagicMock()
        mock_tokenizer_cls.from_pretrained.return_value = mock_tokenizer_instance

        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(MagicMock(), MagicMock(), mock_fe_cls, mock_tokenizer_cls, mock_model_cls)):
            service._ensure_model_loaded()
            assert service._model is mock_model_on_device
            assert service._processor is mock_fe_instance
            assert service._tokenizer is mock_tokenizer_instance

    def test_raises_when_deps_not_available(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)
        service._model = None

        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(None, None, None, None, None)):
            with pytest.raises(RuntimeError, match="IndicSeamless dependencies not available"):
                service._ensure_model_loaded()


class TestResolveDevice:
    def test_auto_returns_cpu_when_cuda_not_available(self):
        settings = FakeSettings()
        settings.speech_device = "auto"
        service = IndicSeamlessService(settings)

        mock_torch = MagicMock()
        mock_torch.cuda.is_available.return_value = False

        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(mock_torch, None, None, None, None)):
            result = service._resolve_device()
            assert result == "cpu"

    def test_auto_returns_cuda_when_available(self):
        settings = FakeSettings()
        settings.speech_device = "auto"
        service = IndicSeamlessService(settings)

        mock_torch = MagicMock()
        mock_torch.cuda.is_available.return_value = True

        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(mock_torch, None, None, None, None)):
            result = service._resolve_device()
            assert result == "cuda"

    def test_cuda_falls_back_to_cpu(self):
        settings = FakeSettings()
        settings.speech_device = "cuda"
        service = IndicSeamlessService(settings)

        mock_torch = MagicMock()
        mock_torch.cuda.is_available.return_value = False

        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(mock_torch, None, None, None, None)):
            result = service._resolve_device()
            assert result == "cpu"

    def test_cuda_keeps_cuda_when_available(self):
        settings = FakeSettings()
        settings.speech_device = "cuda"
        service = IndicSeamlessService(settings)

        mock_torch = MagicMock()
        mock_torch.cuda.is_available.return_value = True

        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(mock_torch, None, None, None, None)):
            result = service._resolve_device()
            assert result == "cuda"

    def test_respects_configured_device(self):
        settings = FakeSettings()
        settings.speech_device = "mps"
        service = IndicSeamlessService(settings)

        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(MagicMock(), None, None, None, None)):
            result = service._resolve_device()
            assert result == "mps"


class TestSpeechResultToDict:
    def test_converts_to_dict(self):
        settings = FakeSettings()
        service = IndicSeamlessService(settings)

        with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(MagicMock(), MagicMock(), MagicMock(), MagicMock(), MagicMock())):
            with patch.object(service, "_ensure_model_loaded"):
                service._model = MagicMock()
                service._processor = MagicMock()
                service._tokenizer = MagicMock()
                mock_torch = MagicMock()
                mock_torchaudio = MagicMock()

                mock_waveform = MagicMock()
                mock_waveform.ndim = 1
                mock_torchaudio.load.return_value = (mock_waveform, 16000)

                mock_model = MagicMock()
                mock_model.generate.return_value = [MagicMock()]
                mock_model.generate.return_value[0].detach.return_value.cpu.return_value.numpy.return_value.squeeze.return_value = [1]
                mock_tokenizer = MagicMock()
                mock_tokenizer.decode.return_value = "test result"
                mock_processor = MagicMock()
                mock_processor.return_value = {"input_values": MagicMock()}

                with patch.object(IndicSeamlessService, "_import_dependencies", return_value=(mock_torch, mock_torchaudio, MagicMock(), mock_tokenizer, mock_model)):
                    service._model = mock_model
                    service._processor = mock_processor
                    service._tokenizer = mock_tokenizer

                    result = service.translate_audio_bytes(b"test data", target_language="eng")
                    d = speech_result_to_dict(result)
                    assert isinstance(d, dict)
                    assert d["text"] == "test result"
                    assert d["target_language"] == "eng"
                    assert d["device"] == "cpu"
                    assert d["sample_rate"] == 16000
