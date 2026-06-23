# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

"""H7: ORM model for sos_incidents table — replaces raw SQL text() usage."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from core.database import Base


class SosIncident(Base):
    __tablename__ = 'sos_incidents'

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    org_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)  # Phase 0.6: Multi-tenant isolation
    user_id: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
