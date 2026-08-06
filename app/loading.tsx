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
      <div
        className="serif"
        style={{ color: "var(--ink-70)", fontStyle: "italic" }}
      >
        Loading…
      </div>
    </main>
  );
}
