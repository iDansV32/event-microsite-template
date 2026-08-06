import Link from "next/link";

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ display: "block" }}
    >
      <circle cx="20" cy="20" r="18" fill="var(--terracotta)" />
      <text
        x="19"
        y="26.5"
        textAnchor="middle"
        fill="white"
        fontFamily="var(--f-sans)"
        fontWeight="700"
        fontSize="17"
        letterSpacing="-0.04em"
      >
        O.
      </text>
    </svg>
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
      className="ed-flex items-center"
      style={{ gap: 12, textDecoration: "none" }}
    >
      <LogoMark size={32} />
      {!compact && (
        <div style={{ lineHeight: 1.1 }}>
          <div className="serif" style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em" }}>
            {brand}
          </div>
          <div className="eyebrow" style={{ fontSize: 9.5, letterSpacing: "0.18em", marginTop: 2 }}>
            {shortName.toUpperCase()}
          </div>
        </div>
      )}
    </Link>
  );
}
