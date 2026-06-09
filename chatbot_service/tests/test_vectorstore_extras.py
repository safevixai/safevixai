from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from rag.document_loader import LoadedDocument
from rag.vectorstore import (
    DocumentChunk,
    LocalVectorStore,
)


class TestLocalVectorStoreEnsureIndexExtras:
    def test_chroma_count_exception_falls_through_no_index(self):
        """Lines 58-59: collection.count() raises -> falls through, no index -> build_index"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=True,
        )
        mock_collection = MagicMock()
        mock_collection.count.side_effect = RuntimeError("Chroma unavailable")
        store._collection = mock_collection

        with (
            patch.object(Path, 'exists', return_value=False),
            patch.object(LocalVectorStore, 'build_index', return_value=[]) as mock_build,
        ):
            result = store.ensure_index()

        mock_build.assert_called_once_with(force=True)
        assert result == []

    def test_chroma_count_exception_index_exists_loads_and_upserts(self):
        """Lines 58-59: collection.count() raises but index exists -> load + upsert"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=True,
        )
        mock_collection = MagicMock()
        mock_collection.count.side_effect = RuntimeError("Chroma unavailable")
        store._collection = mock_collection

        expected = [DocumentChunk('a', 's', 't', 'c', 'x')]

        with (
            patch.object(Path, 'exists', return_value=True),
            patch.object(LocalVectorStore, '_load_index_file', return_value=expected),
            patch.object(LocalVectorStore, '_upsert_chroma') as mock_upsert,
        ):
            result = store.ensure_index()

        assert result == expected
        mock_upsert.assert_called_once_with(mock_collection, expected)

    def test_chroma_has_items_index_missing_builds_anyway(self):
        """collection.count() > 0 but index_path does NOT exist -> build_index"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=True,
        )
        mock_collection = MagicMock()
        mock_collection.count.return_value = 5
        store._collection = mock_collection

        with (
            patch.object(Path, 'exists', return_value=False),
            patch.object(LocalVectorStore, 'build_index', return_value=[]) as mock_build,
        ):
            store.ensure_index()

        mock_build.assert_called_once_with(force=True)

    def test_chroma_has_items_and_index_exists_returns_cached(self):
        """collection.count() > 0 and index_path exists -> load and return"""
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

    def test_chroma_has_zero_items_and_index_exists_loads_and_upserts(self):
        """collection.count() == 0, index exists -> load and upsert to chroma"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=True,
        )
        mock_collection = MagicMock()
        mock_collection.count.return_value = 0
        store._collection = mock_collection

        expected = [DocumentChunk('a', 's', 't', 'c', 'x')]

        with (
            patch.object(Path, 'exists', return_value=True),
            patch.object(LocalVectorStore, '_load_index_file', return_value=expected),
            patch.object(LocalVectorStore, '_upsert_chroma') as mock_upsert,
        ):
            result = store.ensure_index()

        assert result == expected
        mock_upsert.assert_called_once_with(mock_collection, expected)


