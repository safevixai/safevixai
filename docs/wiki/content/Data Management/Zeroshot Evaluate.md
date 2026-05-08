# `zeroshot_evaluate.py` - Zero-Shot Evaluation of LLMs on Multiple-Choice Questions

## Overview

This module evaluates the performance of Large Language Models (LLMs) on multiple-choice questions in a zero-shot setting. It takes a CSV file containing question-answer pairs, formats the questions with a predefined prompt, and uses a specified LLM to generate answers and justifications. The results, including the LLM's predictions and justifications, are logged to a CSV file for analysis.

## Architecture

This module is part of the data management component within the SafeVixAI platform. It sits within the `data/chatbot_service/data/qa_pairs/mhqa-main/benchmarking` directory. It leverages LLM models (OpenAI GPT and Hugging Face API models) to perform inference on multiple-choice questions. The module utilizes a `CsvLogger` for storing the evaluation results and employs multithreading to parallelize the evaluation process. The results are stored in a CSV file, enabling performance analysis.

## Key Classes/Functions

| Name | Parameters | Return | Description |
|---|---|---|---|
| `extract_answer_justification(s: str)` | `s: str` - The generated text from the LLM. | `(correct_option, justification)` - A tuple containing the predicted correct option (integer) and the justification (string). | Extracts the predicted answer and justification from the LLM's generated text using regular expressions. |
| `run_inference(model: BaseModel, df: pd.DataFrame)` | `model: BaseModel` - The LLM model to use for inference. `df: pd.DataFrame` - A Pandas DataFrame containing the multiple-choice questions. | `outputs` - A list of lists, where each inner list contains the predicted answer, justification, and raw generated text. | Iterates through the DataFrame, formats each question with the prompt, calls the LLM's `generate_text` method, and extracts the answer and justification. |
| `evaluate(model, batch, reslog)` | `model` - The LLM model. `batch` - A Pandas DataFrame containing a batch of questions. `reslog` - An instance of `CsvLogger` for logging results. | None | Runs inference on a batch of questions, logs the results to the CSV file using the `CsvLogger`. |
| `if __name__ == "__main__":` |  `--model` (str), `--csv_path` (str) | None | The main execution block. Parses command-line arguments, initializes the LLM model, reads the input CSV, sets up the result logger, and runs the evaluation in parallel using a thread pool. |

## Dependencies

```python
import sys
sys.path.append(".") # Adds the current directory to the Python path.
import re
import argparse
from pathlib import Path
from threading import Lock
from concurrent.futures import ThreadPoolExecutor

import torch
import pandas as pd
from tqdm import tqdm

from model import BaseModel, OpenAIGPT, HFApiModel
from logger import CsvLogger
```

## Configuration

*   **`prompt`**: A string defining the prompt used to format the multiple-choice questions for the LLM.
*   **`openai_model_names`**: A list of strings containing the names of the OpenAI GPT models supported.
*   **`csv_lock`**: A `threading.Lock` object used to synchronize access to the CSV file during logging.
*   **Command-line arguments**:
    *   `--model`: Specifies the name of the LLM model to use.
    *   `--csv_path`: Specifies the path to the CSV file containing the multiple-choice questions.
*   **`device`**:  Determines the device to use for model inference ("cuda" if CUDA is available, otherwise "cpu").
*   **`batch_size`**: The number of questions to process in each batch (set to 2).
*   **Logging**: Results are logged to a directory structure under `./logs/`. The experiment name is derived from the model name and the input CSV path.

## Usage Examples

```python
# Example command-line usage:
# python zeroshot_evaluate.py --model gpt-4o --csv_path data/qa_pairs/mhqa-main/benchmarking/test_questions.csv

# Example of how the model is initialized:
if cmd_args.model in openai_model_names:
    print("Using OpenAI GPT model")
    model = OpenAIGPT(cmd_args.model, device)
else:
    print("Using HuggingFace model")
    model = HFApiModel(cmd_args.model, device)

# Example of how the evaluation is run:
with ThreadPoolExecutor(max_workers=32) as executor:
    futures = []
    for i in range(0, len(df), batch_size):
        batch = df.iloc[i:i+batch_size]
        futures.append(executor.submit(evaluate, model, batch, result_logger))
    for future in tqdm(futures):
        future.result()
```

## Error Handling

*   The code does not explicitly handle errors within the `run_inference` or `evaluate` functions. Errors during LLM generation or file I/O could potentially lead to program termination.
*   The `extract_answer_justification` function handles cases where the LLM does not provide an answer or justification by returning `None`.
*   The code relies on the `model` class's `generate_text` method for handling model-specific errors.

## Related Modules

*   `model.py`: Contains the `BaseModel`, `OpenAIGPT`, and `HFApiModel` classes, which provide the interface for interacting with the LLMs.
*   `logger.py`: Contains the `CsvLogger` class, responsible for logging the evaluation results to a CSV file.
