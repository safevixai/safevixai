# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

"""Verify ChromaDB RAG is populated and queryable."""
import os
import sys

CHROMA_PATH = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma_db")
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "safevixai_rag")


def verify_rag():
    try:
        import chromadb
    except ImportError:
        print("FAIL: chromadb not installed")
        sys.exit(1)

    client = chromadb.PersistentClient(path=CHROMA_PATH)
    try:
        col = client.get_collection(COLLECTION_NAME)
    except Exception as e:
        print(f"FAIL: Collection '{COLLECTION_NAME}' not found: {e}")
        sys.exit(1)

    count = col.count()
    print(f"Documents in ChromaDB: {count}")

    if count == 0:
        print("FAIL: ChromaDB is empty")
        sys.exit(1)

    results = col.query(query_texts=["road accident first aid"], n_results=1)
    if results.get("documents") and results["documents"][0]:
        doc = results["documents"][0][0]
        dist = results["distances"][0][0] if results.get("distances") else "N/A"
        print(f"Sample document: {doc[:100]}...")
        print(f"Distance: {dist}")
    else:
        print("WARNING: Query returned no results")

    print(f"PASS: RAG is healthy ({count} documents)")
    return True


if __name__ == "__main__":
    verify_rag()
