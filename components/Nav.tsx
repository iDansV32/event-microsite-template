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
  /** When supplied, render a "Signed in as X · Sign out" badge at
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
    <header className="site-header">
      <div className="container site-header-inner">
        <Logo slug={slug} brand={brand} shortName={shortName} />
        <nav aria-label="Sections" className="site-nav">
          {visibleSections.map((s) => {
            const href = `${base}/${s.key}`;
            const active =
              pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={s.key}
                href={href}
                aria-current={active ? "page" : undefined}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
        {signedInEmail && <SessionBadge slug={slug} email={signedInEmail} />}
      </div>
    </header>
  );
}
