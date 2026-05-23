from __future__ import annotations

import contextlib
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

import aiofiles
import httpx
from PIL import UnidentifiedImageError
from fastapi import UploadFile
from geoalchemy2 import Geography, WKTElement
from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import Settings
from core.redis_client import CacheHelper
from models.road_issue import RoadInfrastructure, RoadIssue
from models.schemas import (
    AuthorityPreviewResponse,
    RoadInfrastructureResponse,
    RoadIssueItem,
    RoadIssuesResponse,
    RoadReportResponse,
)
from services.authority_router import ROAD_TYPE_LABELS, AuthorityRouter
from services.exceptions import ExternalServiceError, ServiceValidationError
from services.geocoding_service import GeocodingService


ACTIVE_ROAD_ISSUE_STATUSES = ['open', 'acknowledged', 'in_progress']
ALL_ROAD_ISSUE_STATUSES = {'open', 'acknowledged', 'in_progress', 'resolved', 'rejected'}
ISSUES_CACHE_VERSION_KEY = 'roads:issues:version'
UPLOAD_EXTENSION_BY_CONTENT_TYPE = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
}

# Known image file signatures (magic bytes)
_IMAGE_MAGIC_SIGNATURES: list[bytes] = [
    b'\xff\xd8\xff',                     # JPEG
    b'\x89PNG\r\n\x1a\n',               # PNG
    b'RIFF',                             # WebP (RIFF....WEBP)
]

logger = logging.getLogger(__name__)


def _is_valid_image_magic(header: bytes) -> bool:
    """Returns True if the first bytes match a known image format signature."""
    for sig in _IMAGE_MAGIC_SIGNATURES:
        if header.startswith(sig):
            # Extra check for WebP: bytes 8-11 must be 'WEBP'
            if sig == b'RIFF' and header[8:12] != b'WEBP':
                continue
            return True
    return False


