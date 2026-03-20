import { useMemo, useState } from "react";
import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { useSlots } from "../context/SlotContext";

const Admin = () => {
  const {
    slots,
    reservations,
    reserveSlot,
    releaseSlot,
    cancelReservation,
    resetSystem,
  } = useSlots();

  const [typeFilter, setTypeFilter] = useState<"All" | "Parking" | "EV">("All");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Available" | "Occupied"
  >("All");

  const filteredSlots = useMemo(() => {
    return slots.filter((s) => {
      if (typeFilter !== "All" && s.type !== typeFilter) return false;
      if (statusFilter !== "All" && s.status !== statusFilter) return false;
      return true;
    });
  }, [slots, typeFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = slots.length;
    const available = slots.filter((s) => s.status === "Available").length;
    const occupied = slots.filter((s) => s.status === "Occupied").length;

    return {
      total,
      available,
      occupied,
      reservations: reservations.length,
    };
  }, [slots, reservations]);

  return (
    <PageContainer title="Admin Dashboard" subtitle="Control occupancy, monitor slot health, and handle system resets.">
      <div>
        <button
          onClick={() => {
            if (confirm("Reset everything? This will clear all reservations.")) {
              resetSystem();
            }
          }}
          className="button button-danger"
        >
          Reset System
        </button>
      </div>

      <div className="grid three">
        <Card>
          <p className="kpi-label">Total Slots</p>
          <p className="kpi-value">{stats.total}</p>
        </Card>

        <Card>
          <p className="kpi-label">Available</p>
          <p className="kpi-value">{stats.available}</p>
        </Card>

        <Card>
          <p className="kpi-label">Occupied</p>
          <p className="kpi-value">{stats.occupied}</p>
        </Card>

        <Card>
          <p className="kpi-label">Reservations</p>
          <p className="kpi-value">{stats.reservations}</p>
        </Card>
      </div>

      <Card>
        <div className="button-row">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as "All" | "Parking" | "EV")}
          >
            <option value="All">All Types</option>
            <option value="Parking">Parking</option>
            <option value="EV">EV</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "All" | "Available" | "Occupied")}
          >
            <option value="All">All Status</option>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
          </select>
        </div>
      </Card>

      <div className="stack compact">
        {filteredSlots.map((s) => (
          <Card key={s.id}>
            <div className="list-item no-border">
              <div>
                <strong>
                  {s.type} {s.id}
                </strong>
                <div>Status: {s.status}</div>
              </div>

              <div className="button-row">
                {s.status === "Occupied" ? (
                  <button onClick={() => releaseSlot(s.id)}>
                    Mark Available
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      reserveSlot(s.id, "ADMIN", "BLOCKED")
                    }
                  >
                    Mark Occupied
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {filteredSlots.length === 0 && (
          <p>No slots match the filters.</p>
        )}
      </div>

      <Card>
        <h3>All Reservations</h3>

        {reservations.length === 0 ? (
          <p>No reservations.</p>
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
                  onClick={() => cancelReservation(r.id)}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
};

export default Admin;
