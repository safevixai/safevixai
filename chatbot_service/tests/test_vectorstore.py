from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, PropertyMock, call, patch

import pytest

from rag.document_loader import (
    EXCLUDED_DATA_DIRS,
    LoadedDocument,
    MAX_CSV_ROWS,
    MAX_TEXT_CHARS,
    _LOADER_BY_SUFFIX,
    _read_csv,
    _read_json,
    _read_pdf,
    _read_text,
    load_documents,
)
from rag.vectorstore import (
    EXCLUDED_INDEX_CATEGORIES,
    DocumentChunk,
    LocalVectorStore,
)


def _make_mock_path(
    suffix: str = '.txt',
    parts: tuple[str, ...] = ('data', 'file.txt'),
    stem: str = 'file',
    is_file: bool = True,
    text_content: str = 'Default content',
    relative: str | None = None,
):
    path = MagicMock(spec=Path)
    path.suffix = suffix
    path.is_file.return_value = is_file
    path.parts = parts
    path.stem = stem
    path.name = parts[-1] if parts else 'file.txt'
    path.read_text.return_value = text_content
    if relative is None:
        relative = str(Path(*parts[1:])) if len(parts) > 1 else parts[0]
    path.relative_to.return_value = Path(relative)
    return path


# ═══════════════════════════════════════════════════════════════════════════════
# DocumentChunk
# ═══════════════════════════════════════════════════════════════════════════════

class TestDocumentChunk:
    def test_creates_with_all_fields(self):
        chunk = DocumentChunk(
            chunk_id='doc.txt:1',
            source='doc.txt',
            title='My Document',
            category='legal',
            content='Some text here',
        )
        assert chunk.chunk_id == 'doc.txt:1'
        assert chunk.source == 'doc.txt'
        assert chunk.title == 'My Document'
        assert chunk.category == 'legal'
        assert chunk.content == 'Some text here'

    def test_dataclass_slots(self):
        chunk = DocumentChunk('a', 'b', 'c', 'd', 'e')
        with pytest.raises(AttributeError):
            chunk.__dict__


# ═══════════════════════════════════════════════════════════════════════════════
# LoadedDocument
# ═══════════════════════════════════════════════════════════════════════════════

class TestLoadedDocument:
    def test_creates_with_all_fields(self):
        doc = LoadedDocument(
            source='path/to/doc.txt',
            title='My Document',
            category='legal',
            text='Full document text',
        )
        assert doc.source == 'path/to/doc.txt'
        assert doc.title == 'My Document'
        assert doc.category == 'legal'
        assert doc.text == 'Full document text'

    def test_dataclass_slots(self):
        doc = LoadedDocument('a', 'b', 'c', 'd')
        with pytest.raises(AttributeError):
            doc.__dict__


# ═══════════════════════════════════════════════════════════════════════════════
# _read_text
# ═══════════════════════════════════════════════════════════════════════════════

class TestReadText:
    def test_reads_text_file(self):
        mock_path = MagicMock(spec=Path)
        mock_path.read_text.return_value = 'Hello world'
        result = _read_text(mock_path)
        assert result == 'Hello world'
        mock_path.read_text.assert_called_once_with(encoding='utf-8', errors='ignore')


# ═══════════════════════════════════════════════════════════════════════════════
# _read_csv
# ═══════════════════════════════════════════════════════════════════════════════

