import { Link } from "react-router-dom";
import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { useSlots } from "../context/SlotContext";

const Home = () => {
  const { slots, reservations, lots, getSlotStatus, chargingSessions } = useSlots();
  const available = slots.filter((slot) => getSlotStatus(slot.id) === "Available").length;
  const activeCharging = chargingSessions.filter((session) => session.status === "active").length;

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
        </div>
      </section>
    </PageContainer>
  );
};

export default Home;
