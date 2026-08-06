// ─────────────────────────────────────────────────────────────────────────────
// Event registry.
//
// Events live under events/<slug>/ and export plain data via a barrel
// (events/<slug>/index.ts). Every event module is statically imported below
// so the bundler can tree-shake and emit typed chunks.
//
// Validation policy — two kinds of "invalid":
//   • Syntax / import-time errors (typos, bad imports, missing exports) will
//     fail module evaluation the moment the registry is loaded, regardless of
//     the event's declared status. These crashes are intentional — drafts can
//     be schema-incomplete, but they must still *compile*.
//   • Schema errors (wrong shape, missing required fields, failed Zod rules)
//     are deferred: event modules use `satisfies z.input<typeof Schema>` for
//     compile-time shape checking only, and the loader is the single point
//     where runtime parsing happens. listPublishedSlugs() then applies the
//     status-based policy: drafts/archived events with schema errors are
//     warned-and-hidden; published events with schema errors throw an
//     EventValidationError and fail the build.
// ─────────────────────────────────────────────────────────────────────────────

import type { EventBundle } from "@/lib/schemas";
import { Meta } from "@/lib/schemas/meta";
import { EventContent } from "@/lib/schemas/event";
import { Theme } from "@/lib/schemas/theme";
import { Agenda } from "@/lib/schemas/agenda";
import { Faq } from "@/lib/schemas/faq";
import { Expensing } from "@/lib/schemas/expensing";
import { Feedback } from "@/lib/schemas/feedback";

import * as demoAcme from "./demo-acme-xk7p3";

type EventModule = {
  meta: unknown;
  content: unknown;
  theme: unknown;
  agenda?: unknown;
  faq?: unknown;
  expensing?: unknown;
  feedback?: unknown;
};

const REGISTRY: Record<string, EventModule> = {
  "demo-acme-xk7p3": demoAcme as EventModule,
};

export class EventNotFoundError extends Error {
  constructor(slug: string) {
    super(`event not found: ${slug}`);
    this.name = "EventNotFoundError";
  }
}

export class EventValidationError extends Error {
  readonly cause: unknown;
  constructor(slug: string, cause: unknown) {
    super(
      `event "${slug}" failed validation: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    this.name = "EventValidationError";
    this.cause = cause;
  }
}

export function listEventSlugs(): string[] {
  return Object.keys(REGISTRY);
}

export function listPublishedSlugs(): string[] {
  // Distinguishes two failure modes:
  //  - Draft/archived events whose content fails validation → skipped with a
  //    loud console warning; they can live in the registry while WIP.
  //  - Published events whose content fails validation → re-thrown so the
  //    build/preflight fails instead of silently dropping the event from
  //    generateStaticParams (which would 404 the live site).
  return listEventSlugs().filter((slug) => {
    let bundle;
    try {
      bundle = loadEvent(slug);
    } catch (err) {
      if (err instanceof EventNotFoundError) return false;
      const mod = REGISTRY[slug];
      const declaredStatus =
        typeof mod === "object" && mod !== null && "meta" in mod
          ? (mod.meta as { status?: unknown })?.status
          : undefined;
      if (declaredStatus === "published") {
        throw new EventValidationError(
          slug,
          `${(err as Error).message} — this event declares status="published" and must pass validation before the site can build.`,
        );
      }
      // eslint-disable-next-line no-console
      console.warn(
        `[events] draft/archived event "${slug}" failed validation and will be hidden until it is fixed.`,
        err,
      );
      return false;
    }
    return bundle.meta.status === "published";
  });
}

export function loadEvent(slug: string): EventBundle {
  const mod = REGISTRY[slug];
  if (!mod) throw new EventNotFoundError(slug);
  try {
    return loadEventUnsafe(slug, mod);
  } catch (err) {
    throw new EventValidationError(slug, err);
  }
}

function loadEventUnsafe(slug: string, mod: EventModule): EventBundle {

  const meta = Meta.parse(mod.meta);
  if (meta.slug !== slug) {
    throw new Error(
      `meta.slug (${meta.slug}) must equal registry key (${slug})`,
    );
  }

  const bundle: EventBundle = {
    meta,
    content: EventContent.parse(mod.content),
    theme: Theme.parse(mod.theme),
  };

  const requiresContentFile = ["agenda", "faq", "expensing", "feedback"] as const;
  for (const key of requiresContentFile) {
    if (meta.enabledSections.includes(key) && mod[key] === undefined) {
      throw new Error(
        `enabledSections includes "${key}" but events/${slug}/${key}.ts is not exported from the event barrel`,
      );
    }
  }

  if (mod.agenda !== undefined) bundle.agenda = Agenda.parse(mod.agenda);
  if (mod.faq !== undefined) bundle.faq = Faq.parse(mod.faq);
  if (mod.expensing !== undefined) bundle.expensing = Expensing.parse(mod.expensing);
  if (mod.feedback !== undefined) bundle.feedback = Feedback.parse(mod.feedback);

  return bundle;
}
