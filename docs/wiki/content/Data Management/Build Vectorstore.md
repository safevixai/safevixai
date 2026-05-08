```markdown
# build_vectorstore.py

## Overview

This module is responsible for building and maintaining the vectorstore used for Retrieval-Augmented Generation (RAG) within the SafeVixAI platform. It leverages a local vector store implementation to index and store data from a specified directory, enabling efficient similarity search for the chatbot functionality. The module rebuilds the index, optionally forcing a complete refresh of the data.

## Architecture

This module sits within the Data Management section of the SafeVixAI platform. It is a standalone script that is typically executed as part of a data pipeline or initialization process. It interacts with the `LocalVectorStore` class from the `rag.vectorstore` module to create and manage the vector index. The resulting vectorstore is then used by the chatbot service to retrieve relevant information based on user queries. It utilizes the `config` module to access application settings, including the persistence directory for the vectorstore and the directory containing the data to be indexed.

## Key Classes/Functions

| Name | Parameters | Return | Description |
|---|---|---|---|
| `main()` | None | None | The main function that orchestrates the vectorstore building process. It retrieves settings, instantiates a `LocalVectorStore`, builds the index (optionally forcing a rebuild), and prints statistics about the vectorstore. |

## Dependencies

```python
from __future__ import annotations
from config import get_settings
from rag.vectorstore import LocalVectorStore
```

## Configuration

The module relies on environment variables and settings defined in the `config.py` file. Specifically, it uses the following settings:

*   `settings.chroma_persist_dir`:  The directory where the vectorstore's persistent data is stored.
*   `settings.rag_data_dir`: The directory containing the data files to be indexed by the vectorstore.

These settings are loaded using the `get_settings()` function from the `config` module.

## Usage Examples

```python
from __future__ import annotations

from config import get_settings
from rag.vectorstore import LocalVectorStore


def main() -> None:
    settings = get_settings()
    vectorstore = LocalVectorStore(settings.chroma_persist_dir, settings.rag_data_dir)
    vectorstore.build_index(force=True)
    print(vectorstore.stats())


if __name__ == '__main__':
    main()
```

This script, when executed, will:

1.  Load the application settings.
2.  Instantiate a `LocalVectorStore` object, pointing to the configured persistence and data directories.
3.  Build the vector index, forcing a rebuild of the index regardless of its current state.
4.  Print statistics about the vectorstore (e.g., number of documents indexed).

## Error Handling

The `LocalVectorStore` class handles potential errors during index building (e.g., file access issues, data parsing errors).  The `main()` function itself does not include specific error handling; any exceptions raised by the `LocalVectorStore` methods will propagate up to the calling environment.  The `LocalVectorStore` implementation should include robust error handling.

## Related Modules

*   `config.py`:  Provides access to application settings, including the directories used by this module.
*   `rag.vectorstore`:  Contains the `LocalVectorStore` class, which provides the core functionality for building and managing the vector index.
```
