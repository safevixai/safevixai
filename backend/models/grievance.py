# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Grievance(Base):
    """Civic grievances from CPGRAMS + all state PGRS portals — pan-India."""

    __tablename__ = 'grievances'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True,
        comment='cpgrams, tn_pgrs, ap_pgrs, meekosam, ka_cm_helpline, mh_samadhan, up_jansunwai',
    )
    grievance_ref: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True,
        comment='road_damage, traffic, streetlight, drainage, other',
    )
    subcategory: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    complainant_district: Mapped[str | None] = mapped_column(Text, nullable=True)
    state_code: Mapped[str | None] = mapped_column(String(2), nullable=True, index=True)
    location: Mapped[str | None] = mapped_column(
        Geometry(geometry_type='POINT', srid=4326, spatial_index=True),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default='pending',
        comment='pending, forwarded, in_progress, resolved, closed',
    )
    filed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ministry: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False,
    )