class RoadWatchService:
    def __init__(
        self,
        *,
        settings: Settings,
        cache: CacheHelper,
        geocoding_service: GeocodingService,
        authority_router: AuthorityRouter,
    ) -> None:
        self.settings = settings
        self.cache = cache
        self.geocoding_service = geocoding_service
        self.authority_router = authority_router

    async def get_authority(self, *, db: AsyncSession, lat: float, lon: float) -> AuthorityPreviewResponse:
        cache_key = f'roads:authority:{lat:.4f}:{lon:.4f}'
        cached = await self.cache.get_json(cache_key)
        if cached:
            return AuthorityPreviewResponse.model_validate(cached)
        preview = await self.authority_router.resolve(db=db, lat=lat, lon=lon)
        await self.cache.set_json(cache_key, preview.model_dump(mode='json'), self.settings.authority_cache_ttl_seconds)
        return preview

    async def get_infrastructure(self, *, db: AsyncSession, lat: float, lon: float) -> RoadInfrastructureResponse:
        cache_key = f'roads:infra:{lat:.4f}:{lon:.4f}'
        cached = await self.cache.get_json(cache_key)
        if cached:
            return RoadInfrastructureResponse.model_validate(cached)

        infrastructure = await self._lookup_infrastructure(db=db, lat=lat, lon=lon)
        if infrastructure is not None:
            road_type_code = self.authority_router.normalize_road_type(
                infrastructure.road_type,
                infrastructure.road_number,
            )
            result = RoadInfrastructureResponse(
                road_type=ROAD_TYPE_LABELS.get(road_type_code, road_type_code),
                road_type_code=road_type_code,
                road_name=infrastructure.road_name,
                road_number=infrastructure.road_number,
                contractor_name=infrastructure.contractor_name,
                exec_engineer=infrastructure.exec_engineer,
                exec_engineer_phone=infrastructure.exec_engineer_phone,
                budget_sanctioned=infrastructure.budget_sanctioned,
                budget_spent=infrastructure.budget_spent,
                last_relayed_date=infrastructure.last_relayed_date,
                next_maintenance=infrastructure.next_maintenance,
                data_source_url=infrastructure.data_source_url,
                source='road_infrastructure',
            )
        else:
            preview = await self.authority_router.resolve(db=db, lat=lat, lon=lon)
            result = RoadInfrastructureResponse(
                road_type=preview.road_type,
                road_type_code=preview.road_type_code,
                road_name=preview.road_name,
                road_number=preview.road_number,
                contractor_name=None,
                exec_engineer=None,
                exec_engineer_phone=None,
                budget_sanctioned=None,
                budget_spent=None,
                last_relayed_date=None,
                next_maintenance=None,
                data_source_url=None,
                source=preview.source,
            )

        await self.cache.set_json(cache_key, result.model_dump(mode='json'), self.settings.authority_cache_ttl_seconds)
        return result

    async def find_nearby_issues(
        self,
        *,
        db: AsyncSession,
        lat: float,
        lon: float,
        radius: int,
        limit: int = 50,
        offset: int = 0,
        statuses: list[str] | None = None,
        category: str | None = None,
        sub_category: str | None = None,
    ) -> RoadIssuesResponse:
        normalized_statuses = statuses or ACTIVE_ROAD_ISSUE_STATUSES
        cache_version = await self.cache.get_int(ISSUES_CACHE_VERSION_KEY, default=0)
        cache_key = (
            f'roads:issues:v{cache_version}:{lat:.4f}:{lon:.4f}:{radius}:'
            f'{",".join(sorted(normalized_statuses))}:{limit}:{offset}:{category or ""}:{sub_category or ""}'
        )
        cached = await self.cache.get_json(cache_key)
        if cached:
            return RoadIssuesResponse.model_validate(cached)

        point = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
        point_geography = cast(point, Geography)
        issue_geography = cast(RoadIssue.location, Geography)
        distance_expr = func.ST_Distance(issue_geography, point_geography).label('distance_meters')
        lat_expr = func.ST_Y(RoadIssue.location).label('lat')
        lon_expr = func.ST_X(RoadIssue.location).label('lon')

        base_stmt = (
            select()
            .where(func.ST_DWithin(issue_geography, point_geography, radius))
            .where(RoadIssue.status.in_(normalized_statuses))
        )
        
        if category:
            base_stmt = base_stmt.where(RoadIssue.category == category)
        if sub_category:
            base_stmt = base_stmt.where(RoadIssue.sub_category == sub_category)

        # Get total count for pagination metadata
        count_stmt = base_stmt.add_columns(func.count(RoadIssue.uuid))
        total_count = (await db.execute(count_stmt)).scalar() or 0

        stmt = (
            base_stmt.add_columns(RoadIssue, lat_expr, lon_expr, distance_expr)
            .order_by(distance_expr.asc(), RoadIssue.created_at.desc())
            .limit(limit)
            .offset(offset)
        )

        rows = (await db.execute(stmt)).all()
        issues = [
            RoadIssueItem(
                uuid=issue.uuid,
                issue_type=issue.issue_type,
                severity=issue.severity,
                description=issue.description,
                lat=float(item_lat),
                lon=float(item_lon),
                location_address=issue.location_address,
                road_name=issue.road_name,
                road_type=issue.road_type,
                road_number=issue.road_number,
                authority_name=issue.authority_name,
                status=issue.status,
                created_at=issue.created_at,
                distance_meters=float(distance),
                
                # Enterprise fields
                category=issue.category,
                sub_category=issue.sub_category,
                ward_id=issue.ward_id,
                ward_name=issue.ward_name,
                assigned_officer_id=issue.assigned_officer_id,
                sla_deadline=issue.sla_deadline,
                resolved_at=issue.resolved_at,
                duplicate_of_uuid=issue.duplicate_of_uuid,
                confirmation_count=issue.confirmation_count,
                before_photo_url=issue.before_photo_url,
                after_photo_url=issue.after_photo_url,
            )
            for issue, item_lat, item_lon, distance in rows
        ]

        next_offset = offset + limit if (offset + limit) < total_count else None

        response = RoadIssuesResponse(
            issues=issues,
            count=len(issues),
            radius_used=radius,
            next_offset=next_offset,
            total_count=total_count,
        )
        await self.cache.set_json(cache_key, response.model_dump(mode='json'), self.settings.cache_ttl_seconds)
        return response

    async def submit_report(
        self,
        *,
        db: AsyncSession,
        lat: float,
        lon: float,
        issue_type: str,
        severity: int,
        description: str | None,
        photo: UploadFile | None,
        citizen_phone: str | None = None,
    ) -> RoadReportResponse:
        normalized_issue_type = issue_type.strip()
        if len(normalized_issue_type) < 2:
            raise ServiceValidationError('issue_type must contain at least 2 non-space characters')
        normalized_description = description.strip() if description and description.strip() else None

        from services.report_classifier import ReportClassifier
        classifier = ReportClassifier()
        ai_classification = classifier.classify(normalized_description, normalized_issue_type)
        if ai_classification:
            normalized_issue_type = ai_classification.get("issue_type", normalized_issue_type)
            if not description and ai_classification.get("issue_type"):
                severity = ai_classification.get("severity", severity)

        # 1. Ward detection
        from services.ward_service import WardService
        ward = await WardService.find_ward_by_coordinates(db, lat, lon)
        ward_id = ward.ward_id if ward else None
        ward_name = ward.ward_name if ward else None

        # 2. Duplicate detection
        from services.duplicate_detector import DuplicateDetector
        duplicates = await DuplicateDetector.find_duplicates(db, lat=lat, lon=lon, issue_type=normalized_issue_type)
        duplicate_of_uuid = duplicates[0].uuid if duplicates else None

        # 3. Categorization logic
        category = "roads"
        sub_category = normalized_issue_type.lower()
        if "light" in normalized_issue_type.lower() or normalized_issue_type == "streetlight":
            category = "streetlight"
            sub_category = "dark_street"
        elif any(kw in normalized_issue_type.lower() for kw in ["signal", "sign", "crossing", "bump", "traffic", "guardrail"]):
            category = "traffic"
            if "signal" in normalized_issue_type.lower():
                sub_category = "signal_outage"
            elif "sign" in normalized_issue_type.lower():
                sub_category = "missing_sign"
            elif "crossing" in normalized_issue_type.lower() or "zebra" in normalized_issue_type.lower():
                sub_category = "zebra_crossing"
            elif "bump" in normalized_issue_type.lower():
                sub_category = "speed_bump"
            else:
                sub_category = "traffic_hazard"
        else:
            category = "roads"
            if "pothole" in normalized_issue_type.lower():
                sub_category = "pothole"
            elif "flood" in normalized_issue_type.lower() or "water" in normalized_issue_type.lower():
                sub_category = "waterlogging"
            elif "debris" in normalized_issue_type.lower() or "hazard" in normalized_issue_type.lower():
                sub_category = "debris"
            elif "footpath" in normalized_issue_type.lower() or "sidewalk" in normalized_issue_type.lower():
                sub_category = "footpath"
            else:
                sub_category = "pothole"

        # 4. SLA deadline
        from services.complaint_lifecycle import ComplaintLifecycle
        sla_deadline = ComplaintLifecycle.calculate_sla_deadline(severity)

        # 5. Auto-assignment
        assigned_officer_id = None
        if ward and ward.officer_id:
            assigned_officer_id = ward.officer_id

        preview = await self.get_authority(db=db, lat=lat, lon=lon)
        try:
            geocode = await self.geocoding_service.reverse(lat=lat, lon=lon)
            location_address = geocode.display_name
        except ExternalServiceError:
            location_address = None
        issue_uuid = uuid.uuid4()
        complaint_ref = f'RS-{issue_uuid.hex[:10].upper()}'
        photo_url = await self._save_photo(issue_uuid=issue_uuid, photo=photo)

        issue = RoadIssue(
            uuid=issue_uuid,
            issue_type=normalized_issue_type,
            severity=severity,
            description=normalized_description,
            location=WKTElement(f'POINT({lon} {lat})', srid=4326),
            location_address=location_address,
            road_name=preview.road_name,
            road_type=preview.road_type,
            road_number=preview.road_number,
            photo_url=photo_url,
            authority_name=preview.authority_name,
            authority_phone=preview.helpline,
            complaint_ref=complaint_ref,
            status='open' if not duplicate_of_uuid else 'acknowledged',
            ai_detection=ai_classification,
            
            # Enterprise fields
            category=category,
            sub_category=sub_category,
            ward_id=ward_id,
            ward_name=ward_name,
            duplicate_of_uuid=duplicate_of_uuid,
            citizen_phone=citizen_phone,
            before_photo_url=photo_url,
            sla_deadline=sla_deadline,
            assigned_officer_id=assigned_officer_id,
            ai_confidence=ai_classification.get("issue_type_confidence") if ai_classification else None,
            ai_model_version="v1.0.0-rule"
        )

        db.add(issue)
        await db.commit()
        await db.refresh(issue)
        await self.cache.increment(ISSUES_CACHE_VERSION_KEY)

        # Log audit trail events
        await ComplaintLifecycle.log_event(
            db,
            complaint_uuid=issue_uuid,
            event_type="created",
            notes=f"Citizen filed a new {category} report.",
            metadata={"citizen_phone": citizen_phone}
        )

        if duplicate_of_uuid:
            await ComplaintLifecycle.log_event(
                db,
                complaint_uuid=issue_uuid,
                event_type="updated",
                notes=f"Linked as duplicate of primary complaint {duplicate_of_uuid}.",
                metadata={"duplicate_of": str(duplicate_of_uuid)}
            )
        elif assigned_officer_id:
            await ComplaintLifecycle.log_event(
                db,
                complaint_uuid=issue_uuid,
                event_type="assigned",
                notes=f"Auto-assigned to ward officer.",
                metadata={"officer_id": str(assigned_officer_id)}
            )

        return RoadReportResponse(
            uuid=issue.uuid,
            complaint_ref=issue.complaint_ref,
            authority_name=preview.authority_name,
            authority_phone=preview.helpline,
            complaint_portal=preview.complaint_portal,
            road_type=preview.road_type,
            road_type_code=preview.road_type_code,
            road_number=preview.road_number,
            road_name=preview.road_name,
            exec_engineer=preview.exec_engineer,
            exec_engineer_phone=preview.exec_engineer_phone,
            contractor_name=preview.contractor_name,
            last_relayed_date=preview.last_relayed_date,
            next_maintenance=preview.next_maintenance,
            budget_sanctioned=preview.budget_sanctioned,
            budget_spent=preview.budget_spent,
            photo_url=photo_url,
            status=issue.status,
            ai_detection=issue.ai_detection,
        )

    async def verify_report(self, *, db: AsyncSession, report_id: str) -> dict:
        """Mark a RoadWatch report as acknowledged and return contribution-ready data."""
        try:
            report_uuid = uuid.UUID(report_id)
        except ValueError as exc:
            raise ServiceValidationError('report_id must be a valid UUID') from exc

        lat_expr = func.ST_Y(RoadIssue.location).label('lat')
        lon_expr = func.ST_X(RoadIssue.location).label('lon')
        row = (
            await db.execute(
                select(RoadIssue, lat_expr, lon_expr).where(RoadIssue.uuid == report_uuid)
            )
        ).first()
        if row is None:
            raise ServiceValidationError('Road report not found')

        issue, lat, lon = row
        issue.status = 'acknowledged'
        issue.status_updated = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.commit()
        await db.refresh(issue)
        await self.cache.increment(ISSUES_CACHE_VERSION_KEY)

        return {
            'id': str(issue.uuid),
            'uuid': str(issue.uuid),
            'status': issue.status,
            'lat': float(lat),
            'lon': float(lon),
            'issue_type': issue.issue_type,
            'severity': issue.severity,
            'description': issue.description,
            'road_name': issue.road_name,
            'road_type': issue.road_type,
            'road_number': issue.road_number,
            'location_address': issue.location_address,
            'authority_name': issue.authority_name,
            'complaint_ref': issue.complaint_ref,
        }

    async def _lookup_infrastructure(
        self,
        *,
        db: AsyncSession,
        lat: float,
        lon: float,
        radius_meters: int = 150,
    ) -> RoadInfrastructure | None:
        point = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326)
        point_geography = cast(point, Geography)
        geometry_geography = cast(RoadInfrastructure.geometry, Geography)
        distance_expr = func.ST_Distance(geometry_geography, point_geography)
        stmt = (
            select(RoadInfrastructure)
            .where(func.ST_DWithin(geometry_geography, point_geography, radius_meters))
            .order_by(distance_expr.asc())
            .limit(1)
        )
        return (await db.execute(stmt)).scalar_one_or_none()

    async def _save_photo(self, *, issue_uuid: uuid.UUID, photo: UploadFile | None) -> str | None:
        if photo is None or not photo.filename:
            return None

        target: Path | None = None
        try:
            content_type = (photo.content_type or '').lower()
            if content_type and content_type not in self.settings.allowed_upload_content_types:
                raise ServiceValidationError(
                    f'Unsupported photo content type "{content_type}". '
                    f'Allowed types: {", ".join(self.settings.allowed_upload_content_types)}'
                )

            suffix = Path(photo.filename).suffix.lower() or UPLOAD_EXTENSION_BY_CONTENT_TYPE.get(content_type, '.jpg')
            file_name = f'{issue_uuid}{suffix}'
            max_bytes = self.settings.max_upload_bytes
            written = 0
            chunks: list[bytes] = []

            first_chunk = True
            while True:
                chunk = await photo.read(1024 * 1024)
                if not chunk:
                    break
                # Validate magic bytes on first chunk before writing anywhere
                if first_chunk:
                    first_chunk = False
                    header = chunk[:12]
                    if not _is_valid_image_magic(header):
                        raise ServiceValidationError(
                            'Uploaded file does not appear to be a valid JPEG, PNG, or WebP image.'
                        )
                written += len(chunk)
                if written > max_bytes:
                    raise ServiceValidationError(
                        f'Photo exceeds max upload size of {max_bytes // (1024 * 1024)} MB'
                    )
                chunks.append(chunk)

            if not chunks:
                return None

            payload = b''.join(chunks)

            # P1-03: Strip EXIF metadata from uploaded images (audit H5)
            # This prevents inadvertent leakage of user GPS coordinates or device data.
            try:
                import io
                from PIL import Image

                with Image.open(io.BytesIO(payload)) as img:
                    # Strip EXIF by re-saving without the 'exif' kwarg
                    if img.mode in ("RGBA", "P") and content_type == "image/jpeg":
                        img = img.convert("RGB")
                    
                    output = io.BytesIO()
                    fmt = img.format or "JPEG"
                    img.save(output, format=fmt)
                    payload = output.getvalue()
            except (OSError, ValueError, UnidentifiedImageError) as e:
                logger.warning("Failed to strip EXIF data; proceeding with original payload. Error: %s", e, extra={"service": "roadwatch"})
            uploaded_url = await self._upload_photo_to_supabase(
                file_name=file_name,
                content_type=content_type or 'image/jpeg',
                payload=payload,
            )
            if uploaded_url:
                return uploaded_url

            target = self.settings.upload_dir / file_name
            async with aiofiles.open(target, 'wb') as handle:
                await handle.write(payload)
        except (OSError, httpx.HTTPError):
            if target is not None:
                with contextlib.suppress(FileNotFoundError):
                    target.unlink()
            raise
        finally:
            await photo.close()

        if self.settings.local_upload_base_url:
            return f'{self.settings.local_upload_base_url}/{file_name}'
        return f'/uploads/{file_name}'

    async def _upload_photo_to_supabase(
        self,
        *,
        file_name: str,
        content_type: str,
        payload: bytes,
    ) -> str | None:
        supabase_url = (self.settings.supabase_url or '').rstrip('/')
        service_key = self.settings.supabase_service_role_key
        bucket = self.settings.road_photo_bucket.strip() or 'road-photos'
        if not supabase_url or not service_key:
            return None

        object_path = f'roadwatch/{file_name}'
        upload_url = f'{supabase_url}/storage/v1/object/{bucket}/{object_path}'
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                response = await client.post(
                    upload_url,
                    content=payload,
                    headers={
                        'Authorization': f'Bearer {service_key}',
                        'apikey': service_key,
                        'Content-Type': content_type,
                        'x-upsert': 'false',
                    },
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning('Supabase Storage upload failed; falling back to local upload: %s', exc, extra={"service": "roadwatch"})
            return None

        return f'{supabase_url}/storage/v1/object/public/{bucket}/{object_path}'
