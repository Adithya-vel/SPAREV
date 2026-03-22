import { Link } from "react-router-dom";
import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { useSlots } from "../context/SlotContext";

const Home = () => {
  const { slots, reservations, lots, getSlotStatus, chargingSessions } = useSlots();
  const available = slots.filter((slot) => getSlotStatus(slot.id) === "Available").length;
  const activeCharging = chargingSessions.filter((session) => session.status === "active").length;
  const adminManaged = slots.filter((slot) => {
    const status = getSlotStatus(slot.id);
    return status === "Under Repair" || status === "VIP Only" || status === "Reserved" || status === "Occupied";
  });
  const chargingOccupiedSlots = new Set(
    chargingSessions.filter((session) => session.status === "active").map((session) => session.slotId)
  );

  return (
    <PageContainer
      title="Parking Experience, Reimagined"
      subtitle="Coordinate parking and EV sessions with confidence using a single smart operations board."
    >
      <section className="hero-grid">
        <Card className="hero-card reveal-up">
          <p className="eyebrow">Live Snapshot</p>
          <h2>Campus mobility without friction.</h2>
          <p>
            Track occupancy, start charging sessions, and reserve slots in seconds.
            Everything updates from one consistent workspace.
          </p>
          <div className="button-row">
            <Link className="button" to="/reservation">Reserve a Slot</Link>
            <Link className="button button-ghost" to="/availability">View Availability</Link>
          </div>
        </Card>

        <div className="grid three reveal-up-delay">
          <Card>
            <p className="kpi-label">Total Lots</p>
            <p className="kpi-value">{lots.length}</p>
          </Card>
          <Card>
            <p className="kpi-label">Available Spots</p>
            <p className="kpi-value">{available}</p>
          </Card>
          <Card>
            <p className="kpi-label">Live EV Sessions</p>
            <p className="kpi-value">{activeCharging}</p>
          </Card>
          <Card>
            <p className="kpi-label">Reservations</p>
            <p className="kpi-value">{reservations.filter((r) => r.source === "reservation").length}</p>
          </Card>
          <Card>
            <p className="kpi-label">Admin Managed Spots</p>
            <p className="kpi-value">{adminManaged.length}</p>
          </Card>
        </div>
      </section>

      <section className="grid two">
        <Card>
          <h3>Admin Spot Updates</h3>
          {adminManaged.length === 0 ? (
            <p className="muted-note">No spots are currently blocked or specially managed.</p>
          ) : (
            <div className="stack compact">
              {adminManaged.slice(0, 8).map((slot) => (
                <div key={slot.id} className="list-item">
                  <div>
                    <strong>{slot.label}</strong>
                    <p className="eyebrow">{slot.type.toLowerCase()}</p>
                  </div>
                  <span className="badge danger">{getSlotStatus(slot.id)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3>Charging Occupancy</h3>
          {chargingOccupiedSlots.size === 0 ? (
            <p className="muted-note">No EV slot is actively charging right now.</p>
          ) : (
            <div className="stack compact">
              {[...chargingOccupiedSlots].map((slotId) => {
                const slot = slots.find((item) => item.id === slotId);
                if (!slot) return null;
                return (
                  <div key={slotId} className="list-item">
                    <div>
                      <strong>{slot.label}</strong>
                      <p className="eyebrow">{slot.type.toLowerCase()}</p>
                    </div>
                    <span className="badge warn">Occupied by Charging</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </PageContainer>
  );
};

export default Home;
