-- ============================================================
-- FixHub — Jeu de données de SIMULATION
-- À exécuter dans l'éditeur SQL Supabase (Run without RLS)
-- APRÈS schema.sql et après la création de l'hôtel 'hotel-test'.
-- Rejouable : nettoie ses propres données avant de réinsérer.
-- Tout est marqué (incidents : e-mail @sim.fixhub ; prestataires : notes='SIM').
-- ============================================================

-- ------------------------------------------------------------
-- 0. NETTOYAGE des données de simulation précédentes
-- ------------------------------------------------------------
DELETE FROM notifications WHERE type = 'sim';
DELETE FROM service_providers WHERE notes = 'SIM'
  AND hotel_id = (SELECT id FROM hotels WHERE slug = 'hotel-test');
DELETE FROM incidents WHERE guest_email LIKE '%@sim.fixhub';
-- (les photos, évaluations et historiques liés sont supprimés en cascade)

-- ------------------------------------------------------------
-- 1. CHAMBRES supplémentaires + QR codes
-- ------------------------------------------------------------
INSERT INTO rooms (hotel_id, room_number, floor)
SELECT (SELECT id FROM hotels WHERE slug = 'hotel-test'), n.num, n.fl
FROM (VALUES
  ('106',1),('107',1),('108',1),('109',1),('110',1),
  ('201',2),('202',2),('203',2),('204',2),('205',2)
) AS n(num, fl)
ON CONFLICT (hotel_id, room_number) DO NOTHING;

INSERT INTO qr_codes (hotel_id, room_id)
SELECT r.hotel_id, r.id
FROM rooms r
JOIN hotels h ON h.id = r.hotel_id
WHERE h.slug = 'hotel-test'
ON CONFLICT (room_id) DO NOTHING;

-- ------------------------------------------------------------
-- 2. PRESTATAIRES externes + compétences
-- ------------------------------------------------------------
INSERT INTO service_providers (hotel_id, company_name, contact_name, email, phone, is_global, notes)
SELECT (SELECT id FROM hotels WHERE slug = 'hotel-test'), v.co, v.ct, v.em, v.ph, false, 'SIM'
FROM (VALUES
  ('Plomberie Express 24/7','M. Diallo','contact@plomberie-express.fr','+33 6 90 00 00 10'),
  ('ElecPro Services','Mme Petit','contact@elecpro.fr','+33 6 90 00 00 11'),
  ('Froid & Clim Pro','M. Keller','contact@froidclim.fr','+33 6 90 00 00 12')
) AS v(co, ct, em, ph);

INSERT INTO provider_skills (provider_id, skill_id)
SELECT sp.id, sk.id
FROM service_providers sp
JOIN (VALUES
  ('Plomberie Express 24/7','Plomberie'),
  ('Plomberie Express 24/7','Serrurerie'),
  ('ElecPro Services','Électricité'),
  ('Froid & Clim Pro','Climatisation')
) AS m(co, skill) ON m.co = sp.company_name
JOIN skills sk ON sk.name_fr = m.skill
WHERE sp.notes = 'SIM'
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 3. INCIDENTS (statuts, priorités et dates variés)
-- ------------------------------------------------------------
INSERT INTO incidents (
  hotel_id, room_id, category_id, status, priority, title, description,
  guest_name, guest_email, access_preference, assigned_to,
  created_at, acknowledged_at, assigned_at, in_progress_at, resolved_at,
  resolution_notes, next_escalation_at
)
SELECT
  h.id, r.id, c.id,
  v.status::incident_status, v.priority::incident_priority,
  v.title, v.descr, v.gname,
  lower(split_part(v.gname,' ',1)) || '@sim.fixhub',
  v.access::access_preference,
  CASE WHEN v.assign THEN u.id ELSE NULL END,
  now() - (v.days || ' days')::interval,
  CASE WHEN v.status IN ('acknowledged','assigned','in_progress','resolved','closed')
       THEN now() - (v.days || ' days')::interval + interval '12 minutes' END,
  CASE WHEN v.status IN ('assigned','in_progress','resolved','closed')
       THEN now() - (v.days || ' days')::interval + interval '25 minutes' END,
  CASE WHEN v.status IN ('in_progress','resolved','closed')
       THEN now() - (v.days || ' days')::interval + interval '40 minutes' END,
  CASE WHEN v.status IN ('resolved','closed')
       THEN now() - (v.days || ' days')::interval + interval '3 hours' END,
  CASE WHEN v.status IN ('resolved','closed')
       THEN 'Intervention réalisée, contrôle effectué.' END,
  CASE WHEN v.status IN ('new','acknowledged','assigned','in_progress')
       THEN now() + interval '2 hours' END
