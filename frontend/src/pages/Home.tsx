function Home() {
  return (
    <section className="panel">
      <h1>Welcome to Smart Parking &amp; EV</h1>
      <p>
        Discover available parking spots and EV chargers on campus, reserve in advance,
        and monitor your charging sessions from a single, mobile-friendly experience.
      </p>
      <div className="grid two">
        <div className="card">
          <h3>Find &amp; Reserve</h3>
          <p>Search nearby lots, check real-time availability, and secure a spot before you arrive.</p>
        </div>
        <div className="card">
          <h3>Charge with Confidence</h3>
          <p>Start and monitor charging sessions, view connector details, and track estimated costs.</p>
        </div>
        <div className="card">
          <h3>Operator Tools</h3>
          <p>Manage lots, spots, and stations, and keep tabs on reservations and sessions.</p>
        </div>
        <div className="card">
          <h3>Support</h3>
          <p>Get help fast with FAQs, contact options, and clear guidance for common issues.</p>
        </div>
      </div>
    </section>
  );
}

export default Home;
