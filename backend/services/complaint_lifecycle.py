from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.road_issue import RoadIssue
from models.officer import Officer
from models.complaint_event import ComplaintEvent

logger = logging.getLogger(__name__)


class ComplaintLifecycle:
    @staticmethod
    def calculate_sla_deadline(severity: int) -> datetime:
        """
        Calculate SLA deadline based on severity:
        - Severity 5 (Extreme): 4 hours
        - Severity 4 (Critical): 24 hours
        - Severity 3 (Serious): 72 hours
        - Severity 1-2: 7 days (168 hours)
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if severity >= 5:
            return now + timedelta(hours=4)
        elif severity == 4:
            return now + timedelta(hours=24)
        elif severity == 3:
            return now + timedelta(hours=72)
        else:
            return now + timedelta(days=7)

    @classmethod
    async def log_event(
        cls,
        db: AsyncSession,
        *,
        complaint_uuid: uuid.UUID,
        event_type: str,
        actor_id: uuid.UUID | None = None,
        actor_role: str | None = None,
        notes: str | None = None,
        metadata: dict | None = None
    ) -> ComplaintEvent:
        """Helper to create and commit an audit trail event for a complaint."""
        event = ComplaintEvent(
            complaint_uuid=complaint_uuid,
            event_type=event_type,
            actor_id=actor_id,
            actor_role=actor_role,
            notes=notes,
            metadata=metadata
        )
        db.add(event)
        await db.commit()
        return event

    @classmethod
    async def assign_officer(
        cls,
        db: AsyncSession,
        complaint_uuid: uuid.UUID,
        officer_id: uuid.UUID,
        actor_id: uuid.UUID | None = None,
        actor_role: str | None = 'admin'
    ) -> RoadIssue:
        """Assign an issue to a field officer, calculate SLA, update status, log event."""
        # 1. Fetch issue
        stmt = select(RoadIssue).where(RoadIssue.uuid == complaint_uuid)
        issue = (await db.execute(stmt)).scalar_one_or_none()
        if not issue:
            raise ValueError(f"Complaint with UUID {complaint_uuid} not found")

        # 2. Fetch officer
        officer_stmt = select(Officer).where(Officer.id == officer_id)
        officer = (await db.execute(officer_stmt)).scalar_one_or_none()
        if not officer:
            raise ValueError(f"Officer with ID {officer_id} not found")

        # 3. Update issue columns
        issue.assigned_officer_id = officer_id
        if issue.status == 'open':
            issue.status = 'acknowledged'
            issue.status_updated = datetime.now(timezone.utc).replace(tzinfo=None)
        
        issue.sla_deadline = cls.calculate_sla_deadline(issue.severity)
        
        await db.commit()
        await db.refresh(issue)

        # 4. Log event
        await cls.log_event(
            db,
            complaint_uuid=complaint_uuid,
            event_type="assigned",
            actor_id=actor_id,
            actor_role=actor_role,
            notes=f"Assigned to officer {officer.name} ({officer.department})",
            metadata={"officer_name": officer.name, "sla_deadline": issue.sla_deadline.isoformat() if issue.sla_deadline else None}
        )

        return issue

    @classmethod
    async def update_status(
        cls,
        db: AsyncSession,
        complaint_uuid: uuid.UUID,
        status: str,
        notes: str | None = None,
        actor_id: uuid.UUID | None = None,
        actor_role: str | None = None
    ) -> RoadIssue:
        """Update complaint status and record audit trail event."""
        stmt = select(RoadIssue).where(RoadIssue.uuid == complaint_uuid)
        issue = (await db.execute(stmt)).scalar_one_or_none()
        if not issue:
            raise ValueError(f"Complaint with UUID {complaint_uuid} not found")

        old_status = issue.status
        issue.status = status
        issue.status_updated = datetime.now(timezone.utc).replace(tzinfo=None)
        
        if status == 'resolved':
            issue.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)

        await db.commit()
        await db.refresh(issue)

        # Log event
        await cls.log_event(
            db,
            complaint_uuid=complaint_uuid,
            event_type="updated",
            actor_id=actor_id,
            actor_role=actor_role,
            notes=notes or f"Status changed from {old_status} to {status}",
            metadata={"old_status": old_status, "new_status": status}
        )

        return issue

    @classmethod
    async def resolve(
        cls,
        db: AsyncSession,
        complaint_uuid: uuid.UUID,
        after_photo_url: str | None = None,
        notes: str | None = None,
        actor_id: uuid.UUID | None = None,
        actor_role: str | None = 'field_officer'
    ) -> RoadIssue:
        """Mark issue as resolved, record resolution photo, save event."""
        stmt = select(RoadIssue).where(RoadIssue.uuid == complaint_uuid)
        issue = (await db.execute(stmt)).scalar_one_or_none()
        if not issue:
            raise ValueError(f"Complaint with UUID {complaint_uuid} not found")

        issue.status = 'resolved'
        issue.status_updated = datetime.now(timezone.utc).replace(tzinfo=None)
        issue.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
        if after_photo_url:
            issue.after_photo_url = after_photo_url

        await db.commit()
        await db.refresh(issue)

        # Log event
        await cls.log_event(
            db,
            complaint_uuid=complaint_uuid,
            event_type="resolved",
            actor_id=actor_id,
            actor_role=actor_role,
            notes=notes or "Issue resolved by field team.",
            metadata={"after_photo_url": after_photo_url}
        )

        return issue

    @classmethod
    async def escalate(
        cls,
        db: AsyncSession,
        complaint_uuid: uuid.UUID,
        reason: str
    ) -> RoadIssue:
        """Escalate an issue (e.g. because of SLA breach) and log audit event."""
        stmt = select(RoadIssue).where(RoadIssue.uuid == complaint_uuid)
        issue = (await db.execute(stmt)).scalar_one_or_none()
        if not issue:
            raise ValueError(f"Complaint with UUID {complaint_uuid} not found")

        # Increase severity if not already at maximum
        if issue.severity < 5:
            issue.severity += 1

        await db.commit()
        await db.refresh(issue)

        await cls.log_event(
            db,
            complaint_uuid=complaint_uuid,
            event_type="escalated",
            notes=reason,
            metadata={"new_severity": issue.severity}
        )
        return issue

    @staticmethod
    async def get_timeline(db: AsyncSession, complaint_uuid: uuid.UUID) -> list[ComplaintEvent]:
        """Get the chronological audit log of all events for this issue."""
        stmt = (
            select(ComplaintEvent)
            .where(ComplaintEvent.complaint_uuid == complaint_uuid)
            .order_by(ComplaintEvent.created_at.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())
