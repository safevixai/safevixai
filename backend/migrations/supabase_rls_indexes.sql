-- SafeVixAI — Supabase RLS Policies & Indexes
-- Run this in Supabase SQL Editor after migrations

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- emergency_services: public read
ALTER TABLE emergency_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read" ON emergency_services;
CREATE POLICY "public_read" ON emergency_services
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "service_write" ON emergency_services;
CREATE POLICY "service_write" ON emergency_services
  FOR ALL USING (auth.role() = 'service_role');

-- user_profiles: owner only
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_only" ON user_profiles;
CREATE POLICY "owner_only" ON user_profiles
  FOR ALL USING (auth.uid() = user_id::uuid);

-- sos_incidents: owner read + insert any
ALTER TABLE sos_incidents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_insert" ON sos_incidents;
CREATE POLICY "public_insert" ON sos_incidents
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "owner_read" ON sos_incidents;
CREATE POLICY "owner_read" ON sos_incidents
  FOR SELECT USING (auth.uid() = user_id::uuid);

-- road_issues: public insert, public read, service moderate
ALTER TABLE road_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_insert" ON road_issues;
CREATE POLICY "public_insert" ON road_issues
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "public_read_verified" ON road_issues;
CREATE POLICY "public_read_verified" ON road_issues
  FOR SELECT USING (status IN ('acknowledged','in_progress','resolved'));
DROP POLICY IF EXISTS "service_moderate" ON road_issues;
CREATE POLICY "service_moderate" ON road_issues
  FOR UPDATE USING (auth.role() = 'service_role');

-- chat_logs: owner only
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_only" ON chat_logs;
CREATE POLICY "owner_only" ON chat_logs
  FOR ALL USING (auth.uid() = user_id::uuid);

-- traffic_violations: fully public (legal reference data)
ALTER TABLE traffic_violations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read" ON traffic_violations;
CREATE POLICY "public_read" ON traffic_violations
  FOR SELECT USING (true);

-- first_aid_articles: fully public
ALTER TABLE first_aid_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read" ON first_aid_articles;
CREATE POLICY "public_read" ON first_aid_articles
  FOR SELECT USING (true);

-- live_tracking: owner insert + update, token-holder read
ALTER TABLE live_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner_insert" ON live_tracking;
CREATE POLICY "owner_insert" ON live_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);
DROP POLICY IF EXISTS "owner_update" ON live_tracking;
CREATE POLICY "owner_update" ON live_tracking
  FOR UPDATE USING (auth.uid() = user_id::uuid);

-- operator_users: service only
ALTER TABLE operator_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_only" ON operator_users;
CREATE POLICY "service_only" ON operator_users
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- REQUIRED INDEXES
-- ============================================================

-- Spatial index on emergency_services location (PostGIS GIST)
DROP INDEX IF EXISTS idx_emergency_services_location;
CREATE INDEX idx_emergency_services_location
  ON emergency_services USING GIST (location);

-- Filter + category index for emergency locator queries
DROP INDEX IF EXISTS idx_emergency_services_category;
CREATE INDEX idx_emergency_services_category
  ON emergency_services (category);

-- Road issues status + city for Waze feed and filtering
DROP INDEX IF EXISTS idx_road_issues_status;
CREATE INDEX idx_road_issues_status ON road_issues (status);
DROP INDEX IF EXISTS idx_road_issues_city;
CREATE INDEX idx_road_issues_city ON road_issues (city);
DROP INDEX IF EXISTS idx_road_issues_created_at;
CREATE INDEX idx_road_issues_created_at ON road_issues (created_at DESC);

-- Spatial index on road_issues location
DROP INDEX IF EXISTS idx_road_issues_location;
CREATE INDEX idx_road_issues_location
  ON road_issues USING GIST (location);

-- Chat logs by session_id for conversation history
DROP INDEX IF EXISTS idx_chat_logs_session;
CREATE INDEX idx_chat_logs_session ON chat_logs (session_id);

-- Traffic violations by section number
DROP INDEX IF EXISTS idx_traffic_violations_section;
CREATE INDEX idx_traffic_violations_section ON traffic_violations (section_number);

-- State fine overrides composite lookup
DROP INDEX IF EXISTS idx_state_fine_overrides_lookup;
CREATE INDEX idx_state_fine_overrides_lookup
  ON state_fine_overrides (section_number, state_code);

-- Live tracking active sessions
DROP INDEX IF EXISTS idx_live_tracking_active;
CREATE INDEX idx_live_tracking_active ON live_tracking (is_active, expires_at);

-- Road infrastructure spatial index
DROP INDEX IF EXISTS idx_road_infrastructure_geometry;
CREATE INDEX idx_road_infrastructure_geometry
  ON road_infrastructure USING GIST (geometry);

-- ============================================================
-- DATA RETENTION (Run weekly via pg_cron or Supabase scheduled)
-- ============================================================

-- Create a function for data retention cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
  -- Delete expired live tracking sessions
  DELETE FROM live_tracking
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- Archive SOS incidents older than 1 year
  DELETE FROM sos_incidents
  WHERE created_at < NOW() - INTERVAL '1 year';

  -- Clean up chat logs older than 90 days
  DELETE FROM chat_logs
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- Soft-delete resolved road issues older than 6 months
  UPDATE road_issues
  SET status = 'archived'
  WHERE status = 'resolved'
    AND updated_at < NOW() - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
