# Local Development — Fitcheck

How to run Fitcheck locally with a local Supabase database (Postgres + Auth + Storage) in Docker.
**Nothing here touches your Supabase cloud account** — the local stack is separate and lives only on your
machine. The cloud EU project gets created later, at launch.

---

## Prerequisites (already installed on this machine)

- **Docker Desktop** — `/Applications/Docker.app`
- **Supabase CLI** — check with `supabase --version`
- **Node + npm** — for the Next.js app

---

## Start everything (every coding session)

### 1. Start Docker

Open Docker Desktop (the local DB containers need it running):

```bash
open -a Docker
# wait a few seconds, then confirm it's ready:
docker ps
```

### 2. Start the local Supabase stack

From the project root. **Source `.env.local` first** — Google OAuth is enabled in `config.toml`, and the
Supabase CLI reads the `SUPABASE_AUTH_EXTERNAL_GOOGLE_*` values from the environment (it does **not**
auto-load `.env.local`):

```bash
set -a; source .env.local; set +a   # loads Google OAuth client id + secret
supabase start
```

(If you skip the `source` line, the stack still starts but Google sign-in won't work — email magic-link will.)

First run pulls the container images (a few minutes); later runs are fast. When it's up you'll see the
local URLs and keys. Useful endpoints:

| Service | URL |
|---|---|
| API | http://127.0.0.1:54321 |
| **Studio (database UI)** | **http://127.0.0.1:54323** |
| Mailpit (catches test emails / magic links) | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

> **Your data lives in local Studio (54323), NOT supabase.com.** That's expected for local dev.

### 3. Start the Next.js app

```bash
npm run dev
```

App runs at http://localhost:3000. It reads the local Supabase credentials from `.env.local`
(already created; gitignored).

---

## Stop / reset

```bash
supabase stop            # stop the local stack (keeps data)
supabase stop --no-backup  # stop and discard local data
supabase db reset        # wipe + re-run all migrations from scratch (fresh DB)
supabase status          # show running services + local keys
```

You can leave Docker + the stack running between sessions; `supabase stop` frees the resources when done.

---

## Database changes (migrations)

We never hand-edit the DB blindly — every schema change is a migration file under `supabase/migrations/`.

```bash
supabase migration new <name>   # create a new empty migration file
# ...write SQL in the generated file...
supabase db reset               # apply ALL migrations to a clean local DB (safest while developing)
supabase migration list         # see applied migrations
```

The same migration files apply unchanged to the cloud EU project later via `supabase db push`.

---

## `.env.local`

Already created with the local stack's credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from `supabase status`>
SUPABASE_SERVICE_ROLE_KEY=<secret key from `supabase status`>
ANTHROPIC_API_KEY=        # add when you reach the AI plans (04, 06)
```

If the keys ever change (e.g. after a full reset), re-copy them from `supabase status`.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `supabase start` fails / hangs | Make sure Docker is running: `docker ps`. If not, `open -a Docker` and wait. |
| App can't reach the DB | Confirm `supabase status` shows it running and `.env.local` matches the printed keys. |
| Port already in use | `supabase stop` then `supabase start` again. |
| Want a clean slate | `supabase db reset` (re-runs migrations on an empty DB). |
| "I don't see it in my Supabase profile" | Correct — local dev never appears in the cloud dashboard. Use local Studio: http://127.0.0.1:54323 |

---

## Going to production (later)

When ready to launch, create the cloud project (EU region) and push the schema:

```bash
supabase projects create "Fitcheck" --org-id frxjzfjlcqcbgdnwpjeg --region eu-central-1
supabase link --project-ref <new-project-ref>
supabase db push          # apply local migrations to the cloud DB
```

That cloud project **will** show up in your supabase.com dashboard.
