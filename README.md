# Pastoral Care — prototype

A working prototype of the app you described: a simple, uncluttered way for
ministers to see who needs a visit this week, keep basic contact info, and
log visits without exposing sensitive notes to everyone on the team.

It's two pieces:

- **`backend/`** — a small Node.js/TypeScript API (Express + Prisma) that
  holds the roster, schedule, and visit notes, and enforces who can see what.
- **`mobile/`** — the iOS/Android app (React Native + Expo, TypeScript) your
  ministers and staff would actually use.

Both are real, runnable code — not mockups. The sections below get them
running on your machine.

## Why client/server, not just an on-device app

You picked "team with shared roster + role-based permissions," which means
the roster and notes have to live somewhere everyone's phone can reach, and
the server — not each phone — has to be the one deciding who's allowed to
see notes. That's what `backend/` does. This is more setup than a
single-device app, but it's the only way to give support staff visibility
into scheduling without giving them your ministers' private notes.

## Quick start

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # then edit JWT_SECRET to something random
npx prisma generate
npx prisma migrate dev --name init
npm run seed                 # creates demo users + parishioners + visits
npm run dev                  # starts the API on http://localhost:4000
```

> **Note on this build environment:** I built this in a sandboxed cloud
> container whose network is locked down to a small allowlist, and
> Prisma's engine download (`binaries.prisma.sh`) isn't on it — so I
> couldn't run `prisma generate` myself here to fully verify the backend
> end-to-end. That domain is ordinary public internet and this is a
> sandbox-specific restriction; `npm install` for both projects went
> through fine and the mobile app's TypeScript passes a full typecheck.
> On your own machine this should just work — if `prisma generate` ever
> fails for you, it's worth checking you're not behind a restrictive
> proxy/firewall.

Demo logins (password for all: `password123`):

| Role | Email | Can see notes? |
|---|---|---|
| Admin | admin@example.com | Yes |
| Minister | minister@example.com | Yes |
| Support staff | staff@example.com | No — scheduling/contact info only |

### 2. Mobile app

```bash
cd mobile
npm install
npx expo install --fix       # aligns exact versions with your Expo SDK
```

Find your computer's LAN IP (e.g. `192.168.1.42` — on a Mac,
`ipconfig getifaddr en0`), then either:

- set it once: `export EXPO_PUBLIC_API_URL=http://192.168.1.42:4000` before
  running `npx expo start`, or
- edit the fallback URL in `mobile/src/api/client.ts`.

Your phone and computer need to be on the same Wi-Fi network. `localhost`
won't work from a physical phone — it means the phone itself.

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app (iOS or Android) to run it. Log
in with one of the demo accounts above.

## What's in the prototype

- **Today / this week** — a day-by-day accordion (today, tomorrow, and the
  next 5 days) showing how many visits are on each day, matching the
  "dropdowns with summaries" you described.
- **Visit detail** — name, contact-method chips (in person / phone / email
  / text / other), an alternate point-of-contact picker, a notes field,
  a way to schedule the next visit in the same step, and history is shown
  back on the parishioner's page. Reschedule and cancel are always
  available; logging notes is limited to ministers/admins.
- **Parishioner detail** — demographics, "in case of emergency" contact,
  and a family list that shows names and relationships only — not a full
  record for each family member (see "Handling sensitive data" below).
- **Add a parishioner** and **schedule/add someone ad hoc** (e.g. a
  hospital admission) from anywhere.
- **A lock screen** on app open (and again whenever the app comes back
  from the background) using the phone's own Face ID / fingerprint /
  passcode — no separate PIN system to build or forget.
- **Role-based note access** enforced on the server, not just hidden in
  the UI: a support-staff account physically cannot receive note text in
  the API response, even by inspecting network traffic.
- **Team management** (Admins only) — add team members, deactivate/
  reactivate accounts; reassign a parishioner to a different minister from
  their own page. See "Team management" below.
- **Push notifications** for visits that are overdue or due later today.
  See "Push notifications" below.
- **Routing** — a one-tap multi-stop route for today's whole schedule, and
  per-parishioner directions. See "Routing" below.

## Roles

- **Admin** — manages the roster and users, full access.
- **Minister** — full access to their assigned parishioners, including
  notes.
- **Support staff** — can see names, addresses, phone numbers, family/
  emergency contacts, and the schedule; cannot read or write visit notes.
  This is the "someone can see contact info but not notes" permission you
  asked for.

Admins manage the team from the app now — see "Team management" below.

## Handling sensitive data — recommendations

You asked directly for suggestions here, since pastoral notes can include
things like grief, illness, family conflict, or hospitalization. What's
built in, and what I'd still do before real people's information goes in:

