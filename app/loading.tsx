export default function Loading() {
  return (
    <main
      style={{
        minHeight: "70vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
      }}
      aria-busy="true"
      aria-live="polite"
    >
      <div style={{ color: "var(--ink-muted)", fontSize: 15 }}>Loading…</div>
    </main>
  );
}
