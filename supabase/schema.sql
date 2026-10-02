-- ============================================================
-- FixHub – Schéma Supabase complet
-- Exécuter dans l'ordre dans l'éditeur SQL Supabase
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- TYPES
-- ============================================================
DO $$ BEGIN
  CREATE TYPE incident_status AS ENUM (
    'new','acknowledged','assigned','in_progress',
    'waiting_parts','waiting_provider','resolved','closed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE incident_priority AS ENUM ('low','medium','high','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('hotel_admin','manager','technician','receptionist');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE access_preference AS ENUM ('anytime','morning','afternoon','evening','notify_first');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- HELPER: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION fn_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END $$;

-- ============================================================
-- TABLES
-- ============================================================

-- subscription_plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  max_rooms     INT NOT NULL,
  price_monthly NUMERIC(10,2),
  stripe_price_id TEXT,
  features      JSONB DEFAULT '{}',
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- hotels
CREATE TABLE IF NOT EXISTS hotels (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 TEXT NOT NULL,
  slug                 TEXT NOT NULL UNIQUE,
  address              TEXT,
  city                 TEXT,
  country              TEXT DEFAULT 'FR',
  phone                TEXT,
  email                TEXT,
  logo_url             TEXT,
  emergency_phone      TEXT,
  subscription_plan_id UUID REFERENCES subscription_plans(id),
  subscription_status  subscription_status DEFAULT 'trialing',
  trial_ends_at        TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  stripe_customer_id   TEXT,
  stripe_subscription_id TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_hotels_updated_at
  BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- rooms
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id    UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor       INT,
  room_type   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (hotel_id, room_number)
);

-- qr_codes
CREATE TABLE IF NOT EXISTS qr_codes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id    UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active   BOOLEAN DEFAULT TRUE,
  scan_count  INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (room_id)
);

-- incident_categories (global)
CREATE TABLE IF NOT EXISTS incident_categories (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_fr                  TEXT NOT NULL,
  name_en                  TEXT NOT NULL,
  name_ar                  TEXT,
  name_es                  TEXT,
  icon                     TEXT DEFAULT '🔧',
  default_priority         incident_priority DEFAULT 'medium',
  default_escalation_hours INT DEFAULT 4,
  is_active                BOOLEAN DEFAULT TRUE,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- room_locations (bathroom, bedroom, etc.)
CREATE TABLE IF NOT EXISTS room_locations (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_fr  TEXT NOT NULL,
  name_en  TEXT NOT NULL
);

-- profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone      TEXT,
  language   TEXT DEFAULT 'fr',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- hotel_users
CREATE TABLE IF NOT EXISTS hotel_users (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hotel_id   UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  role       user_role NOT NULL DEFAULT 'receptionist',
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, hotel_id)
);

-- skills
CREATE TABLE IF NOT EXISTS skills (
  id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_fr  TEXT NOT NULL,
  name_en  TEXT NOT NULL
);

