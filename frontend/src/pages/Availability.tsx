import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { useSlots } from "../context/SlotContext";


const Availability = () => {
  const { slots } = useSlots();
  return (
    <PageContainer title="Availability Status">
      {slots.map((slot) => (
        <Card key={slot.id}>
          <strong>{slot.id}</strong>
          <p>Status: {slot.status}</p>
        </Card>
      ))}
    </PageContainer>
  );
};

export default Availability;
