import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        padding: "64px 24px",
        background: "var(--bg)",
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        <div className="eyebrow">Not found</div>
        <h1 className="display" style={{ fontSize: 64, marginTop: 12 }}>
          404
        </h1>
        <p
          className="serif"
          style={{
            marginTop: 16,
            color: "var(--ink-70)",
            fontStyle: "italic",
            lineHeight: 1.5,
          }}
        >
          This page does not exist, or the event link is incorrect.
        </p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 32, display: "inline-block" }}>
          Back home
        </Link>
      </div>
    </main>
  );
}
