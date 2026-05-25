"""Sample random RAG chunks for human quality review."""
import os
import random

CHROMA_PATH = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma_db")
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "safevixai_rag")


def audit_chunks():
    import chromadb

    client = chromadb.PersistentClient(path=CHROMA_PATH)
    col = client.get_collection(COLLECTION_NAME)
    count = col.count()
    print(f"Total chunks: {count}")

    all_data = col.get(limit=count)
    if not all_data.get("documents"):
        print("No documents found")
        return

    indices = random.sample(range(len(all_data["documents"])), min(5, count))
    for i in indices:
        doc = all_data["documents"][i]
        meta = all_data["metadatas"][i] if all_data.get("metadatas") else {}
        print(f"\n{'='*60}")
        print(f"CHUNK {i}")
        print(f"Source: {meta.get('source_file', 'unknown')}")
        print(f"Section: {meta.get('section', 'unknown')}")
        print(f"Category: {meta.get('category', 'unknown')}")
        print(f"{'='*60}")
        print(doc[:300])
        print("...")


if __name__ == "__main__":
    audit_chunks()
