# `evaluate.py` Module - SafeVixAI

## Overview

The `evaluate.py` module is designed to evaluate the performance of a multiple-choice question answering (MCQA) model within the SafeVixAI platform. It loads a pre-trained `MCQAModel` from a checkpoint, processes a test dataset, generates predictions, and calculates a classification report to assess the model's accuracy and performance. The results, including the predictions and the classification report, are then saved for analysis.

## Architecture

This module resides within the `data/chatbot_service/data/qa_pairs/mhqa-main/sft/` directory and is a crucial component of the SafeVixAI's data management pipeline for evaluating the chatbot's question-answering capabilities. It interacts with the `MCQAModel` (defined elsewhere, likely in `model.py`) and `MCQADataset` (defined in `dataset.py`) to perform inference and evaluation. It leverages PyTorch for model execution and scikit-learn for generating the classification report. The module utilizes a Next.js frontend, a FastAPI backend, and Supabase for authentication. The data is managed using a LocalHashEmbeddingFunction (SHA-256) for data integrity.

## Key Classes/Functions

| Name | Parameters | Return | Description |
|---|---|---|---|
| `process_batch` | `batch` (list), `tokenizer` (tokenizer object), `max_len` (int, default: 32) | `tokenized_batch` (dict of tensors), `torch.LongTensor` (labels) | Processes a batch of data from the dataset. It expands each question-option pair, tokenizes the expanded batch using the provided tokenizer, and returns the tokenized input and corresponding labels as PyTorch tensors. |
| `get_dataloader` | `dataset` (MCQADataset object), `tokenizer` (tokenizer object), `args` (dict) | `test_dataloader` (DataLoader object) | Creates a PyTorch `DataLoader` for the test dataset. It uses a `SequentialSampler` and a custom `model_collate_fn` (which is `process_batch`) to prepare the data for batch processing. The `num_workers` is set to 95. |
| `run_inference` | `model` (MCQAModel object), `dataloader` (DataLoader object), `args` (dict) | `predictions` (list of ints) | Runs inference on the provided `dataloader` using the given `model`. It iterates through the dataloader, performs a forward pass, and extracts the predicted class indices. It returns a list of predicted class indices. |
| `if __name__ == "__main__":` |  `--ckpt_path` (str), `--csv_path` (str) | None | The main execution block. It parses command-line arguments for the checkpoint path and CSV path. It loads the model, creates the dataset and dataloader, runs inference, saves the predictions to a CSV, and generates a classification report. |

## Dependencies

```python
import functools
import sys
sys.path.append(".")

from argparse import ArgumentParser
from pathlib import Path
import pandas as pd
import torch
from tqdm import tqdm
from torch.utils.data import DataLoader, SequentialSampler
from model import MCQAModel
from dataset import MCQADataset
from sklearn.metrics import classification_report
```

## Configuration

The module uses command-line arguments for configuration:

*   `--ckpt_path`:  Path to the model checkpoint file (string).
*   `--csv_path`: Path to the CSV file containing the test data (string).

Internal configuration:

*   `batch_size`: 32
*   `max_len`: 192
*   `device`: "cuda" (specifies the device to run the model on)
*   `num_workers`: 95 (for the dataloader)

The results are saved to a directory structure under `./logs/` based on the checkpoint path's parent directory.

## Usage Examples

```bash
python evaluate.py --ckpt_path /path/to/your/checkpoint.ckpt --csv_path /path/to/your/test_data.csv
```

This command will:

1.  Load the model from `/path/to/your/checkpoint.ckpt`.
2.  Load the test data from `/path/to/your/test_data.csv`.
3.  Run inference on the test data.
4.  Save the predictions to a CSV file (e.g., `./logs/checkpoint_parent_dir/test_results.csv`).
5.  Generate a classification report and save it to a text file (e.g., `./logs/checkpoint_parent_dir/classification_report.txt`).

## Error Handling

*   The code assumes the existence of the checkpoint file and the CSV file specified by the command-line arguments. It does not explicitly handle file not found errors.
*   The code assumes the `MCQAModel` and `MCQADataset` are correctly defined and accessible.
*   The code implicitly relies on the model's `tokenizer` being available and compatible with the input data.
*   The code assumes that the test data CSV has columns named `correct_option_number`.

## Related Modules

*   `model.py`: Defines the `MCQAModel` class, which is loaded and used for inference.
*   `dataset.py`: Defines the `MCQADataset` class, which is used to load and preprocess the test data.
