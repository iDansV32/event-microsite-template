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
        <div className="eyebrow">Event microsite platform</div>
        <h1
          className="display"
          style={{ fontSize: "clamp(44px, 8vw, 72px)", marginTop: 12, lineHeight: 0.95 }}
        >
          You need an <em style={{ fontStyle: "italic" }}>event link</em>.
        </h1>
        <p
          className="serif"
          style={{
            marginTop: 20,
            color: "var(--ink-70)",
            fontStyle: "italic",
            lineHeight: 1.55,
            fontSize: 18,
          }}
        >
          This domain hosts individual event microsites. If you&rsquo;re
          looking for your event, ask your organizer for the direct link.
        </p>
      </div>
    </main>
  );
}
