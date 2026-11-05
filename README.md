# ApplyPilot — Job Discovery MVP

Single-user local development prototype: Next.js UI/API, JSearch provider adapter, BullMQ worker, PostgreSQL persistence. **Does not submit applications.**

## Prerequisites

Node.js 20+, pnpm 9, Docker, and a RapidAPI JSearch subscription/key. Check the provider's current terms, limits, endpoint and field names before production use.

## Run

```bash
cp .env.example .env
# Set RAPIDAPI_KEY and a long random DISCOVERY_API_TOKEN
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
# Export environment variables for each process, e.g. use a shell env loader:
set -a; source .env; set +a
pnpm dev:worker
# In a second terminal, load .env again:
pnpm dev:web
```

Open http://localhost:3000 and enter DISCOVERY_API_TOKEN. Create a search, then refresh after the worker completes. Run `pnpm test` for the time-filter unit test.

## Known limitations / next tasks

- This is an **unexecuted scaffold**: dependency installation, database migration, and live JSearch requests require your environment and credentials.
- Local single-user bearer-token prototype only. Replace with authenticated sessions, authorization checks, rate limits, and CSRF protection before public deployment.
- The UI creates a new saved search for each click. Add a saved-search list, run status polling, and reuse.
- Deduplication currently uses `(provider, externalId)` only; cross-provider canonical URL merging is not implemented.
- Concurrent runs can race on the same provider record. Add a conflict-safe upsert or advisory lock.
- Worker crash recovery, idempotent resume, retries, provider rate limiting, and a reconciliation process remain future work.
- Results omit jobs without a trustworthy timestamp for strict 24-hour filtering.
- Provider remote flag does not guarantee work eligibility in every state.
- Job source retention and display rights must be checked against provider terms.
- The worker's queued job status is not yet surfaced automatically in the UI.