FROM (VALUES
  --room, catégorie,            statut,         priorité,  titre,                    description,                                        client,         accès,         affecté, jours
  ('101','Plomberie',          'resolved',     'high',    'Fuite sous le lavabo',   'Le robinet goutte en continu.',                    'Marie Dupont', 'anytime',     true,  2),
  ('102','Électricité',        'in_progress',  'high',    'Prise sans courant',     'La prise près du lit ne fonctionne plus.',         'Jean Morel',   'notify_first',true,  0),
  ('103','Climatisation',      'new',          'medium',  'Clim ne refroidit plus', 'La chambre reste chaude malgré la clim a fond.',   'Sophie Bernard','anytime',    false, 0),
  ('104','Serrure / Porte',    'new',          'critical','Porte ne verrouille pas','Impossible de fermer la porte a cle.',             'Luca Rossi',   'notify_first',false, 0),
  ('105','Mobilier',           'resolved',     'low',     'Chaise cassée',          'Un pied de la chaise de bureau est casse.',        'Emma Petit',   'anytime',     true,  5),
  ('106','Internet / WiFi',    'closed',       'medium',  'WiFi tres lent',         'Connexion instable depuis hier soir.',             'Tom Leroy',    'anytime',     true,  7),
  ('107','Nettoyage',          'assigned',     'medium',  'Serviettes manquantes',  'Pas de serviettes dans la salle de bain.',         'Chen Wei',     'anytime',     true,  0),
  ('108','Chauffage',          'resolved',     'high',    'Radiateur froid',        'Le radiateur ne chauffe pas du tout.',             'Anna Schmidt', 'anytime',     true,  3),
  ('201','Télévision',         'new',          'low',     'TV sans signal',         'Ecran noir, message aucun signal.',                'Paul Girard',  'anytime',     false, 1),
  ('202','Plomberie',          'acknowledged', 'high',    'WC bouche',              'Les toilettes sont bouchees.',                     'Nadia Benali', 'notify_first',false, 0),
  ('203','Plomberie',          'resolved',     'medium',  'Douche qui fuit',        'Fuite au niveau du pommeau de douche.',            'Marco Conti',  'anytime',     true,  10),
  ('101','Plomberie',          'new',          'high',    'Nouvelle fuite lavabo',  'Le lavabo fuit a nouveau au meme endroit.',        'Claire Dubois','anytime',     false, 0),
  ('204','Électricité',        'resolved',     'medium',  'Lampe de chevet HS',     'La lampe ne s allume plus.',                       'Omar Haddad',  'anytime',     true,  4),
  ('205','Autre',              'new',          'low',     'Rideau decroche',        'Le rideau est tombe du rail.',                     'Lisa Meyer',   'anytime',     false, 0),
  ('101','Plomberie',          'closed',       'medium',  'Fuite lavabo (passee)',  'Ancien incident de plomberie resolu.',             'Hugo Faure',   'anytime',     true,  22)
) AS v(room, cat, status, priority, title, descr, gname, access, assign, days)
JOIN hotels h ON h.slug = 'hotel-test'
LEFT JOIN (SELECT id FROM auth.users WHERE email = 'hamza.dahmouni@gmail.com') u ON true
JOIN rooms r ON r.room_number = v.room AND r.hotel_id = h.id
JOIN incident_categories c ON c.name_fr = v.cat;

-- ------------------------------------------------------------
-- 4. ÉVALUATIONS clients (incidents résolus / clôturés)
-- ------------------------------------------------------------
INSERT INTO evaluations (incident_id, guest_rating, guest_comment, submitted_at)
SELECT i.id,
       (ARRAY[5,4,5,4,3,5])[1 + (floor(random()*6))::int],
       'Merci pour la reactivite de l equipe.',
       i.resolved_at + interval '1 hour'
FROM incidents i
WHERE i.guest_email LIKE '%@sim.fixhub'
  AND i.status IN ('resolved','closed')
ON CONFLICT (incident_id) DO NOTHING;

-- ------------------------------------------------------------
-- 5. NOTIFICATIONS internes (incidents en attente)
-- ------------------------------------------------------------
INSERT INTO notifications (hotel_id, user_id, incident_id, type, title, message, is_read)
SELECT i.hotel_id,
       (SELECT id FROM auth.users WHERE email = 'hamza.dahmouni@gmail.com'),
       i.id, 'sim',
       'Nouvel incident : ' || i.title,
       'Chambre ' || r.room_number || ' — priorité ' || i.priority,
       false
FROM incidents i
JOIN rooms r ON r.id = i.room_id
WHERE i.guest_email LIKE '%@sim.fixhub'
  AND i.status = 'new';

-- ------------------------------------------------------------
-- 6. RÉCAPITULATIF
-- ------------------------------------------------------------
SELECT 'Incidents de simulation' AS element, count(*)::text AS total
  FROM incidents WHERE guest_email LIKE '%@sim.fixhub'
UNION ALL
SELECT 'dont ouverts (à traiter)', count(*)::text
  FROM incidents WHERE guest_email LIKE '%@sim.fixhub'
   AND status NOT IN ('resolved','closed','cancelled')
UNION ALL
SELECT 'Évaluations clients', count(*)::text
  FROM evaluations e JOIN incidents i ON i.id = e.incident_id
  WHERE i.guest_email LIKE '%@sim.fixhub'
UNION ALL
SELECT 'Prestataires externes', count(*)::text
  FROM service_providers WHERE notes = 'SIM'
UNION ALL
SELECT 'Chambres de l''hôtel', count(*)::text
  FROM rooms r JOIN hotels h ON h.id = r.hotel_id WHERE h.slug = 'hotel-test'
UNION ALL
SELECT 'Problèmes récurrents détectés', count(*)::text
  FROM recurring_issues ri JOIN hotels h ON h.id = ri.hotel_id WHERE h.slug = 'hotel-test';
