import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { useSlots } from "../context/SlotContext";


const Availability = () => {
  const { slots } = useSlots();

  return (
    <PageContainer title="Availability" subtitle="Monitor all parking and EV slots in real time.">
      <section className="grid three">
        {slots.map((slot) => (
          <Card key={slot.id} className="slot-card">
            <p className="eyebrow">{slot.type}</p>
            <h3>{slot.id}</h3>
            <span className={slot.status === "Available" ? "badge success" : "badge danger"}>
              {slot.status}
            </span>
          </Card>
        ))}
      </section>
    </PageContainer>
  );
};

export default Availability;
