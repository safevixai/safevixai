```markdown
# `split.py` - Dataset Splitting Module

## Overview

The `split.py` module provides functionality to split a CSV dataset into training, validation, and test sets. It utilizes the `pandas` and `sklearn` libraries to read the CSV, perform stratified splitting based on the `correct_option_num` column, and save the resulting splits to separate CSV files. This module is crucial for preparing data for training and evaluating the performance of AI models within the SafeVixAI platform.

## Architecture

This module resides within the `data/chatbot_service/data/qa_pairs/mhqa-main/sft/scripts/` directory, indicating its role in the data preparation pipeline for the chatbot service, specifically for the fine-tuning (SFT) process. It takes a single CSV file as input, splits it into three distinct datasets, and outputs three new CSV files. The module is designed to be run as a standalone script. It interacts directly with the local file system to read and write CSV files.

## Key Classes/Functions

