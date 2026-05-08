```markdown
# `shuffle.py` - Option Shuffling for Question Answering Data

## Overview

The `shuffle.py` module is designed to randomize the order of answer options within a question-answering dataset. It takes a CSV file containing question-answer pairs, shuffles the order of the answer options for each question, and updates the `correct_option_num` column to reflect the new position of the correct answer. This module is crucial for preventing bias in model training by ensuring that the correct answer does not consistently appear in the same position.

## Architecture

This module is part of the data preparation pipeline for the SafeVixAI chatbot service. It operates on the raw question-answering data, specifically within the `data/chatbot_service/data/qa_pairs/mhqa-main/sft/scripts` directory. The module reads a CSV file, shuffles the answer options, and outputs a new CSV file with the shuffled data. It integrates with the larger data management system to prepare the dataset for fine-tuning the LLMs used by the chatbot.

## Key Classes/Functions

