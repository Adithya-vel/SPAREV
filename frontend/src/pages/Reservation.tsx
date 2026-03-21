import { useState } from "react";
import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { useSlots } from "../context/SlotContext";

const Reservation = () => {
  const {
    lots,
    reservations,
    reserveSlot,
    cancelReservation,
    getSlotsByLot,
    getSlotStatus
  } = useSlots();

  const [lotId, setLotId] = useState(lots[0]?.id ?? "");
  const [slotId, setSlotId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");

  const lotSlots = lotId ? getSlotsByLot(lotId) : [];

  const selectedLot = lots.find((lot) => lot.id === lotId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = reserveSlot(slotId, date, time);
    if (!result.ok) {
      setMessage(`❌ ${result.message}`);
      return;
    }

    setMessage(`✅ Reserved ${slotId} on ${date} at ${time}`);
    setSlotId("");
  };

  return (
    <PageContainer title="Reservation Desk" subtitle="Book, review, and cancel reservations from one place.">
      <div className="stack">
        <Card>
          <h3>Book a Slot</h3>

          <form onSubmit={handleSubmit} className="form">
            <select value={lotId} onChange={(e) => {
              setLotId(e.target.value);
              setSlotId("");
            }}>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.name} ({lot.address})
                </option>
              ))}
            </select>

            <select value={slotId} onChange={(e) => setSlotId(e.target.value)}>
              <option value="">Select Slot</option>
              {lotSlots.map((s) => {
                const status = getSlotStatus(s.id);
                return (
                  <option key={s.id} value={s.id}>
                    {s.type} {s.label} - {status}
                  </option>
                );
              })}
            </select>

            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />

            <button type="submit">Reserve</button>
          </form>

          {selectedLot && (
            <p className="muted-note" style={{ marginTop: "0.6rem" }}>
              Booking in {selectedLot.name}. One reservation blocks a slot for 60 minutes.
            </p>
          )}

          {message && <div className={message.startsWith("❌") ? "alert error" : "alert success"}>{message}</div>}
        </Card>

        <Card>
          <h3>My Reservations</h3>

          {reservations.filter((r) => r.source === "reservation").length === 0 ? (
            <p>No reservations yet.</p>
          ) : (
            <div className="stack compact">
              {reservations
                .filter((r) => r.source === "reservation")
                .map((r) => {
                  const lot = lots.find((item) => item.id === r.lotId);
                  return (
                    <div key={r.id} className="list-item">
                      <div>
                        <strong>Lot:</strong> {lot?.name ?? r.lotId} <br />
                        <strong>Slot:</strong> {r.slotId} <br />
                        <strong>Date:</strong> {r.date} <br />
                        <strong>Time:</strong> {r.time}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          cancelReservation(r.id);
                          setMessage(`✅ Cancelled reservation for ${r.slotId}`);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};

export default Reservation;
