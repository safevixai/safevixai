from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.complaint_lifecycle import ComplaintLifecycle
from services.complaint_state_machine import ComplaintStateMachine

FROZEN = datetime(2026, 5, 23, 10, 0, 0)


# ═══════════════════════════════════════════════════════════════
# calculate_sla_deadline  (pure function, no DB)
# ═══════════════════════════════════════════════════════════════


def test_calculate_sla_deadline_severity_5_extreme_4_hours():
    with patch('services.complaint_lifecycle.datetime') as mock_dt:
        mock_dt.now.return_value = FROZEN.replace(tzinfo=timezone.utc)
        deadline = ComplaintLifecycle.calculate_sla_deadline(5)
    assert deadline == FROZEN + timedelta(hours=4)


def test_calculate_sla_deadline_severity_4_critical_24_hours():
    with patch('services.complaint_lifecycle.datetime') as mock_dt:
        mock_dt.now.return_value = FROZEN.replace(tzinfo=timezone.utc)
        deadline = ComplaintLifecycle.calculate_sla_deadline(4)
    assert deadline == FROZEN + timedelta(hours=24)


def test_calculate_sla_deadline_severity_3_serious_72_hours():
    with patch('services.complaint_lifecycle.datetime') as mock_dt:
        mock_dt.now.return_value = FROZEN.replace(tzinfo=timezone.utc)
        deadline = ComplaintLifecycle.calculate_sla_deadline(3)
    assert deadline == FROZEN + timedelta(hours=72)


def test_calculate_sla_deadline_severity_2_seven_days():
    with patch('services.complaint_lifecycle.datetime') as mock_dt:
        mock_dt.now.return_value = FROZEN.replace(tzinfo=timezone.utc)
        deadline = ComplaintLifecycle.calculate_sla_deadline(2)
    assert deadline == FROZEN + timedelta(days=7)


def test_calculate_sla_deadline_severity_1_seven_days():
    with patch('services.complaint_lifecycle.datetime') as mock_dt:
        mock_dt.now.return_value = FROZEN.replace(tzinfo=timezone.utc)
        deadline = ComplaintLifecycle.calculate_sla_deadline(1)
    assert deadline == FROZEN + timedelta(days=7)


def test_calculate_sla_deadline_severity_0_default_seven_days():
    with patch('services.complaint_lifecycle.datetime') as mock_dt:
        mock_dt.now.return_value = FROZEN.replace(tzinfo=timezone.utc)
        deadline = ComplaintLifecycle.calculate_sla_deadline(0)
    assert deadline == FROZEN + timedelta(days=7)


# ═══════════════════════════════════════════════════════════════
# log_event
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_log_event_creates_and_commits_event():
    db = MagicMock()
    db.commit = AsyncMock()
    db.add = MagicMock()

    complaint_uuid = uuid.uuid4()
    actor_id = uuid.uuid4()

    event = await ComplaintLifecycle.log_event(
        db,
        complaint_uuid=complaint_uuid,
        event_type="assigned",
        actor_id=actor_id,
        actor_role="admin",
        notes="Test event notes",
        metadata={"key": "value"},
    )

    assert event.complaint_uuid == complaint_uuid
    assert event.event_type == "assigned"
    assert event.actor_id == actor_id
    assert event.actor_role == "admin"
    assert event.notes == "Test event notes"
    db.add.assert_called_once()
    arg = db.add.call_args[0][0]
    assert arg.complaint_uuid == complaint_uuid
    assert arg.event_type == "assigned"
    db.commit.assert_awaited_once()


