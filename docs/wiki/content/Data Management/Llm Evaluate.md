```markdown
# llm_evaluate.py Module Documentation

## Overview

The `llm_evaluate.py` module is designed to evaluate the difficulty of multiple-choice questions (MCQs) using Large Language Models (LLMs). It takes a CSV file containing MCQs as input, constructs prompts for the LLMs, and parses the LLM's responses to determine the difficulty level (Easy, Medium, or Hard) of each question. The results, including the LLM's responses, are logged to a CSV file.

## Architecture

This module is part of the SafeVixAI platform, specifically within the data management section. It interacts with various LLM providers (9 supported, including OpenAI models and HF API models) to assess the difficulty of MCQs. The module utilizes a `BaseModel` class and its subclasses (`OpenAIGPT`, `HFApiModel`) to interface with the LLMs. It leverages threading and batch processing for efficiency. The results are stored in a CSV file, and the module uses a `CsvLogger` for logging. The module is designed to be run as a standalone script, taking a CSV file path and model name as command-line arguments.

## Key Classes/Functions

| Name | Parameters | Return | Description |
|---|---|---|---|
| `extract_ids_question_difficulty(s: str)` | `s: str` (LLM response string) | `tuple(list, list, list)` (IDs, questions, difficulties) | Extracts question IDs, questions, and difficulty levels from the LLM's response string using regular expressions. |
| `build_prompt(batch: pd.DataFrame)` | `batch: pd.DataFrame` (DataFrame of MCQ data) | `str` (Prompt string) | Constructs the prompt for the LLM, formatting the MCQs into the required input format. |
| `run_inference(model: BaseModel, df: pd.DataFrame)` | `model: BaseModel`, `df: pd.DataFrame` (DataFrame of MCQ data) | `tuple(list, str)` (List of difficulty/response pairs, full response) | Sends the prompt to the LLM, receives the response, and parses the response to extract the difficulty levels. |
| `evaluate(model, batch, reslog)` | `model: BaseModel`, `batch: pd.DataFrame`, `reslog: CsvLogger` | `None` | Executes the evaluation process for a given batch of MCQs using the specified LLM. Logs the results to the CSV file using the provided `CsvLogger`. |
| `if __name__ == "__main__":` |  |  |  The main execution block, handles command-line arguments, loads the CSV, initializes the model, and calls the evaluate function. |

## Dependencies

```python
import sys
sys.path.append(".")

from logger import CsvLogger
import re, argparse
from pathlib import Path
from threading import Lock
from concurrent.futures import ThreadPoolExecutor

from  itertools import zip_longest

import torch
import pandas as pd
from tqdm import tqdm

from model import BaseModel, OpenAIGPT, HFApiModel
```

## Configuration

*   **`openai_model_names`**: A list of strings representing the names of OpenAI models supported by the script: `["gpt-4o-mini", "gpt-3.5-turbo", "gpt-4o"]`.
*   **`prompt`**: A multiline string containing the prompt template used to instruct the LLM. This includes instructions, input format, and output format.
*   **`csv_lock`**: A `threading.Lock` object used to synchronize access to the CSV file during logging.
*   **Command-line arguments**:
    *   `--model`: Specifies the model name to use (e.g., "gpt-4o").  Required.
    *   `--csv_path`: Specifies the path to the input CSV file containing the MCQs. Required.

## Usage Examples

```python
# Example usage (within the if __name__ == "__main__": block)

    parser = argparse.ArgumentParser(description='Evaluate LLM model on multiple choice questions')
    parser.add_argument('--model', type=str, required=True, help='Model name w.r.t the service')
    parser.add_argument("--csv_path", help="path to the csv file", required=True)

    cmd_args = parser.parse_args()

    input_csv_path = Path(cmd_args.csv_path)
    # Assuming you have a CSV file at the specified path
    # and a model instance initialized.
    # Example:
    # model = OpenAIGPT(model_name=cmd_args.model) # or HFApiModel or other BaseModel subclass
    # df = pd.read_csv(input_csv_path)
    # reslog = CsvLogger(output_csv_path) # Assuming output_csv_path is defined
    # evaluate(model, df, reslog)
```

## Error Handling

*   The code uses `try-except` blocks (not explicitly shown in the provided code snippet) within the `run_inference` function to handle potential errors during LLM API calls.
*   The `extract_ids_question_difficulty` function uses regular expressions, which can fail if the LLM's response doesn't match the expected format.
*   The code includes basic logging using `CsvLogger`, which can help in identifying and debugging issues.

## Related Modules

*   `logger.py`:  Provides the `CsvLogger` class for logging results to a CSV file.
*   `model.py`: Defines the `BaseModel` class and its subclasses (`OpenAIGPT`, `HFApiModel`) for interacting with different LLM providers.
*   `pandas`: Used for data manipulation and handling the CSV data.
*   `torch`: Potentially used by the `HFApiModel` or other model implementations.
*   `tqdm`: Used for displaying progress bars during processing.
*   `threading`: Used for thread safety.
*   `concurrent.futures`: Used for parallel processing.
*   `argparse`: Used for parsing command-line arguments.
*   `pathlib`: Used for handling file paths.
*   `itertools`: Used for iterating.
