import { createContext, useContext, useEffect, useMemo, useState } from "react";

type SlotType = "Parking" | "EV";
type SlotStatus = "Available" | "Reserved" | "Occupied";

const RESERVATION_DURATION_MINUTES = 60;
const LS_SLOTS_KEY = "sparev_slots_v2";
const LS_RES_KEY = "sparev_reservations_v2";
const LS_SESSIONS_KEY = "sparev_charging_sessions_v2";

export type ParkingLot = {
  id: string;
  name: string;
  address: string;
};

export type Slot = {
  id: string;
  lotId: string;
  label: string;
  type: SlotType;
};

export type Reservation = {
  id: string; // unique reservation id
  lotId: string;
  slotId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  startAt: number;
  endAt: number;
  source: "reservation" | "charging";
  createdAt: number;
};

export type ChargingSession = {
  id: string;
  reservationId: string;
  lotId: string;
  slotId: string;
  targetKwh: number;
  ratePerKwh: number;
  powerKw: number;
  pluggedInAt: number;
  unpluggedAt?: number;
  deliveredKwh?: number;
  amount?: number;
  status: "active" | "completed";
};

type SlotContextType = {
  lots: ParkingLot[];
  slots: Slot[];
  reservations: Reservation[];
  chargingSessions: ChargingSession[];
  getSlotStatus: (slotId: string) => SlotStatus;
  getSlotsByLot: (lotId: string) => Slot[];
  reserveSlot: (slotId: string, date: string, time: string) => { ok: true } | { ok: false; message: string };
  cancelReservation: (reservationId: string) => void;
  startCharging: (slotId: string, options: { targetKwh: number; ratePerKwh: number; powerKw: number }) =>
    { ok: true; sessionId: string } | { ok: false; message: string };
  stopCharging: (sessionId: string) => { ok: true } | { ok: false; message: string };
  resetSystem: () => void;
};

const SlotContext = createContext<SlotContextType | null>(null);

const defaultLots: ParkingLot[] = [
  { id: "LOT-1", name: "North Atrium", address: "Block A" },
  { id: "LOT-2", name: "Library Deck", address: "Central Library" },
  { id: "LOT-3", name: "Sports Hub", address: "Stadium Wing" },
  { id: "LOT-4", name: "Innovation Yard", address: "Tech Park" }
];

const defaultSlots: Slot[] = defaultLots.flatMap((lot) =>
  Array.from({ length: 7 }, (_, index) => {
    const number = index + 1;
    const type: SlotType = number <= 2 ? "EV" : "Parking";
    return {
      id: `${lot.id}-S${number}`,
      lotId: lot.id,
      label: `${lot.id.replace("LOT-", "L")}-${number}`,
      type
    };
  })
);

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

function parseStart(date: string, time: string) {
  const d = new Date(`${date}T${time}:00`);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d;
}

function hasOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

