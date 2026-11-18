import Link from "next/link";

/** Rounded-square mark in the event accent with the client's initial. */
export function LogoMark({
  size = 28,
  initial = "O",
}: {
  size?: number;
  initial?: string;
}) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.29),
        background: "var(--accent)",
        color: "#FFFFFF",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.5),
        fontWeight: 700,
        lineHeight: 1,
        flex: "0 0 auto",
      }}
    >
      {initial.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function Logo({
  slug,
  brand,
  shortName,
  compact = false,
}: {
  slug: string;
  brand: string;
  shortName: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/e/${slug}/overview`}
      aria-label={compact ? `${shortName} home` : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        minHeight: 44,
        color: "var(--ink)",
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: "-0.01em",
      }}
    >
      <LogoMark initial={brand} />
      {!compact && <span>{shortName}</span>}
    </Link>
  );
}
