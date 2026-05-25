from __future__ import annotations

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class AdminBoundary(Base):
    """Administrative boundary polygons from Datameet / India Geodata."""

    __tablename__ = 'admin_boundaries'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    level: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True,
        comment='state, district, subdistrict, ward',
    )
    code: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    state_code: Mapped[str] = mapped_column(String(2), nullable=False, index=True)
    parent_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    boundary: Mapped[str] = mapped_column(
        Geometry(geometry_type='MULTIPOLYGON', srid=4326, spatial_index=True),
        nullable=False,
    )
    area_sqkm: Mapped[float | None] = mapped_column(Float, nullable=True)
    centroid_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    centroid_lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(
        String(32), nullable=False,
        comment='datameet, india_geodata, manual',
    )
    source_version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    properties_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False,
    )