class TestReadCsv:
    def test_parses_csv_with_headers_and_rows(self):
        mock_path = MagicMock(spec=Path)
        mock_file = MagicMock()
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = mock_file
        mock_path.open.return_value = mock_cm

        with patch('rag.document_loader.csv.DictReader') as mock_reader_cls:
            mock_reader = MagicMock()
            mock_reader.fieldnames = ['col1', 'col2']
            mock_reader.__iter__.return_value = iter([
                {'col1': 'a', 'col2': 'b'},
                {'col1': 'c', 'col2': 'd'},
            ])
            mock_reader_cls.return_value = mock_reader
            result = _read_csv(mock_path)

        assert 'Columns: col1, col2' in result
        assert 'Row 1: col1=a; col2=b' in result
        assert 'Row 2: col1=c; col2=d' in result

    def test_empty_csv_returns_just_columns_line(self):
        mock_path = MagicMock(spec=Path)
        mock_file = MagicMock()
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = mock_file
        mock_path.open.return_value = mock_cm

        with patch('rag.document_loader.csv.DictReader') as mock_reader_cls:
            mock_reader = MagicMock()
            mock_reader.fieldnames = ['col1']
            mock_reader.__iter__.return_value = iter([])
            mock_reader_cls.return_value = mock_reader
            result = _read_csv(mock_path)

        assert result == 'Columns: col1'
        assert 'Row' not in result

    def test_skips_empty_values_in_row(self):
        mock_path = MagicMock(spec=Path)
        mock_file = MagicMock()
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = mock_file
        mock_path.open.return_value = mock_cm

        with patch('rag.document_loader.csv.DictReader') as mock_reader_cls:
            mock_reader = MagicMock()
            mock_reader.fieldnames = ['col1', 'col2']
            mock_reader.__iter__.return_value = iter([
                {'col1': 'a', 'col2': ''},
            ])
            mock_reader_cls.return_value = mock_reader
            result = _read_csv(mock_path)

        assert 'col2=' not in result
        assert 'col1=a' in result

    def test_respects_max_csv_rows(self):
        mock_path = MagicMock(spec=Path)
        mock_file = MagicMock()
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = mock_file
        mock_path.open.return_value = mock_cm

        many_rows = [{f'col{k}': f'val{k}'} for k in range(MAX_CSV_ROWS + 50)]

        with patch('rag.document_loader.csv.DictReader') as mock_reader_cls:
            mock_reader = MagicMock()
            mock_reader.fieldnames = ['col0']
            mock_reader.__iter__.return_value = iter(many_rows)
            mock_reader_cls.return_value = mock_reader
            result = _read_csv(mock_path)

        row_count = result.count('Row ')
        assert row_count == MAX_CSV_ROWS


# ═══════════════════════════════════════════════════════════════════════════════
# _read_json
# ═══════════════════════════════════════════════════════════════════════════════

class TestReadJson:
    def test_parses_json_content(self):
        mock_path = MagicMock(spec=Path)
        mock_path.read_text.return_value = '{"key": "value", "num": 42}'
        result = _read_json(mock_path)
        parsed = json.loads(result)
        assert parsed['key'] == 'value'
        assert parsed['num'] == 42

    def test_pretty_printed(self):
        mock_path = MagicMock(spec=Path)
        mock_path.read_text.return_value = '{"a":1,"b":2}'
        result = _read_json(mock_path)
        assert '  ' in result
        assert '\n' in result


# ═══════════════════════════════════════════════════════════════════════════════
# _read_pdf
# ═══════════════════════════════════════════════════════════════════════════════

class TestReadPdf:
    def test_pdfreader_unavailable_returns_empty_string(self):
        mock_path = MagicMock(spec=Path)
        with patch('rag.document_loader.PdfReader', None):
            result = _read_pdf(mock_path)
        assert result == ''

    def test_pdfreader_available_extracts_text(self):
        mock_path = MagicMock(spec=Path)
        mock_pdf_reader_cls = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = 'Page content here'
        mock_pdf_reader = MagicMock()
        mock_pdf_reader.pages = [mock_page]
        mock_pdf_reader_cls.return_value = mock_pdf_reader

        with patch('rag.document_loader.PdfReader', mock_pdf_reader_cls):
            result = _read_pdf(mock_path)
        assert 'Page 1: Page content here' in result


# ═══════════════════════════════════════════════════════════════════════════════
# load_documents
# ═══════════════════════════════════════════════════════════════════════════════

