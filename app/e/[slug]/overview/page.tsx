import Link from "next/link";
import { notFound } from "next/navigation";
import { Countdown } from "@/components/Countdown";
import { Icon, type IconName } from "@/components/Icon";
import { ImgPh, type ImgPhVariant } from "@/components/ImgPh";
import { loadEvent } from "@/lib/content";
import { formatMonthDay } from "@/lib/format";

const PROGRAM_ICONS: IconName[] = ["target", "layers", "pen", "users"];
const MOSAIC_VARIANTS: ImgPhVariant[] = ["palms", "ocean", "pool"];
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const base = `/e/${slug}`;
  const { content, meta } = loadEvent(slug);
  if (!meta.enabledSections.includes("overview")) notFound();
  const registrationIsOpen = content.registration.isOpen;
  const { opensISO, closesISO } = content.registration;
  const cityShort = content.venue.cityShort ?? content.venue.city;
  const agendaEnabled = meta.enabledSections.includes("agenda");
  const hotelEnabled = meta.enabledSections.includes("hotel");
  const faqEnabled = meta.enabledSections.includes("faq");
  const editorial = content.overview;
  const title = editorial?.headline
    ? [editorial.headline.main, editorial.headline.emphasis].filter(Boolean).join(" ")
    : content.brand.client;
  const countdownHeading = editorial?.countdownHeading;
  const countdownLabel = countdownHeading
    ? `${countdownHeading.before ?? ""}${countdownHeading.emphasis}${countdownHeading.after ?? ""}`
    : "Until we’re all together.";
  const mosaic = editorial?.mosaic ?? [];

  const { startISO, endISO } = content.dates;
  const startDay = weekdayOf(startISO);
  const endDay = weekdayOf(endISO);
  const facts: { label: string; value: string; sub?: string }[] = [
    {
      label: "Dates",
      value: content.dates.display,
      sub:
        startDay && endDay && startISO.slice(0, 10) !== endISO.slice(0, 10)
          ? `${startDay} to ${endDay}`
          : startDay,
    },
    { label: "Location", value: cityShort, sub: content.venue.neighborhood },
    ...(editorial?.mastheadStats ?? []).map((stat) => ({
      label: stat.eyebrow,
      value: stat.value,
      sub: stat.sub,
    })),
  ];

  const slack = content.contact?.slackChannel;
  const supportEmail = content.contact?.supportEmail;
  const showQuestions = Boolean(slack || supportEmail || faqEnabled);
  const questionsCopy = slack
    ? `Post in ${slack} on Slack — that’s the fastest way to get a response from the events team.`
    : supportEmail
      ? "Email the events team and we’ll get back to you."
      : "Most answers are already in the FAQ.";

  return (
    <div className="page-in page-end">
      {/* HERO */}
      <section
        className="container page-head split split-end"
        style={{ paddingBottom: 48 }}
      >
        <div
          className="split-main"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 24,
          }}
        >
          <span
            className="badge badge-accent badge-dot"
            style={{ padding: "6px 12px", gap: 8 }}
          >
            {registrationIsOpen
              ? "Registration open"
              : `Registration opens ${opensISO ? formatMonthDay(opensISO) : "soon"}`}
          </span>
          <h1 className="h-hero">{title}</h1>
          <p className="lede" style={{ maxWidth: 560, fontSize: 20, lineHeight: 1.55 }}>
            {content.brand.tagline}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px", fontSize: 15 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Icon name="calendar" size={18} style={{ color: "var(--ink-muted)" }} />
              {content.dates.display}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Icon name="pin" size={18} style={{ color: "var(--ink-muted)" }} />
              {content.venue.name}, {content.venue.city}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
            <Link href={`${base}/registration`} className="btn btn-primary">
              Count me in
              <Icon name="arrow-right" size={16} strokeWidth={2} />
            </Link>
            {agendaEnabled && (
              <Link href={`${base}/agenda`} className="btn btn-secondary">
                See the agenda
              </Link>
            )}
          </div>
        </div>
        <div
          className="split-side panel"
          style={{ flexBasis: 320, display: "flex", flexDirection: "column", gap: 20 }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 500,
              color: "var(--ink-muted)",
            }}
          >
            {countdownLabel}
          </p>
          <Countdown targetISO={startISO} />
          {editorial?.arrivalDetail && (
            <p className="text-muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              {editorial.arrivalDetail}
            </p>
          )}
        </div>
      </section>

      {/* HERO PHOTO */}
      <section className="container">
        <ImgPh
          variant="pool"
          src={editorial?.hero?.src}
          alt={editorial?.hero?.alt ?? content.venue.name}
          label={
            editorial?.hero?.src ? undefined : (editorial?.hero?.label ?? content.venue.name)
          }
          ratio="21/9"
          sizes="(max-width: 1168px) 100vw, 1120px"
          priority
        />
      </section>

      {/* FACTS */}
      <section className="container" style={{ paddingTop: 40 }}>
        <dl className="facts" style={{ margin: 0 }}>
          {facts.map((fact, i) => (
            <div key={`${fact.label}-${i}`}>
              <dt style={{ fontSize: 13, color: "var(--ink-muted)" }}>{fact.label}</dt>
              <dd
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  letterSpacing: "-0.015em",
                }}
              >
                {fact.value}
              </dd>
              {fact.sub && (
                <dd className="text-muted" style={{ margin: 0, fontSize: 14 }}>
                  {fact.sub}
                </dd>
              )}
            </div>
          ))}
        </dl>
      </section>

      {/* WHAT TO EXPECT */}
      {editorial?.program && (
        <section className="container section">
          <div className="section-head" style={{ marginBottom: 40 }}>
            <div style={{ flex: "1 1 360px", minWidth: 0 }}>
              <div className="kicker">The program</div>
              <h2 className="h2" style={{ marginTop: 8 }}>
                What to expect
              </h2>
            </div>
            <p
              className="body"
              style={{ flex: "1 1 360px", maxWidth: 480, fontSize: 17, lineHeight: 1.6 }}
            >
              {editorial.program.intro}
            </p>
          </div>
          <div className="cards cards-4">
            {editorial.program.sections.map((section, i) => (
              <div
                key={`${section.title}-${i}`}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 40,
                  minHeight: 220,
                }}
              >
                <span className="icon-tile">
                  <Icon name={PROGRAM_ICONS[i % PROGRAM_ICONS.length]} />
                </span>
                <div>
                  <h3 className="h3">{section.title}</h3>
                  <p className="body" style={{ marginTop: 8 }}>
                    {section.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* THE VENUE */}
      {mosaic.length > 0 && (
        <section className="container section">
          <div className="section-head">
            <div>
              <div className="kicker">The venue</div>
              <h2 className="h2" style={{ marginTop: 8 }}>
                {content.venue.name}
              </h2>
            </div>
            {hotelEnabled && (
              <Link href={`${base}/hotel`} className="link-arrow">
                Hotel &amp; travel
                <Icon name="arrow-right" size={16} strokeWidth={2} />
              </Link>
            )}
          </div>
          <div className="cards cards-3">
            {mosaic.map((img, i) => (
              <ImgPh
                key={`mosaic-${i}`}
                variant={MOSAIC_VARIANTS[i % MOSAIC_VARIANTS.length]}
                src={img.src}
                alt={img.alt}
                caption={img.alt}
                ratio="4/3"
                sizes="(max-width: 900px) 100vw, 370px"
                style={{ borderRadius: "var(--r-lg)" }}
              />
            ))}
          </div>
        </section>
      )}

      {/* KEY DATES */}
      <section className="container section">
        <div className="section-head" style={{ marginBottom: 24 }}>
          <div>
            <div className="kicker">Mark your calendar</div>
            <h2 className="h2" style={{ marginTop: 8 }}>
              Key dates
            </h2>
          </div>
          {agendaEnabled && (
            <Link href={`${base}/agenda`} className="link-arrow">
              Full agenda
              <Icon name="arrow-right" size={16} strokeWidth={2} />
            </Link>
          )}
        </div>
        <div className="rows">
          {registrationIsOpen ? (
            <DateRow
              date="Open now"
              tone="badge"
              label="Registration is open"
              detail="Head to the registration page to confirm your spot."
            />
          ) : (
            <DateRow
              date={opensISO ? rowDate(opensISO) : "Soon"}
              tone="badge"
              label="Registration opens"
              detail="The sooner the better once it's live."
            />
          )}
          {closesISO ? (
            <DateRow
              date={rowDate(closesISO)}
              tone="deadline"
              label="Registration closes"
              detail="Register and book flights by this date to secure your spot and hotel room."
            />
          ) : (
            <DateRow
              date="TBD"
              tone="muted"
              label="Registration deadline coming soon"
              detail="We'll share it once flight coordination is locked in."
            />
          )}
          <DateRow
            date={rowDate(startISO)}
            label={`Arrive in ${cityShort}`}
            detail={editorial?.arrivalDetail}
          />
          <DateRow
            date={rowDate(endISO)}
            label="Event wraps"
            detail={editorial?.departureDetail}
          />
        </div>
      </section>

      {/* QUESTIONS */}
      {showQuestions && (
        <section className="container section">
          <div className="dark-band">
            <div style={{ flex: "1 1 380px", minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 32,
                  lineHeight: 1.15,
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                }}
              >
                Questions?
              </h2>
              <p className="body" style={{ marginTop: 10, maxWidth: 520, fontSize: 16, lineHeight: 1.6 }}>
                {questionsCopy}
              </p>
            </div>
            {(faqEnabled || supportEmail) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, maxWidth: "100%" }}>
                {faqEnabled && (
                  <Link href={`${base}/faq`} className="btn btn-light">
                    Read the FAQ
                  </Link>
                )}
                {supportEmail && (
                  <a
                    href={`mailto:${supportEmail}`}
                    className="btn btn-outline-light"
                    style={{ maxWidth: "100%", whiteSpace: "normal", overflowWrap: "anywhere" }}
                  >
                    {supportEmail}
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/** Weekday name for the calendar date in an ISO string, read from the
    string itself (like formatMonthDay) so it never shifts with timezone. */
function weekdayOf(iso: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return undefined;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return WEEKDAYS[date.getUTCDay()];
}

/** "Mon, June 1" */
function rowDate(iso: string): string {
  const weekday = weekdayOf(iso);
  const monthDay = formatMonthDay(iso);
  return weekday ? `${weekday.slice(0, 3)}, ${monthDay}` : monthDay;
}

function DateRow({
  date,
  label,
  detail,
  tone,
}: {
  date: string;
  label: string;
  detail?: string;
  tone?: "badge" | "deadline" | "muted";
}) {
  const dateColor =
    tone === "deadline" ? "var(--danger)" : tone === "muted" ? "var(--ink-muted)" : undefined;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "6px 32px",
        padding: "24px 0",
      }}
    >
      <div style={{ flex: "0 0 140px", fontSize: 15, fontWeight: 600, color: dateColor }}>
        {tone === "badge" ? (
          <span className="badge badge-accent" style={{ padding: "4px 10px", fontWeight: 600 }}>
            {date}
          </span>
        ) : (
          date
        )}
      </div>
      <div style={{ flex: "1 1 320px", minWidth: 0 }}>
        <h3 style={{ margin: 0, fontSize: 17, lineHeight: 1.4, fontWeight: 600 }}>{label}</h3>
        {detail && (
          <p className="body" style={{ marginTop: 4 }}>
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}
