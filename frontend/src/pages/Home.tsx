const Home = () => {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>Welcome to Smart Parking & EV System 🚗⚡</h1>

      <p style={{ marginTop: "1rem", maxWidth: "700px" }}>
        This platform helps users to book parking slots and EV charging
        stations easily and efficiently.
      </p>

      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
        <button>Book Parking</button>
        <button>EV Charging</button>
        <button>View Availability</button>
      </div>
    </div>
  );
};

export default Home;
