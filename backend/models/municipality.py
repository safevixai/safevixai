from __future__ import annotations

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Municipality(Base):
    """Municipality directory — MeraWard-style civic hub for pan-India coverage."""

    __tablename__ = 'municipalities'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    short_name: Mapped[str] = mapped_column(String(16), nullable=False)
    municipality_type: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True,
        comment='municipal_corporation, municipality, town_panchayat, cantonment_board',
    )
    city: Mapped[str] = mapped_column(String(128), nullable=False)
    state_code: Mapped[str] = mapped_column(String(2), nullable=False, index=True)
    state_name: Mapped[str] = mapped_column(String(64), nullable=False)
    lgd_code: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    district_name: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Contact channels
    headquarters_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    helpline_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    whatsapp_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    website_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    app_name: Mapped[str | None] = mapped_column(String(64), nullable=True)
    app_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    grievance_portal_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Leadership
    mayor_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    mayor_photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    commissioner_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    commissioner_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Geo + stats
    ward_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    population: Mapped[int | None] = mapped_column(Integer, nullable=True)
    area_sqkm: Mapped[float | None] = mapped_column(Float, nullable=True)
    centroid_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    centroid_lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    boundary: Mapped[str | None] = mapped_column(
        Geometry(geometry_type='MULTIPOLYGON', srid=4326, spatial_index=True),
        nullable=True,
    )

    # About
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    services_offered: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Metadata
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    data_source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_verified: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow(), nullable=False,
    )
