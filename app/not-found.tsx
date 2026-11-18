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
        <div className="kicker">Not found</div>
        <h1 className="h1" style={{ marginTop: 10 }}>
          404
        </h1>
        <p className="lede" style={{ marginTop: 16, marginInline: "auto" }}>
          This page does not exist, or the event link is incorrect.
        </p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: 32 }}>
          Back home
        </Link>
      </div>
    </main>
  );
}
