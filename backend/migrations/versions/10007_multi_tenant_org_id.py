"""Add org_id column to all tables for multi-tenant isolation.

Phase 0.6: Enables tenant-aware queries and data isolation.
Revision ID: 10007
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "10007"
down_revision = "10006_sos_rls_policies"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add org_id to user table
    op.add_column("users", sa.Column("org_id", sa.String(36), nullable=True))
    op.create_index("ix_users_org_id", "users", ["org_id"])
    
    # Add org_id to emergency_services table
    op.add_column("emergency_services", sa.Column("org_id", sa.String(36), nullable=True))
    op.create_index("ix_emergency_services_org_id", "emergency_services", ["org_id"])
    
    # Add org_id to road_issues table
    op.add_column("road_issues", sa.Column("org_id", sa.String(36), nullable=True))
    op.create_index("ix_road_issues_org_id", "road_issues", ["org_id"])
    
    # Add org_id to road_infrastructure table
    op.add_column("road_infrastructure", sa.Column("org_id", sa.String(36), nullable=True))
    op.create_index("ix_road_infrastructure_org_id", "road_infrastructure", ["org_id"])
    
    # Add org_id to sos_incidents table
    op.add_column("sos_incidents", sa.Column("org_id", sa.String(36), nullable=True))
    op.create_index("ix_sos_incidents_org_id", "sos_incidents", ["org_id"])
    
    # Add org_id to user_profiles table
    op.add_column("user_profiles", sa.Column("org_id", sa.String(36), nullable=True))
    op.create_index("ix_user_profiles_org_id", "user_profiles", ["org_id"])


def downgrade() -> None:
    op.drop_index("ix_user_profiles_org_id", table_name="user_profiles")
    op.drop_column("user_profiles", "org_id")
    
    op.drop_index("ix_sos_incidents_org_id", table_name="sos_incidents")
    op.drop_column("sos_incidents", "org_id")
    
    op.drop_index("ix_road_infrastructure_org_id", table_name="road_infrastructure")
    op.drop_column("road_infrastructure", "org_id")
    
    op.drop_index("ix_road_issues_org_id", table_name="road_issues")
    op.drop_column("road_issues", "org_id")
    
    op.drop_index("ix_emergency_services_org_id", table_name="emergency_services")
    op.drop_column("emergency_services", "org_id")
    
    op.drop_index("ix_users_org_id", table_name="users")
    op.drop_column("users", "org_id")
