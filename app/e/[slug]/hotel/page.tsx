import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ImgPh } from "@/components/ImgPh";
import { loadEvent } from "@/lib/content";
import { formatMonthDay } from "@/lib/format";

export default async function HotelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { content, meta } = loadEvent(slug);
  if (!meta.enabledSections.includes("hotel")) notFound();
  const registrationIsOpen = content.registration.isOpen;
  const registrationHasDeadline = !!content.registration.closesISO;
  const closesDisplay = content.registration.closesISO
    ? formatMonthDay(content.registration.closesISO)
    : "TBD";
  const opensDisplay = content.registration.opensISO
    ? formatMonthDay(content.registration.opensISO)
    : "soon";
  const cityShort = content.venue.cityShort ?? content.venue.city;
  const hotelEditorial = content.hotel;
  return (
    <div className="page-in">
      <PageHeader
        eyebrow="Where you'll stay"
        title={
          <>
            Hotel
            <br />& <em style={{ fontStyle: "italic" }}>travel.</em>
          </>
        }
        lede={
          hotelEditorial?.lede ??
          `Everything you need to get to ${content.venue.city}.`
        }
      />

      {hotelEditorial?.hero && hotelEditorial.hero.length > 0 && (() => {
        // The "hotel-mosaic" CSS expects exactly 4 slots in a specific layout:
        //   [0] tall-left (row 1 / span 2)
        //   [1] mid-top
        //   [2] mid-bot
        //   [3] wide-right (col 2 / span 2)
        // Events with fewer images lose the bespoke slot spans; they still
        // render, just in default grid order.
        const variants = ["ocean", "pool", "palms", "sunset"] as const;
        const hero = hotelEditorial.hero;
        const wrap = [
          { gridRow: "1 / span 2" } as const,
          undefined,
          undefined,
          { gridColumn: "2 / span 2" } as const,
        ];
        return (
          <section className="container-ed" style={{ paddingBottom: 96 }}>
            <div className="hotel-mosaic">
              {hero.map((img, i) => {
                const imgNode = (
                  <ImgPh
                    variant={variants[i % variants.length]}
                    src={img.src}
                    alt={img.alt}
                    label={img.label}
                    ratio="unset"
                    style={{ height: "100%", aspectRatio: "unset" }}
                  />
                );
                const outer = wrap[i];
                return outer ? (
                  <div key={`hotel-hero-${i}`} style={outer}>
                    {imgNode}
                  </div>
                ) : (
                  <div key={`hotel-hero-${i}`} style={{ display: "contents" }}>
                    {imgNode}
                  </div>
                );
              })}
            </div>
            <div className="ed-flex items-center" style={{ marginTop: 20, gap: 20 }}>
              <div
                className="mono"
                style={{ fontSize: 11, color: "var(--ink-55)", letterSpacing: "0.08em" }}
              >
                {content.venue.name.toUpperCase()}
                {content.venue.neighborhood && ` · ${content.venue.neighborhood.toUpperCase()}`}
              </div>
              <div style={{ flex: 1, height: 1, background: "var(--ink-12)" }} />
              {content.venue.url && (
                <a
                  href={content.venue.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-link"
                  style={{ fontSize: 13 }}
                >
                  Resort site →
                </a>
              )}
            </div>
          </section>
        );
      })()}

      <section className="container-ed" style={{ paddingBottom: 96 }}>
        <div className="ed-grid grid-2" style={{ gap: 24 }}>
          <div className="card">
            <div className="eyebrow eyebrow-accent">The venue</div>
            <h2
              className="display"
              style={{ fontSize: 40, marginTop: 12, marginBottom: 20 }}
            >
              {content.venue.name}
            </h2>
            {hotelEditorial?.intro && (
              <p
                className="serif"
                style={{
                  fontSize: 17,
                  lineHeight: 1.55,
                  color: "var(--ink-70)",
                  fontStyle: "italic",
                  marginBottom: 28,
                }}
              >
                {hotelEditorial.intro}
              </p>
            )}

            <InfoRow label="Address" value={content.venue.address} />
            <InfoRow
              label="Room block"
              value={
                registrationHasDeadline
                  ? `Managed by the events team — register by ${closesDisplay} to be on the rooming list.`
                  : "Managed by the events team — register to be on the rooming list. Final deadline coming soon."
              }
            />

            <div
              style={{
                marginTop: 28,
                padding: 24,
                background: "var(--bg-deep)",
                borderRadius: 12,
              }}
            >
              <div className="eyebrow eyebrow-accent" style={{ marginBottom: 16 }}>
                How rooming works
              </div>
              <ol
                style={{
                  margin: 0,
                  paddingLeft: 0,
                  listStyle: "none",
                  display: "grid",
                  gap: 14,
                }}
              >
                {[
                  registrationHasDeadline
                    ? `Register by ${closesDisplay} (${registrationIsOpen ? "open now" : `opens ${opensDisplay}`} — form + travel booking)`
                    : `Register via the registration page (${registrationIsOpen ? "open now" : `opens ${opensDisplay}`}) — final deadline coming soon`,
                  "Events team adds you to the rooming list",
                  "You receive your confirmation directly from the hotel",
                ].map((t, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: 14,
                      fontSize: 14,
                      lineHeight: 1.55,
                    }}
                  >
                    <span
                      className="serif"
                      style={{
                        fontSize: 22,
                        fontStyle: "italic",
                        color: "var(--terracotta)",
                        minWidth: 28,
                        lineHeight: 1,
                      }}
                    >
                      0{i + 1}
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="card">
            <div className="eyebrow eyebrow-accent">Getting there</div>
            <h2
              className="display"
              style={{ fontSize: 40, marginTop: 12, marginBottom: 28 }}
            >
              {(() => {
                if (hotelEditorial?.travelTitle) {
                  const { main, emphasis } = hotelEditorial.travelTitle;
                  return (
                    <>
                      {main}
                      {emphasis && (
                        <>
                          <br />
                          <em style={{ fontStyle: "italic" }}>{emphasis}</em>
                        </>
                      )}
                    </>
                  );
                }
                // Neutral default, derived from what other travel content is
                // configured so the title reflects what's actually on the page.
                if (content.airport && hotelEditorial?.passportNote) {
                  return (
                    <>
                      Flights, transfers,
                      <br />
                      <em style={{ fontStyle: "italic" }}>passports.</em>
                    </>
                  );
                }
                if (content.airport) {
                  return (
                    <>
                      Flights &amp;<br />
                      <em style={{ fontStyle: "italic" }}>transfers.</em>
                    </>
                  );
                }
                return (
                  <em style={{ fontStyle: "italic" }}>Travel.</em>
                );
              })()}
            </h2>

            {content.airport && (
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: "var(--tint-teal)",
                  marginBottom: 24,
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div
                  className="serif"
                  style={{
                    fontSize: 42,
                    color: "var(--teal)",
                    lineHeight: 1,
                    fontStyle: "italic",
                    fontWeight: 300,
                  }}
                >
                  {content.airport.code}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="serif" style={{ fontSize: 18, fontWeight: 400 }}>
                    {content.airport.name}
                  </div>
                  {content.airport.detail && (
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                      {content.airport.detail}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="eyebrow" style={{ marginBottom: 12 }}>
              Booking flights
            </div>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--ink-70)",
                marginBottom: 16,
              }}
            >
              {content.airport
                ? `Flights to ${content.airport.name} (${content.airport.code}) will be coordinated by the events team.`
                : "Flights will be coordinated by the events team."}
              {hotelEditorial?.flightsNote && (
                <>
                  {" "}
                  {hotelEditorial.flightsNote}
                </>
              )}
            </p>

            {hotelEditorial?.passportNote && (
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: "rgba(155,58,40,0.08)",
                  border: "1px solid rgba(155,58,40,0.22)",
                  marginBottom: 16,
                }}
              >
                <div
                  className="ed-flex items-center"
                  style={{ marginBottom: 8, gap: 12 }}
                >
                  <span
                    className="serif"
                    style={{
                      fontSize: 20,
                      color: "var(--danger)",
                      fontStyle: "italic",
                    }}
                  >
                    !
                  </span>
                  <div className="eyebrow" style={{ color: "var(--danger)", margin: 0 }}>
                    Passport & visa
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: "var(--ink-70)",
                    margin: 0,
                  }}
                >
                  {hotelEditorial.passportNote}
                </p>
              </div>
            )}

            {(content.rates?.extensionEmployee || content.rates?.extensionPlusOne) && (
              <div
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: "var(--bg-deep)",
                }}
              >
                <div className="eyebrow" style={{ marginBottom: 10 }}>
                  Stay extensions
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-70)" }}>
                  Pre- and post-event nights available
                  {content.rates?.extensionEmployee !== undefined && (
                    <>
                      {" at "}
                      <strong style={{ color: "var(--ink)" }}>
                        ${content.rates.extensionEmployee}/day
                      </strong>{" "}
                      (employees)
                    </>
                  )}
                  {content.rates?.extensionPlusOne !== undefined && (
                    <>
                      {" or "}
                      <strong style={{ color: "var(--ink)" }}>
                        ${content.rates.extensionPlusOne}/day
                      </strong>{" "}
                      (plus-ones)
                    </>
                  )}
                  .
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {hotelEditorial?.fieldNotes && hotelEditorial.fieldNotes.length > 0 && (
        <section className="container-ed" style={{ paddingBottom: 120 }}>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 16 }}>
            Field notes
          </div>
          <h2
            className="display"
            style={{ fontSize: 56, marginBottom: 48, lineHeight: 0.95 }}
          >
            A few things
            <br />
            <em style={{ fontStyle: "italic" }}>to know.</em>
          </h2>
          <div className="ed-grid grid-3" style={{ gap: 24 }}>
            {hotelEditorial.fieldNotes.map((note, i) => (
              <div key={`${note.title}-${i}`}>
                <div
                  className="serif"
                  style={{
                    fontSize: 40,
                    color: "var(--terracotta)",
                    fontStyle: "italic",
                    fontWeight: 300,
                    lineHeight: 1,
                    marginBottom: 16,
                  }}
                >
                  {romanize(i + 1)}.
                </div>
                <h3
                  className="serif"
                  style={{
                    fontSize: 22,
                    fontWeight: 400,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {note.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.65,
                    color: "var(--ink-70)",
                    marginTop: 12,
                  }}
                >
                  {note.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px 1fr",
        gap: 16,
        padding: "14px 0",
        borderTop: "1px solid var(--ink-12)",
        fontSize: 14,
      }}
    >
      <div className="eyebrow">{label}</div>
      <div style={{ color: "var(--ink-70)", lineHeight: 1.55 }}>{value}</div>
    </div>
  );
}

const ROMAN = [
  "i",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "vii",
  "viii",
  "ix",
  "x",
  "xi",
  "xii",
];

function romanize(n: number): string {
  return ROMAN[n - 1] ?? String(n);
}