export const SlotProvider = ({ children }: { children: React.ReactNode }) => {
  const [slots, setSlots] = useState<Slot[]>(() => loadJSON(LS_SLOTS_KEY, defaultSlots));
  const [reservations, setReservations] = useState<Reservation[]>(() => loadJSON(LS_RES_KEY, []));
  const [chargingSessions, setChargingSessions] = useState<ChargingSession[]>(() => loadJSON(LS_SESSIONS_KEY, []));

  // persist
  useEffect(() => {
    localStorage.setItem(LS_SLOTS_KEY, JSON.stringify(slots));
  }, [slots]);

  useEffect(() => {
    localStorage.setItem(LS_RES_KEY, JSON.stringify(reservations));
  }, [reservations]);

  useEffect(() => {
    localStorage.setItem(LS_SESSIONS_KEY, JSON.stringify(chargingSessions));
  }, [chargingSessions]);

  const getSlotStatus = (slotId: string): SlotStatus => {
    const now = Date.now();
    const slotReservations = reservations.filter((r) => r.slotId === slotId);

    if (slotReservations.some((r) => r.startAt <= now && now < r.endAt)) {
      return "Occupied";
    }

    if (slotReservations.some((r) => r.startAt > now)) {
      return "Reserved";
    }

    return "Available";
  };

  const getSlotsByLot = (lotId: string) => slots.filter((s) => s.lotId === lotId);

  const reserveSlot = (slotId: string, date: string, time: string) => {
    const target = slots.find((s) => s.id === slotId);
    if (!target) return { ok: false as const, message: "Slot not found" };
    if (!date || !time) return { ok: false as const, message: "Please fill date & time" };

    const startDate = parseStart(date, time);
    if (!startDate) {
      return { ok: false as const, message: "Invalid date/time" };
    }

    const startAt = startDate.getTime();
    const endAt = startAt + RESERVATION_DURATION_MINUTES * 60 * 1000;

    if (endAt <= Date.now()) {
      return { ok: false as const, message: "Choose a future time slot" };
    }

    const conflict = reservations.some(
      (r) => r.slotId === slotId && hasOverlap(startAt, endAt, r.startAt, r.endAt)
    );

    if (conflict) {
      return { ok: false as const, message: "Slot already reserved for that time" };
    }

    const newRes: Reservation = {
      id: makeId(),
      lotId: target.lotId,
      slotId,
      date,
      time,
      startAt,
      endAt,
      source: "reservation",
      createdAt: Date.now(),
    };
    setReservations((prev) => [newRes, ...prev]);

    return { ok: true as const };
  };

const cancelReservation = (reservationId: string) => {
  setReservations((prev) => prev.filter((r) => r.id !== reservationId));
};

const startCharging = (
  slotId: string,
  options: { targetKwh: number; ratePerKwh: number; powerKw: number }
) => {
  const target = slots.find((s) => s.id === slotId);
  if (!target) {
    return { ok: false as const, message: "Slot not found" };
  }

  if (target.type !== "EV") {
    return { ok: false as const, message: "Only EV slots can be used for charging" };
  }

  if (options.targetKwh <= 0 || options.ratePerKwh <= 0 || options.powerKw <= 0) {
    return { ok: false as const, message: "Enter valid charging values" };
  }

  const now = Date.now();
  const estimatedMinutes = Math.max(1, Math.ceil((options.targetKwh / options.powerKw) * 60));
  const endAt = now + estimatedMinutes * 60 * 1000;

  const conflict = reservations.some(
    (r) => r.slotId === slotId && hasOverlap(now, endAt, r.startAt, r.endAt)
  );

  if (conflict) {
    return { ok: false as const, message: "Slot has a conflicting reservation" };
  }

  const reservationId = makeId();
  const sessionId = makeId();

  const chargingReservation: Reservation = {
    id: reservationId,
    lotId: target.lotId,
    slotId,
    date: new Date(now).toISOString().slice(0, 10),
    time: new Date(now).toTimeString().slice(0, 5),
    startAt: now,
    endAt,
    source: "charging",
    createdAt: now
  };

  const session: ChargingSession = {
    id: sessionId,
    reservationId,
    lotId: target.lotId,
    slotId,
    targetKwh: options.targetKwh,
    ratePerKwh: options.ratePerKwh,
    powerKw: options.powerKw,
    pluggedInAt: now,
    status: "active"
  };

  setReservations((prev) => [chargingReservation, ...prev]);
  setChargingSessions((prev) => [session, ...prev]);

  return { ok: true as const, sessionId };
};

const stopCharging = (sessionId: string) => {
  const session = chargingSessions.find((s) => s.id === sessionId && s.status === "active");
  if (!session) {
    return { ok: false as const, message: "Active session not found" };
  }

  const now = Date.now();
  const elapsedHours = Math.max(0, (now - session.pluggedInAt) / (1000 * 60 * 60));
  const deliveredKwh = Math.min(session.targetKwh, elapsedHours * session.powerKw);
  const amount = deliveredKwh * session.ratePerKwh;

  setChargingSessions((prev) =>
    prev.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            status: "completed",
            unpluggedAt: now,
            deliveredKwh,
            amount
          }
        : s
    )
  );

  setReservations((prev) =>
    prev.map((r) =>
      r.id === session.reservationId
        ? {
            ...r,
            endAt: now
          }
        : r
    )
  );

  return { ok: true as const };
};

const resetSystem = () => {
  localStorage.removeItem(LS_SLOTS_KEY);
  localStorage.removeItem(LS_RES_KEY);
  localStorage.removeItem(LS_SESSIONS_KEY);

  setSlots(defaultSlots);
  setReservations([]);
  setChargingSessions([]);
};

  const value = useMemo(
  () => ({
    lots: defaultLots,
    slots,
    reservations,
    chargingSessions,
    getSlotStatus,
    getSlotsByLot,
    reserveSlot,
    cancelReservation,
    startCharging,
    stopCharging,
    resetSystem,
  }),
  [slots, reservations, chargingSessions]
);


  return <SlotContext.Provider value={value}>{children}</SlotContext.Provider>;
};

export const useSlots = () => {
  const ctx = useContext(SlotContext);
  if (!ctx) throw new Error("useSlots must be used inside SlotProvider");
  return ctx;
};
