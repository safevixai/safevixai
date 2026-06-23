# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

from pathlib import Path

import pytest

from rag.retriever import Retriever
from rag.vectorstore import LocalVectorStore


@pytest.fixture
def populated_store(tmp_path: Path) -> LocalVectorStore:
    data_dir = tmp_path / "data"
    legal_dir = data_dir / "legal"
    medical_dir = data_dir / "medical"
    legal_dir.mkdir(parents=True)
    medical_dir.mkdir(parents=True)
    (legal_dir / "mv_act.md").write_text(
        "Motor Vehicles Act helmet fine and challan guidance for Indian road safety.",
        encoding="utf-8",
    )
    (legal_dir / "traffic_rules.md").write_text(
        "Traffic signals, speed limits, and road signs as per Indian regulations.",
        encoding="utf-8",
    )
    (medical_dir / "first_aid.md").write_text(
        "First aid procedures for road accident victims including CPR and bleeding control.",
        encoding="utf-8",
    )
    store = LocalVectorStore(
        tmp_path / "index",
        data_dir,
        embedding_model="safevixai-local-hash",
        use_chroma=False,
    )
    return store


def test_retriever_returns_legal_context_from_repo_data(populated_store: LocalVectorStore):
    retriever = Retriever(populated_store, default_top_k=3, min_score=0.0)
    results = retriever.retrieve("motor vehicles act helmet fine", scopes={"legal"})
    assert results
    assert len(results) > 0
    assert any("legal/" in item.source for item in results)


def test_retriever_filters_weak_matches(populated_store: LocalVectorStore):
    retriever = Retriever(populated_store, default_top_k=3, min_score=999.0)
    results = retriever.retrieve("motor vehicles act helmet fine", scopes={"legal"})
    assert results == []


def test_retriever_returns_empty_for_empty_query(populated_store: LocalVectorStore):
    retriever = Retriever(populated_store, default_top_k=3, min_score=0.0)
    results = retriever.retrieve("", scopes={"legal"})
    assert results == []


def test_retriever_filters_by_scope(populated_store: LocalVectorStore):
    retriever = Retriever(populated_store, default_top_k=5, min_score=0.0)
    results = retriever.retrieve("first aid", scopes={"medical"})
    assert results
    assert all("medical/" in item.source for item in results)


def test_retriever_env_var_min_score(populated_store: LocalVectorStore, monkeypatch):
    monkeypatch.setenv("RAG_MIN_SCORE", "0.99")
    retriever = Retriever(populated_store, default_top_k=3)
    assert retriever.min_score == 0.99


def test_retriever_default_min_score(populated_store: LocalVectorStore, monkeypatch):
    monkeypatch.delenv("RAG_MIN_SCORE", raising=False)
    retriever = Retriever(populated_store, default_top_k=3)
    assert retriever.min_score == 0.55


def test_retriever_top_k_override(populated_store: LocalVectorStore):
    retriever = Retriever(populated_store, default_top_k=5, min_score=0.0)
    results = retriever.retrieve("motor vehicles act", top_k=1)
    assert len(results) <= 1


def test_retriever_no_matching_scope(populated_store: LocalVectorStore):
    retriever = Retriever(populated_store, default_top_k=3, min_score=0.0)
    results = retriever.retrieve("motor vehicles act helmet fine", scopes={"nonexistent"})
    assert results == []
