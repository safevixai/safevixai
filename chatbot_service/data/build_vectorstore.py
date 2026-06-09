from __future__ import annotations

import sys
from pathlib import Path

CHATBOT_DIR = Path(__file__).resolve().parent.parent
if str(CHATBOT_DIR) not in sys.path:
    sys.path.insert(0, str(CHATBOT_DIR))

from config import get_settings
from rag.vectorstore import LocalVectorStore


def main() -> None:
    settings = get_settings()
    vectorstore = LocalVectorStore(settings.chroma_persist_dir, settings.rag_data_dir)
    vectorstore.build_index(force=True)
    print(vectorstore.stats())


if __name__ == '__main__':
    main()
