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

  return (
    <PageContainer title="System Analytics">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
        }}
      >
        <Card>
          <h3>Total Slots</h3>
          <h1>{total}</h1>
        </Card>

        <Card>
          <h3>Available</h3>
          <h1>{available}</h1>
        </Card>

        <Card>
          <h3>Occupied</h3>
          <h1>{occupied}</h1>
        </Card>

        <Card>
          <h3>Total Reservations</h3>
          <h1>{reservations.length}</h1>
        </Card>

        <Card>
          <h3>EV Chargers</h3>
          <h1>{evCount}</h1>
        </Card>

        <Card>
          <h3>Parking Slots</h3>
          <h1>{parkingCount}</h1>
        </Card>
      </div>
    </PageContainer>
  );
};

export default Analytics;
