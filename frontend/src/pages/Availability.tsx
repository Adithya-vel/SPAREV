import { useEffect, useState } from "react";
import { fetchLots, fetchSpots } from "../api/client";
import type { ParkingLot, ParkingSpot } from "@shared/types";

function Availability() {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [selectedLot, setSelectedLot] = useState<string>("");
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLots()
      .then(setLots)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedLot) return;
    setLoading(true);
    setError(null);
    fetchSpots(selectedLot)
      .then(setSpots)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedLot]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Availability</p>
          <h1>Find a parking spot or charger</h1>
        </div>
        <select value={selectedLot} onChange={(e) => setSelectedLot(e.target.value)}>
          <option value="">Select a lot</option>
          {lots.map((lot) => (
            <option key={lot.id} value={lot.id}>
              {lot.name} — {lot.availableSpots}/{lot.totalSpots} open
            </option>
          ))}
        </select>
      </div>

      {error && <div className="alert error">{error}</div>}
      {loading && <div className="alert">Loading spots…</div>}

      {!loading && selectedLot && (
        <div className="grid three">
          {spots.map((spot) => (
            <div className="card" key={spot.id}>
              <h3>{spot.label}</h3>
              <p>{spot.supportsEv ? "EV-capable" : "Standard"}</p>
              <p className={spot.isAvailable ? "positive" : "negative"}>
                {spot.isAvailable ? "Available" : "Unavailable"}
              </p>
            </div>
          ))}
          {spots.length === 0 && <p>No spots found for this lot.</p>}
        </div>
      )}
    </section>
  );
}

export default Availability;