class TestLoadDocuments:
    def test_empty_data_dir_returns_empty_list(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = False
        assert load_documents(data_dir) == []

    def test_non_existent_dir_returns_empty_list(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = False
        assert load_documents(data_dir) == []

    def test_loads_txt_files(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = True
        txt_path = _make_mock_path('.txt', ('data', 'doc.txt'), 'doc', text_content='Hello world',
                                   relative='doc.txt')
        data_dir.rglob.return_value = [txt_path]

        with patch('rag.document_loader.normalize_text', side_effect=lambda x: x):
            docs = load_documents(data_dir)

        assert len(docs) == 1
        assert docs[0].source == 'doc.txt'
        assert docs[0].text == 'Hello world'
        assert docs[0].category == 'general'

    def test_loads_md_files(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = True
        md_path = _make_mock_path('.md', ('data', 'readme.md'), 'readme', text_content='# Markdown',
                                  relative='readme.md')
        data_dir.rglob.return_value = [md_path]

        with patch('rag.document_loader.normalize_text', side_effect=lambda x: x):
            docs = load_documents(data_dir)

        assert len(docs) == 1
        assert docs[0].source == 'readme.md'

    def test_loads_json_files(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = True
        json_path = _make_mock_path('.json', ('data', 'data.json'), 'data',
                                    text_content='{"key":"val"}', relative='data.json')
        data_dir.rglob.return_value = [json_path]

        with patch('rag.document_loader.normalize_text', side_effect=lambda x: x):
            docs = load_documents(data_dir)

        assert len(docs) == 1
        assert docs[0].source == 'data.json'

    def test_loads_csv_files(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = True
        csv_path = _make_mock_path('.csv', ('data', 'data.csv'), 'data', text_content='',
                                   relative='data.csv')
        data_dir.rglob.return_value = [csv_path]

        mock_file = MagicMock()
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = mock_file
        csv_path.open.return_value = mock_cm

        with (
            patch('rag.document_loader.normalize_text', side_effect=lambda x: x),
            patch('rag.document_loader.csv.DictReader') as mock_reader_cls,
        ):
            mock_reader = MagicMock()
            mock_reader.fieldnames = ['a']
            mock_reader.__iter__.return_value = iter([{'a': '1'}])
            mock_reader_cls.return_value = mock_reader
            docs = load_documents(data_dir)

        assert len(docs) == 1
        assert docs[0].source == 'data.csv'

    def test_csv_max_rows_limit(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = True
        csv_path = _make_mock_path('.csv', ('data', 'big.csv'), 'big', text_content='',
                                   relative='big.csv')
        data_dir.rglob.return_value = [csv_path]

        mock_file = MagicMock()
        mock_cm = MagicMock()
        mock_cm.__enter__.return_value = mock_file
        csv_path.open.return_value = mock_cm

        many_rows = [{f'col{k}': f'val{k}'} for k in range(MAX_CSV_ROWS + 50)]

        with (
            patch('rag.document_loader.normalize_text', side_effect=lambda x: x),
            patch('rag.document_loader.csv.DictReader') as mock_reader_cls,
        ):
            mock_reader = MagicMock()
            mock_reader.fieldnames = ['col0']
            mock_reader.__iter__.return_value = iter(many_rows)
            mock_reader_cls.return_value = mock_reader
            docs = load_documents(data_dir)

        assert len(docs) == 1
        # Should contain MAX_CSV_ROWS rows, not more
        row_count = docs[0].text.count('Row ')
        assert row_count == MAX_CSV_ROWS

    def test_skips_excluded_dirs(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = True

        for excluded in EXCLUDED_DATA_DIRS:
            excluded_path = _make_mock_path('.txt', (excluded, 'file.txt'), 'file',
                                            text_content='Should be excluded',
                                            relative=f'{excluded}/file.txt')
            data_dir.rglob.return_value = [excluded_path]

            with patch('rag.document_loader.normalize_text', side_effect=lambda x: x):
                docs = load_documents(data_dir)
            assert len(docs) == 0, f'Expected 0 docs for excluded dir {excluded}'

    def test_oserror_skipped_and_logged(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = True
        bad_path = _make_mock_path('.txt', ('data', 'bad.txt'), 'bad', text_content='',
                                   relative='bad.txt')
        data_dir.rglob.return_value = [bad_path]

        err_loader = MagicMock(side_effect=OSError('Permission denied'))
        with (
            patch('rag.document_loader.normalize_text', side_effect=lambda x: x),
            patch.dict('rag.document_loader._LOADER_BY_SUFFIX', {'.txt': err_loader}),
        ):
            docs = load_documents(data_dir)
        assert len(docs) == 0

    def test_empty_text_skipped(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = True
        empty_path = _make_mock_path('.txt', ('data', 'empty.txt'), 'empty', text_content='   ',
                                     relative='empty.txt')
        data_dir.rglob.return_value = [empty_path]

        docs = load_documents(data_dir)
        assert len(docs) == 0

    def test_category_from_relative_path(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = True
        nested = _make_mock_path('.txt', ('legal', 'mva.txt'), 'mva', text_content='Rules',
                                 relative='legal/mva.txt')
        data_dir.rglob.return_value = [nested]

        with patch('rag.document_loader.normalize_text', side_effect=lambda x: x):
            docs = load_documents(data_dir)

        assert len(docs) == 1
        assert docs[0].category == 'legal'
        assert docs[0].source == 'legal/mva.txt'

    def test_max_text_chars_truncation(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = True
        long_text = 'A' * (MAX_TEXT_CHARS + 5000)
        long_path = _make_mock_path('.txt', ('data', 'long.txt'), 'long', text_content=long_text,
                                    relative='long.txt')
        data_dir.rglob.return_value = [long_path]

        docs = load_documents(data_dir)
        assert len(docs) == 1
        assert len(docs[0].text) == MAX_TEXT_CHARS

    def test_unknown_suffix_ignored(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = True
        unknown = _make_mock_path('.xyz', ('data', 'file.xyz'), 'file', text_content='xyz',
                                  relative='file.xyz')
        data_dir.rglob.return_value = [unknown]
        docs = load_documents(data_dir)
        assert len(docs) == 0

    def test_non_file_paths_skipped(self):
        data_dir = MagicMock(spec=Path)
        data_dir.exists.return_value = True
        dir_path = _make_mock_path('', ('data', 'subdir'), 'subdir', is_file=False)
        data_dir.rglob.return_value = [dir_path]
        docs = load_documents(data_dir)
        assert len(docs) == 0


# ═══════════════════════════════════════════════════════════════════════════════
# LocalVectorStore
# ═══════════════════════════════════════════════════════════════════════════════

class TestLocalVectorStoreConstructor:
    def test_stores_persist_dir_data_dir_and_embedding_model(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        assert store.persist_dir == Path('/fake/persist')
        assert store.data_dir == Path('/fake/data')
        assert store.embedding_model == 'hash'
        assert store.index_path == Path('/fake/persist/simple_index.json')

    def test_use_chroma_defaults_to_true(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
        )
        assert store.use_chroma is True

    def test_use_chroma_true_still_works(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=True,
        )
        assert store.use_chroma is True
        assert store._collection is None


class TestLocalVectorStoreEnsureIndex:
    def test_already_loaded_returns_cached_chunks(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        cached = [DocumentChunk('a', 's', 't', 'c', 'x')]
        store._chunks = cached
        result = store.ensure_index()
        assert result is cached

    def test_chroma_available_and_loaded_loads_index_file(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=True,
        )
        mock_collection = MagicMock()
        mock_collection.count.return_value = 5
        store._collection = mock_collection
        expected = [DocumentChunk('a', 's', 't', 'c', 'x')]

        with (
            patch.object(Path, 'exists', return_value=True),
            patch.object(LocalVectorStore, '_load_index_file', return_value=expected),
        ):
            result = store.ensure_index()
        assert result == expected

    def test_no_chroma_index_file_exists_loads_index(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        expected = [DocumentChunk('a', 's', 't', 'c', 'x')]

        with (
            patch.object(Path, 'exists', return_value=True),
            patch.object(LocalVectorStore, '_load_index_file', return_value=expected),
        ):
            result = store.ensure_index()
        assert result == expected

    def test_no_chroma_no_index_file_builds_index(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        built = [DocumentChunk('b', 'src', 'title', 'cat', 'cont')]

        with (
            patch.object(Path, 'exists', return_value=False),
            patch.object(LocalVectorStore, 'build_index', return_value=built) as mock_build,
        ):
            result = store.ensure_index()
        assert result == built
        mock_build.assert_called_once_with(force=True)


class TestLocalVectorStoreBuildIndex:
    def test_loads_documents_chunks_filters_and_writes_index(self):
        persist_dir = MagicMock(spec=Path)
        persist_dir.__truediv__.return_value = MagicMock(spec=Path)
        data_dir = MagicMock(spec=Path)

        store = LocalVectorStore(
            persist_dir=persist_dir,
            data_dir=data_dir,
            embedding_model='hash',
            use_chroma=False,
        )

        doc = LoadedDocument(source='test.txt', title='Test', category='legal', text='Some content about law')

        with (
            patch('rag.vectorstore.load_documents', return_value=[doc]),
            patch.object(LocalVectorStore, '_chunk_document') as mock_chunk,
            patch.object(LocalVectorStore, '_filter_chunks') as mock_filter,
            patch.object(LocalVectorStore, '_write_index_file') as mock_write,
        ):
            mock_chunk.return_value = [
                DocumentChunk('test.txt:1', 'test.txt', 'Test', 'legal', 'Some content about law'),
            ]
            mock_filter.return_value = [
                DocumentChunk('test.txt:1', 'test.txt', 'Test', 'legal', 'Some content about law'),
            ]
            result = store.build_index()

        assert len(result) == 1
        assert result[0].source == 'test.txt'
        mock_write.assert_called_once()

    def test_force_true_rebuilds_even_if_loaded(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        store._chunks = [DocumentChunk('old', 's', 't', 'c', 'x')]
        doc = LoadedDocument(source='new.txt', title='New', category='legal', text='New content')

        with (
            patch('rag.vectorstore.load_documents', return_value=[doc]),
            patch.object(LocalVectorStore, '_chunk_document') as mock_chunk,
            patch.object(LocalVectorStore, '_filter_chunks') as mock_filter,
            patch.object(LocalVectorStore, '_write_index_file'),
        ):
            mock_chunk.return_value = [
                DocumentChunk('new.txt:1', 'new.txt', 'New', 'legal', 'New content'),
            ]
            mock_filter.side_effect = lambda x: x
            result = store.build_index(force=True)

        assert result[0].source == 'new.txt'

    def test_force_false_with_existing_returns_cached(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        cached = [DocumentChunk('cached', 's', 't', 'c', 'x')]
        store._chunks = cached

        with patch('rag.vectorstore.load_documents') as mock_load:
            result = store.build_index(force=False)
        mock_load.assert_not_called()
        assert result is cached


class TestLocalVectorStoreLoadIndexFile:
    def test_loads_and_parses_json(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        raw_json = json.dumps([
            {'chunk_id': 'a:1', 'source': 'a.txt', 'title': 'A', 'category': 'legal', 'content': 'xyz'},
        ])

        mock_index = MagicMock(spec=Path)
        mock_index.read_text.return_value = raw_json
        store.index_path = mock_index

        with patch.object(LocalVectorStore, '_filter_chunks', side_effect=lambda x: x):
            result = store._load_index_file()

        assert len(result) == 1
        assert result[0].chunk_id == 'a:1'
        mock_index.read_text.assert_called_once_with(encoding='utf-8')

    def test_filters_excluded_categories(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        raw_json = json.dumps([
            {'chunk_id': 'keep:1', 'source': 'keep.txt', 'title': 'Keep', 'category': 'legal', 'content': 'x'},
            {'chunk_id': 'qa:1', 'source': 'qa.txt', 'title': 'QA', 'category': 'qa_pairs', 'content': 'y'},
        ])

        mock_index = MagicMock(spec=Path)
        mock_index.read_text.return_value = raw_json
        store.index_path = mock_index

        result = store._load_index_file()
        assert len(result) == 1
        assert result[0].chunk_id == 'keep:1'


class TestLocalVectorStoreWriteIndexFile:
    def test_creates_persist_dir_and_writes_json(self):
        persist_dir = MagicMock(spec=Path)
        index_path = MagicMock(spec=Path)
        persist_dir.__truediv__.return_value = index_path

        store = LocalVectorStore(
            persist_dir=persist_dir,
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        store.index_path = index_path

        chunks = [DocumentChunk('id:1', 'src', 'title', 'cat', 'cont')]
        store._write_index_file(chunks)

        persist_dir.mkdir.assert_called_once_with(parents=True, exist_ok=True)
        index_path.write_text.assert_called_once()
        written = index_path.write_text.call_args[0][0]
        parsed = json.loads(written)
        assert parsed[0]['chunk_id'] == 'id:1'
        assert parsed[0]['source'] == 'src'


class TestLocalVectorStoreFilterChunks:
    def test_filters_out_excluded_categories(self):
        included = DocumentChunk('a:1', 'a', 'A', 'legal', 'x')
        excluded = DocumentChunk('b:1', 'b', 'B', 'qa_pairs', 'y')

        result = LocalVectorStore._filter_chunks([included, excluded])
        assert len(result) == 1
        assert result[0] is included

    def test_all_excluded_returns_empty(self):
        chunks = [DocumentChunk('a:1', 'a', 'A', cat, 'x') for cat in EXCLUDED_INDEX_CATEGORIES]
        result = LocalVectorStore._filter_chunks(chunks)
        assert result == []

    def test_none_excluded_returns_all(self):
        chunks = [
            DocumentChunk('a:1', 'a', 'A', 'legal', 'x'),
            DocumentChunk('b:1', 'b', 'B', 'general', 'y'),
        ]
        result = LocalVectorStore._filter_chunks(chunks)
        assert result == chunks


class TestLocalVectorStoreSearch:
    def test_chroma_available_returns_results_from_chroma(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        chunk = DocumentChunk('a:1', 'a.txt', 'A', 'legal', 'content')
        store._chunks = [chunk]

        chroma_results = [(chunk, 0.95)]

        with patch.object(LocalVectorStore, '_search_chroma', return_value=chroma_results):
            results = store.search('query', top_k=5)
        assert results == chroma_results

    def test_chroma_fails_falls_back_to_lexical(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        chunk = DocumentChunk('a:1', 'a.txt', 'A', 'legal', 'helmet fine amount section')
        store._chunks = [chunk]

        with (
            patch.object(LocalVectorStore, '_search_chroma', return_value=[]),
            patch('rag.vectorstore.score_query', return_value=3.0),
        ):
            results = store.search('helmet fine', top_k=5)
        assert len(results) == 1
        assert results[0][0] is chunk
        assert results[0][1] > 0

    def test_lexical_search_filters_by_scopes(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        legal = DocumentChunk('a:1', 'a.txt', 'A', 'legal', 'helmet fine')
        general = DocumentChunk('b:1', 'b.txt', 'B', 'general', 'hello')
        store._chunks = [legal, general]

        with (
            patch.object(LocalVectorStore, '_search_chroma', return_value=[]),
            patch('rag.vectorstore.score_query', side_effect=lambda q, c: 1.0 if 'helmet' in c else 0.3),
        ):
            results = store.search('helmet fine', top_k=5, scopes={'legal'})
        assert len(results) == 1
        assert results[0][0].source == 'a.txt'

    def test_lexical_search_returns_only_score_above_zero(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        chunk = DocumentChunk('a:1', 'a.txt', 'A', 'legal', 'helmet rules')
        store._chunks = [chunk]

        with (
            patch.object(LocalVectorStore, '_search_chroma', return_value=[]),
            patch('rag.vectorstore.score_query', return_value=0.0),
        ):
            results = store.search('unrelated query', top_k=5)
        assert results == []

    def test_lexical_search_returns_top_k_sorted_by_score(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        chunks = [
            DocumentChunk(f'{i}:1', f'{i}.txt', f'T{i}', 'general', f'content {i}') for i in range(5)
        ]
        store._chunks = chunks

        with (
            patch.object(LocalVectorStore, '_search_chroma', return_value=[]),
            patch('rag.vectorstore.score_query', side_effect=lambda q, c: float(c[-1])),
        ):
            results = store.search('query', top_k=3)
        assert len(results) == 3
        scores = [r[1] for r in results]
        assert scores == sorted(scores, reverse=True)

    def test_scopes_none_returns_all_matching(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        chunks = [
            DocumentChunk('a:1', 'a.txt', 'A', 'legal', 'fine amount'),
            DocumentChunk('b:1', 'b.txt', 'B', 'general', 'fine rules'),
        ]
        store._chunks = chunks

        with (
            patch.object(LocalVectorStore, '_search_chroma', return_value=[]),
            patch('rag.vectorstore.score_query', return_value=1.0),
        ):
            results = store.search('fine', top_k=5, scopes=None)
        assert len(results) == 2


class TestLocalVectorStoreStats:
    def test_returns_chunks_count_categories_chroma_chunks(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        store._chunks = [
            DocumentChunk('a:1', 'a.txt', 'A', 'legal', 'x'),
            DocumentChunk('b:1', 'b.txt', 'B', 'legal', 'y'),
            DocumentChunk('c:1', 'c.txt', 'C', 'general', 'z'),
        ]

        result = store.stats()
        assert result['chunks'] == 3
        assert result['categories'] == 2
        assert result['chroma_chunks'] == 0
        assert result['embedding_model'] == 'hash'

    def test_chroma_collection_count_included(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=True,
        )
        store._chunks = [DocumentChunk('a:1', 'a.txt', 'A', 'legal', 'x')]
        mock_collection = MagicMock()
        mock_collection.count.return_value = 7
        store._collection = mock_collection

        result = store.stats()
        assert result['chroma_chunks'] == 7


class TestLocalVectorStoreGetCollection:
    def test_use_chroma_false_returns_none(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        assert store._get_collection() is None

    def test_chromadb_unavailable_logs_warning_returns_none(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=True,
        )
        store._collection = None

        with (
            patch.dict('sys.modules', {'chromadb': None}),
            patch.object(Path, 'mkdir'),
        ):
            result = store._get_collection()
        assert result is None

    def test_creates_persistent_client_with_correct_params(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=True,
        )
        store._collection = None

        mock_chromadb = MagicMock()
        mock_client = MagicMock()
        mock_collection = MagicMock()
        mock_chromadb.PersistentClient.return_value = mock_client
        mock_client.get_or_create_collection.return_value = mock_collection

        with (
            patch.dict('sys.modules', {'chromadb': mock_chromadb}),
            patch.object(Path, 'mkdir'),
        ):
            result = store._get_collection()
        assert result is mock_collection
        mock_chromadb.PersistentClient.assert_called_once_with(path=str(Path('/fake/persist')))
        mock_client.get_or_create_collection.assert_called_once_with(
            name='safevixai_rag',
            embedding_function=store._embedding_function,
            metadata={'hnsw:space': 'cosine'},
        )

    def test_cached_collection_returned(self):
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=True,
        )
        cached = MagicMock()
        store._collection = cached
        assert store._get_collection() is cached


class TestLocalVectorStoreChunkDocument:
    def test_chunks_at_900_char_boundary(self):
        paras = ['A' * 500, 'B' * 500]
        doc = LoadedDocument('test.txt', 'Test', 'legal', '\n'.join(paras))
        chunks = LocalVectorStore._chunk_document(doc)
        assert len(chunks) == 2

    def test_single_paragraph_single_chunk(self):
        doc = LoadedDocument('test.txt', 'Test', 'legal', 'Short text')
        chunks = LocalVectorStore._chunk_document(doc)
        assert len(chunks) == 1
        assert chunks[0].content == 'Short text'
        assert chunks[0].chunk_id == 'test.txt:1'

    def test_empty_paragraphs_falls_back_to_full_text(self):
        doc = LoadedDocument('test.txt', 'Test', 'legal', '')
        with patch('rag.vectorstore.normalize_text', side_effect=lambda x: ''):
            chunks = LocalVectorStore._chunk_document(doc)
        assert len(chunks) == 1
        assert chunks[0].content == ''

    def test_multiple_paragraphs_within_900(self):
        doc = LoadedDocument('test.txt', 'Test', 'legal', 'Para1\n\nPara2\n\nPara3')
        with patch('rag.vectorstore.normalize_text', side_effect=lambda x: x.strip()):
            chunks = LocalVectorStore._chunk_document(doc)
        assert len(chunks) == 1
        assert 'Para1' in chunks[0].content

    def test_chunk_ids_sequential(self):
        paras = ['X' * 600, 'Y' * 600, 'Z' * 600]
        doc = LoadedDocument('multi.txt', 'Multi', 'general', '\n'.join(paras))
        with patch('rag.vectorstore.normalize_text', side_effect=lambda x: x.strip()):
            chunks = LocalVectorStore._chunk_document(doc)
        assert len(chunks) >= 2
        for i, chunk in enumerate(chunks, start=1):
            assert chunk.chunk_id == f'multi.txt:{i}'

    def test_metadata_returns_source_title_category(self):
        chunk = DocumentChunk('a:1', 'src.txt', 'Title', 'legal', 'content')
        meta = LocalVectorStore._metadata(chunk)
        assert meta == {'source': 'src.txt', 'title': 'Title', 'category': 'legal'}
