# event-microsite-template

A multi-tenant Next.js template for private, invite-only event microsites —
one codebase, many events, each a typed data bundle rather than a fork.

Each event lives in `events/<slug>/` as plain TypeScript config: content,
theme, agenda, FAQ, expensing policy, feedback form. The app renders any of
them from the same routes. Adding an event is adding a directory, not
branching the site.

## The problem

The usual way to build an event site is to fork last year's. Six events
later there are six codebases, a fix lands in one of them, and nobody
remembers which. The alternative — a CMS — hands non-technical organizers a
box they can put anything into, including a public page with an attendee
roster on it.

This sits between the two. Event content is **data, validated at the
boundary**: every bundle is parsed through Zod on load, and a published
event that fails validation **fails the build** rather than silently 404ing
in production. Drafts are allowed to be incomplete — they warn and hide.
That distinction is the whole design:

```
draft + invalid     → warn, hide from generateStaticParams
published + invalid → throw, break the build
```

You cannot ship a broken published event, and you cannot be blocked from
committing a half-finished draft.

## What's here

| Piece | Path | What it does |
|---|---|---|
| Event registry | `events/registry.ts` | Static imports + the validation policy above |
| Event bundle | `events/_template/` | Copy this to start a new event |
| Schemas | `lib/schemas/` | Zod definitions for every section |
| Attendee routes | `app/e/[slug]/` | Overview, registration, hotel, agenda, FAQ, expensing, feedback |
| Organizer view | `app/internal/[slug]/` | RSVP status, exports, feedback |
| Auth | `app/api/auth/`, `app/login/[slug]/` | Passwordless magic-link against an invite allowlist |
| RSVP | `app/api/rsvp/[slug]/` | Writes to Supabase |
| Retention | `app/api/cron/purge-retention/` | Scheduled PII purge (see below) |
| Migrations | `supabase/migrations/` | 7 migrations — RSVPs, invites, retention log, feedback |

## Access model

Events are **not public**. A visitor gets a magic link only if their address
is already in `invited_attendees`; there is no self-registration path. The
allowlist is authored in `events/<slug>/invites.ts` and seeded to Supabase
by `scripts/seed-invites.ts` — editing the file grants nothing until the
seed runs, which keeps "who can see this" an explicit, auditable act.

## Retention

`meta.retention` declares how long attendee PII survives:

```ts
retention: { pii: "90d", public: "forever" }
```

A daily Vercel cron hits `/api/cron/purge-retention`, which deletes expired
personal data and writes what it did to `retention_log`. An event that
collects RSVPs and then sits in the repo for two years does not keep a
roster of names and dietary requirements alive indefinitely.

## Running it

Requires Node 20+ and a Supabase project.

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + keys
npm run dev
```

The demo event is at `/e/demo-acme-xk7p3`. Without Supabase configured the
static pages render, but RSVP and login will not work.

To seed the demo invite allowlist:

```bash
npx tsx scripts/seed-invites.ts demo-acme-xk7p3
```

### Starting a real event

```bash
cp -r events/_template events/my-event-2027-ab12x
```

Then set `meta.slug` to the directory name (the registry enforces they
match), add the module to `events/registry.ts`, and fill in `content.ts`.
Keep `status: "draft"` until it validates.

## What you must replace

This is a template, and some things in it are deliberately inert:

| Thing | Where | Why |
|---|---|---|
| Placeholder images | `public/images/hotel/` | Generated gradients, not photography. Supply your own — or point `resolveAsset` at a Supabase Storage bucket and use opaque keys instead of `/public` paths |
| `tallyFormId: "REPLACEME"` | `events/demo-acme-xk7p3/feedback.ts` | Feedback embeds need your own Tally form with `event` + `respondent` hidden fields |
| Demo venue | `events/demo-acme-xk7p3/` | "Palma Verde Resort, Isla Verde" is invented, as are all addresses and airport codes |
| Invite addresses | `events/*/invites.ts` | `example.com` placeholders |

Every company, person, venue, and email address in this repository is
fictional.

## Status

Extracted from an internal tool and adapted for release. The event/render
pipeline, auth, RSVP, retention, and organizer views work. Rough edges:

- **Supabase is assumed.** The data layer is not abstracted; swapping it
  means editing the route handlers.
- **Feedback depends on Tally.** The webhook at `app/api/webhooks/tally/`
  is shaped to Tally's payload.
- **No test suite.** Validation is enforced at the schema boundary and by
  the build, which catches config errors but not behavioural regressions.

## License

MIT — see [LICENSE](LICENSE).
