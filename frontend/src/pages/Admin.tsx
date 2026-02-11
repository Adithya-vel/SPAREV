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
    <PageContainer title="Admin Dashboard">
      {/* RESET BUTTON */}
      <div style={{ marginBottom: "14px" }}>
        <button
          onClick={() => {
            if (
              confirm("Reset everything? This will clear all reservations.")
            ) {
              resetSystem();
            }
          }}
          style={{
            background: "#dc2626",
            color: "white",
            padding: "10px 16px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
          }}
        >
          🔄 Reset System
        </button>
      </div>

      {/* STATS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <Card>
          <strong>Total Slots</strong>
          <h2>{stats.total}</h2>
        </Card>

        <Card>
          <strong>Available</strong>
          <h2>{stats.available}</h2>
        </Card>

        <Card>
          <strong>Occupied</strong>
          <h2>{stats.occupied}</h2>
        </Card>

        <Card>
          <strong>Reservations</strong>
          <h2>{stats.reservations}</h2>
        </Card>
      </div>

      {/* FILTERS */}
      <Card>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as any)
            }
          >
            <option value="All">All Types</option>
            <option value="Parking">Parking</option>
            <option value="EV">EV</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as any)
            }
          >
            <option value="All">All Status</option>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
          </select>
        </div>
      </Card>

      {/* SLOT LIST */}
      <div style={{ display: "grid", gap: "12px" }}>
        {filteredSlots.map((s) => (
          <Card key={s.id}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div>
                <strong>
                  {s.type} {s.id}
                </strong>
                <div>Status: {s.status}</div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
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

      {/* RESERVATIONS */}
      <Card>
        <h3 style={{ marginTop: 0 }}>All Reservations</h3>

        {reservations.length === 0 ? (
          <p>No reservations.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {reservations.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
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
