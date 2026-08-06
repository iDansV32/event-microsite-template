"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format";

/**
 * Authenticated RSVP form.
 *
 * Identity comes from props (the server component read the session cookie
 * + invite row). No IdentifyStep, no localStorage reads, no "invite
 * only" fallback — if the user made it here, middleware + the event
 * layout already confirmed they're signed in with an active invite.
 *
 * Submit calls POST /api/rsvp/[slug] with credentials: "same-origin" so
 * the session cookie goes along. The API path enforces
 *   body.email === session.email
 * so a leaked cookie can't be used to submit on behalf of a different
 * attendee.
 *
 * If the API returns 401 (session expired between page load and submit),
 * we redirect to /login/<slug>?next=... so the user can re-auth and
 * resubmit without losing their in-progress form state (they'll re-
 * render with the same prefilled values on return).
 */

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
  "Nut allergy",
  "Shellfish allergy",
  "Kosher",
  "Halal",
  "No restrictions",
] as const;

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
type TShirt = (typeof TSHIRT_SIZES)[number] | "";

export interface ExistingRsvp {
  attending: "yes" | "no";
  plusOne: boolean;
  plusOneName: string;
  dietary: string[];
  dietaryOther: string;
  tshirt: TShirt;
  roommate: string;
  arrivalNote: string;
  emergencyContact: string;
  updatedAt: string;
}

interface Form {
  attending: "yes" | "no" | null;
  plusOne: "no" | "yes";
  plusOneName: string;
  dietary: string[];
  dietaryOther: string;
  arrivalNote: string;
  roommate: string;
  tshirt: TShirt;
  emergency: string;
}

function formFromExisting(existing: ExistingRsvp | null): Form {
  if (!existing) {
    return {
      attending: null,
      plusOne: "no",
      plusOneName: "",
      dietary: [],
      dietaryOther: "",
      arrivalNote: "",
      roommate: "",
      tshirt: "M",
      emergency: "",
    };
  }
  return {
    attending: existing.attending,
    plusOne: existing.plusOne ? "yes" : "no",
    plusOneName: existing.plusOneName,
    dietary: existing.dietary,
    dietaryOther: existing.dietaryOther,
    arrivalNote: existing.arrivalNote,
    roommate: existing.roommate,
    tshirt: existing.tshirt || "M",
    emergency: existing.emergencyContact,
  };
}

