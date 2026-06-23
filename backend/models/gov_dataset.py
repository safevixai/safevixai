# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class GovDataset(Base):
    """Data.gov.in ingested records — road accidents, traffic violations, PMGSY, etc."""

    __tablename__ = 'gov_datasets'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    dataset_slug: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    resource_id: Mapped[str] = mapped_column(String(128), nullable=False)
    year: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    state_code: Mapped[str | None] = mapped_column(String(2), nullable=True, index=True)
    district_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    metric_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    metric_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False,
    )
