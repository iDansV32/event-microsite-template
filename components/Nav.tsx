"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { SessionBadge } from "./auth/SignOut";

const SECTIONS: { key: string; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "agenda", label: "Agenda" },
  { key: "hotel", label: "Hotel & Travel" },
  { key: "registration", label: "Registration" },
  { key: "expensing", label: "Expensing" },
  { key: "faq", label: "FAQ" },
  { key: "feedback", label: "Feedback" },
];

export function Nav({
  slug,
  enabledSections,
  brand,
  shortName,
  signedInEmail,
}: {
  slug: string;
  enabledSections: string[];
  brand: string;
  shortName: string;
  /** When supplied, render a "Signed in as X \u00b7 Sign out" badge at
      the right edge of the header. Omitted when the caller doesn't have
      a trustworthy session on hand (e.g. db_error degraded render). */
  signedInEmail?: string;
}) {
  const pathname = usePathname();
  const base = `/e/${slug}`;
  const visibleSections = SECTIONS.filter((s) =>
    enabledSections.includes(s.key),
  );

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(245,240,232,0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--ink-12)",
      }}
    >
      <div
        className="container-ed ed-flex items-center"
        style={{ height: 72, justifyContent: "space-between", gap: 16 }}
      >
        <Logo slug={slug} brand={brand} shortName={shortName} />
        <div
          className="ed-flex items-center"
          style={{ gap: 24, flex: 1, justifyContent: "flex-end", flexWrap: "wrap" }}
        >
          <nav
            className="ed-flex items-center nav-scroll"
            style={{ gap: 24, fontSize: 14 }}
          >
            {visibleSections.map((s) => {
              const href = `${base}/${s.key}`;
              const active =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={s.key}
                  href={href}
                  style={{
                    position: "relative",
                    padding: "6px 2px",
                    color: active ? "var(--ink)" : "var(--ink-70)",
                    fontWeight: active ? 500 : 400,
                    fontSize: 14,
                    transition: "color 0.2s",
                  }}
                >
                  {s.label}
                  {active && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: -4,
                        height: 2,
                        background: "var(--terracotta)",
                        borderRadius: 1,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
          {signedInEmail && <SessionBadge slug={slug} email={signedInEmail} />}
        </div>
      </div>
    </header>
  );
}
