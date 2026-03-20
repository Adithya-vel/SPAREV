import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { useSlots } from "../context/SlotContext";

const Analytics = () => {
  const { slots, reservations } = useSlots();

  const total = slots.length;
  const available = slots.filter((s) => s.status === "Available").length;
  const occupied = slots.filter((s) => s.status === "Occupied").length;

  const evCount = slots.filter((s) => s.type === "EV").length;
  const parkingCount = slots.filter((s) => s.type === "Parking").length;
  const occupancyPercent = total === 0 ? 0 : Math.round((occupied / total) * 100);
  const availabilityPercent = total === 0 ? 0 : 100 - occupancyPercent;

  return (
    <PageContainer title="System Analytics" subtitle="Understand occupancy and reservation flow at a glance.">
      <div className="grid three">
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
          <p className="kpi-label">Total Reservations</p>
          <p className="kpi-value">{reservations.length}</p>
        </Card>

        <Card>
          <p className="kpi-label">EV Chargers</p>
          <p className="kpi-value">{evCount}</p>
        </Card>

        <Card>
          <p className="kpi-label">Parking Slots</p>
          <p className="kpi-value">{parkingCount}</p>
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
