import Link from "next/link";
import type { EventContent } from "@/lib/schemas";

const QUICK_LINKS: { key: string; label: string; href: string }[] = [
  { key: "agenda", label: "Agenda", href: "agenda" },
  { key: "hotel", label: "Hotel & Travel", href: "hotel" },
  { key: "faq", label: "FAQ", href: "faq" },
];

export function Footer({
  slug,
  content,
  enabledSections,
}: {
  slug: string;
  content: EventContent;
  enabledSections: string[];
}) {
  const base = `/e/${slug}`;
  const links = QUICK_LINKS.filter((l) => enabledSections.includes(l.key));
  const cityShort = content.venue.cityShort ?? content.venue.city;
  const slack = content.contact?.slackChannel;
  const supportEmail = content.contact?.supportEmail;

  return (
    <footer
      style={{
        marginTop: 120,
        background: "var(--ink)",
        color: "var(--bg)",
        padding: "80px 0 48px",
      }}
    >
      <div className="container-ed">
        <div
          className="ed-grid"
          style={{
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
            gap: 48,
            alignItems: "start",
          }}
        >
          <div>
            <div
              className="serif"
              style={{ fontSize: 44, lineHeight: 1, fontWeight: 300, letterSpacing: "-0.02em" }}
            >
              See you in
              <br />
              <em style={{ fontStyle: "italic", color: "var(--clay)" }}>{cityShort}.</em>
            </div>
            <div
              className="script"
              style={{
                fontSize: 32,
                color: "var(--clay)",
                marginTop: 18,
                transform: "rotate(-2deg)",
                display: "inline-block",
              }}
            >
              ~ see you soon
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ color: "rgba(245,240,232,0.55)" }}>
              Event
            </div>
            <div style={{ marginTop: 14, lineHeight: 1.9, fontSize: 14 }}>
              <div>{content.dates.display}</div>
              <div style={{ opacity: 0.7 }}>{content.venue.name}</div>
              {content.venue.neighborhood && (
                <div style={{ opacity: 0.7 }}>{content.venue.neighborhood}</div>
              )}
            </div>
          </div>
          {(slack || supportEmail) && (
            <div>
              <div className="eyebrow" style={{ color: "rgba(245,240,232,0.55)" }}>
                Questions
              </div>
              <div style={{ marginTop: 14, lineHeight: 1.9, fontSize: 14 }}>
                {slack && (
                  <div>
                    Slack:{" "}
                    <span style={{ color: "var(--clay)" }}>{slack}</span>
                  </div>
                )}
                {supportEmail && (
                  <div style={{ opacity: 0.7 }}>{supportEmail}</div>
                )}
              </div>
            </div>
          )}
          {links.length > 0 && (
            <div>
              <div className="eyebrow" style={{ color: "rgba(245,240,232,0.55)" }}>
                Quick links
              </div>
              <div style={{ marginTop: 14, lineHeight: 1.9, fontSize: 14 }}>
                {links.map((l) => (
                  <div key={l.key}>
                    <Link href={`${base}/${l.href}`} style={{ opacity: 0.85 }}>
                      {l.label}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div
          style={{
            marginTop: 64,
            paddingTop: 24,
            borderTop: "1px solid rgba(245,240,232,0.12)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "rgba(245,240,232,0.55)",
          }}
        >
          <div>© {new Date().getFullYear()} {content.brand.client}</div>
          <div>Made with care by the Events team</div>
        </div>
      </div>
    </footer>
  );
}