**Already built in:**
- *Field-level RBAC.* Notes are stripped from the API response itself for
  roles that shouldn't see them (`backend/src/middleware/rbac.ts`) — this
  is enforced once, on the server, so it can't be bypassed by a modified
  app or a network inspector.
- *Audit trail.* Every note view and edit is logged (`AuditLog` model)
  with who and when. There's no admin screen to browse it yet, but the
  data's there — worth building before rollout so you can answer "who saw
  this."
- *Biometric/passcode lock*, re-armed whenever the app returns from the
  background.
- *Thin family records.* A person's file shows their spouse/kids by name
  and relationship only — deliberately not a full record, so you're not
  quietly building sensitive files on people who never gave you their own
  information.

**Worth adding before this holds real data:**
- *Encrypt notes at rest*, not just control access to them — either at the
  database layer (e.g. Postgres + `pgcrypto`, or your cloud provider's
  disk encryption) or by encrypting the `notes` field in the application
  with a key held outside the database (a KMS). Right now a leaked
  database file is a leaked set of notes.
- *Run the API behind HTTPS/TLS* in production — this prototype talks
  plain HTTP on your local network, which is fine for testing but not for
  anything real. A reverse proxy like Caddy or your host's managed TLS
  is the easy path.
- *Shorter-lived logins with refresh*, and a way to remotely revoke a
  session (e.g. if a phone is lost).
- *A retention policy.* Decide on purpose how long visit notes are kept
  and who can export or delete them — and write it down.
- *If you issue church-owned phones*, enable your organization's mobile
  device management (MDM) so a lost phone can be remotely wiped, on top
  of the app's own lock.
- Clergy records aren't legally HIPAA-covered, but treating notes with
  HIPAA-style habits — minimum necessary access, an audit trail, no
  sharing outside the care team — is a reasonable bar and most of it is
  already built in above.
- I'm not a lawyer — it's worth a short conversation with your church's
  leadership or insurer about mandatory-reporting obligations and how
  long records should be retained before this goes live with real
  parishioner data.

## Team management

There's a **Team** tab, visible only to Admins, for what used to require
editing the database by hand:

- Add a team member (name, email, temporary password, role) — no self-serve
  signup, since real church staff accounts get set up by someone, not
  created by strangers.
- Deactivate/reactivate an account. A deactivated login is refused at the
  server (`403`, not just hidden in the UI) — their visit history and audit
  entries stay intact, nothing is deleted.
- You can't deactivate your own account, so you can't accidentally lock
  yourself out.

Reassigning a parishioner to a different minister happens on that
parishioner's own page instead (tap **Change** next to "Assigned minister")
— it's a roster edit, not a team-membership one, and it's open to Admins and
Ministers, matching who can already edit a parishioner's other details.

**New setup step:** this added a `User.active` column and a `PushToken`
table (see Push notifications below), so run a fresh migration after
pulling these changes:

```bash
cd backend
npx prisma migrate dev --name add_user_active_and_push_tokens
npm run seed   # optional — refreshes demo data, including a deactivated demo account
```

(On the deployed database, that's `npx prisma migrate deploy` instead — see
"Deploying a shareable test version" below.)

## Push notifications

"So people don't slip under radar" — the app can now nudge a minister about
visits that are overdue or still scheduled for later today.

- The app asks for notification permission on login (skipped automatically
  on web and in a simulator, where there's no real push channel) and
  registers the device's Expo push token with the API.
- `POST` (or `GET`, for cron compatibility) **`/cron/send-reminders`** finds
  every `SCHEDULED` visit due today or earlier, groups it by the
  parishioner's assigned minister, and sends each one a single summary push
  ("You have 2 overdue visits and 1 today — check your schedule.") via
  Expo's push service.
- This endpoint isn't behind a login — a scheduler has no user session — so
  it's protected by a `CRON_SECRET` you set yourself (see
  `backend/.env.example`). **Set this before deploying anywhere shared**,
  or anyone with the URL could trigger pushes to your whole team.
- `backend/vercel.json` wires it up as a daily Vercel Cron Job. Vercel's
  Hobby plan only allows once-a-day crons — for anything more frequent,
  point an external scheduler (e.g. cron-job.org) at the same URL with the
  same secret instead.
- **Known limitation:** it doesn't track which visits it already notified
  about, so calling it more than once in a day re-sends for the same
  visits. Fine for testing or a once-daily cron; worth adding a
  `lastReminderSentAt` column before this runs unattended more often than
  that against real schedules.
- Try it locally once you're registered: `curl -X POST http://localhost:4000/cron/send-reminders`
  (add `-H "Authorization: Bearer <CRON_SECRET>"` if you set one).

## Routing

Tapping **Route** on the Today screen opens a multi-stop driving route for
everyone on today's schedule (in order, in Google Maps — the only maps
provider whose URL scheme supports multiple stops). Each parishioner's own
page also has a one-tap **Directions** link for just their address, using
Apple Maps on iOS and Google Maps elsewhere.

