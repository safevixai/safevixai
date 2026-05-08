from __future__ import annotations

from pathlib import Path

from rag.retriever import Retriever
from rag.vectorstore import LocalVectorStore


def test_retriever_returns_legal_context_from_repo_data(tmp_path: Path):
    data_dir = tmp_path / 'data'
    legal_dir = data_dir / 'legal'
    legal_dir.mkdir(parents=True)
    (legal_dir / 'mv_act.md').write_text(
        'Motor Vehicles Act helmet fine and challan guidance for Indian road safety.',
        encoding='utf-8',
    )
    store = LocalVectorStore(
        tmp_path / 'index',
        data_dir,
        embedding_model='safevixai-local-hash',
        use_chroma=False,
    )
    retriever = Retriever(store, default_top_k=3)

    results = retriever.retrieve('motor vehicles act helmet fine', scopes={'legal'})

    assert results
    assert any('legal/' in item.source for item in results)


def test_retriever_filters_weak_matches(tmp_path: Path):
    data_dir = tmp_path / 'data'
    legal_dir = data_dir / 'legal'
    legal_dir.mkdir(parents=True)
    (legal_dir / 'mv_act.md').write_text(
        'Motor Vehicles Act helmet fine and challan guidance for Indian road safety.',
        encoding='utf-8',
    )
    store = LocalVectorStore(
        tmp_path / 'index',
        data_dir,
        embedding_model='safevixai-local-hash',
        use_chroma=False,
    )
    retriever = Retriever(store, default_top_k=3, min_score=999.0)

    results = retriever.retrieve('motor vehicles act helmet fine', scopes={'legal'})

    assert results == []