-- service_providers
CREATE TABLE IF NOT EXISTS service_providers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id        UUID REFERENCES hotels(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  contact_name    TEXT NOT NULL,
  email           TEXT,
  phone           TEXT NOT NULL,
  is_global       BOOLEAN DEFAULT FALSE,
  average_rating  NUMERIC(3,2),
  rating_count    INT DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_providers_updated_at
  BEFORE UPDATE ON service_providers FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- provider_skills
CREATE TABLE IF NOT EXISTS provider_skills (
  provider_id UUID REFERENCES service_providers(id) ON DELETE CASCADE,
  skill_id    UUID REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (provider_id, skill_id)
);

-- incidents
CREATE TABLE IF NOT EXISTS incidents (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id            UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id             UUID NOT NULL REFERENCES rooms(id),
  category_id         UUID NOT NULL REFERENCES incident_categories(id),
  status              incident_status DEFAULT 'new',
  priority            incident_priority DEFAULT 'medium',
  title               TEXT NOT NULL,
  description         TEXT,
  guest_name          TEXT,
  guest_email         TEXT,
  guest_phone         TEXT,
  access_preference   access_preference DEFAULT 'notify_first',
  tracking_token      TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  assigned_to         UUID REFERENCES auth.users(id),
  acknowledged_at     TIMESTAMPTZ,
  assigned_at         TIMESTAMPTZ,
  in_progress_at      TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  resolution_notes    TEXT,
  next_escalation_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION fn_updated_at();

-- incident_photos
CREATE TABLE IF NOT EXISTS incident_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id   UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  public_url    TEXT NOT NULL,
  uploaded_by   UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- incident_status_history
CREATE TABLE IF NOT EXISTS incident_status_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id   UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  changed_by    UUID REFERENCES auth.users(id),
  old_status    incident_status,
  new_status    incident_status NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- provider_quotes
CREATE TABLE IF NOT EXISTS provider_quotes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id     UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  provider_id     UUID NOT NULL REFERENCES service_providers(id),
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired')),
  amount          NUMERIC(10,2),
  scheduled_date  DATE,
  scheduled_time  TIME,
  notes           TEXT,
  response_token  TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '48 hours'),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- evaluations
CREATE TABLE IF NOT EXISTS evaluations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id      UUID NOT NULL UNIQUE REFERENCES incidents(id) ON DELETE CASCADE,
  guest_rating     INT CHECK (guest_rating BETWEEN 1 AND 5),
  guest_comment    TEXT,
  evaluation_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  submitted_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id    UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- recurring_issues
CREATE TABLE IF NOT EXISTS recurring_issues (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id         UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_id          UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  category_id      UUID NOT NULL REFERENCES incident_categories(id),
  occurrence_count INT DEFAULT 1,
  first_occurrence TIMESTAMPTZ DEFAULT NOW(),
  last_occurrence  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (room_id, category_id)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_incidents_hotel_status ON incidents(hotel_id, status);
CREATE INDEX IF NOT EXISTS idx_incidents_tracking ON incidents(tracking_token);
CREATE INDEX IF NOT EXISTS idx_incidents_escalation ON incidents(next_escalation_at) WHERE status NOT IN ('resolved','closed','cancelled');
CREATE INDEX IF NOT EXISTS idx_incidents_assigned ON incidents(assigned_to);
CREATE INDEX IF NOT EXISTS idx_hotel_users_user ON hotel_users(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_codes_token ON qr_codes(token);
CREATE INDEX IF NOT EXISTS idx_evaluations_token ON evaluations(evaluation_token);
CREATE INDEX IF NOT EXISTS idx_quotes_token ON provider_quotes(response_token);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on new user
CREATE OR REPLACE FUNCTION fn_new_user_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles(id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_new_user_profile ON auth.users;
CREATE TRIGGER trg_new_user_profile
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION fn_new_user_profile();

-- Auto-log status history on incident update
CREATE OR REPLACE FUNCTION fn_incident_status_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO incident_status_history(incident_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_incident_status_history ON incidents;
CREATE TRIGGER trg_incident_status_history
  AFTER UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION fn_incident_status_history();

-- Detect recurring issues (3+ in 60 days, same room+category)
CREATE OR REPLACE FUNCTION fn_detect_recurring()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM incidents
  WHERE room_id = NEW.room_id
    AND category_id = NEW.category_id
    AND created_at > NOW() - INTERVAL '60 days';

  IF v_count >= 3 THEN
    INSERT INTO recurring_issues(hotel_id, room_id, category_id, occurrence_count, last_occurrence)
    VALUES (NEW.hotel_id, NEW.room_id, NEW.category_id, v_count, NOW())
    ON CONFLICT (room_id, category_id)
    DO UPDATE SET occurrence_count = v_count, last_occurrence = NOW();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_detect_recurring ON incidents;
CREATE TRIGGER trg_detect_recurring
  AFTER INSERT ON incidents FOR EACH ROW EXECUTE FUNCTION fn_detect_recurring();

-- Update provider average rating
CREATE OR REPLACE FUNCTION fn_update_provider_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Placeholder: update via quote acceptance rating if needed
  RETURN NEW;
END $$;

-- QR scan counter function
CREATE OR REPLACE FUNCTION increment_qr_scan(p_token TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE qr_codes SET scan_count = scan_count + 1 WHERE token = p_token;
END $$;

-- ============================================================
-- RLS – Row Level Security
-- ============================================================

ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_issues ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION get_my_hotel_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT hotel_id FROM hotel_users
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION has_role(p_hotel_id UUID, p_roles user_role[])
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM hotel_users
    WHERE user_id = auth.uid()
      AND hotel_id = p_hotel_id
      AND role = ANY(p_roles)
      AND is_active = TRUE
  );
$$;

-- Lit le rôle depuis le JWT de la session (un utilisateur connecté n'a pas
-- le droit de lire auth.users directement, ce qui ferait échouer les requêtes).
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT COALESCE((auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin', FALSE);
$$;

-- hotels policies
CREATE POLICY "hotel: members can read" ON hotels FOR SELECT
  USING (id = get_my_hotel_id() OR is_super_admin());

CREATE POLICY "hotel: admin can update" ON hotels FOR UPDATE
  USING (has_role(id, ARRAY['hotel_admin']::user_role[]) OR is_super_admin());

CREATE POLICY "super_admin: full access hotels" ON hotels FOR ALL
  USING (is_super_admin());

-- rooms policies
CREATE POLICY "rooms: hotel members read" ON rooms FOR SELECT
  USING (hotel_id = get_my_hotel_id() OR is_super_admin());

CREATE POLICY "rooms: admin/manager write" ON rooms FOR ALL
  USING (has_role(hotel_id, ARRAY['hotel_admin','manager']::user_role[]) OR is_super_admin());

-- incidents policies
CREATE POLICY "incidents: hotel members read" ON incidents FOR SELECT
  USING (hotel_id = get_my_hotel_id() OR is_super_admin());

CREATE POLICY "incidents: team can update" ON incidents FOR UPDATE
  USING (has_role(hotel_id, ARRAY['hotel_admin','manager','technician','receptionist']::user_role[]) OR is_super_admin());

CREATE POLICY "incidents: service role insert" ON incidents FOR INSERT
  WITH CHECK (TRUE);

-- profiles policies
CREATE POLICY "profiles: own read" ON profiles FOR SELECT
  USING (id = auth.uid() OR is_super_admin()
    OR EXISTS (SELECT 1 FROM hotel_users hu1
               JOIN hotel_users hu2 ON hu1.hotel_id = hu2.hotel_id
               WHERE hu1.user_id = auth.uid() AND hu2.user_id = profiles.id));

CREATE POLICY "profiles: own update" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- hotel_users policies
CREATE POLICY "hotel_users: members read" ON hotel_users FOR SELECT
  USING (hotel_id = get_my_hotel_id() OR is_super_admin());

-- notifications policies
CREATE POLICY "notifications: own" ON notifications FOR ALL
  USING (user_id = auth.uid() OR is_super_admin());

-- photos policies
CREATE POLICY "photos: hotel members read" ON incident_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM incidents i WHERE i.id = incident_photos.incident_id AND i.hotel_id = get_my_hotel_id()) OR is_super_admin());

CREATE POLICY "photos: service role insert" ON incident_photos FOR INSERT
  WITH CHECK (TRUE);

-- history policies
CREATE POLICY "history: hotel members read" ON incident_status_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM incidents i WHERE i.id = incident_status_history.incident_id AND i.hotel_id = get_my_hotel_id()) OR is_super_admin());

CREATE POLICY "history: service role insert" ON incident_status_history FOR INSERT
  WITH CHECK (TRUE);

-- evaluations (public read by token – done in API with service role)
CREATE POLICY "evaluations: hotel members" ON evaluations FOR ALL
  USING (EXISTS (SELECT 1 FROM incidents i WHERE i.id = evaluations.incident_id AND i.hotel_id = get_my_hotel_id()) OR is_super_admin());

-- service_providers policies
CREATE POLICY "providers: hotel members read" ON service_providers FOR SELECT
  USING (is_global = TRUE OR hotel_id = get_my_hotel_id() OR is_super_admin());

CREATE POLICY "providers: admin write" ON service_providers FOR ALL
  USING (has_role(hotel_id, ARRAY['hotel_admin','manager']::user_role[]) OR is_super_admin());

-- recurring_issues policies
CREATE POLICY "recurring: hotel members" ON recurring_issues FOR SELECT
  USING (hotel_id = get_my_hotel_id() OR is_super_admin());

-- qr_codes policies
CREATE POLICY "qr: hotel members" ON qr_codes FOR ALL
  USING (hotel_id = get_my_hotel_id() OR is_super_admin());

-- incident_categories & skills are public
ALTER TABLE incident_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories: public read" ON incident_categories FOR SELECT USING (TRUE);
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "skills: public read" ON skills FOR SELECT USING (TRUE);
ALTER TABLE room_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locations: public read" ON room_locations FOR SELECT USING (TRUE);
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans: public read" ON subscription_plans FOR SELECT USING (TRUE);

-- ============================================================
-- STORAGE
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('incident-photos', 'incident-photos', FALSE, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('hotel-logos', 'hotel-logos', TRUE, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "photos: auth read" ON storage.objects FOR SELECT
  USING (bucket_id = 'incident-photos' AND auth.role() = 'authenticated');

CREATE POLICY "photos: service insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'incident-photos');

CREATE POLICY "logos: public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'hotel-logos');

CREATE POLICY "logos: auth insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'hotel-logos' AND auth.role() = 'authenticated');

-- ============================================================
-- VIEWS
-- ============================================================
CREATE OR REPLACE VIEW v_incidents_full AS
SELECT
  i.*,
  r.room_number,
  ic.name_fr AS category_name_fr,
  ic.icon    AS category_icon,
  p.full_name AS assignee_name,
  p.phone    AS assignee_phone
FROM incidents i
JOIN rooms r ON r.id = i.room_id
JOIN incident_categories ic ON ic.id = i.category_id
LEFT JOIN profiles p ON p.id = i.assigned_to;

CREATE OR REPLACE VIEW v_hotel_kpis AS
SELECT
  h.id AS hotel_id,
  COUNT(i.id) FILTER (WHERE i.status NOT IN ('resolved','closed','cancelled')) AS open_incidents,
  COUNT(i.id) FILTER (WHERE i.status IN ('in_progress','assigned')) AS in_progress_incidents,
  COUNT(i.id) FILTER (WHERE i.status IN ('resolved','closed') AND i.resolved_at > NOW() - INTERVAL '7 days') AS resolved_last_7_days,
  AVG(e.guest_rating) FILTER (WHERE e.submitted_at IS NOT NULL) AS avg_guest_rating,
  AVG(EXTRACT(EPOCH FROM (i.acknowledged_at - i.created_at))/60)
    FILTER (WHERE i.acknowledged_at IS NOT NULL) AS avg_acknowledgement_minutes,
  AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.created_at))/3600)
    FILTER (WHERE i.resolved_at IS NOT NULL) AS avg_resolution_hours
FROM hotels h
LEFT JOIN incidents i ON i.hotel_id = h.id
LEFT JOIN evaluations e ON e.incident_id = i.id
GROUP BY h.id;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Subscription plans
INSERT INTO subscription_plans(name, max_rooms, price_monthly) VALUES
  ('Solo',        25,   59),
  ('Boutique',    75,  129),
  ('Premium',    150,  249),
  ('Pro',        400,  449),
  ('Enterprise', 9999, NULL)
ON CONFLICT DO NOTHING;

-- Incident categories
INSERT INTO incident_categories(name_fr, name_en, icon, default_priority, default_escalation_hours) VALUES
  ('Plomberie',        'Plumbing',         '🚿', 'high',   2),
  ('Électricité',      'Electricity',      '💡', 'high',   2),
  ('Climatisation',    'Air conditioning', '❄️', 'medium', 4),
  ('Mobilier',         'Furniture',        '🪑', 'low',    8),
  ('Serrure / Porte',  'Lock / Door',      '🔑', 'high',   1),
  ('Télévision',       'Television',       '📺', 'low',    8),
  ('Internet / WiFi',  'Internet / WiFi',  '📶', 'medium', 4),
  ('Nettoyage',        'Cleaning',         '🧹', 'medium', 4),
  ('Chauffage',        'Heating',          '🔥', 'high',   2),
  ('Autre',            'Other',            '🔧', 'medium', 6)
ON CONFLICT DO NOTHING;

-- Room locations
INSERT INTO room_locations(name_fr, name_en) VALUES
  ('Salle de bain',   'Bathroom'),
  ('Chambre',         'Bedroom'),
  ('Salon',           'Living room'),
  ('Cuisine',         'Kitchen'),
  ('Couloir',         'Hallway'),
  ('Terrasse',        'Terrace'),
  ('Entrée',          'Entrance')
ON CONFLICT DO NOTHING;

-- Skills
INSERT INTO skills(name_fr, name_en) VALUES
  ('Plomberie',        'Plumbing'),
  ('Électricité',      'Electricity'),
  ('Menuiserie',       'Carpentry'),
  ('Peinture',         'Painting'),
  ('Climatisation',    'HVAC'),
  ('Serrurerie',       'Locksmithing'),
  ('Informatique',     'IT'),
  ('Nettoyage',        'Cleaning')
ON CONFLICT DO NOTHING;
