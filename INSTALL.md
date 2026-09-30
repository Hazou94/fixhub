# FixHub — Guide d'installation complet

> Stack : Next.js 14 · Supabase · Vercel · Resend · Twilio · Stripe

---

## Prérequis

| Outil | Version minimale | Vérifier |
|---|---|---|
| Node.js | 18.17+ | `node -v` |
| npm | 9+ | `npm -v` |
| Git | toute | `git --version` |
| Compte [Supabase](https://supabase.com) | Gratuit OK | — |
| Compte [Vercel](https://vercel.com) | Gratuit OK | — |
| Compte [Resend](https://resend.com) | Gratuit OK | — |
| Compte [Twilio](https://twilio.com) | Essai gratuit | — |
| Compte [Stripe](https://stripe.com) | Test mode | — |

---

## Étape 1 — Cloner et installer les dépendances

```bash
git clone <votre-repo> fixhub
cd fixhub
npm install
```

Si vous partez du ZIP livré :

```bash
unzip fixhub-complet.zip
cd fixhub
npm install
```

---

## Étape 2 — Créer le projet Supabase

1. Allez sur [app.supabase.com](https://app.supabase.com) → **New project**
2. Choisissez la région **Frankfurt (eu-central-1)** pour la conformité RGPD
3. Notez le **mot de passe de la base de données** (vous en aurez besoin plus tard)
4. Une fois le projet créé, allez dans **Settings → API** et copiez :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Étape 3 — Exécuter le schéma SQL

1. Dans Supabase, allez dans **SQL Editor → New query**
2. Copiez-collez intégralement le contenu de `supabase/schema.sql`
3. Cliquez sur **Run**
4. Vérifiez dans **Table Editor** que les tables suivantes existent :
   - `hotels`, `rooms`, `incidents`, `incident_categories`, `notifications`, `evaluations`, `provider_quotes`, `recurring_issues`, etc.

> **Important** : Le schéma inclut les RLS (Row Level Security), les triggers, les vues et les données initiales (catégories, plans d'abonnement). Tout s'exécute en une seule fois.

---

## Étape 4 — Configurer Resend (emails)

1. Créez un compte sur [resend.com](https://resend.com)
2. **Settings → API Keys → Create API Key**
3. Vérifiez un domaine email (ou utilisez `onboarding@resend.dev` pour les tests)
4. Notez :
   - API Key → `RESEND_API_KEY`
   - Email d'envoi → `RESEND_FROM_EMAIL` (ex: `noreply@fixhub.io`)

---

## Étape 5 — Configurer Twilio (SMS)

1. Créez un compte sur [twilio.com](https://twilio.com)
2. Dans la console, notez :
   - **Account SID** → `TWILIO_ACCOUNT_SID`
   - **Auth Token** → `TWILIO_AUTH_TOKEN`
3. Obtenez un numéro de téléphone Twilio (gratuit en mode essai) → `TWILIO_PHONE_NUMBER`
   - Format international : `+33XXXXXXXXX`

> En mode test Twilio, les SMS ne sont envoyés qu'aux numéros vérifiés dans votre console.

---

## Étape 6 — Configurer Stripe (abonnements)

1. Créez un compte sur [stripe.com](https://stripe.com) et restez en **mode Test**
2. **Developers → API Keys** :
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
3. **Developers → Webhooks → Add endpoint** :
   - URL : `https://votre-domaine.vercel.app/api/webhooks/stripe`
   - Events : `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Signing secret → `STRIPE_WEBHOOK_SECRET`

> Pour les tests en local, utilisez [Stripe CLI](https://stripe.com/docs/stripe-cli) : `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## Étape 7 — Configurer les variables d'environnement

Copiez le fichier exemple et remplissez-le :

```bash
cp .env.local.example .env.local
```

Editez `.env.local` :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@votredomaine.com

# SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+33XXXXXXXXX

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Cron (générer une chaîne aléatoire)
CRON_SECRET=votre_secret_aleatoire_ici
```

Pour générer `CRON_SECRET` :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Étape 8 — Lancer en local

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

---

## Étape 9 — Créer le super admin

1. Dans Supabase → **Authentication → Users → Invite user**
2. Entrez votre email et envoyez l'invitation
3. Après avoir accepté l'invitation, allez dans **SQL Editor** et exécutez :

```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"role": "super_admin"}'::jsonb
WHERE email = 'votre@email.com';
```

4. Connectez-vous sur [http://localhost:3000/auth/login](http://localhost:3000/auth/login)
5. Vous aurez accès au super admin panel via `/admin/dashboard`

---

## Étape 10 — Créer le premier hôtel et les chambres

Via SQL Editor dans Supabase :

```sql
-- Créer un hôtel
INSERT INTO hotels (name, slug, city, country, phone, email, subscription_status)
VALUES (
  'Hôtel de la Paix',
  'hotel-de-la-paix',
  'Paris',
  'France',
  '+33123456789',
  'contact@hoteldelapaix.fr',
  'trialing'
)
RETURNING id;
-- Notez l'id retourné (ex: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')

-- Créer les chambres (adapter le nombre)
INSERT INTO rooms (hotel_id, room_number, floor, type)
SELECT
  'VOTRE_HOTEL_ID',
  room_num,
  CASE WHEN room_num::int < 100 THEN 0
       WHEN room_num::int < 200 THEN 1
       ELSE 2 END,
  'standard'
FROM unnest(ARRAY['101','102','103','104','105','201','202','203','204','205']) AS room_num;

-- Associer votre compte super admin comme hotel_admin
INSERT INTO hotel_users (hotel_id, user_id, role, is_active)
SELECT
  'VOTRE_HOTEL_ID',
  id,
  'hotel_admin',
  true
FROM auth.users
WHERE email = 'votre@email.com';
```

---

## Étape 11 — Générer les QR codes

1. Connectez-vous et allez sur `/hotel/qrcodes`
2. Cliquez sur **Générer tous les QR codes**
3. Téléchargez chaque QR code (PNG) pour l'imprimer
4. Collez le QR code dans chaque chambre correspondante

Le QR code pointe vers :
```
https://votre-domaine.com/client/hotel-de-la-paix/101?token=XXXXX
```

---

## Étape 12 — Inviter l'équipe

Via le panel admin → **Équipe → Inviter** :
- `hotel_admin` : directeur, accès total
- `manager` : chef de réception, voit tout, peut assigner
- `technician` : technicien, voit ses incidents assignés
- `receptionist` : réception, voit et crée des incidents

Ou via SQL :
```sql
-- Après que le membre a créé son compte via l'invitation email
INSERT INTO hotel_users (hotel_id, user_id, role, is_active)
SELECT 'VOTRE_HOTEL_ID', id, 'technician', true
FROM auth.users WHERE email = 'technicien@hotel.com';
```

---

## Étape 13 — Déployer sur Vercel

### A. Via GitHub (recommandé)

```bash
git init
git add .
git commit -m "Initial FixHub setup"
git remote add origin https://github.com/votre-user/fixhub.git
git push -u origin main
```

1. Allez sur [vercel.com](https://vercel.com) → **New Project → Import from GitHub**
2. Sélectionnez votre repo
3. Dans **Environment Variables**, ajoutez toutes les variables de `.env.local`
4. Changez `NEXT_PUBLIC_APP_URL` pour votre domaine Vercel (ex: `https://fixhub.vercel.app`)
5. Cliquez sur **Deploy**

### B. Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## Étape 14 — Configurer le cron Vercel (escalade automatique)

Le fichier `vercel.json` configure déjà le cron :

```json
{
  "crons": [{
    "path": "/api/cron/escalation",
    "schedule": "*/15 * * * *"
  }]
}
```

Dans Vercel Dashboard → votre projet → **Settings → Environment Variables** :
- Ajoutez `CRON_SECRET` avec la même valeur que dans `.env.local`

---

## Étape 15 — Configurer le stockage Supabase

Le schéma SQL crée automatiquement les buckets. Vérifiez dans Supabase → **Storage** :
- `incident-photos` (privé, 10MB max, images uniquement)
- `hotel-logos` (public)

Si les buckets n'ont pas été créés, exécutez dans SQL Editor :

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('incident-photos', 'incident-photos', false, 10485760, ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('hotel-logos', 'hotel-logos', true, 2097152, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;
```

---

## Tester l'application

### Flux client (signalement)
1. Allez sur `/client/hotel-de-la-paix/101?token=XXXXX` (token depuis la table `qr_codes`)
2. Choisissez une catégorie, prenez/uploadez une photo, entrez votre email
3. Soumettez → vous recevez un email de confirmation avec le lien de suivi

### Flux technicien
1. Connectez-vous en tant que technicien
2. Allez sur `/hotel/incidents` → vous voyez le nouvel incident
3. Cliquez sur l'incident, changez le statut → le client reçoit un email de mise à jour

### Flux évaluation
1. Après que le technicien marque "Résolu"
2. Le client reçoit un email avec un lien d'évaluation unique
3. Il donne une note 1-5 étoiles → l'incident se ferme automatiquement

---

## Arborescence du projet

```
fixhub/
├── src/
│   ├── app/
│   │   ├── admin/           # Super admin (global)
│   │   ├── api/             # Routes API
│   │   ├── auth/            # Login, callback OAuth
│   │   ├── client/          # Page signalement (publique)
│   │   ├── evaluate/        # Page évaluation (publique)
│   │   ├── hotel/           # Dashboard hôtel (auth requis)
│   │   ├── provider/        # Page devis prestataire (publique)
│   │   └── track/           # Suivi incident (publique)
│   ├── components/
│   │   ├── client/          # Composants page client
│   │   └── hotel/           # Composants dashboard hôtel
│   ├── lib/
│   │   ├── email/           # Fonctions Resend
│   │   ├── sms/             # Fonctions Twilio
│   │   └── supabase/        # Clients Supabase
│   ├── middleware.ts         # Protection des routes
│   └── types/index.ts       # Types TypeScript
├── supabase/
│   └── schema.sql           # Schéma complet DB
├── public/
│   └── manifest.json        # PWA manifest
├── .env.local.example
├── vercel.json              # Config Vercel + Cron
└── INSTALL.md               # Ce fichier
```

---

## Aide-mémoire des URLs importantes

| URL | Description |
|---|---|
| `/auth/login` | Connexion équipe hôtel |
| `/hotel/dashboard` | Tableau de bord principal |
| `/hotel/incidents` | Liste des incidents |
| `/hotel/qrcodes` | Générer et télécharger les QR codes |
| `/hotel/team` | Gestion de l'équipe |
| `/hotel/settings` | Paramètres de l'hôtel |
| `/admin/dashboard` | Super admin — vue globale |
| `/client/[slug]/[room]` | Page signalement client (QR code) |
| `/track/[token]` | Suivi d'incident par le client |
| `/evaluate/[token]` | Page d'évaluation |
| `/provider/quote/[token]` | Réponse devis prestataire |

---

## Problèmes fréquents

**Erreur "Policy violation" lors du signalement**
→ Vérifiez que le bucket `incident-photos` a une policy INSERT pour les utilisateurs non authentifiés.
Ajoutez dans SQL Editor :
```sql
CREATE POLICY "Public can upload incident photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'incident-photos');
```

**Les emails n'arrivent pas**
→ Vérifiez que votre domaine est vérifié sur Resend. En test, utilisez un email vérifié dans Resend.

**QR code invalide / page 404**
→ Vérifiez que le token existe dans la table `qr_codes` et que le `hotel_slug` et `room_number` correspondent.

**Cron ne s'exécute pas**
→ Vérifiez que `CRON_SECRET` est identique dans Vercel et dans votre code. Le cron n'est disponible que sur Vercel Pro/Team pour les intervalles < 1h sur le plan Hobby.

---

*FixHub — Maintenance hôtelière simplifiée*
