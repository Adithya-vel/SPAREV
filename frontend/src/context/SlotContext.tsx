import { createContext, useContext, useEffect, useMemo, useState } from "react";

type SlotType = "Parking" | "EV";
type SlotStatus = "Available" | "Occupied";

export type Slot = {
  id: string;
  type: SlotType;
  status: SlotStatus;
};

export type Reservation = {
  id: string; // unique reservation id
  slotId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  createdAt: number;
};

type SlotContextType = {
  slots: Slot[];
  reservations: Reservation[];
  reserveSlot: (slotId: string, date: string, time: string) => { ok: true } | { ok: false; message: string };
  cancelReservation: (reservationId: string) => void;
  releaseSlot: (slotId: string) => void;
  resetSystem: () => void;
};

const SlotContext = createContext<SlotContextType | null>(null);

const LS_SLOTS_KEY = "sparev_slots_v1";
const LS_RES_KEY = "sparev_reservations_v1";

const defaultSlots: Slot[] = [
  { id: "A1", type: "Parking", status: "Available" },
  { id: "A2", type: "Parking", status: "Available" },
  { id: "C1", type: "EV", status: "Available" },
  { id: "C2", type: "EV", status: "Available" },
];

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function makeId() {
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

export const SlotProvider = ({ children }: { children: React.ReactNode }) => {
  const [slots, setSlots] = useState<Slot[]>(() => loadJSON(LS_SLOTS_KEY, defaultSlots));
  const [reservations, setReservations] = useState<Reservation[]>(() => loadJSON(LS_RES_KEY, []));

  // persist
  useEffect(() => {
    localStorage.setItem(LS_SLOTS_KEY, JSON.stringify(slots));
  }, [slots]);

  useEffect(() => {
    localStorage.setItem(LS_RES_KEY, JSON.stringify(reservations));
  }, [reservations]);

  const releaseSlot = (slotId: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, status: "Available" } : s))
    );
  };

  const reserveSlot = (slotId: string, date: string, time: string) => {
    const target = slots.find((s) => s.id === slotId);
    if (!target) return { ok: false as const, message: "Slot not found" };
    if (target.status === "Occupied") return { ok: false as const, message: "Slot already occupied" };
    if (!date || !time) return { ok: false as const, message: "Please fill date & time" };

    // mark occupied
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, status: "Occupied" } : s)));

    // add reservation record
    const newRes: Reservation = {
      id: makeId(),
      slotId,
      date,
      time,
      createdAt: Date.now(),
    };
    setReservations((prev) => [newRes, ...prev]);

    return { ok: true as const };
  };

const cancelReservation = (reservationId: string) => {
  setReservations((prev) => {
    const res = prev.find((r) => r.id === reservationId);
    if (res) {
      // free slot when cancelling
      setSlots((slotsPrev) =>
        slotsPrev.map((s) => (s.id === res.slotId ? { ...s, status: "Available" } : s))
      );
    }
    return prev.filter((r) => r.id !== reservationId);
  });
};

const resetSystem = () => {
  localStorage.removeItem(LS_SLOTS_KEY);
  localStorage.removeItem(LS_RES_KEY);

  setSlots(defaultSlots);
  setReservations([]);
};

  const value = useMemo(
  () => ({
    slots,
    reservations,
    reserveSlot,
    cancelReservation,
    releaseSlot,
    resetSystem,
  }),
  [slots, reservations]
);


  return <SlotContext.Provider value={value}>{children}</SlotContext.Provider>;
};

export const useSlots = () => {
  const ctx = useContext(SlotContext);
  if (!ctx) throw new Error("useSlots must be used inside SlotProvider");
  return ctx;
};
