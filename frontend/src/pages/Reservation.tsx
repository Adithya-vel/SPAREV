import { useState } from "react";

function Reservation() {
  const [lotId, setLotId] = useState("");
  const [spotId, setSpotId] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Placeholder: wire to POST /api/reservations
    setStatus("Reservation submitted (mock).");
  };

  return (
    <section className="panel">
      <p className="eyebrow">Reservation</p>
      <h1>Reserve your spot</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Lot ID
          <input value={lotId} onChange={(e) => setLotId(e.target.value)} placeholder="lot-1" required />
        </label>
        <label>
          Spot ID
          <input value={spotId} onChange={(e) => setSpotId(e.target.value)} placeholder="spot-1" required />
        </label>
        <label>
          Vehicle plate
          <input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="TN-00-XX-0000" required />
        </label>
        <button type="submit">Submit reservation</button>
      </form>
      {status && <div className="alert success">{status}</div>}
    </section>
  );
}

export default Reservation;
