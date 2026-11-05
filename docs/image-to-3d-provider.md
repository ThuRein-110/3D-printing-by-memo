# Image-to-3D provider and worker

The genuine adapter targets [Meshy's documented image-to-3D API](https://docs.meshy.ai/en/api/image-to-3d). It submits image data URIs, polls task status, requests untextured remeshed STL, retrieves output and classifies errors. There are no invented endpoints. The API key is used only by the separate worker, never sent to the browser or web server client bundle.

Set `PREVIEW_PROVIDER=meshy` and a conservative positive `PREVIEW_JOB_BUDGET_THB` in the customer web app. These enable consented enqueueing, not conversion inside an HTTP request. The worker needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MESHY_API_KEY`, `PREVIEW_PROVIDER=meshy`, and the exact approved asset hostname list. Load its environment through your process supervisor or Node's environment-file facility, then run:

```powershell
node --env-file=.env.worker --import tsx scripts/worker.ts
```

Keep `.env.worker` ignored and outside logs. A supervised persistent Node process/VM is required. Vercel web functions do not run this worker. Do not enable enqueueing without operating the worker.

Create an operator-approved daily budget row, using Bangkok's calendar date:

```sql
insert into public.provider_budgets(day,limit_thb)
values ((now() at time zone 'Asia/Bangkok')::date, 0);
-- Replace zero only after validating provider pricing and a worst-case per-job allowance.
```

The reservation ledger prevents aggregate configured allowances from exceeding the daily cap. It does not query exchange rates, guarantee Meshy's credit spend or release allowances on errors. The zero default deliberately disables paid submissions. Set a worst-case per-job bound that includes the intended provider settings. Reconcile actual credit usage manually.

Queue states: queued, processing, succeeded, failed, cancelled. Queue uniqueness deduplicates an owner's image; global SQL leases restrict concurrency to one. Reads poll every 15 seconds, transient poll failures retry after 60 seconds, network requests time out after 20 seconds and jobs stop locally after 30 minutes. A timeout can leave remote work running; it never guarantees refund or remote cancellation.

Submission attempts are persisted before POST. A worker crash or network failure after that point is ambiguous: no second POST is made. Reconcile the provider dashboard before any manual recovery. This sacrifices automatic recovery to prevent duplicate charges where provider idempotency is not established. Lease recovery resumes polling only with a stored provider task ID. A successful local result may leave an orphan object if persistence fails; reconcile private storage.

Meshy DELETE rejects in-progress tasks with 409. `cancel()` returns false in that case. UI reports cancellation requests, never a fabricated remote cancellation. No webhook endpoint is exposed; polling avoids accepting unauthenticated callbacks. If callbacks are added, verify signatures and replay windows using current provider documentation before enabling them.

Asset fetches accept HTTPS on exact configured provider hosts, no credentials/ports, no redirects, 20-second timeouts and a 4 MiB streamed cap. Do not add user-controlled hostnames. Output is parsed again as bounded STL, stored privately, and requires admin printability and scale review. No real provider call was made during implementation.
