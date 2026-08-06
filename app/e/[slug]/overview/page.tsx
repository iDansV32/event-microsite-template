import Link from "next/link";
import { notFound } from "next/navigation";
import { Countdown } from "@/components/Countdown";
import { ImgPh } from "@/components/ImgPh";
import { loadEvent } from "@/lib/content";
import { formatMonthDay } from "@/lib/format";

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
  const registrationHasDeadline = !!content.registration.closesISO;
  const cityShort = content.venue.cityShort ?? content.venue.city;
  const opensDisplay = content.registration.opensISO
    ? formatMonthDay(content.registration.opensISO)
    : "Soon";
  const closesDisplay = content.registration.closesISO
    ? formatMonthDay(content.registration.closesISO)
    : "TBD";
  const agendaEnabled = meta.enabledSections.includes("agenda");
  const editorial = content.overview;
  const headline = editorial?.headline ?? { main: content.brand.client };
  const countdownHeading = editorial?.countdownHeading;
  return (
    <div className="page-in">
      {/* HERO */}
      <section
        className="container-ed section-pad-top section-pad-bottom"
        style={{ paddingTop: 64, paddingBottom: 96 }}
      >
        <div
          className="ed-grid stack-mobile"
          style={{
            gridTemplateColumns: "1.1fr 1fr",
            gap: 56,
            alignItems: "start",
          }}
        >
          <div>
            <div className="ed-flex items-center" style={{ gap: 12, marginBottom: 36 }}>
              <span className="tag tag-accent">
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--terracotta)",
                  }}
                />
                {registrationIsOpen
                  ? "REGISTRATION OPEN"
                  : `REGISTRATION OPENS ${opensDisplay.toUpperCase()}`}
              </span>
              {editorial?.issueLabel && (
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-55)" }}>
                  {editorial.issueLabel}
                </span>
              )}
            </div>
            <h1
              className="display"
              style={{ fontSize: "clamp(56px, 13vw, 128px)", letterSpacing: "-0.035em" }}
            >
              {headline.main}
              {headline.emphasis && (
                <>
                  <br />
                  <em style={{ fontStyle: "italic", color: "var(--terracotta)" }}>
                    {headline.emphasis}
                  </em>
                </>
              )}
            </h1>
            <div
              className="serif"
              style={{
                fontSize: 22,
                lineHeight: 1.5,
                marginTop: 32,
                color: "var(--ink-70)",
                fontStyle: "italic",
                maxWidth: 520,
              }}
            >
              {content.brand.tagline}
            </div>
            <div
              className="ed-flex"
              style={{ marginTop: 40, flexWrap: "wrap", gap: 12 }}
            >
              <Link href={`${base}/registration`} className="btn btn-primary">
                Count me in →
              </Link>
              {agendaEnabled && (
                <Link href={`${base}/agenda`} className="btn btn-ghost">
                  See the agenda
                </Link>
              )}
            </div>
          </div>
          <div>
            <ImgPh
              variant="ocean"
              src={editorial?.hero?.src}
              alt={editorial?.hero?.alt ?? `${content.venue.name} hero`}
              label={editorial?.hero?.label ?? content.venue.name}
              ratio="4/5"
            />
            {editorial?.heroCaption && (
              <div
                className="ed-flex items-center"
                style={{ marginTop: 16, gap: 12, fontSize: 12, color: "var(--ink-55)" }}
              >
                {editorial.heroCaption.figLabel && (
                  <span className="mono">{editorial.heroCaption.figLabel}</span>
                )}
                <span className="serif" style={{ fontStyle: "italic", fontSize: 14 }}>
                  {editorial.heroCaption.text}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* MASTHEAD STRIP */}
      {(() => {
        const cells: { eyebrow: string; value: string; sub?: string }[] = [
          { eyebrow: "Dates", value: content.dates.displayShort },
          {
            eyebrow: "Venue",
            value: cityShort,
            sub: content.venue.neighborhood,
          },
          ...(editorial?.mastheadStats ?? []),
        ];
        return (
          <section
            style={{ background: "var(--ink)", color: "var(--bg)", padding: "56px 0" }}
          >
            <div
              className="container-ed ed-grid stack-mobile"
              style={{
                gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
                gap: 32,
              }}
            >
              {cells.map((c, i) => (
                <MastCell
                  key={`${c.eyebrow}-${i}`}
                  eyebrow={c.eyebrow}
                  value={c.value}
                  sub={c.sub ?? ""}
                />
              ))}
            </div>
          </section>
        );
      })()}

      {/* COUNTDOWN */}
      <section className="container-ed" style={{ paddingTop: 96, paddingBottom: 64 }}>
        <div
          className="ed-flex items-end"
          style={{
            marginBottom: 32,
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "space-between",
          }}
        >
          <div>
            <div className="eyebrow eyebrow-accent">Count with us</div>
            <h2 className="display" style={{ fontSize: 48, marginTop: 8 }}>
              {countdownHeading ? (
                <>
                  {countdownHeading.before ?? ""}
                  <em style={{ fontStyle: "italic" }}>
                    {countdownHeading.emphasis}
                  </em>
                  {countdownHeading.after ?? ""}
                </>
              ) : (
                <>
                  Until we&rsquo;re <em style={{ fontStyle: "italic" }}>all</em>{" "}
                  together.
                </>
              )}
            </h2>
          </div>
          <div
            className="script"
            style={{
              fontSize: 30,
              color: "var(--terracotta)",
              transform: "rotate(-2deg)",
            }}
          >
            see you soon!
          </div>
        </div>
        <div
          className="countdown-card"
          style={{
            background: "var(--paper)",
            border: "1px solid var(--ink-12)",
            borderRadius: 18,
            padding: "48px 56px",
          }}
        >
          <Countdown targetISO={content.dates.startISO} />
        </div>
      </section>

      {/* WHAT TO EXPECT */}
      {editorial?.program && (
      <section
        className="container-ed section-pad-top section-pad-bottom"
        style={{ paddingTop: 64, paddingBottom: 80 }}
      >
        <div
          className="ed-grid stack-mobile"
          style={{ gridTemplateColumns: "1fr 1.4fr", gap: 64 }}
        >
          <div>
            <div className="eyebrow eyebrow-accent">The program</div>
            <h2
              className="display"
              style={{ fontSize: 56, marginTop: 12, lineHeight: 0.95 }}
            >
              What to
              <br />
              expect.
            </h2>
            <p
              className="serif"
              style={{
                fontSize: 18,
                lineHeight: 1.6,
                color: "var(--ink-70)",
                marginTop: 24,
                fontStyle: "italic",
              }}
            >
              {editorial.program.intro}
            </p>
          </div>
          <div className="ed-grid grid-2" style={{ gap: 16 }}>
            {editorial.program.sections.map((section, i) => {
              const tints = [
                "var(--tint-blush)",
                "var(--tint-clay)",
                "var(--tint-fog)",
                "var(--tint-teal)",
              ];
              const roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];
              const x = {
                n: roman[i] ?? String(i + 1),
                t: section.title,
                d: section.detail,
                tint: tints[i % tints.length],
              };
              return (
              <div
                key={x.n}
                style={{
                  background: x.tint,
                  borderRadius: 18,
                  padding: 28,
                  minHeight: 220,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                }}
              >
                <div
                  className="serif"
                  style={{
                    fontSize: 52,
                    fontStyle: "italic",
                    color: "var(--ink)",
                    opacity: 0.55,
                    lineHeight: 1,
                    fontWeight: 300,
                  }}
                >
                  {x.n}.
                </div>
                <div>
                  <div
                    className="serif"
                    style={{ fontSize: 28, fontWeight: 400, letterSpacing: "-0.01em" }}
                  >
                    {x.t}
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: "var(--ink-70)",
                      marginTop: 10,
                      marginBottom: 0,
                    }}
                  >
                    {x.d}
                  </p>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* EDITORIAL IMAGE STRIP */}
      {editorial?.mosaic && editorial.mosaic.length > 0 && (() => {
        const variants = ["palms", "sunset", "pool"] as const;
        const ratios = ["3/4", "16/10", "3/4"] as const;
        return (
          <section
            className="container-ed section-pad-bottom"
            style={{ paddingBottom: 96 }}
          >
            <div
              className="ed-grid stack-mobile"
              style={{ gridTemplateColumns: "1fr 1.3fr 1fr", gap: 12 }}
            >
              {editorial.mosaic.map((img, i) => (
                <ImgPh
                  key={`mosaic-${i}`}
                  variant={variants[i % variants.length]}
                  src={img.src}
                  alt={img.alt}
                  label={img.label}
                  ratio={ratios[i % ratios.length]}
                />
              ))}
            </div>
            {editorial?.mosaicCaption && (
              <div
                className="ed-flex items-center"
                style={{ marginTop: 20, gap: 20 }}
              >
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-55)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {editorial.mosaicCaption}
                </div>
                <div style={{ flex: 1, height: 1, background: "var(--ink-12)" }} />
              </div>
            )}
          </section>
        );
      })()}

      {/* IMPORTANT DATES */}
      <section className="container-ed" style={{ paddingBottom: 120 }}>
        <div
          className="ed-flex items-end"
          style={{
            marginBottom: 40,
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "space-between",
          }}
        >
          <div>
            <div className="eyebrow eyebrow-accent">Mark your calendar</div>
            <h2
              className="display"
              style={{ fontSize: 56, marginTop: 12, lineHeight: 0.95 }}
            >
              Important
              <br />
              dates.
            </h2>
          </div>
          {agendaEnabled && (
            <Link href={`${base}/agenda`} className="btn-link">
              Full agenda →
            </Link>
          )}
        </div>
        <div style={{ borderTop: "1px solid var(--ink-12)" }}>
          {registrationIsOpen ? (
            <DateRow
              date="Open"
              label="Registration is open"
              detail="Head to the registration page to confirm your spot."
              tone="accent"
            />
          ) : (
            <DateRow
              date={opensDisplay}
              label="Registration opens"
              detail="The sooner the better once it's live."
              tone="accent"
            />
          )}
          {registrationHasDeadline ? (
            <DateRow
              date={closesDisplay}
              label="Registration closes"
              detail="Register and book flights by this date to secure your spot and hotel room."
              tone="danger"
            />
          ) : (
            <DateRow
              date="TBD"
              label="Registration deadline coming soon"
              detail="We'll share it once flight coordination is locked in."
              tone="accent"
            />
          )}
          <DateRow
            date={formatMonthDay(content.dates.startISO)}
            label={`Arrive in ${cityShort}`}
            detail={editorial?.arrivalDetail}
          />
          <DateRow
            date={formatMonthDay(content.dates.endISO)}
            label="Event wraps"
            detail={editorial?.departureDetail}
          />
        </div>
      </section>
    </div>
  );
}

