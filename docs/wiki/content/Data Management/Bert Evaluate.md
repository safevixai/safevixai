```markdown
# `bert_evaluate.py` - BERT Model Evaluation

## Overview

This module evaluates a pre-trained BERT model on a multiple-choice question answering (MCQA) dataset. It loads the dataset from a CSV file, preprocesses the data using a specified tokenizer, runs inference using the BERT model, and saves the predictions to a new CSV file. The module supports different BERT models and allows for customization of batch size and maximum sequence length.

## Architecture

This module is part of the data management pipeline within the SafeVixAI platform, specifically designed for evaluating the performance of BERT-based models on MCQA datasets. It takes a CSV file containing question-answer pairs as input, preprocesses the data for the BERT model, runs inference, and saves the results. It integrates with the `MCQADataset` class for dataset loading and utilizes the Hugging Face `transformers` library for model loading, tokenization, and inference. The module is designed to be run as a standalone script, taking model name and CSV path as command-line arguments.

## Key Classes/Functions

| Name | Parameters | Return | Description |
|---|---|---|---|
| `process_batch` | `batch`, `tokenizer`, `max_len` | `tokenized_batch`, `torch.tensor(labels)` | Preprocesses a batch of data for the BERT model. It tokenizes the question and options, pads them to a maximum length, and converts them into tensors. |
| `create_dataloader` | `dataset`, `tokenizer`, `batch_size`, `max_len` | `test_dataloader` | Creates a PyTorch `DataLoader` for the given dataset, tokenizer, batch size, and maximum sequence length. It uses a `SequentialSampler` for evaluation. |
| `run_inference` | `model`, `dataloader` | `predictions` | Runs inference on the given data loader using the provided model. It iterates through the dataloader, performs a forward pass, and returns a list of predicted answer indices. |
| `evaluate` | `inference_model`, `tokenizer`, `experiment_folder`, `csv_path`, `batch_size`, `max_len` | None | Orchestrates the evaluation process. It loads the dataset, creates the dataloader, runs inference, and saves the predictions to a CSV file. |
| `if __name__ == "__main__":` | `--model`, `--csv_path` | None | The main execution block. Parses command-line arguments, loads the model and tokenizer, sets up the experiment folder, and calls the `evaluate` function. |

## Dependencies

```python
import sys
sys.path.append("..")

import re
import argparse
import pandas as pd
from torch.utils.data import DataLoader, SequentialSampler
from transformers import AutoTokenizer,AutoModelForMultipleChoice
import functools
import torch
from tqdm import tqdm
import os
from pathlib import Path
from sft.dataset import MCQADataset
from pprint import pprint
```

## Configuration

*   **`device`**:  Determines whether to use "cuda" (GPU) if available, otherwise "cpu".
*   **Command-line arguments**:
    *   `--model`: Specifies the name of the pre-trained BERT model (e.g., "bert-base-uncased"). Default is "bert-base-uncased".
    *   `--csv_path`: Specifies the path to the CSV file containing the MCQA dataset. This argument is required.
*   **Constants**:
    *   `batch_size`: Default batch size for inference (32).
    *   `max_len`: Maximum sequence length for tokenization (192).

## Usage Examples

```python
# Example usage from the command line:
# python bert_evaluate.py --model bert-base-uncased --csv_path data/qa_pairs/my_dataset.csv

# Example of how the evaluate function is called within the script:
# evaluate(inference_model, tokenizer, experiment_folder, cmd_args.csv_path)
```

## Error Handling

*   The `process_batch` function includes a `try-except` block to catch potential errors during tokenization. If an error occurs, it prints the problematic batch and exits the program.
*   The script checks for CUDA availability and defaults to CPU if a GPU is not found.

## Related Modules

*   `sft.dataset.MCQADataset`: Used for loading and preparing the MCQA dataset.
*   Hugging Face `transformers` library: Provides the `AutoTokenizer` and `AutoModelForMultipleChoice` classes for loading and using pre-trained BERT models.
*   PyTorch: Used for tensor operations, model training, and data loading.
*   `pandas`: Used for reading and writing CSV files.
*   `argparse`: Used for parsing command-line arguments.
