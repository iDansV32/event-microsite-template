import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { ImgPh, type ImgPhVariant } from "@/components/ImgPh";
import { PageHeader } from "@/components/PageHeader";
import { loadEvent } from "@/lib/content";
import { formatMonthDay } from "@/lib/format";
import type { ImageSlot } from "@/lib/schemas";

const PHOTO_VARIANTS: ImgPhVariant[] = ["ocean", "pool", "palms", "sunset"];
const NOTE_ICONS: IconName[] = ["car", "sun", "shirt"];
const SMALL_PHOTO_HEIGHT = "clamp(160px, 17vw, 220px)";

export default async function HotelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const base = `/e/${slug}`;
  const { content, meta } = loadEvent(slug);
  if (!meta.enabledSections.includes("hotel")) notFound();
  const registrationEnabled = meta.enabledSections.includes("registration");
  const expensingEnabled = meta.enabledSections.includes("expensing");
  const registrationIsOpen = content.registration.isOpen;
  const registrationHasDeadline = !!content.registration.closesISO;
  const closesDisplay = content.registration.closesISO
    ? formatMonthDay(content.registration.closesISO)
    : "TBD";
  const opensDisplay = content.registration.opensISO
    ? formatMonthDay(content.registration.opensISO)
    : "soon";
  const hotel = content.hotel;
  const airport = content.airport;
  const flightsNote = hotel?.flightsNote;
  const passportNote = hotel?.passportNote;
  const fieldNotes = hotel?.fieldNotes ?? [];
  const [leadPhoto, widePhoto, ...smallPhotos] = hotel?.hero ?? [];

  // Neutral default heading, derived from what travel content is configured.
  const travelTitle = hotel?.travelTitle
    ? [hotel.travelTitle.main, hotel.travelTitle.emphasis].filter(Boolean).join(" ")
    : airport && passportNote
      ? "Flights, transfers, passports"
      : airport
        ? "Flights & transfers"
        : "Travel";

  const roomingSteps = [
    registrationHasDeadline
      ? `Register by ${closesDisplay} (${registrationIsOpen ? "open now" : `opens ${opensDisplay}`} — form + travel booking)`
      : `Register via the registration page (${registrationIsOpen ? "open now" : `opens ${opensDisplay}`}) — final deadline coming soon`,
    "Events team adds you to the rooming list",
    "You receive your confirmation directly from the hotel",
  ];

  const rates = content.rates;
  const rateCells = [
    { amount: rates?.extensionEmployee, label: "Extra nights · employees" },
    { amount: rates?.extensionPlusOne, label: "Extra nights · plus-ones" },
    { amount: rates?.plusOne, label: "Plus-one during the event" },
  ].filter((cell): cell is { amount: number; label: string } => cell.amount !== undefined);

  return (
    <div className="page-in page-end">
      <PageHeader
        eyebrow="Hotel & travel"
        title={content.venue.name}
        lede={hotel?.lede ?? `Everything you need to get to ${content.venue.city}.`}
      />

      {/* PHOTO GRID: one large, one wide, then small ones; stacks on phones. */}
      {leadPhoto && (
        <section className="container" style={{ paddingTop: 40 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div style={{ flex: "3 1 480px", minWidth: 0 }}>
              <GridPhoto
                img={leadPhoto}
                variant={PHOTO_VARIANTS[0]}
                height="clamp(260px, 36vw, 452px)"
                sizes="(max-width: 900px) 100vw, 660px"
                priority
              />
            </div>
            {widePhoto && (
              <div
                style={{
                  flex: "2 1 300px",
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <GridPhoto
                  img={widePhoto}
                  variant={PHOTO_VARIANTS[1]}
                  height={SMALL_PHOTO_HEIGHT}
                  sizes="(max-width: 900px) 100vw, 450px"
                />
                {smallPhotos.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {smallPhotos.map((img, i) => (
                      <div key={`hotel-photo-${i + 2}`} style={{ flex: "1 1 140px", minWidth: 0 }}>
                        <GridPhoto
                          img={img}
                          variant={PHOTO_VARIANTS[(i + 2) % PHOTO_VARIANTS.length]}
                          height={SMALL_PHOTO_HEIGHT}
                          sizes="(max-width: 900px) 50vw, 225px"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* WHERE YOU'LL STAY + ROOMING */}
      <section className="container section split">
        <div className="split-main">
          <div className="kicker">The venue</div>
          <h2 className="h2" style={{ marginTop: 8 }}>
            Where you&rsquo;ll stay
          </h2>
          {hotel?.intro && (
            <p className="lede" style={{ marginTop: 16, maxWidth: 560, fontSize: 17 }}>
              {hotel.intro}
            </p>
          )}
          <div className="rows" style={{ marginTop: 28 }}>
            <InfoRow label="Address" value={content.venue.address} />
            <InfoRow label="Dates" value={content.dates.display} />
            <InfoRow
              label="Room block"
              value={
                registrationHasDeadline
                  ? `Managed by the events team — register by ${closesDisplay} to be on the rooming list.`
                  : "Managed by the events team — register to be on the rooming list. Final deadline coming soon."
              }
            />
          </div>
          {content.venue.url && (
            <a
              href={content.venue.url}
              target="_blank"
              rel="noopener noreferrer"
              className="link-arrow"
              style={{ marginTop: 16 }}
            >
              Visit the resort website
              <Icon name="external" size={15} strokeWidth={2} />
            </a>
          )}
        </div>

        <div className="split-side panel" style={{ flexBasis: 340 }}>
          <h3 className="h3">How rooming works</h3>
          <ol
            style={{
              margin: "20px 0 0",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {roomingSteps.map((step, i) => (
              <li
                key={`rooming-${i}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  fontSize: 15,
                  lineHeight: 1.5,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flex: "0 0 auto",
                    width: 28,
                    height: 28,
                    boxSizing: "border-box",
                    borderRadius: 999,
                    background: "var(--bg)",
                    border: "1px solid var(--line-strong)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ paddingTop: 3 }}>{step}</span>
              </li>
            ))}
          </ol>
          {registrationEnabled && (
            <Link
              href={`${base}/registration`}
              className="btn btn-primary btn-block"
              style={{ marginTop: 24 }}
            >
              Go to registration
              <Icon name="arrow-right" size={16} strokeWidth={2} />
            </Link>
          )}
        </div>
      </section>

      {/* GETTING THERE */}
      {(flightsNote || airport || passportNote) && (
        <section className="container section">
          <div className="kicker">Getting there</div>
          <h2 className="h2" style={{ marginTop: 8, marginBottom: 32 }}>
            {travelTitle}
          </h2>
          <div className="cards cards-3">
            {flightsNote && (
              <TravelCard
                mark={
                  <span className="icon-tile">
                    <Icon name="plane" />
                  </span>
                }
                title="Flights"
                body={flightsNote}
              />
            )}
            {airport && (
              <TravelCard
                mark={
                  <span
                    className="icon-tile"
                    style={{
                      width: "auto",
                      alignSelf: "flex-start",
                      padding: "0 12px",
                      fontSize: 16,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {airport.code}
                  </span>
                }
                title={airport.name}
                body={airport.detail}
              />
            )}
            {passportNote && (
              <TravelCard
                mark={
                  <span className="icon-tile">
                    <Icon name="passport" />
                  </span>
                }
                title="Passports"
                body={passportNote}
              />
            )}
          </div>
        </section>
      )}

      {/* GOOD TO KNOW */}
      {fieldNotes.length > 0 && (
        <section className="container section-md">
          <h2
            style={{
              margin: "0 0 24px",
              fontSize: 28,
              lineHeight: 1.2,
              fontWeight: 600,
              letterSpacing: "-0.02em",
            }}
          >
            Good to know
          </h2>
          <div
            className="hairline"
            style={{ display: "flex", flexWrap: "wrap", gap: 32, paddingTop: 28 }}
          >
            {fieldNotes.map((note, i) => (
              <div
                key={`${note.title}-${i}`}
                style={{
                  flex: "1 1 280px",
                  minWidth: 0,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                }}
              >
                <Icon
                  name={NOTE_ICONS[i % NOTE_ICONS.length]}
                  style={{ color: "var(--ink-muted)", marginTop: 2 }}
                />
                <div style={{ minWidth: 0 }}>
                  <h3 className="h4">{note.title}</h3>
                  <p className="body" style={{ marginTop: 6 }}>
                    {note.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* EXTRA NIGHTS & GUESTS */}
      {rateCells.length > 0 && (
        <section className="container section-md">
          <div
            className="panel"
            style={{
              borderRadius: 24,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "32px 48px",
            }}
          >
            <div style={{ flex: "1 1 320px", minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 26,
                  lineHeight: 1.2,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                Staying longer or bringing a guest?
              </h2>
              <p className="body" style={{ marginTop: 10, lineHeight: 1.6 }}>
                Daily rates at {content.venue.name}.
              </p>
              {expensingEnabled && (
                <Link href={`${base}/expensing`} className="link-arrow" style={{ marginTop: 8 }}>
                  What&rsquo;s covered
                  <Icon name="arrow-right" size={16} strokeWidth={2} />
                </Link>
              )}
            </div>
            <div
              style={{
                flex: "2 1 420px",
                minWidth: 0,
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {rateCells.map((cell) => (
                <div
                  key={cell.label}
                  style={{
                    flex: "1 1 160px",
                    background: "var(--bg)",
                    borderRadius: 14,
                    padding: 20,
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    className="tabular"
                    style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.2, letterSpacing: "-0.02em" }}
                  >
                    ${cell.amount}
                    <span style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-muted)" }}>
                      {" "}
                      /day
                    </span>
                  </div>
                  <div className="text-muted" style={{ marginTop: 6, fontSize: 14, lineHeight: 1.45 }}>
                    {cell.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/** Photo slot with a fixed height. The label only marks an empty slot. */
function GridPhoto({
  img,
  variant,
  height,
  sizes,
  priority = false,
}: {
  img: ImageSlot;
  variant: ImgPhVariant;
  height: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <ImgPh
      variant={variant}
      src={img.src}
      alt={img.alt}
      label={img.src ? undefined : img.label}
      ratio="unset"
      style={{ height }}
      sizes={sizes}
      priority={priority}
    />
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 24px", padding: "16px 0" }}>
      <div className="text-muted" style={{ flex: "0 0 140px", fontSize: 14 }}>
        {label}
      </div>
      <div style={{ flex: "1 1 240px", minWidth: 0, fontSize: 15, fontWeight: 500, lineHeight: 1.5 }}>
        {value}
      </div>
    </div>
  );
}

function TravelCard({
  mark,
  title,
  body,
}: {
  mark: ReactNode;
  title: string;
  body?: string;
}) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {mark}
      <h3 className="h3">{title}</h3>
      {body && <p className="body">{body}</p>}
    </div>
  );
}
