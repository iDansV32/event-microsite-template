"use client";

import { Fragment, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
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

/** Per-event rates shown in the "At a glance" panel (all optional). */
export interface RegistrationRates {
  plusOne?: number;
  extensionEmployee?: number;
  extensionPlusOne?: number;
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
  datesDisplay: string;
  venueName: string;
  rates?: RegistrationRates;
  supportEmail?: string;
  faqEnabled: boolean;
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

  const glance = (
    <AtAGlance
      email={props.email}
      datesDisplay={props.datesDisplay}
      venueName={props.venueName}
      closesDisplay={props.closesDisplay}
      rates={props.rates}
      slackChannel={props.slackChannel}
      supportEmail={props.supportEmail}
      faqHref={props.faqEnabled ? `${base}/faq` : undefined}
    />
  );

  if (isSubmitted) {
    const declined = form.attending === "no";
    return (
      <RegistrationShell aside={glance}>
        <Submitted
          base={base}
          cityShort={props.cityShort}
          submittedAt={submittedAt}
          declined={declined}
          onEdit={editAgain}
        />
      </RegistrationShell>
    );
  }

  const canContinueStep0 = form.attending !== null;

  return (
    <RegistrationShell
      lede={
        props.closesDisplay
          ? `Registration is open \u2014 please submit by ${props.closesDisplay}.`
          : "Registration is open."
      }
      aside={glance}
    >
      <div className="card card-lg">
        <div className="hint" style={{ fontWeight: 500 }}>
          {form.attending === "no" ? "Step 1 of 1" : `Step ${step + 1} of 3`}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 999,
                background: i <= step ? "var(--accent)" : "var(--line)",
                transition: "background-color 0.3s",
                opacity: form.attending === "no" && i > 0 ? 0.3 : 1,
              }}
            />
          ))}
        </div>

        {submitError && (
          <div
            role="alert"
            className="callout callout-danger"
            style={{ marginTop: 24 }}
          >
            <Icon name="alert" size={20} style={{ marginTop: 1 }} />
            <span>{submitError}</span>
          </div>
        )}

        {step === 0 && (
          <div className="page-in" style={{ marginTop: 32 }}>
            <h2 id="reg-attending-title" style={STEP_TITLE}>
              Will you join us{props.firstName ? `, ${props.firstName}?` : "?"}
            </h2>
            <p className="body" style={STEP_INTRO}>
              Attendance is expected for all team members. If something&rsquo;s
              blocking you, let&rsquo;s still hear from you.
            </p>
            <div
              role="group"
              aria-labelledby="reg-attending-title"
              style={{ ...CHOICE_ROW, marginTop: 20 }}
            >
              <ChoiceCard
                active={form.attending === "yes"}
                onClick={() => update("attending", "yes")}
                title="Count me in"
                detail={`I'll be there for ${props.eventShortName}.`}
              />
              <ChoiceCard
                active={form.attending === "no"}
                onClick={() => update("attending", "no")}
                title="I can't make it"
                detail="Let me flag a conflict or scheduling issue with the team."
              />
            </div>
            <StepNav>
              <Link href={`${base}/overview`} className="btn btn-secondary">
                <Icon name="arrow-left" size={16} strokeWidth={2} />
                Back
              </Link>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canContinueStep0 || submitting}
                onClick={() => {
                  if (form.attending === "yes") setStep(1);
                  else if (form.attending === "no") void submit("no");
                }}
              >
                {submitting ? (
                  "Submitting\u2026"
                ) : (
                  <>
                    Continue
                    <Icon name="arrow-right" size={16} strokeWidth={2} />
                  </>
                )}
              </button>
            </StepNav>
          </div>
        )}

        {step === 1 && (
          <div className="page-in" style={{ marginTop: 32 }}>
            <h2 style={STEP_TITLE}>The little details</h2>
            <p className="body" style={STEP_INTRO}>
              So we can feed you, room you, and get you home safely.
              {props.closesDisplay ? ` Please submit by ${props.closesDisplay}.` : ""}
            </p>

            <div style={FIELD_STACK}>
              <ChoiceField legend="Dietary preferences" hint="Select all that apply.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {DIETARY_OPTIONS.map((opt) => {
                    const on = form.dietary.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        className="chip"
                        aria-pressed={on}
                        onClick={() => toggleDietary(opt)}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </ChoiceField>

              <TextField
                id="reg-dietary-other"
                label="Other dietary notes"
                hint="Allergies, sensitivities, anything else."
              >
                <input
                  id="reg-dietary-other"
                  type="text"
                  aria-describedby="reg-dietary-other-hint"
                  className="input"
                  placeholder="e.g. severe peanut allergy, low-sodium"
                  value={form.dietaryOther}
                  onChange={(e) => update("dietaryOther", e.target.value)}
                />
              </TextField>

              <ChoiceField legend="T-shirt size" hint="We'll have swag at check-in.">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {TSHIRT_SIZES.map((s) => {
                    const on = form.tshirt === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        className="chip chip-square"
                        aria-pressed={on}
                        onClick={() => update("tshirt", s)}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </ChoiceField>

              <TextField
                id="reg-roommate"
                label="Roommate preference"
                hint="We'll do our best — not always possible."
              >
                <input
                  id="reg-roommate"
                  type="text"
                  aria-describedby="reg-roommate-hint"
                  className="input"
                  placeholder="Name of a teammate (optional)"
                  value={form.roommate}
                  onChange={(e) => update("roommate", e.target.value)}
                />
              </TextField>
            </div>

            <StepNav>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(0)}
              >
                <Icon name="arrow-left" size={16} strokeWidth={2} />
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep(2)}
              >
                Continue
                <Icon name="arrow-right" size={16} strokeWidth={2} />
              </button>
            </StepNav>
          </div>
        )}

        {step === 2 && (
          <div className="page-in" style={{ marginTop: 32 }}>
            <h2 style={STEP_TITLE}>Plus-one &amp; emergency contact</h2>

            <div style={FIELD_STACK}>
              <ChoiceField legend="Bringing a plus-one?">
                <div style={CHOICE_ROW}>
                  {[
                    { v: "no" as const, t: "Just me", d: "Flying solo." },
                    {
                      v: "yes" as const,
                      t: "Yes, plus one",
                      d: "Self-pay at the plus-one rate shown on the Hotel page.",
                    },
                  ].map((o) => (
                    <ChoiceCard
                      key={o.v}
                      active={form.plusOne === o.v}
                      onClick={() => update("plusOne", o.v)}
                      title={o.t}
                      detail={o.d}
                    />
                  ))}
                </div>
              </ChoiceField>

              {form.plusOne === "yes" && (
                <div className="panel" style={{ padding: 20, borderRadius: 14 }}>
                  <label htmlFor="reg-plus-one-name" className="label">
                    Plus-one name
                  </label>
                  <input
                    id="reg-plus-one-name"
                    type="text"
                    className="input"
                    placeholder="First and last name"
                    value={form.plusOneName}
                    onChange={(e) => update("plusOneName", e.target.value)}
                  />
                </div>
              )}

              <TextField
                id="reg-emergency"
                label="Emergency contact"
                hint="Name + phone, anyone we can reach if needed."
              >
                <input
                  id="reg-emergency"
                  type="text"
                  aria-describedby="reg-emergency-hint"
                  className="input"
                  placeholder="Name · +1 555 123 4567"
                  value={form.emergency}
                  onChange={(e) => update("emergency", e.target.value)}
                />
              </TextField>

              <TextField
                id="reg-arrival"
                label="Arrival / departure notes"
                hint="Early arrival, late departure, special routing."
              >
                <textarea
                  id="reg-arrival"
                  aria-describedby="reg-arrival-hint"
                  className="input"
                  rows={4}
                  placeholder="Anything we should know about your travel..."
                  value={form.arrivalNote}
                  onChange={(e) => update("arrivalNote", e.target.value)}
                />
              </TextField>
            </div>

            <StepNav>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(1)}
              >
                <Icon name="arrow-left" size={16} strokeWidth={2} />
                Back
              </button>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "12px 20px",
                }}
              >
                <span className="hint">You can change your answer later.</span>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={submitting}
                  onClick={() => void submit("yes")}
                >
                  {submitting ? (
                    "Submitting\u2026"
                  ) : (
                    <>
                      Submit RSVP
                      <Icon name="arrow-right" size={16} strokeWidth={2} />
                    </>
                  )}
                </button>
              </div>
            </StepNav>
          </div>
        )}
      </div>
    </RegistrationShell>
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

