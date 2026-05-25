from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from rag.embeddings import (
    LocalHashEmbeddingFunction,
    SentenceTransformerEmbeddingFunction,
    build_embedding_function,
    hash_embedding,
    normalize_text,
    score_query,
    tokenize,
)


class TestNormalizeText:
    def test_empty_string(self):
        assert normalize_text("") == ""

    def test_only_whitespace(self):
        assert normalize_text("   ") == ""

    def test_collapses_multiple_spaces(self):
        assert normalize_text("hello   world") == "hello world"

    def test_trims_leading_trailing(self):
        assert normalize_text("  hello world  ") == "hello world"

    def test_punctuation_only(self):
        assert normalize_text("!!! ???") == "!!! ???"

    def test_already_normalized(self):
        assert normalize_text("hello world") == "hello world"


class TestTokenize:
    def test_extracts_tokens(self):
        assert tokenize("Hello World TEST") == {"hello", "world", "test"}

    def test_empty_string(self):
        assert tokenize("") == set()

    def test_no_alpha_tokens(self):
        assert tokenize("123 !!! @#$") == set()

    def test_min_length_two_excludes_single_chars(self):
        assert "a" not in tokenize("a ab abc")
        assert "ab" in tokenize("a ab abc")
        assert "abc" in tokenize("a ab abc")


class TestScoreQuery:
    def test_empty_query_returns_zero(self):
        """Line 23: empty query_tokens → 0.0"""
        assert score_query("", "some text") == 0.0

    def test_empty_text_returns_zero(self):
        """Line 26: empty text_tokens → 0.0"""
        assert score_query("hello", "") == 0.0

    def test_no_common_tokens_returns_length_bonus_only(self):
        score = score_query("xyzzy", "hello world")
        assert 0.0 < score < 1.0

    def test_single_word_query_with_match(self):
        score = score_query("helmet", "helmet fine rules")
        assert score > 1.0

    def test_short_text(self):
        score = score_query("test", "test")
        assert score > 1.0

    def test_exact_phrase_bonus(self):
        score_with = score_query("helmet fine", "helmet fine rules")
        score_without = score_query("helmet fine", "helmet penalty rules")
        assert score_with > score_without

    def test_query_only_punctuation_no_tokens(self):
        assert score_query("!!! ???", "some text") == 0.0

    def test_text_only_punctuation_scored_as_short_text(self):
        score = score_query("hello", "!!!")
        assert score == pytest.approx(0.0 + 0.0 + len("!!!") / 5000, abs=0.001)


class TestHashEmbedding:
    def test_default_dimensions(self):
        result = hash_embedding("test")
        assert len(result) == 384

    def test_custom_dimensions(self):
        result = hash_embedding("test", dimensions=128)
        assert len(result) == 128

    def test_deterministic(self):
        assert hash_embedding("hello world") == hash_embedding("hello world")

    def test_empty_input_returns_zero_vector(self):
        result = hash_embedding("")
        assert all(x == 0.0 for x in result)

    def test_very_long_text(self):
        result = hash_embedding("word " * 1000)
        assert len(result) == 384
        assert any(x != 0.0 for x in result)

    def test_different_inputs_differ(self):
        assert hash_embedding("apple") != hash_embedding("banana")

    def test_unicode_text_produces_zero_vector(self):
        """Unicode scripts don't match ASCII-only tokenizer -> zero vector"""
        result = hash_embedding("नमस्ते తెలుగు தமிழ்")
        assert len(result) == 384
        assert all(x == 0.0 for x in result)


class TestLocalHashEmbeddingFunction:
    def test_call_empty_list(self):
        """Line 53: empty input returns empty list"""
        fn = LocalHashEmbeddingFunction()
        assert fn([]) == []

    def test_call_single_item(self):
        fn = LocalHashEmbeddingFunction()
        result = fn(["hello world"])
        assert len(result) == 1
        assert len(result[0]) == 384

    def test_call_multiple_items(self):
        fn = LocalHashEmbeddingFunction()
        result = fn(["hello", "world"])
        assert len(result) == 2

    def test_name(self):
        """Line 57: static name"""
        assert LocalHashEmbeddingFunction.name() == "safevixai-local-hash"

    def test_build_from_config_default(self):
        """Line 61: no dimensions in config"""
        fn = LocalHashEmbeddingFunction.build_from_config({})
        assert fn.dimensions == 384

    def test_build_from_config_custom(self):
        """Line 61: custom dimensions"""
        fn = LocalHashEmbeddingFunction.build_from_config({"dimensions": 128})
        assert fn.dimensions == 128

    def test_get_config(self):
        """Line 64: returns dimensions dict"""
        fn = LocalHashEmbeddingFunction(dimensions=256)
        assert fn.get_config() == {"dimensions": 256}

    def test_default_space(self):
        """Line 67: returns cosine"""
        assert LocalHashEmbeddingFunction().default_space() == "cosine"

    def test_supported_spaces(self):
        """Line 70: returns [cosine]"""
        assert LocalHashEmbeddingFunction().supported_spaces() == ["cosine"]

    def test_is_legacy(self):
        """Line 73: returns False"""
        assert LocalHashEmbeddingFunction().is_legacy() is False


