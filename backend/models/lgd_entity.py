from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class LGDEntity(Base):
    """Local Government Directory entity — hierarchical Indian admin structure."""

    __tablename__ = 'lgd_entities'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    lgd_code: Mapped[int] = mapped_column(Integer, unique=True, nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True,
        comment='state, district, subdistrict, block, ulb, gp, village',
    )
    name_en: Mapped[str] = mapped_column(Text, nullable=False)
    name_local: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_lgd_code: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    state_code: Mapped[str] = mapped_column(String(2), nullable=False, index=True)
    census_code_2011: Mapped[str | None] = mapped_column(String(16), nullable=True)
    population_census_2011: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow(), nullable=False,
    )
