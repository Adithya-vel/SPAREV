import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createChargingSession as apiCreateChargingSession,
  cancelReservation as apiCancelReservation,
  createReservation as apiCreateReservation,
  fetchChargingSessions,
  fetchChargingStations,
  fetchLots,
  fetchReservations,
  fetchSpots,
  stopChargingSession as apiStopChargingSession
} from "../api/client";

type SlotType = "Parking" | "EV";
type SlotStatus = "Available" | "Reserved" | "Occupied" | "Under Repair" | "VIP Only";
type SpotAdminStatus = "available" | "reserved" | "occupied" | "under_repair" | "vip";

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
  adminStatus?: SpotAdminStatus;
};

export type Reservation = {
  id: string; // unique reservation id
  lotId: string;
  slotId: string;
  date: string; // YYYY-MM-DD
  fromTime: string; // HH:MM
  toTime: string; // HH:MM
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
  getSlotTypeLabel: (slotId: string) => SlotType | "Unknown";
  getSlotDisplayLabel: (slotId: string) => string;
  getSlotsByLot: (lotId: string) => Slot[];
  reserveSlot: (slotId: string, date: string, fromTime: string, toTime: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  cancelReservation: (reservationId: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  startCharging: (
    slotId: string,
    options: { targetKwh: number; ratePerKwh: number; powerKw: number }
  ) => Promise<{ ok: true; sessionId: string } | { ok: false; message: string }>;
  stopCharging: (sessionId: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  resetSystem: () => void;
};

const SlotContext = createContext<SlotContextType | null>(null);

const defaultLots: ParkingLot[] = [
  { id: "LOT-1", name: "North Atrium", address: "Block A" },
  { id: "LOT-2", name: "Library Deck", address: "Central Library" },
  { id: "LOT-3", name: "Sports Hub", address: "Stadium Wing" },
  { id: "LOT-4", name: "Innovation Yard", address: "Tech Park" }
];

function toLotSpotPrefix(lotName: string): string {
  const words = lotName
    .split(/[^A-Za-z0-9]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  const base = (words[0] ?? "SP").toUpperCase();
  return base.length >= 2 ? base.slice(0, 2) : `${base}X`;
}

const defaultSlots: Slot[] = defaultLots.flatMap((lot) =>
  Array.from({ length: 7 }, (_, index) => {
    const number = index + 1;
    const type: SlotType = number <= 2 ? "EV" : "Parking";
    const prefix = toLotSpotPrefix(lot.name);
    return {
      id: `${lot.id}-S${number}`,
      lotId: lot.id,
      label: `${prefix}-${number}`,
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

function toLocalTimeHHMM(timestamp: number) {
  return new Date(timestamp).toTimeString().slice(0, 5);
}

function normalizeSavedSlotLabels(storedSlots: Slot[]): Slot[] {
  const lotNameById = new Map(defaultLots.map((lot) => [lot.id, lot.name]));

  return storedSlots.map((slot) => {
    if (/^[A-Z]{2}-\d+$/i.test(slot.label)) {
      return slot;
    }

    const lotName = lotNameById.get(slot.lotId);
    if (!lotName) {
      return slot;
    }

    const spotNumberMatch = slot.label.match(/(\d+)$/) ?? slot.id.match(/S(\d+)$/i);
    if (!spotNumberMatch) {
      return slot;
    }

    return {
      ...slot,
      label: `${toLotSpotPrefix(lotName)}-${spotNumberMatch[1]}`
    };
  });
}

type LegacyReservation = Reservation & { time?: string };

function normalizeReservations(storedReservations: LegacyReservation[]): Reservation[] {
  return storedReservations
    .filter((reservation) => Number.isFinite(reservation.startAt) && Number.isFinite(reservation.endAt))
    .map((reservation) => ({
      ...reservation,
      fromTime: reservation.fromTime ?? reservation.time ?? toLocalTimeHHMM(reservation.startAt),
      toTime: reservation.toTime ?? toLocalTimeHHMM(reservation.endAt)
    }));
}

type ApiReservation = {
  id: string;
  lotId: string;
  spotId: string;
  userId: string;
  vehiclePlate: string;
  startTime: string;
  endTime: string | null;
  status: string;
};

type ApiChargingSession = {
  id: string;
  stationId: string;
  reservationId: string | null;
  userId: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  energyKwh: number | null;
  cost: number | null;
};

function toContextReservation(apiReservation: ApiReservation): Reservation | null {
  const startAt = new Date(apiReservation.startTime).getTime();
  if (!Number.isFinite(startAt)) {
    return null;
  }

  const endAt = apiReservation.endTime
    ? new Date(apiReservation.endTime).getTime()
    : Number.POSITIVE_INFINITY;

  if (!Number.isFinite(endAt) && endAt !== Number.POSITIVE_INFINITY) {
    return null;
  }

  return {
    id: apiReservation.id,
    lotId: apiReservation.lotId,
    slotId: apiReservation.spotId,
    date: apiReservation.startTime.slice(0, 10),
    fromTime: toLocalTimeHHMM(startAt),
    toTime: Number.isFinite(endAt) ? toLocalTimeHHMM(endAt) : "--:--",
    startAt,
    endAt,
    source: "reservation",
    createdAt: startAt
  };
}

function toContextChargingSession(
  apiSession: ApiChargingSession,
  reservationById: Map<string, Reservation>,
  slotByReservationId: Map<string, string>
): ChargingSession | null {
  const reservationId = apiSession.reservationId;
  if (!reservationId) {
    return null;
  }

  const reservation = reservationById.get(reservationId);
  const slotId = slotByReservationId.get(reservationId) ?? reservation?.slotId;
  const lotId = reservation?.lotId;
  const pluggedInAt = new Date(apiSession.startedAt).getTime();
  const unpluggedAt = apiSession.endedAt ? new Date(apiSession.endedAt).getTime() : undefined;

  if (!slotId || !lotId || !Number.isFinite(pluggedInAt)) {
    return null;
  }

  const deliveredKwh = apiSession.energyKwh ?? undefined;
  const amount = apiSession.cost ?? undefined;
  const elapsedHours =
    unpluggedAt && unpluggedAt > pluggedInAt
      ? (unpluggedAt - pluggedInAt) / (1000 * 60 * 60)
      : undefined;
  const inferredPower =
    elapsedHours && deliveredKwh !== undefined && elapsedHours > 0
      ? Number((deliveredKwh / elapsedHours).toFixed(2))
      : 7.2;
  const inferredRate =
    deliveredKwh && amount !== undefined && deliveredKwh > 0
      ? Number((amount / deliveredKwh).toFixed(2))
      : 18;
  const inferredTargetKwh =
    deliveredKwh ??
    (reservation && Number.isFinite(reservation.endAt)
      ? Math.max(1, Math.ceil(((reservation.endAt - reservation.startAt) / (1000 * 60 * 60)) * inferredPower))
      : 1);

  return {
    id: apiSession.id,
    reservationId,
    lotId,
    slotId,
    targetKwh: inferredTargetKwh,
    ratePerKwh: inferredRate,
    powerKw: inferredPower,
    pluggedInAt,
    ...(unpluggedAt ? { unpluggedAt } : {}),
    ...(deliveredKwh === undefined ? {} : { deliveredKwh }),
    ...(amount === undefined ? {} : { amount }),
    status: apiSession.status === "completed" ? "completed" : "active"
  };
}

export const SlotProvider = ({ children }: { children: React.ReactNode }) => {
  const [lots, setLots] = useState<ParkingLot[]>(defaultLots);
  const [slots, setSlots] = useState<Slot[]>(() => normalizeSavedSlotLabels(loadJSON(LS_SLOTS_KEY, defaultSlots)));
  const [reservations, setReservations] = useState<Reservation[]>(() => normalizeReservations(loadJSON(LS_RES_KEY, [])));
  const [chargingSessions, setChargingSessions] = useState<ChargingSession[]>(() => loadJSON(LS_SESSIONS_KEY, []));

  const syncSlotsFromBackend = async () => {
    try {
      const apiLots = await fetchLots();
      const mappedLots: ParkingLot[] = apiLots.map((lot) => ({
        id: lot.id,
        name: lot.name,
        address: lot.address
      }));

      const perLotSpots = await Promise.all(
        mappedLots.map(async (lot) => {
          const spotList = await fetchSpots(lot.id);
          return spotList.map((spot) => ({
            id: spot.id,
            lotId: spot.lotId,
            label: spot.label,
            type: spot.supportsEv ? "EV" : "Parking",
            adminStatus: spot.adminStatus
          } as Slot));
        })
      );

      setLots(mappedLots);
      setSlots(normalizeSavedSlotLabels(perLotSpots.flat()));
    } catch {
      // Keep local data if API is unavailable.
    }
  };

  const syncReservationsFromBackend = async () => {
    try {
      const apiReservations = await fetchReservations();
      const mappedReservations = apiReservations
        .filter((reservation) => reservation.status !== "cancelled" && reservation.status !== "completed")
        .map((reservation) => toContextReservation(reservation))
        .filter((reservation): reservation is Reservation => reservation !== null);

      setReservations(mappedReservations);
    } catch {
      // Keep local data if API is unavailable.
    }
  };

  const syncChargingSessionsFromBackend = async () => {
    try {
      const [apiReservations, apiSessions] = await Promise.all([
        fetchReservations({ includePast: true }),
        fetchChargingSessions()
      ]);

      const reservationMap = new Map<string, Reservation>();
      const slotByReservationId = new Map<string, string>();

      for (const reservation of apiReservations) {
        const mappedReservation = toContextReservation(reservation);
        if (!mappedReservation) {
          continue;
        }
        reservationMap.set(reservation.id, mappedReservation);
        slotByReservationId.set(reservation.id, reservation.spotId);
      }

      const mappedSessions = apiSessions
        .map((session) => toContextChargingSession(session, reservationMap, slotByReservationId))
        .filter((session): session is ChargingSession => session !== null);

      setChargingSessions(mappedSessions);
    } catch {
      // Keep local data if API is unavailable.
    }
  };

  useEffect(() => {
    void syncSlotsFromBackend();
    void syncReservationsFromBackend();
    void syncChargingSessionsFromBackend();

    const handleExternalRefresh = () => {
      void syncSlotsFromBackend();
      void syncReservationsFromBackend();
      void syncChargingSessionsFromBackend();
    };

    const pollId = window.setInterval(() => {
      void syncSlotsFromBackend();
      void syncReservationsFromBackend();
      void syncChargingSessionsFromBackend();
    }, 15000);

    window.addEventListener("sparev:spot-updated", handleExternalRefresh);
    return () => {
      window.removeEventListener("sparev:spot-updated", handleExternalRefresh);
      window.clearInterval(pollId);
    };
  }, []);

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
    const slot = slots.find((s) => s.id === slotId);
    if (slot?.adminStatus && slot.adminStatus !== "available") {
      if (slot.adminStatus === "reserved") return "Reserved";
      if (slot.adminStatus === "under_repair") return "Under Repair";
      if (slot.adminStatus === "vip") return "VIP Only";
      return "Occupied";
    }

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

  const getSlotTypeLabel = (slotId: string): SlotType | "Unknown" => {
    const slot = slots.find((s) => s.id === slotId);
    return slot?.type ?? "Unknown";
  };

  const getSlotDisplayLabel = (slotId: string) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) {
      return slotId;
    }
    return `${slot.label} (${slot.type})`;
  };

  const getSlotsByLot = (lotId: string) => slots.filter((s) => s.lotId === lotId);

  const reserveSlot = async (slotId: string, date: string, fromTime: string, toTime: string) => {
    const target = slots.find((s) => s.id === slotId);
    if (!target) return { ok: false as const, message: "Slot not found" };
    if (target.adminStatus && target.adminStatus !== "available") {
      return { ok: false as const, message: "Slot is blocked by admin status" };
    }
    if (!date || !fromTime || !toTime) return { ok: false as const, message: "Please fill date, from time and to time" };

    const startDate = parseStart(date, fromTime);
    const endDate = parseStart(date, toTime);
    if (!startDate || !endDate) {
      return { ok: false as const, message: "Invalid date or time" };
    }

    const startAt = startDate.getTime();
    const endAt = endDate.getTime();

    if (endAt <= startAt) {
      return { ok: false as const, message: "To time must be after from time" };
    }

    if (endAt <= Date.now()) {
      return { ok: false as const, message: "Choose a future time slot" };
    }

    const conflict = reservations.some(
      (r) => r.slotId === slotId && hasOverlap(startAt, endAt, r.startAt, r.endAt)
    );

    if (conflict) {
      return { ok: false as const, message: "Slot already reserved for that time" };
    }

    try {
      const durationMinutes = Math.max(1, Math.ceil((endAt - startAt) / (60 * 1000)));
      const created = await apiCreateReservation({
        lotId: target.lotId,
        spotId: slotId,
        vehiclePlate: "DEMO-USER",
        startTime: new Date(startAt).toISOString(),
        durationMinutes
      });

      const mappedReservation = toContextReservation(created);
      if (mappedReservation) {
        setReservations((prev) => [mappedReservation, ...prev.filter((reservation) => reservation.id !== mappedReservation.id)]);
      } else {
        await syncReservationsFromBackend();
      }

      window.dispatchEvent(new Event("sparev:spot-updated"));
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: "Failed to create reservation" };
    }
  };

const cancelReservation = async (reservationId: string) => {
  const targetReservation = reservations.find((reservation) => reservation.id === reservationId);
  if (!targetReservation) {
    return { ok: false as const, message: "Reservation not found" };
  }

  if (targetReservation.source === "charging") {
    setReservations((prev) => prev.filter((reservation) => reservation.id !== reservationId));
    return { ok: true as const };
  }

  try {
    await apiCancelReservation(reservationId, { reason: "Cancelled from reservation page" });
    setReservations((prev) => prev.filter((reservation) => reservation.id !== reservationId));
    window.dispatchEvent(new Event("sparev:spot-updated"));
    return { ok: true as const };
  } catch {
    return { ok: false as const, message: "Failed to cancel reservation" };
  }
};

const startCharging = async (
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

  try {
    const stations = await fetchChargingStations();
    const station = stations.find((item) => item.lotId === target.lotId);
    if (!station) {
      return { ok: false as const, message: "No charging station configured for this lot" };
    }

    const durationMinutes = Math.max(1, Math.ceil((options.targetKwh / options.powerKw) * 60));
    const createdReservation = await apiCreateReservation({
      lotId: target.lotId,
      spotId: slotId,
      vehiclePlate: "EV-CHARGE",
      startTime: new Date(now).toISOString(),
      durationMinutes
    });

    const estimatedAmount = Math.round(options.targetKwh * options.ratePerKwh);
    const createdSession = await apiCreateChargingSession({
      stationId: station.id,
      reservationId: createdReservation.id,
      userId: "demo-user",
      energyKwh: options.targetKwh,
      cost: estimatedAmount
    });

    const mappedReservation = toContextReservation(createdReservation);
    if (mappedReservation) {
      setReservations((prev) => [mappedReservation, ...prev.filter((reservation) => reservation.id !== mappedReservation.id)]);
    } else {
      await syncReservationsFromBackend();
    }

    const session: ChargingSession = {
      id: createdSession.id,
      reservationId: createdReservation.id,
      lotId: target.lotId,
      slotId,
      targetKwh: options.targetKwh,
      ratePerKwh: options.ratePerKwh,
      powerKw: options.powerKw,
      pluggedInAt: now,
      status: "active"
    };

    setChargingSessions((prev) => [session, ...prev.filter((item) => item.id !== session.id)]);
    window.dispatchEvent(new Event("sparev:spot-updated"));
    return { ok: true as const, sessionId: createdSession.id };
  } catch {
    return { ok: false as const, message: "Failed to start charging session" };
  }
};

const stopCharging = (sessionId: string) => {
  const session = chargingSessions.find((s) => s.id === sessionId && s.status === "active");
  if (!session) {
    return Promise.resolve({ ok: false as const, message: "Active session not found" });
  }

  return (async () => {
    try {
      const now = Date.now();
      const elapsedHours = Math.max(0, (now - session.pluggedInAt) / (1000 * 60 * 60));
      const deliveredKwh = Number(Math.min(session.targetKwh, elapsedHours * session.powerKw).toFixed(3));
      const amount = Math.round(deliveredKwh * session.ratePerKwh);

      await apiStopChargingSession(sessionId, { energyKwh: deliveredKwh, cost: amount });
      await apiCancelReservation(session.reservationId, { reason: "Charging completed" });

      await syncReservationsFromBackend();
      await syncChargingSessionsFromBackend();
      window.dispatchEvent(new Event("sparev:spot-updated"));
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: "Failed to stop charging session" };
    }
  })();
};

const resetSystem = () => {
  localStorage.removeItem(LS_SLOTS_KEY);
  localStorage.removeItem(LS_RES_KEY);
  localStorage.removeItem(LS_SESSIONS_KEY);

  setSlots(defaultSlots);
  setReservations([]);
  setChargingSessions([]);
  void syncSlotsFromBackend();
  void syncReservationsFromBackend();
  void syncChargingSessionsFromBackend();
};

  const value = useMemo(
  () => ({
    lots,
    slots,
    reservations,
    chargingSessions,
    getSlotStatus,
    getSlotTypeLabel,
    getSlotDisplayLabel,
    getSlotsByLot,
    reserveSlot,
    cancelReservation,
    startCharging,
    stopCharging,
    resetSystem,
  }),
  [lots, slots, reservations, chargingSessions]
);


  return <SlotContext.Provider value={value}>{children}</SlotContext.Provider>;
};

export const useSlots = () => {
  const ctx = useContext(SlotContext);
  if (!ctx) throw new Error("useSlots must be used inside SlotProvider");
  return ctx;
};
