function Charging() {
  return (
    <section className="panel">
      <p className="eyebrow">Charging</p>
      <h1>Monitor charging sessions</h1>
      <p>
        This view will surface active charging sessions, connector details, and live progress. Hook
        this page to the backend charging session endpoints once they are ready.
      </p>
      <div className="card">
        <h3>Next steps</h3>
        <ul>
          <li>Call GET /api/charging-sessions for active sessions.</li>
          <li>Enable start/stop actions tied to reservation IDs.</li>
          <li>Show estimates for energy delivered and time remaining.</li>
        </ul>
      </div>
    </section>
  );
}

export default Charging;