function MastCell({ eyebrow, value, sub }: { eyebrow: string; value: string; sub: string }) {
  return (
    <div>
      <div
        className="eyebrow"
        style={{ color: "rgba(245,240,232,0.6)", fontSize: 10 }}
      >
        {eyebrow}
      </div>
      <div
        className="serif"
        style={{ fontSize: 32, fontWeight: 400, marginTop: 10, letterSpacing: "-0.01em" }}
      >
        {value}
      </div>
      <div style={{ fontSize: 13, color: "rgba(245,240,232,0.65)", marginTop: 4 }}>{sub}</div>
    </div>
  );
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
  tone?: "accent" | "danger";
}) {
  const color =
    tone === "danger" ? "var(--danger)" : tone === "accent" ? "var(--terracotta)" : "var(--ink)";
  return (
    <div
      className="date-row"
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr auto",
        alignItems: "baseline",
        gap: 32,
        padding: "28px 0",
        borderBottom: "1px solid var(--ink-12)",
      }}
    >
      <div
        className="serif"
        style={{
          fontSize: 24,
          fontWeight: 400,
          letterSpacing: "-0.01em",
          color,
          fontStyle: tone ? "italic" : "normal",
        }}
      >
        {date}
      </div>
      <div>
        <div
          className="serif"
          style={{ fontSize: 22, fontWeight: 400, letterSpacing: "-0.005em" }}
        >
          {label}
        </div>
        {detail && (
          <div className="muted" style={{ fontSize: 14, marginTop: 4, lineHeight: 1.5 }}>
            {detail}
          </div>
        )}
      </div>
      {tone === "danger" && <span className="tag tag-danger">Don&rsquo;t miss it</span>}
      {tone === "accent" && <span className="tag tag-accent">Coming up</span>}
      {!tone && (
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-55)" }}>
          →
        </span>
      )}
    </div>
  );
}