This is deliberately links into the Maps app people already have, not an
embedded map view. An embedded map (`react-native-maps` or the newer
`expo-maps`) needs a native module, API keys, and — on this Expo SDK — a
custom "dev client" build instead of the plain Expo Go workflow this
project uses, which would add real setup cost for something the directions
links already mostly solve. If you later want an actual in-app map (e.g. to
see everyone's location on one screen before picking a route), that's the
path — ask and I can scope it.

## Automated tests

`backend/src/middleware/rbac.test.ts` covers the one piece of logic the
roadmap called out as "must never regress": who can see a visit's notes.
Run them with:

```bash
cd backend
npm test
```

These are unit tests (no database needed — the Prisma client is mocked
out), covering `canAccessNotes`, `redactVisit` (notes get stripped for
Support Staff, left alone for Admin/Minister, and never leak under a
different key), and the `requireRole` route guard. Worth expanding next:
integration tests that actually hit `/visits` and `/people` as each role
and assert on the HTTP response, once there's a disposable test database to
run them against.

## Roadmap — what I'd build next

- Map view showing everyone's location on one screen (see "Routing" above
  for what's built now and the tradeoff that's deferring a real map).
- A retry/backoff and delivery-tracking layer for push notifications, plus
  the `lastReminderSentAt` de-dupe mentioned above.
- Broader automated test coverage (auth, scheduling, the admin routes),
  and integration tests against a real test database.

## Deploying a shareable test version (Vercel + Neon)

The backend now targets Postgres and both apps are set up for zero-config
Vercel deployment, so this can run as a real URL others can test from their
own phone/laptop, not just your machine. This is testing infrastructure,
not a production rollout — see "Handling sensitive data" above for what's
still missing before real parishioner data goes in.

**1. Database — Neon**
- Create a free project at neon.tech, and a database inside it.
- From its "Connect" dialog, copy two connection strings: the **pooled**
  one (hostname has `-pooler` in it) and the **direct/unpooled** one.
- In `backend/.env`, set `DATABASE_URL` to the pooled string and
  `DATABASE_URL_UNPOOLED` to the direct one.
- Run `cd backend && npx prisma migrate deploy && npm run seed` to create
  the tables and demo accounts in the new database.

**2. Backend — Vercel**
- Create a Vercel project from this repo, with **Root Directory** set to
  `backend`. No other config needed — it auto-detects the Express app.
- In the project's Environment Variables, set `DATABASE_URL`,
  `DATABASE_URL_UNPOOLED`, `JWT_SECRET`, `JWT_EXPIRES_IN`, and `CRON_SECRET`
  to the same values as your local `backend/.env` (see "Push notifications"
  above for what `CRON_SECRET` protects — set it here, not just locally).
- Deploy, then note the resulting URL (e.g. `https://pastoral-care-api.vercel.app`).
  `backend/vercel.json` registers the daily reminder cron automatically.

**3. Mobile web build — Vercel**
- Create a second Vercel project from the same repo, **Root Directory**
  set to `mobile`, **Build Command** `npx expo export --platform web`,
  **Output Directory** `dist`.
- Set an Environment Variable `EXPO_PUBLIC_API_URL` to the backend URL from
  step 2 (Expo bakes this in at build time, so it must be set before you
  deploy — not just in a local `.env`).
- Deploy. The resulting URL is what you share with testers — no phone
  setup, Expo Go, or Wi-Fi matching required, just a browser.

Two things are deliberately different on the web build: the biometric lock
screen is skipped entirely (there's no Face ID/passcode concept in a
browser), and the login token is kept in the browser's local storage
instead of the phone's encrypted keychain — both fine for testing, worth
revisiting before real notes go through it.

## Project layout

```
backend/
  prisma/schema.prisma      — data model (User, Person, FamilyMember,
                               EmergencyContact, Visit, AuditLog, PushToken)
  src/routes/                — auth, people, visits, users, notifications,
                               cron endpoints
  src/middleware/rbac.ts     — the role → notes-access rule, in one place
  src/jobs/sendReminders.ts  — the overdue/today-visit push notification job
  src/middleware/rbac.test.ts — automated tests for the access-control rules
  src/seed.ts                — demo data
  vercel.json                — registers the daily reminder cron on Vercel

mobile/
  App.tsx                 — login → biometric lock → navigator
  src/screens/            — Today, People, Person detail, Visit detail,
                            Add visit, Add parishioner, Admin (Team) — the
                            last one only reachable by Admins
  src/auth/               — login session + biometric gate
  src/lib/directions.ts   — "Route" / "Directions" links (see Routing above)
  src/lib/pushNotifications.ts — device push-token registration
  src/theme/theme.ts       — the entire color/spacing palette, in one file
```
