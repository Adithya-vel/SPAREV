import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { useSlots } from "../context/SlotContext";

const Analytics = () => {
  const { lots, slots, reservations, chargingSessions, getSlotStatus } = useSlots();

  const total = slots.length;
  const available = slots.filter((s) => getSlotStatus(s.id) === "Available").length;
  const occupied = slots.filter((s) => getSlotStatus(s.id) === "Occupied").length;
  const reserved = slots.filter((s) => getSlotStatus(s.id) === "Reserved").length;

  const evCount = slots.filter((s) => s.type === "EV").length;
  const parkingCount = slots.filter((s) => s.type === "Parking").length;
  const occupancyPercent = total === 0 ? 0 : Math.round((occupied / total) * 100);
  const availabilityPercent = total === 0 ? 0 : Math.round((available / total) * 100);
  const activeCharging = chargingSessions.filter((s) => s.status === "active").length;

  return (
    <PageContainer title="System Analytics" subtitle="Understand occupancy and reservation flow at a glance.">
      <div className="grid three">
        <Card>
          <p className="kpi-label">Lots</p>
          <p className="kpi-value">{lots.length}</p>
        </Card>

        <Card>
          <p className="kpi-label">Total Slots</p>
          <p className="kpi-value">{total}</p>
        </Card>

        <Card>
          <p className="kpi-label">Available</p>
          <p className="kpi-value">{available}</p>
        </Card>

        <Card>
          <p className="kpi-label">Occupied</p>
          <p className="kpi-value">{occupied}</p>
        </Card>

        <Card>
          <p className="kpi-label">Reserved (Upcoming)</p>
          <p className="kpi-value">{reserved}</p>
        </Card>

        <Card>
          <p className="kpi-label">Reservations</p>
          <p className="kpi-value">{reservations.filter((r) => r.source === "reservation").length}</p>
        </Card>

        <Card>
          <p className="kpi-label">EV Chargers</p>
          <p className="kpi-value">{evCount}</p>
        </Card>

        <Card>
          <p className="kpi-label">Parking Slots</p>
          <p className="kpi-value">{parkingCount}</p>
        </Card>

        <Card>
          <p className="kpi-label">Live Charging Sessions</p>
          <p className="kpi-value">{activeCharging}</p>
        </Card>
      </div>

      <Card>
        <h3>Occupancy Balance</h3>
        <div className="meter">
          <div className="meter-fill warm" style={{ width: `${occupancyPercent}%` }} />
        </div>
        <p className="muted-note">Occupied: {occupancyPercent}%</p>

        <div className="meter">
          <div className="meter-fill cool" style={{ width: `${availabilityPercent}%` }} />
        </div>
        <p className="muted-note">Available: {availabilityPercent}%</p>
      </Card>
    </PageContainer>
  );
};

export default Analytics;
