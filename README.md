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

## Roles

- **Admin** — manages the roster and users, full access.
- **Minister** — full access to their assigned parishioners, including
  notes.
- **Support staff** — can see names, addresses, phone numbers, family/
  emergency contacts, and the schedule; cannot read or write visit notes.
  This is the "someone can see contact info but not notes" permission you
  asked for.

Right now users are created via `backend/src/seed.ts` or directly in the
database — there's no in-app "invite a user" screen yet (see Roadmap).

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

## Roadmap — what I'd build next

- Admin screen to create/deactivate users and reassign parishioners
  between ministers.
- Push notifications for visits that are overdue or coming up ("so people
  don't slip under radar" — this is the natural next step).
- Map view of parishioners for routing (you mentioned this as a future
  idea).
- Move from SQLite to Postgres for production (`backend/prisma/schema.prisma`
  — change the `datasource` provider and `DATABASE_URL`).
- Automated tests for the RBAC rules specifically, since that's the part
  that must never regress.

## Project layout

```
backend/
  prisma/schema.prisma   — data model (Users, Person, FamilyMember,
                            EmergencyContact, Visit, AuditLog)
  src/routes/             — auth, people, visits endpoints
  src/middleware/rbac.ts  — the role → notes-access rule, in one place
  src/seed.ts             — demo data

mobile/
  App.tsx                 — login → biometric lock → navigator
  src/screens/            — Today, People, Person detail, Visit detail,
                            Add visit, Add parishioner
  src/auth/               — login session + biometric gate
  src/theme/theme.ts       — the entire color/spacing palette, in one file
```
