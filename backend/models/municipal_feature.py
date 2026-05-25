from __future__ import annotations

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class MunicipalFeature(Base):
    """Municipal GIS features from ArcGIS REST / GeoServer WFS — pan-India coverage."""

    __tablename__ = 'municipal_features'

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    municipality: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True,
        comment='BMC, GCC, GVMC, BBMP, GHMC, etc.',
    )
    layer_name: Mapped[str] = mapped_column(
        String(128), nullable=False, index=True,
        comment='pothole_repairs, road_works, stormwater_drains, ward_boundaries, etc.',
    )
    feature_id: Mapped[str] = mapped_column(String(128), nullable=False)
    geometry: Mapped[str] = mapped_column(
        Geometry(geometry_type='GEOMETRY', srid=4326, spatial_index=True),
        nullable=False,
    )
    attributes_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    last_synced: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False,
    )
