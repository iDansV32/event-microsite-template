export default function Home() {
  return (
    <main
      style={{
        minHeight: "80vh",
        display: "grid",
        placeItems: "center",
        padding: "64px 24px",
        background: "var(--bg)",
      }}
    >
      <div style={{ maxWidth: 560, textAlign: "center" }}>
        <div className="kicker">Event microsite platform</div>
        <h1 className="h1" style={{ marginTop: 10 }}>
          You need an event link.
        </h1>
        <p className="lede" style={{ marginTop: 18, marginInline: "auto" }}>
          This domain hosts individual event microsites. If you&rsquo;re
          looking for your event, ask your organizer for the direct link.
        </p>
      </div>
    </main>
  );
}