class TestLocalVectorStoreBuildIndexExtras:
    def test_upserts_to_chroma_when_collection_available(self):
        """Line 79: build_index with collection -> _upsert_chroma called"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=True,
        )
        mock_collection = MagicMock()
        store._collection = mock_collection

        doc = LoadedDocument(source='test.txt', title='Test', category='legal', text='Some content')
        expected_chunk = DocumentChunk('test.txt:1', 'test.txt', 'Test', 'legal', 'Some content')

        with (
            patch('rag.vectorstore.load_documents', return_value=[doc]),
            patch.object(LocalVectorStore, '_chunk_document', return_value=[expected_chunk]),
            patch.object(LocalVectorStore, '_filter_chunks', side_effect=lambda x: x),
            patch.object(LocalVectorStore, '_write_index_file'),
            patch.object(LocalVectorStore, '_upsert_chroma') as mock_upsert,
        ):
            result = store.build_index(force=True)

        assert len(result) == 1
        mock_upsert.assert_called_once_with(mock_collection, [expected_chunk])


class TestLocalVectorStoreSearchChromaScopes:
    def test_with_scopes_adds_where_clause(self):
        """Lines 191, 197-198: scopes builds sorted $in where clause"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        mock_collection = MagicMock()
        mock_collection.query.return_value = {
            'ids': [[]],
            'documents': [[]],
            'metadatas': [[]],
            'distances': [[]],
        }

        with patch.object(LocalVectorStore, '_get_collection', return_value=mock_collection):
            store._search_chroma('query', top_k=5, scopes={'legal', 'general'})

        kwargs = mock_collection.query.call_args[1]
        assert kwargs['where'] == {'category': {'$in': ['general', 'legal']}}

    def test_without_scopes_no_where_clause(self):
        """Line 191: scopes None -> no where clause"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        mock_collection = MagicMock()
        mock_collection.query.return_value = {
            'ids': [[]],
            'documents': [[]],
            'metadatas': [[]],
            'distances': [[]],
        }

        with patch.object(LocalVectorStore, '_get_collection', return_value=mock_collection):
            store._search_chroma('query', top_k=5, scopes=None)

        kwargs = mock_collection.query.call_args[1]
        assert 'where' not in kwargs


class TestLocalVectorStoreSearchChromaFallback:
    def test_query_exception_returns_empty(self):
        """Lines 200-202: chroma query exception caught -> returns []"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        mock_collection = MagicMock()
        mock_collection.query.side_effect = RuntimeError("ChromaDB error")

        with patch.object(LocalVectorStore, '_get_collection', return_value=mock_collection):
            results = store._search_chroma('query', top_k=5, scopes=None)

        assert results == []

    def test_query_returns_empty_structures(self):
        """Lines 204-207: empty results with or [[]] fallbacks"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        mock_collection = MagicMock()
        mock_collection.query.return_value = {
            'ids': None,
            'documents': None,
            'metadatas': None,
            'distances': None,
        }

        with patch.object(LocalVectorStore, '_get_collection', return_value=mock_collection):
            results = store._search_chroma('query', top_k=5, scopes=None)

        assert results == []


class TestLocalVectorStoreSearchChromaResultProcessing:
    def test_excluded_category_filtered_out(self):
        """Lines 219-220: chroma results with excluded categories skipped"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        mock_collection = MagicMock()
        mock_collection.query.return_value = {
            'ids': [['keep:1', 'exclude:1']],
            'documents': [['good content', 'bad content']],
            'metadatas': [[
                {'source': 'keep.txt', 'title': 'Keep', 'category': 'legal'},
                {'source': 'exclude.txt', 'title': 'Exclude', 'category': 'qa_pairs'},
            ]],
            'distances': [[0.1, 0.2]],
        }

        with patch.object(LocalVectorStore, '_get_collection', return_value=mock_collection):
            results = store._search_chroma('query', top_k=5, scopes=None)

        assert len(results) == 1
        assert results[0][0].chunk_id == 'keep:1'

    def test_metadata_none_uses_defaults(self):
        """Lines 211-218: metadata is None -> defaults used"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        mock_collection = MagicMock()
        mock_collection.query.return_value = {
            'ids': [['chunk:1']],
            'documents': [['content']],
            'metadatas': [[None]],
            'distances': [[0.3]],
        }

        with patch.object(LocalVectorStore, '_get_collection', return_value=mock_collection):
            results = store._search_chroma('query', top_k=5, scopes=None)

        assert len(results) == 1
        chunk = results[0][0]
        assert chunk.source == 'unknown'
        assert chunk.title == 'SafeVixAI Knowledge Base'
        assert chunk.category == 'general'

    def test_distance_conversion_to_score(self):
        """Line 221: distance -> 1/(1+distance) conversion"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        mock_collection = MagicMock()
        mock_collection.query.return_value = {
            'ids': [['a:1']],
            'documents': [['content']],
            'metadatas': [[{'source': 'a.txt', 'title': 'A', 'category': 'legal'}]],
            'distances': [[0.0]],
        }

        with patch.object(LocalVectorStore, '_get_collection', return_value=mock_collection):
            results = store._search_chroma('query', top_k=5, scopes=None)

        assert len(results) == 1
        assert results[0][1] == pytest.approx(1.0)

    def test_content_none_uses_empty_string(self):
        """Line 217: content is None -> empty string"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        mock_collection = MagicMock()
        mock_collection.query.return_value = {
            'ids': [['a:1']],
            'documents': [[None]],
            'metadatas': [[{'source': 'a.txt', 'title': 'A', 'category': 'legal'}]],
            'distances': [[0.5]],
        }

        with patch.object(LocalVectorStore, '_get_collection', return_value=mock_collection):
            results = store._search_chroma('query', top_k=5, scopes=None)

        assert len(results) == 1
        assert results[0][0].content == ''


class TestLocalVectorStoreUpsertChroma:
    def test_empty_chunks_returns_early(self):
        """Line 169: empty chunks -> returns without calling upsert"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        mock_collection = MagicMock()
        store._upsert_chroma(mock_collection, [])
        mock_collection.upsert.assert_not_called()

    def test_upsert_exception_caught(self):
        """Lines 177-178: upsert exception caught and logged"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        mock_collection = MagicMock()
        mock_collection.upsert.side_effect = RuntimeError("ChromaDB disk full")

        chunks = [DocumentChunk('a:1', 'a.txt', 'A', 'legal', 'content')]
        store._upsert_chroma(mock_collection, chunks)
        mock_collection.upsert.assert_called_once()

    def test_upsert_correct_arguments(self):
        """Lines 172-176: upsert called with correct ids, documents, metadatas"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        mock_collection = MagicMock()

        chunks = [
            DocumentChunk('a:1', 'a.txt', 'A', 'legal', 'content a'),
            DocumentChunk('b:1', 'b.txt', 'B', 'general', 'content b'),
        ]
        store._upsert_chroma(mock_collection, chunks)

        mock_collection.upsert.assert_called_once_with(
            ids=['a:1', 'b:1'],
            documents=['content a', 'content b'],
            metadatas=[
                {'source': 'a.txt', 'title': 'A', 'category': 'legal'},
                {'source': 'b.txt', 'title': 'B', 'category': 'general'},
            ],
        )


