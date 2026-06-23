# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

"""Civic Intelligence ETL service layer — pan-India data pipeline."""

from .base_ingestor import BaseIngestor
from .etl_scheduler import ETLScheduler

__all__ = ['BaseIngestor', 'ETLScheduler']
