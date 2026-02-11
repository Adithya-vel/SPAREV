export type Slot = {
  id: string;
  type: "Parking" | "EV";
  status: "Available" | "Occupied";
};

const savedSlots = localStorage.getItem("slots");

export const slots: Slot[] = savedSlots
  ? JSON.parse(savedSlots)
  : [
      { id: "A1", type: "Parking", status: "Available" },
      { id: "A2", type: "Parking", status: "Available" },
      { id: "C1", type: "EV", status: "Available" },
    ];
