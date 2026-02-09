function Admin() {
  return (
    <section className="panel">
      <p className="eyebrow">Operator</p>
      <h1>Admin overview</h1>
      <p>
        Use this area to manage lots, spots, and chargers. The starter kit includes placeholders so
        you can hook real data once the backend endpoints are available.
      </p>
      <div className="grid two">
        <div className="card">
          <h3>Lots &amp; Spots</h3>
          <p>List lots, toggle availability, and audit occupancy.</p>
        </div>
        <div className="card">
          <h3>Charging Stations</h3>
          <p>View connector types, power ratings, and maintenance states.</p>
        </div>
      </div>
    </section>
  );
}

export default Admin;
