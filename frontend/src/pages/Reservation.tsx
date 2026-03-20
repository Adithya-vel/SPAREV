import { useState } from "react";
import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { useSlots } from "../context/SlotContext";

const Reservation = () => {
  const { slots, reservations, reserveSlot, cancelReservation } = useSlots();

  const [slotId, setSlotId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");

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
            <select value={slotId} onChange={(e) => setSlotId(e.target.value)}>
              <option value="">Select Slot</option>
              {slots.map((s) => (
                <option key={s.id} value={s.id} disabled={s.status === "Occupied"}>
                  {s.type} {s.id} — {s.status}
                </option>
              ))}
            </select>

            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />

            <button type="submit">Reserve</button>
          </form>

          {message && <div className={message.startsWith("❌") ? "alert error" : "alert success"}>{message}</div>}
        </Card>

        <Card>
          <h3>My Reservations</h3>

          {reservations.length === 0 ? (
            <p>No reservations yet.</p>
          ) : (
            <div className="stack compact">
              {reservations.map((r) => (
                <div key={r.id} className="list-item">
                  <div>
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
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};

export default Reservation;