class TestSentenceTransformerEmbeddingFunction:
    def test_init_stores_model_name(self):
        """Lines 80-81: stores model_name, _model is None"""
        fn = SentenceTransformerEmbeddingFunction("test-model")
        assert fn.model_name == "test-model"
        assert fn._model is None

    def test_load_model_imports_and_creates(self):
        """Lines 84-88: imports SentenceTransformer and creates model"""
        mock_model = MagicMock()
        mock_st_mod = MagicMock()
        mock_st_mod.SentenceTransformer.return_value = mock_model

        with patch.dict('sys.modules', {'sentence_transformers': mock_st_mod}):
            fn = SentenceTransformerEmbeddingFunction("test-model")
            model = fn._load_model()
        assert model is mock_model
        mock_st_mod.SentenceTransformer.assert_called_once_with("test-model")

    def test_load_model_cached_returns_existing(self):
        """Lines 84-88: cached _model returned without re-importing"""
        mock_model = MagicMock()
        mock_st_mod = MagicMock()

        with patch.dict('sys.modules', {'sentence_transformers': mock_st_mod}):
            fn = SentenceTransformerEmbeddingFunction("test-model")
            fn._model = mock_model
            model = fn._load_model()
        mock_st_mod.SentenceTransformer.assert_not_called()
        assert model is mock_model

    def test_call_encodes_input(self):
        """Lines 91-97: __call__ invokes model.encode and returns tolist"""
        mock_model = MagicMock()
        mock_encoded = MagicMock()
        mock_encoded.tolist.return_value = [[0.1, 0.2], [0.3, 0.4]]
        mock_model.encode.return_value = mock_encoded

        with patch.object(SentenceTransformerEmbeddingFunction, "_load_model", return_value=mock_model):
            fn = SentenceTransformerEmbeddingFunction("test-model")
            result = fn(["hello", "world"])

        assert result == [[0.1, 0.2], [0.3, 0.4]]
        mock_model.encode.assert_called_once_with(
            ["hello", "world"],
            normalize_embeddings=True,
            show_progress_bar=False,
        )

    def test_call_empty_input(self):
        """Lines 91-97: empty input returns empty list"""
        mock_model = MagicMock()
        mock_encoded = MagicMock()
        mock_encoded.tolist.return_value = []
        mock_model.encode.return_value = mock_encoded

        with patch.object(SentenceTransformerEmbeddingFunction, "_load_model", return_value=mock_model):
            fn = SentenceTransformerEmbeddingFunction("test-model")
            result = fn([])
        assert result == []

    def test_name(self):
        """Line 101: static name"""
        assert SentenceTransformerEmbeddingFunction.name() == "safevixai-sentence-transformer"

    def test_build_from_config_default(self):
        """Line 105: default model_name"""
        fn = SentenceTransformerEmbeddingFunction.build_from_config({})
        assert fn.model_name == "sentence-transformers/all-MiniLM-L6-v2"

    def test_build_from_config_custom(self):
        """Line 105: custom model_name"""
        fn = SentenceTransformerEmbeddingFunction.build_from_config({"model_name": "custom-model"})
        assert fn.model_name == "custom-model"

    def test_get_config(self):
        """Line 110: returns model_name"""
        fn = SentenceTransformerEmbeddingFunction("my-model")
        assert fn.get_config() == {"model_name": "my-model"}

    def test_default_space(self):
        """Line 113: returns cosine"""
        assert SentenceTransformerEmbeddingFunction("test").default_space() == "cosine"

    def test_supported_spaces(self):
        """Line 116: returns [cosine]"""
        assert SentenceTransformerEmbeddingFunction("test").supported_spaces() == ["cosine"]

    def test_is_legacy(self):
        """Line 119: returns False"""
        assert SentenceTransformerEmbeddingFunction("test").is_legacy() is False


class TestBuildEmbeddingFunction:
    def test_none_returns_default_sentence_transformer(self):
        """Line 124: None model_name -> default model"""
        fn = build_embedding_function(None)
        assert isinstance(fn, SentenceTransformerEmbeddingFunction)
        assert fn.model_name == "sentence-transformers/all-MiniLM-L6-v2"

    def test_empty_string_returns_default(self):
        """Line 124: empty string -> default model"""
        fn = build_embedding_function("")
        assert isinstance(fn, SentenceTransformerEmbeddingFunction)
        assert fn.model_name == "sentence-transformers/all-MiniLM-L6-v2"

    def test_hash_returns_local_hash(self):
        """Line 128: 'hash' -> LocalHashEmbeddingFunction"""
        fn = build_embedding_function("hash")
        assert isinstance(fn, LocalHashEmbeddingFunction)

    def test_local_hash_variant(self):
        """Line 128: 'local-hash' -> LocalHashEmbeddingFunction"""
        fn = build_embedding_function("local-hash")
        assert isinstance(fn, LocalHashEmbeddingFunction)

    def test_safevixai_local_hash(self):
        """Line 128: 'safevixai-local-hash' -> LocalHashEmbeddingFunction"""
        fn = build_embedding_function("safevixai-local-hash")
        assert isinstance(fn, LocalHashEmbeddingFunction)

    def test_custom_model_name(self):
        """Line 129: custom name -> SentenceTransformerEmbeddingFunction"""
        fn = build_embedding_function("custom-embedding-model")
        assert isinstance(fn, SentenceTransformerEmbeddingFunction)
        assert fn.model_name == "custom-embedding-model"

    def test_whitespace_model_name_stripped(self):
        """Line 126: whitespace-around model name gets stripped"""
        fn = build_embedding_function("  my-model  ")
        assert isinstance(fn, SentenceTransformerEmbeddingFunction)
        assert fn.model_name == "my-model"

    def test_not_a_string_returns_default(self):
        """Line 123: non-string model_name -> default"""
        fn = build_embedding_function(123)
        assert isinstance(fn, SentenceTransformerEmbeddingFunction)
        assert fn.model_name == "sentence-transformers/all-MiniLM-L6-v2"