class TestLocalVectorStoreStatsExtras:
    def test_chroma_count_failure_logged(self):
        """Lines 131-132: collection.count() exception -> chroma_chunks stays 0"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=True,
        )
        store._chunks = [DocumentChunk('a:1', 'a.txt', 'A', 'legal', 'x')]
        mock_collection = MagicMock()
        mock_collection.count.side_effect = RuntimeError("Chroma count failed")
        store._collection = mock_collection

        result = store.stats()
        assert result['chunks'] == 1
        assert result['chroma_chunks'] == 0


class TestLocalVectorStoreGetCollectionExtras:
    def test_chromadb_import_fails_returns_none(self):
        """Lines 156-158: chromadb import fails -> returns None"""
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

    def test_persistent_client_creation_fails_returns_none(self):
        """Lines 156-158: PersistentClient raises -> returns None"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=True,
        )
        store._collection = None

        mock_chromadb = MagicMock()
        mock_chromadb.PersistentClient.side_effect = Exception("Failed to create client")

        with (
            patch.dict('sys.modules', {'chromadb': mock_chromadb}),
            patch.object(Path, 'mkdir'),
        ):
            result = store._get_collection()
        assert result is None


class TestLocalVectorStoreSearchExtras:
    def test_lexical_search_with_scopes_filters_excluded_and_scopes(self):
        """search() lexical path: scopes filter applied + excluded categories"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        store._chunks = [
            DocumentChunk('a:1', 'a.txt', 'A', 'legal', 'helmet fine'),
            DocumentChunk('b:1', 'b.txt', 'B', 'general', 'hello world'),
            DocumentChunk('c:1', 'c.txt', 'C', 'qa_pairs', 'q: what?'),
        ]

        with (
            patch.object(LocalVectorStore, '_search_chroma', return_value=[]),
            patch('rag.vectorstore.score_query', side_effect=lambda q, c: 1.0),
        ):
            results = store.search('helmet', top_k=5, scopes={'legal'})

        assert len(results) == 1
        assert results[0][0].chunk_id == 'a:1'

    def test_lexical_search_no_scopes_includes_all_non_excluded(self):
        """search() lexical path: scopes None includes all non-excluded categories"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )
        store._chunks = [
            DocumentChunk('a:1', 'a.txt', 'A', 'legal', 'fine rules'),
            DocumentChunk('b:1', 'b.txt', 'B', 'general', 'general info'),
        ]

        with (
            patch.object(LocalVectorStore, '_search_chroma', return_value=[]),
            patch('rag.vectorstore.score_query', return_value=1.0),
        ):
            results = store.search('fine', top_k=5, scopes=None)

        assert len(results) == 2


class TestLocalVectorStoreLoadIndexFileExtras:
    def test_no_filter_needed_returns_all(self):
        """_load_index_file: same number after filtering -> no rewrite"""
        store = LocalVectorStore(
            persist_dir=Path('/fake/persist'),
            data_dir=Path('/fake/data'),
            embedding_model='hash',
            use_chroma=False,
        )

        raw_json = '[{"chunk_id":"a:1","source":"a.txt","title":"A","category":"legal","content":"x"}]'
        mock_index = MagicMock(spec=Path)
        mock_index.read_text.return_value = raw_json
        store.index_path = mock_index

        with patch.object(LocalVectorStore, '_write_index_file') as mock_write:
            result = store._load_index_file()

        assert len(result) == 1
        mock_write.assert_not_called()

    def test_filter_removes_some_rewrites_file(self):
        """_load_index_file: excluded removed -> triggers _write_index_file"""
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

        with patch.object(LocalVectorStore, '_write_index_file') as mock_write:
            result = store._load_index_file()

        assert len(result) == 1
        assert result[0].chunk_id == 'keep:1'
        mock_write.assert_called_once()
