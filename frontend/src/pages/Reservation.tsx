import { useEffect, useState } from "react";
import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { useSlots } from "../context/SlotContext";

const Reservation = () => {
  const {
    lots,
    reservations,
    reserveSlot,
    cancelReservation,
    getSlotsByLot
  } = useSlots();

  const [lotId, setLotId] = useState(lots[0]?.id ?? "");
  const [slotId, setSlotId] = useState("");
  const [date, setDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [message, setMessage] = useState("");

  const lotSlots = lotId ? getSlotsByLot(lotId) : [];

  const selectedLot = lots.find((lot) => lot.id === lotId);

  useEffect(() => {
    if (lots.length === 0) {
      setLotId("");
      setSlotId("");
      return;
    }

    const currentLotExists = lots.some((lot) => lot.id === lotId);
    if (!currentLotExists) {
      setLotId(lots[0].id);
      setSlotId("");
    }
  }, [lots, lotId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const result = reserveSlot(slotId, date, fromTime, toTime);
    if (!result.ok) {
      window.alert(result.message);
      setMessage(`❌ ${result.message}`);
      return;
    }

    setMessage(`✅ Reserved ${slotId} on ${date} from ${fromTime} to ${toTime}`);
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
              {lotSlots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input type="time" value={fromTime} onChange={(e) => setFromTime(e.target.value)} />
            <input type="time" value={toTime} onChange={(e) => setToTime(e.target.value)} />

            <button type="submit">Reserve</button>
          </form>

          {selectedLot && (
            <p className="muted-note" style={{ marginTop: "0.6rem" }}>
              Booking in {selectedLot.name}. One spot can have only one reservation in the chosen time window.
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
                        <strong>Time:</strong> {r.fromTime} to {r.toTime}
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