export function RegistrationView(props: {
  slug: string;
  email: string;
  firstName: string;
  lastName: string;
  existing: ExistingRsvp | null;
  registrationIsOpen: boolean;
  closesDisplay: string | null;
  eventShortName: string;
  cityShort: string;
  slackChannel?: string;
}) {
  const router = useRouter();
  const base = `/e/${props.slug}`;
  const [form, setForm] = useState<Form>(() => formFromExisting(props.existing));
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [submittedAt, setSubmittedAt] = useState<string | null>(
    props.existing?.updatedAt ?? null,
  );
  const [isSubmitted, setIsSubmitted] = useState(!!props.existing);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleDietary(opt: string) {
    setForm((f) => ({
      ...f,
      dietary: f.dietary.includes(opt)
        ? f.dietary.filter((x) => x !== opt)
        : [...f.dietary, opt],
    }));
  }

  async function submit(attending: "yes" | "no") {
    setSubmitting(true);
    setSubmitError(null);
    const dietary = [...form.dietary];
    // Identity (email + first/last name) is NOT in the payload. The
    // server derives it from the session cookie + invited_attendees
    // row so a stale/blank prop on the page can never persist
    // placeholder names.
    const payload = {
      attending,
      plusOne: attending === "yes" && form.plusOne === "yes",
      plusOneName:
        attending === "yes" && form.plusOne === "yes" && form.plusOneName.trim()
          ? form.plusOneName.trim()
          : undefined,
      dietary: dietary.length > 0 ? dietary : undefined,
      dietaryOther: form.dietaryOther.trim() || undefined,
      tshirt: form.tshirt || undefined,
      roommate: form.roommate.trim() || undefined,
      arrivalNote: form.arrivalNote.trim() || undefined,
      emergencyContact: form.emergency.trim() || undefined,
    };

    try {
      const res = await fetch(`/api/rsvp/${props.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        // Session expired between page load and submit. Bounce through
        // login; the next= brings the user back here with fresh session.
        const next = encodeURIComponent(`${base}/registration`);
        router.push(`/login/${props.slug}?next=${next}`);
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        const code = body.error ?? `http_${res.status}`;
        setSubmitError(errorMessage(code));
        setSubmitting(false);
        return;
      }
      setIsSubmitted(true);
      setSubmittedAt(new Date().toISOString());
      setSubmitting(false);
    } catch {
      setSubmitError(
        "Couldn\u2019t reach the RSVP service. Check your connection and try again.",
      );
      setSubmitting(false);
    }
  }

  function editAgain() {
    setIsSubmitted(false);
    setStep(0);
    // keep form as-is so edits are edits, not rewrites
  }

  if (!props.registrationIsOpen) {
    return <RegistrationClosed base={base} eventShortName={props.eventShortName} />;
  }

  if (isSubmitted) {
    const declined = form.attending === "no";
    return (
      <Submitted
        base={base}
        cityShort={props.cityShort}
        submittedAt={submittedAt}
        declined={declined}
        onEdit={editAgain}
      />
    );
  }

  const canContinueStep0 = form.attending !== null;

  return (
    <div className="page-in">
      <div className="container-reg" style={{ paddingTop: 72, paddingBottom: 120 }}>
        <div
          className="ed-flex items-center"
          style={{ marginBottom: 48, justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}
        >
          <div>
            <div className="eyebrow eyebrow-accent">
              {props.eventShortName}
            </div>
            <h1
              className="display"
              style={{
                fontSize: "clamp(40px, 10vw, 68px)",
                marginTop: 12,
                letterSpacing: "-0.03em",
                lineHeight: 0.95,
              }}
            >
              Your <em style={{ fontStyle: "italic" }}>RSVP.</em>
            </h1>
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-55)", letterSpacing: "0.1em" }}
          >
            {form.attending === "no" ? "STEP 1 / 1" : `STEP ${step + 1} / 3`}
          </div>
        </div>

        <div className="ed-flex" style={{ marginBottom: 48, gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= step ? "var(--terracotta)" : "var(--ink-12)",
                transition: "background 0.3s",
                opacity: form.attending === "no" && i > 0 ? 0.3 : 1,
              }}
            />
          ))}
        </div>

        {submitError && (
          <div
            role="alert"
            style={{
              marginBottom: 24,
              padding: "14px 18px",
              background: "color-mix(in srgb, var(--danger) 10%, transparent)",
              border:
                "1px solid color-mix(in srgb, var(--danger) 30%, transparent)",
              borderRadius: 12,
              fontSize: 14,
              color: "var(--danger)",
              lineHeight: 1.55,
            }}
          >
            {submitError}
          </div>
        )}

        {step === 0 && (
          <div className="page-in">
            <h2
              className="serif"
              style={{
                fontSize: 32,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                marginBottom: 12,
              }}
            >
              Will you join us
              {props.firstName
                ? (
                  <>
                    ,{" "}
                    <em style={{ fontStyle: "italic" }}>{props.firstName}?</em>
                  </>
                )
                : "?"}
            </h2>
            <p
              className="muted"
              style={{
                fontSize: 16,
                lineHeight: 1.55,
                marginBottom: 40,
                maxWidth: 560,
              }}
            >
              Attendance is expected for all team members. If something&rsquo;s
              blocking you, let&rsquo;s still hear from you.
            </p>
            <div className="ed-grid grid-2" style={{ gap: 16 }}>
              <RSVPCard
                active={form.attending === "yes"}
                onClick={() => update("attending", "yes")}
                title="Count me in"
                script="yes!"
                detail={`I'll be there for ${props.eventShortName}.`}
                tint="var(--tint-clay)"
              />
              <RSVPCard
                active={form.attending === "no"}
                onClick={() => update("attending", "no")}
                title="I can't make it"
                script="sorry—"
                detail="Let me flag a conflict or scheduling issue with the team."
                tint="var(--tint-fog)"
              />
            </div>
            <div
              className="ed-flex"
              style={{
                marginTop: 48,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Link
                href={`${base}/overview`}
                className="btn-link"
                style={{ fontSize: 13, color: "var(--ink-70)" }}
              >
                ← Back
              </Link>
              <button
                className="btn btn-primary"
                disabled={!canContinueStep0 || submitting}
                onClick={() => {
                  if (form.attending === "yes") setStep(1);
                  else if (form.attending === "no") void submit("no");
                }}
                style={{ opacity: canContinueStep0 && !submitting ? 1 : 0.4 }}
              >
                {submitting ? "Submitting\u2026" : "Continue \u2192"}
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="page-in">
            <h2
              className="serif"
              style={{
                fontSize: 32,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                marginBottom: 12,
              }}
            >
              The little details.
            </h2>
            <p
              className="muted"
              style={{
                fontSize: 16,
                lineHeight: 1.55,
                marginBottom: 40,
                maxWidth: 560,
              }}
            >
              So we can feed you, room you, and get you home safely.
              {props.closesDisplay ? ` Please submit by ${props.closesDisplay}.` : ""}
            </p>

            <FormBlock label="Dietary preferences" hint="Select all that apply.">
              <div className="ed-flex wrap" style={{ gap: 8 }}>
                {DIETARY_OPTIONS.map((opt) => {
                  const on = form.dietary.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleDietary(opt)}
                      style={{
                        padding: "10px 16px",
                        borderRadius: 999,
                        fontSize: 13,
                        border: `1px solid ${on ? "var(--terracotta)" : "var(--ink-12)"}`,
                        background: on ? "var(--terracotta)" : "var(--paper)",
                        color: on ? "var(--bg)" : "var(--ink)",
                        transition: "all 0.2s",
                        cursor: "pointer",
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </FormBlock>

            <FormBlock
              label="Other dietary notes"
              hint="Allergies, sensitivities, anything else."
            >
              <input
                className="input"
                placeholder="e.g. severe peanut allergy, low-sodium"
                value={form.dietaryOther}
                onChange={(e) => update("dietaryOther", e.target.value)}
              />
            </FormBlock>

            <FormBlock label="T-shirt size" hint="We'll have swag at check-in.">
              <div className="ed-flex" style={{ gap: 8 }}>
                {TSHIRT_SIZES.map((s) => {
                  const on = form.tshirt === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update("tshirt", s)}
                      style={{
                        width: 56,
                        padding: "12px 0",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 500,
                        border: `1px solid ${on ? "var(--terracotta)" : "var(--ink-12)"}`,
                        background: on ? "var(--terracotta)" : "var(--paper)",
                        color: on ? "var(--bg)" : "var(--ink)",
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </FormBlock>

            <FormBlock
              label="Roommate preference"
              hint="We'll do our best — not always possible."
            >
              <input
                className="input"
                placeholder="Name of a teammate (optional)"
                value={form.roommate}
                onChange={(e) => update("roommate", e.target.value)}
              />
            </FormBlock>

            <div
              className="ed-flex"
              style={{ marginTop: 48, justifyContent: "space-between" }}
            >
              <button className="btn btn-ghost" onClick={() => setStep(0)}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={() => setStep(2)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="page-in">
            <h2
              className="serif"
              style={{
                fontSize: 32,
                fontWeight: 400,
                letterSpacing: "-0.01em",
                marginBottom: 12,
              }}
            >
              Plus-one & emergency contact.
            </h2>

            <FormBlock label="Bringing a plus-one?">
              <div className="ed-grid grid-2" style={{ gap: 16 }}>
                {[
                  { v: "no" as const, t: "Just me", d: "Flying solo." },
                  {
                    v: "yes" as const,
                    t: "Yes, plus one",
                    d: "Self-pay at the plus-one rate shown on the Hotel page.",
                  },
                ].map((o) => {
                  const on = form.plusOne === o.v;
                  return (
                    <button
                      key={o.v}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update("plusOne", o.v)}
                      style={{
                        padding: 24,
                        borderRadius: 14,
                        textAlign: "left",
                        border: `1px solid ${on ? "var(--terracotta)" : "var(--ink-12)"}`,
                        background: on
                          ? "color-mix(in srgb, var(--terracotta) 6%, transparent)"
                          : "var(--paper)",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <div className="serif" style={{ fontSize: 20, fontWeight: 400 }}>
                        {o.t}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--ink-55)",
                          marginTop: 4,
                        }}
                      >
                        {o.d}
                      </div>
                    </button>
                  );
                })}
              </div>
            </FormBlock>

            {form.plusOne === "yes" && (
              <FormBlock label="Plus-one name">
                <input
                  className="input"
                  placeholder="First and last name"
                  value={form.plusOneName}
                  onChange={(e) => update("plusOneName", e.target.value)}
                />
              </FormBlock>
            )}

            <FormBlock
              label="Emergency contact"
              hint="Name + phone, anyone we can reach if needed."
            >
              <input
                className="input"
                placeholder="Name · +1 555 123 4567"
                value={form.emergency}
                onChange={(e) => update("emergency", e.target.value)}
              />
            </FormBlock>

            <FormBlock
              label="Arrival / departure notes"
              hint="Early arrival, late departure, special routing."
            >
              <textarea
                className="input"
                rows={3}
                style={{ resize: "vertical", fontFamily: "var(--f-sans)" }}
                placeholder="Anything we should know about your travel..."
                value={form.arrivalNote}
                onChange={(e) => update("arrivalNote", e.target.value)}
              />
            </FormBlock>

            <div
              className="ed-flex"
              style={{ marginTop: 48, justifyContent: "space-between" }}
            >
              <button className="btn btn-ghost" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                className="btn btn-primary"
                disabled={submitting}
                onClick={() => void submit("yes")}
              >
                {submitting ? "Submitting\u2026" : "Submit RSVP \u2192"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function errorMessage(code: string): string {
  switch (code) {
    case "validation":
      return "Some fields look off. Check them and try again.";
    case "registration_closed":
      return "Registration for this event has closed.";
    case "rate_limited":
      return "Too many submissions in a row. Wait a minute and try again.";
    case "storage_error":
      return "We couldn\u2019t reach the RSVP service just now. Try again in a moment.";
    default:
      return "Something went wrong on our end. Try again in a moment.";
  }
}

function RegistrationClosed({
  base,
  eventShortName,
}: {
  base: string;
  eventShortName: string;
}) {
  return (
    <div className="page-in">
      <div
        className="container-read"
        style={{ paddingTop: 96, paddingBottom: 120, textAlign: "center" }}
      >
        <h1
          className="display"
          style={{
            fontSize: 64,
            marginTop: 16,
            letterSpacing: "-0.03em",
            lineHeight: 0.95,
          }}
        >
          Registration is
          <br />
          <em style={{ fontStyle: "italic" }}>closed.</em>
        </h1>
        <p
          className="serif"
          style={{
            fontSize: 19,
            color: "var(--ink-70)",
            fontStyle: "italic",
            marginTop: 24,
            lineHeight: 1.6,
          }}
        >
          {eventShortName} isn&rsquo;t taking new RSVPs right now. If you
          need to change yours, reach out to your organizer.
        </p>
        <div style={{ marginTop: 48 }}>
          <Link href={`${base}/overview`} className="btn btn-ghost">
            Back to overview
          </Link>
        </div>
      </div>
    </div>
  );
}

function Submitted({
  base,
  cityShort,
  submittedAt,
  declined,
  onEdit,
}: {
  base: string;
  cityShort: string;
  submittedAt: string | null;
  declined: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="page-in">
      <div
        className="container-read"
        style={{ paddingTop: 120, paddingBottom: 160, textAlign: "center" }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: declined ? "var(--tint-fog)" : "var(--tint-teal)",
            color: declined ? "var(--ink-70)" : "var(--teal)",
            fontSize: 42,
            fontFamily: "var(--f-serif)",
            fontStyle: "italic",
            marginBottom: 32,
          }}
          aria-hidden
        >
          {declined ? "\u2014" : "\u2713"}
        </div>
        <div
          className="script"
          style={{
            fontSize: 44,
            color: "var(--terracotta)",
            transform: "rotate(-2deg)",
            display: "inline-block",
            marginBottom: 8,
          }}
        >
          {declined ? "noted" : "you\u2019re in!"}
        </div>
        <h1 className="display" style={{ fontSize: 72, marginTop: 16, lineHeight: 0.95 }}>
          {declined ? (
            <>We&rsquo;ll miss you.</>
          ) : (
            <>
              See you in
              <br />
              <em style={{ fontStyle: "italic" }}>{cityShort}.</em>
            </>
          )}
        </h1>
        <p
          className="serif"
          style={{
            fontSize: 19,
            color: "var(--ink-70)",
            fontStyle: "italic",
            marginTop: 28,
            lineHeight: 1.6,
          }}
        >
          {declined
            ? "Your RSVP is recorded. Reach out to your organizer if anything changes."
            : "Your RSVP is recorded. We\u2019ll follow up with flight booking instructions and your rooming confirmation in the coming weeks."}
        </p>
        {submittedAt && (
          <div
            className="mono"
            style={{
              marginTop: 20,
              fontSize: 11,
              letterSpacing: "0.1em",
              color: "var(--ink-55)",
            }}
          >
            RECORDED {formatDateTime(submittedAt)}
          </div>
        )}
        <div
          style={{
            marginTop: 48,
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link href={`${base}/agenda`} className="btn btn-primary">
            See the agenda →
          </Link>
          <Link href={`${base}/hotel`} className="btn btn-ghost">
            Travel details
          </Link>
          <button onClick={onEdit} className="btn btn-ghost">
            Change my answer
          </button>
        </div>
      </div>
    </div>
  );
}

function RSVPCard({
  active,
  onClick,
  title,
  script,
  detail,
  tint,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  script: string;
  detail: string;
  tint: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: 36,
        borderRadius: 18,
        textAlign: "left",
        border: `1px solid ${active ? "var(--terracotta)" : "var(--ink-12)"}`,
        background: active ? tint : "var(--paper)",
        cursor: "pointer",
        transition: "all 0.25s",
        position: "relative",
        overflow: "hidden",
        minHeight: 180,
      }}
    >
      <div
        className="script"
        style={{
          fontSize: 48,
          color: active ? "var(--terracotta)" : "var(--ink-40)",
          lineHeight: 1,
          marginBottom: 12,
          transform: "rotate(-3deg)",
          display: "inline-block",
        }}
      >
        {script}
      </div>
      <div
        className="serif"
        style={{ fontSize: 26, fontWeight: 400, letterSpacing: "-0.01em" }}
      >
        {title}
      </div>
      <div style={{ fontSize: 14, color: "var(--ink-70)", marginTop: 8 }}>{detail}</div>
      {active && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 24,
            right: 24,
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--terracotta)",
            color: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          ✓
        </div>
      )}
    </button>
  );
}

function FormBlock({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div className="eyebrow" style={{ marginBottom: 4 }}>
        {label}
      </div>
      {hint ? (
        <div
          style={{
            fontSize: 13,
            color: "var(--ink-55)",
            marginBottom: 14,
            fontStyle: "italic",
          }}
        >
          {hint}
        </div>
      ) : (
        <div style={{ height: 10 }} />
      )}
      {children}
    </div>
  );
}

/**
 * Shown when the server couldn't load the invite row for this attendee
 * (Supabase blip, network, etc). We deliberately don't render the RSVP
 * form in this state — without a trusted first/last name the form can't
 * write a correct row. A simple retry is kinder than silently
 * persisting placeholder identity.
 */
export function RegistrationRetry({ slug }: { slug: string }) {
  return (
    <div className="page-in">
      <div
        className="container-read"
        style={{ paddingTop: 120, paddingBottom: 160, textAlign: "center" }}
      >
        <div
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: "50%",
            background:
              "color-mix(in srgb, var(--warn) 12%, transparent)",
            color: "var(--warn)",
            fontSize: 34,
            fontFamily: "var(--f-serif)",
            fontStyle: "italic",
            marginBottom: 24,
          }}
        >
          !
        </div>
        <h1
          className="display"
          style={{
            fontSize: 48,
            marginTop: 8,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          Hold on a second.
        </h1>
        <p
          className="serif"
          style={{
            fontSize: 18,
            fontStyle: "italic",
            color: "var(--ink-70)",
            marginTop: 20,
            lineHeight: 1.6,
          }}
        >
          We couldn&rsquo;t load your RSVP details just now. Refresh in a
          moment, or head back to the overview and try again.
        </p>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href={`/e/${slug}/registration`}
            className="btn btn-primary"
            prefetch={false}
          >
            Retry
          </Link>
          <Link href={`/e/${slug}/overview`} className="btn btn-ghost">
            Back to overview
          </Link>
        </div>
      </div>
    </div>
  );
}
