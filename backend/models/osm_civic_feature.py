# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

from __future__ import annotations

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import BigInteger, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class OSMCivicFeature(Base):
    """OSM civic infrastructure features — streetlights, signals, bus stops, etc."""

    __tablename__ = 'osm_civic_features'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    osm_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    feature_type: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True,
        comment='streetlight, traffic_signal, bus_stop, speed_bump, cctv, zebra_crossing, toll_booth',
    )
    city: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    district_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    location: Mapped[str] = mapped_column(
        Geometry(geometry_type='POINT', srid=4326, spatial_index=True),
        nullable=False,
    )
    tags_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    source_timestamp: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False,
    )