/* ------------------------------------------------------------------ */
/* Layout pieces                                                       */
/* ------------------------------------------------------------------ */

const STEP_TITLE: CSSProperties = {
  margin: 0,
  fontSize: 24,
  lineHeight: 1.25,
  fontWeight: 600,
  letterSpacing: "-0.02em",
};

const STEP_INTRO: CSSProperties = { marginTop: 8, maxWidth: 560, lineHeight: 1.6 };

const FIELD_STACK: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 28,
  marginTop: 28,
};

const CHOICE_ROW: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12 };

/** Page header + two-column body (form/result on the left, facts on the right). */
function RegistrationShell({
  lede,
  aside,
  children,
}: {
  lede?: string;
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page-in">
      <PageHeader eyebrow="Registration" title="Your RSVP" lede={lede} />
      <div className="container page-end" style={{ paddingTop: 40 }}>
        <div className="split" style={{ gap: 32 }}>
          <div className="split-main">{children}</div>
          {aside}
        </div>
      </div>
    </div>
  );
}

function StepNav({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 32,
        paddingTop: 28,
        borderTop: "1px solid var(--line)",
      }}
    >
      {children}
    </div>
  );
}

function AtAGlance({
  email,
  datesDisplay,
  venueName,
  closesDisplay,
  rates,
  slackChannel,
  supportEmail,
  faqHref,
}: {
  email: string;
  datesDisplay: string;
  venueName: string;
  closesDisplay: string | null;
  rates?: RegistrationRates;
  slackChannel?: string;
  supportEmail?: string;
  faqHref?: string;
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Dates", value: datesDisplay },
    { label: "Venue", value: venueName },
  ];
  if (closesDisplay) rows.push({ label: "Deadline", value: closesDisplay });
  if (typeof rates?.plusOne === "number") {
    rows.push({ label: "Plus-ones", value: `$${rates.plusOne}/day, self-pay` });
  }
  if (typeof rates?.extensionEmployee === "number") {
    rows.push({ label: "Extra nights", value: `$${rates.extensionEmployee}/day` });
  }
  if (typeof rates?.extensionPlusOne === "number") {
    rows.push({
      label: "Extra nights, plus-ones",
      value: `$${rates.extensionPlusOne}/day`,
    });
  }

  const linkStyle: CSSProperties = { color: "var(--accent)", fontWeight: 500 };
  const contacts: ((first: boolean) => ReactNode)[] = [];
  if (slackChannel) {
    contacts.push((first) => (
      <>
        {first ? "Post" : "post"} in{" "}
        <span style={{ color: "var(--ink)", fontWeight: 500 }}>{slackChannel}</span>
      </>
    ));
  }
  if (supportEmail) {
    contacts.push((first) => (
      <>
        {first ? "Email" : "email"}{" "}
        <a href={`mailto:${supportEmail}`} style={linkStyle}>
          {supportEmail}
        </a>
      </>
    ));
  }
  if (faqHref) {
    contacts.push((first) => (
      <>
        {first ? "See" : "see"} the{" "}
        <Link href={faqHref} style={linkStyle}>
          FAQ
        </Link>
      </>
    ));
  }

  return (
    <aside
      className="split-side sticky-side"
      aria-label="At a glance"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div className="card" style={{ padding: 20 }}>
        <div className="text-muted" style={{ fontSize: 13 }}>
          Signed in as
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 15,
            fontWeight: 600,
            overflowWrap: "anywhere",
          }}
        >
          {email}
        </div>
      </div>

      <div className="panel" style={{ padding: 24, borderRadius: 16 }}>
        <h2 className="h4" style={{ marginBottom: 8 }}>
          At a glance
        </h2>
        <dl style={{ margin: 0 }}>
          {rows.map((r, i) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                padding: i === rows.length - 1 ? "12px 0 0" : "12px 0",
                borderBottom:
                  i === rows.length - 1 ? undefined : "1px solid var(--line)",
                fontSize: 14,
              }}
            >
              <dt className="text-muted">{r.label}</dt>
              <dd style={{ margin: 0, fontWeight: 500, textAlign: "right" }}>
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {contacts.length > 0 && (
        <p
          className="body"
          style={{ fontSize: 14, padding: "0 4px", overflowWrap: "anywhere" }}
        >
          Questions?{" "}
          {contacts.map((render, i) => (
            <Fragment key={i}>
              {i > 0 &&
                (i === contacts.length - 1
                  ? contacts.length > 2
                    ? ", or "
                    : " or "
                  : ", ")}
              {render(i === 0)}
            </Fragment>
          ))}
          .
        </p>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

function RegistrationClosed({
  base,
  eventShortName,
}: {
  base: string;
  eventShortName: string;
}) {
  return (
    <div className="page-in">
      <PageHeader
        eyebrow="Registration"
        title="Registration is closed"
        lede={
          <>
            {eventShortName} isn&rsquo;t taking new RSVPs right now. If you
            need to change yours, reach out to your organizer.
          </>
        }
      />
      <div className="container page-end">
        <div style={{ marginTop: 32 }}>
          <Link href={`${base}/overview`} className="btn btn-secondary">
            <Icon name="arrow-left" size={16} strokeWidth={2} />
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
    <div
      className="card card-lg page-in"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 16,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 48,
          height: 48,
          borderRadius: 999,
          background: declined ? "var(--surface-2)" : "var(--accent-soft)",
          color: declined ? "var(--ink-muted)" : "var(--accent)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="check" size={24} strokeWidth={2} />
      </span>
      <div>
        <h2
          style={{
            margin: 0,
            fontSize: 32,
            lineHeight: 1.15,
            fontWeight: 600,
            letterSpacing: "-0.025em",
          }}
        >
          {declined ? <>We&rsquo;ll miss you.</> : <>See you in {cityShort}.</>}
        </h2>
        <p
          className="body"
          style={{ marginTop: 10, maxWidth: 520, fontSize: 16, lineHeight: 1.6 }}
        >
          {declined
            ? "Your RSVP is recorded. Reach out to your organizer if anything changes."
            : "Your RSVP is recorded. We\u2019ll follow up with flight booking instructions and your rooming confirmation in the coming weeks."}
        </p>
        {submittedAt && (
          <p className="hint" style={{ margin: "12px 0 0" }}>
            Recorded {formatDateTime(submittedAt)}
          </p>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
        <Link href={`${base}/agenda`} className="btn btn-primary">
          See the agenda
          <Icon name="arrow-right" size={16} strokeWidth={2} />
        </Link>
        <Link href={`${base}/hotel`} className="btn btn-secondary">
          Travel details
        </Link>
        <button type="button" onClick={onEdit} className="btn btn-secondary">
          Change my answer
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form pieces                                                         */
/* ------------------------------------------------------------------ */

/** Large radio-style card; selected state is carried by aria-pressed. */
function ChoiceCard({
  active,
  onClick,
  title,
  detail,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      className="choice"
      aria-pressed={active}
      onClick={onClick}
      style={{ flex: "1 1 240px", width: "auto" }}
    >
      <span className="choice-dot" aria-hidden />
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
        <span className="body" style={{ fontSize: 14, lineHeight: 1.5 }}>
          {detail}
        </span>
      </span>
    </button>
  );
}

/** Group of toggle buttons with a legend and optional hint. */
function ChoiceField({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="field">
      <legend>{legend}</legend>
      {hint && (
        <div className="hint" style={{ marginTop: 4 }}>
          {hint}
        </div>
      )}
      <div style={{ marginTop: 12 }}>{children}</div>
    </fieldset>
  );
}

/**
 * Label + optional hint above a single control. The control itself is
 * passed as children and must carry the matching `id` (and
 * `aria-describedby={`${id}-hint`}` when a hint is shown).
 */
function TextField({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="label"
        style={hint ? { marginBottom: 2 } : undefined}
      >
        {label}
      </label>
      {hint && (
        <div id={`${id}-hint`} className="hint" style={{ marginBottom: 8 }}>
          {hint}
        </div>
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
      <PageHeader eyebrow="Registration" title="Hold on a second" />
      <div className="container page-end">
        <div
          className="callout callout-warn"
          style={{ marginTop: 32, maxWidth: 640 }}
        >
          <Icon
            name="alert"
            size={20}
            style={{ marginTop: 1, color: "var(--warn)" }}
          />
          <p style={{ margin: 0 }}>
            We couldn&rsquo;t load your RSVP details just now. Refresh in a
            moment, or head back to the overview and try again.
          </p>
        </div>
        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 12,
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
          <Link href={`/e/${slug}/overview`} className="btn btn-secondary">
            Back to overview
          </Link>
        </div>
      </div>
    </div>
  );
}