# ═══════════════════════════════════════════════════════════════
# assign_officer
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_assign_officer_success():
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()

    issue = MagicMock()
    issue.uuid = uuid.uuid4()
    issue.severity = 3
    issue.status = "open"
    issue.complaint_ref = "REF-1234"
    issue.assigned_officer_id = None
    issue.sla_deadline = None
    issue.category = "roads"
    issue.ward_id = None

    assigned_officer_id = uuid.uuid4()
    actor_id = uuid.uuid4()

    officer = MagicMock()
    officer.name = "Ravi Kumar"
    officer.department = "Traffic Police"

    # Smart mock execute based on table target
    async def mock_exec(stmt):
        stmt_str = str(stmt).lower()
        res = MagicMock()
        if "from officers" in stmt_str:
            res.scalar_one_or_none.return_value = officer
        else:
            res.scalar_one_or_none.return_value = issue
        return res

    db.execute.side_effect = mock_exec

    result = await ComplaintLifecycle.assign_officer(
        db,
        complaint_uuid=issue.uuid,
        officer_id=assigned_officer_id,
        actor_id=actor_id,
        actor_role="admin",
    )

    assert result.assigned_officer_id == assigned_officer_id
    assert result.status == "assigned"
    assert result.status_updated is not None
    assert result.sla_deadline is not None
    db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_assign_officer_issue_not_found_raises_value_error():
    db = MagicMock()
    db.execute = AsyncMock()
    
    officer = MagicMock()
    officer.name = "Ravi Kumar"
    officer.department = "Traffic Police"

    async def mock_exec(stmt):
        stmt_str = str(stmt).lower()
        res = MagicMock()
        if "from officers" in stmt_str:
            res.scalar_one_or_none.return_value = officer
        else:
            res.scalar_one_or_none.return_value = None
        return res

    db.execute.side_effect = mock_exec

    with pytest.raises(ValueError, match="Complaint with UUID"):
        await ComplaintLifecycle.assign_officer(
            db,
            complaint_uuid=uuid.uuid4(),
            officer_id=uuid.uuid4(),
        )


@pytest.mark.asyncio
async def test_assign_officer_officer_not_found_raises_value_error():
    db = MagicMock()
    db.execute = AsyncMock()
    issue = MagicMock()
    issue.uuid = uuid.uuid4()

    async def mock_exec(stmt):
        stmt_str = str(stmt).lower()
        res = MagicMock()
        if "from officers" in stmt_str:
            res.scalar_one_or_none.return_value = None
        else:
            res.scalar_one_or_none.return_value = issue
        return res

    db.execute.side_effect = mock_exec

    with pytest.raises(ValueError, match="Officer with ID"):
        await ComplaintLifecycle.assign_officer(
            db,
            complaint_uuid=uuid.uuid4(),
            officer_id=uuid.uuid4(),
        )


# ═══════════════════════════════════════════════════════════════
# update_status
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_update_status_changes_status_and_logs_event():
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()

    issue = MagicMock()
    issue.status = "open"
    issue.uuid = uuid.uuid4()
    issue.complaint_ref = "REF-123"
    issue.category = "roads"
    issue.ward_id = None
    issue.assigned_officer_id = None

    result = MagicMock()
    result.scalar_one_or_none.return_value = issue
    db.execute.return_value = result

    # Valid transition: open -> assigned
    updated = await ComplaintLifecycle.update_status(
        db,
        complaint_uuid=issue.uuid,
        status="assigned",
        notes="Officer en route",
        actor_id=uuid.uuid4(),
        actor_role="field_officer",
    )

    assert updated.status == "assigned"
    assert updated.status_updated is not None
    db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_update_status_to_resolved_sets_resolved_at():
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()

    issue = MagicMock()
    issue.status = "in_progress"
    issue.uuid = uuid.uuid4()
    issue.complaint_ref = "REF-123"
    issue.category = "roads"
    issue.ward_id = None
    issue.assigned_officer_id = None

    result = MagicMock()
    result.scalar_one_or_none.return_value = issue
    db.execute.return_value = result

    # Valid transition: in_progress -> resolved
    updated = await ComplaintLifecycle.update_status(
        db,
        complaint_uuid=issue.uuid,
        status="resolved",
    )

    assert updated.status == "resolved"
    assert updated.status_updated is not None
    assert updated.resolved_at is not None


@pytest.mark.asyncio
async def test_update_status_issue_not_found_raises_value_error():
    db = MagicMock()
    db.execute = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute.return_value = result

    with pytest.raises(ValueError, match="Complaint with UUID"):
        await ComplaintLifecycle.update_status(
            db,
            complaint_uuid=uuid.uuid4(),
            status="in_progress",
        )


