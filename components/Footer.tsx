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
  const slack = content.contact?.slackChannel;
  const supportEmail = content.contact?.supportEmail;

  return (
    <footer style={{ borderTop: "1px solid var(--line)" }}>
      <div
        className="container"
        style={{
          paddingTop: 32,
          paddingBottom: 32,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 24,
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--ink-muted)",
        }}
      >
        <div style={{ flex: "1 1 320px" }}>
          <div>
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>
              {content.brand.shortName}
            </span>
            {" · "}
            {content.dates.display}
            {" · "}
            {content.venue.name}
          </div>
          {(slack || supportEmail) && (
            <div style={{ marginTop: 4 }}>
              Questions?{" "}
              {slack && (
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>{slack}</span>
              )}
              {slack && supportEmail && " · "}
              {supportEmail && (
                <a
                  href={`mailto:${supportEmail}`}
                  style={{ color: "var(--ink)", fontWeight: 500 }}
                >
                  {supportEmail}
                </a>
              )}
            </div>
          )}
        </div>
        {links.length > 0 && (
          <nav aria-label="Footer" style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px" }}>
            {links.map((l) => (
              <Link
                key={l.key}
                href={`${base}/${l.href}`}
                style={{ color: "var(--ink)", fontWeight: 500 }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
      <div
        className="container"
        style={{
          paddingBottom: 28,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 8,
          fontSize: 13,
          color: "var(--ink-muted)",
        }}
      >
        <div>© {new Date().getFullYear()} {content.brand.client}</div>
        <div>Made with care by the Events team</div>
      </div>
    </footer>
  );
}
