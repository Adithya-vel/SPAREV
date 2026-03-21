import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { useSlots } from "../context/SlotContext";


const Availability = () => {
  const { lots, getSlotsByLot, getSlotStatus } = useSlots();

  return (
    <PageContainer title="Availability" subtitle="Monitor all parking and EV slots in real time.">
      <section className="stack">
        {lots.map((lot) => {
          const lotSlots = getSlotsByLot(lot.id);
          return (
            <Card key={lot.id}>
              <div className="list-item no-border">
                <div>
                  <h3>{lot.name}</h3>
                  <p>{lot.address}</p>
                </div>
                <span className="badge success">{lotSlots.length} Spots</span>
              </div>

              <div className="grid three" style={{ marginTop: "0.9rem" }}>
                {lotSlots.map((slot) => {
                  const status = getSlotStatus(slot.id);
                  return (
                    <Card key={slot.id} className="slot-card">
                      <p className="eyebrow">{slot.type}</p>
                      <h3>{slot.label}</h3>
                      <span
                        className={
                          status === "Available"
                            ? "badge success"
                            : status === "Reserved"
                              ? "badge warn"
                              : "badge danger"
                        }
                      >
                        {status}
                      </span>
                    </Card>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </section>
    </PageContainer>
  );
};

export default Availability;