# ═══════════════════════════════════════════════════════════════
# resolve
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_resolve_success_sets_status_resolved_at_and_photo():
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()

    issue = MagicMock()
    issue.uuid = uuid.uuid4()
    issue.status = "in_progress"
    issue.complaint_ref = "REF-123"
    issue.category = "roads"
    issue.ward_id = None
    issue.assigned_officer_id = None
    photo_url = "https://storage.example.com/after_photo.jpg"

    result = MagicMock()
    result.scalar_one_or_none.return_value = issue
    db.execute.return_value = result

    resolved = await ComplaintLifecycle.resolve(
        db,
        complaint_uuid=issue.uuid,
        after_photo_url=photo_url,
        notes="Pothole repaired.",
        actor_id=uuid.uuid4(),
        actor_role="field_officer",
    )

    assert resolved.status == "resolved"
    assert resolved.status_updated is not None
    assert resolved.resolved_at is not None
    assert resolved.after_photo_url == photo_url
    db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_resolve_without_photo_does_not_set_after_photo_url():
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()

    # Avoid spec strictness issues by providing standard fields
    issue = MagicMock()
    issue.status = "in_progress"
    issue.uuid = uuid.uuid4()
    issue.complaint_ref = "REF-123"
    issue.category = "roads"
    issue.ward_id = None
    issue.assigned_officer_id = None
    issue.status_updated = None
    issue.resolved_at = None
    issue.after_photo_url = None

    result = MagicMock()
    result.scalar_one_or_none.return_value = issue
    db.execute.return_value = result

    resolved = await ComplaintLifecycle.resolve(
        db,
        complaint_uuid=issue.uuid,
    )

    assert resolved.status == "resolved"
    assert resolved.resolved_at is not None
    assert resolved.after_photo_url is None


@pytest.mark.asyncio
async def test_resolve_issue_not_found_raises_value_error():
    db = MagicMock()
    db.execute = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute.return_value = result

    with pytest.raises(ValueError, match="Complaint with UUID"):
        await ComplaintLifecycle.resolve(
            db,
            complaint_uuid=uuid.uuid4(),
        )


# ═══════════════════════════════════════════════════════════════
# escalate
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_escalate_increases_severity_by_one():
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()

    issue = MagicMock()
    issue.uuid = uuid.uuid4()
    issue.severity = 3
    issue.status = "assigned"
    issue.complaint_ref = "REF-123"
    issue.escalation_tier = 0

    result = MagicMock()
    result.scalar_one_or_none.return_value = issue
    db.execute.return_value = result

    escalated = await ComplaintLifecycle.escalate(
        db,
        complaint_uuid=issue.uuid,
        reason="SLA breach — no officer assigned within 24h",
    )

    assert escalated.severity == 4
    db.commit.assert_awaited()
    db.refresh.assert_awaited_once_with(issue)


@pytest.mark.asyncio
async def test_escalate_max_severity_stays_five():
    db = MagicMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()

    issue = MagicMock()
    issue.uuid = uuid.uuid4()
    issue.severity = 5
    issue.status = "assigned"
    issue.complaint_ref = "REF-123"
    issue.escalation_tier = 0

    result = MagicMock()
    result.scalar_one_or_none.return_value = issue
    db.execute.return_value = result

    escalated = await ComplaintLifecycle.escalate(
        db,
        complaint_uuid=issue.uuid,
        reason="Further escalation of max-severity issue",
    )

    assert escalated.severity == 5


@pytest.mark.asyncio
async def test_escalate_issue_not_found_raises_value_error():
    db = MagicMock()
    db.execute = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute.return_value = result

    with pytest.raises(ValueError, match="Complaint with UUID"):
        await ComplaintLifecycle.escalate(
            db,
            complaint_uuid=uuid.uuid4(),
            reason="Testing error path",
        )


# ═══════════════════════════════════════════════════════════════
# get_timeline
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_get_timeline_returns_events_in_ascending_order():
    db = MagicMock()
    db.execute = AsyncMock()

    complaint_uuid = uuid.uuid4()
    event1 = MagicMock()
    event1.event_type = "created"
    event2 = MagicMock()
    event2.event_type = "assigned"

    result = MagicMock()
    scalars_result = MagicMock()
    scalars_result.all.return_value = [event1, event2]
    result.scalars.return_value = scalars_result
    db.execute.return_value = result

    timeline = await ComplaintLifecycle.get_timeline(db, complaint_uuid=complaint_uuid)

    assert timeline == [event1, event2]
    assert timeline[0].event_type == "created"
    assert timeline[1].event_type == "assigned"
    db.execute.assert_awaited_once()
