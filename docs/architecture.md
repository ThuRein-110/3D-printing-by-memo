# Architecture

Both applications use Next.js 16.4.5 App Router and React 19.3.1, stable releases resolved from npm during implementation. TypeScript 5.9 provides strict checking. Exact transitive versions are in pnpm-lock.yaml. Tailwind 4 is integrated through PostCSS; shared semantic CSS supplies the brand system. The grey cat is original SVG artwork, independent of filament color availability.

The server authenticates cookies with Supabase `getUser`, then applies user ownership or the database `is_admin()` check. Admin authorization requires a server-managed role and AAL2. Every sensitive API invocation performs authorization; protection does not depend on navigation visibility. Supabase RLS supplies independent read restrictions. Browser database writes are revoked. Checked server handlers use the server-only service credential for uploads and constrained mutations. Transactional RPCs implement final quote issuance, transitions, inventory changes, promotion allocation and queue claiming.

Shared packages use TypeScript source exports and explicit workspace dependencies. Both Next builds transpile them, with `outputFileTracingRoot` at the repository root. Do not publish or separately install these internal packages. Turborepo orders the dependency graph. Configure Vercel to include sibling sources; see deployment guide.

Private objects live in one non-public bucket. Uploads have SHA-256, ownership and immutable metadata. Models are parsed as data; no external materials, scripts or archive extraction. Preview rendering is lazy-loaded. A custom bounded parser handles STL, triangulated OBJ and a deliberately restricted embedded GLB subset.

The durable reconstruction queue is PostgreSQL-backed. A separate Node worker takes short leases with `SKIP LOCKED`, a global advisory lock and one active lease. It polls Meshy with persisted provider IDs. It never repeats an uncertain paid POST. A daily THB reservation cap is configured explicitly; this is a conservative operator-defined allowance, not a verified currency conversion of provider credits.

Quotes store immutable configuration, rate snapshot and illustrative estimate. Final amounts are a separate reviewed field; accepted quotes cannot be changed. Orders expose only customer-visible events; production notes live in an admin-only table. Notifications are an in-app inbox, not an external mail delivery claim.

Official API references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [Meshy image-to-3D](https://docs.meshy.ai/en/api/image-to-3d). Versions were selected for this implementation and must be maintained with audit checks.
