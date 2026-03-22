import type { ChargingStation, ParkingLot, ParkingSpot } from "@shared/types";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function sendJson<T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export function fetchLots() {
  return getJson<ParkingLot[]>("/api/lots");
}

export function fetchSpots(lotId: string) {
  return getJson<ParkingSpot[]>(`/api/lots/${lotId}/spots`);
}

export function fetchChargingStations() {
  return getJson<ChargingStation[]>("/api/charging-stations");
}

export function fetchChargingSessions(params?: { status?: "active" | "completed" }) {
  const search = new URLSearchParams();
  if (params?.status) {
    search.set("status", params.status);
  }

  const suffix = search.toString();
  return getJson<Array<{
    id: string;
    stationId: string;
    reservationId: string | null;
    userId: string;
    startedAt: string;
    endedAt: string | null;
    status: string;
    energyKwh: number | null;
    cost: number | null;
  }>>(`/api/charging-sessions${suffix ? `?${suffix}` : ""}`);
}

export function fetchReservations(params?: { lotId?: string; includePast?: boolean }) {
  const search = new URLSearchParams();
  if (params?.lotId) {
    search.set("lotId", params.lotId);
  }
  if (params?.includePast) {
    search.set("includePast", "true");
  }

  const suffix = search.toString();
  return getJson<Array<{
    id: string;
    lotId: string;
    spotId: string;
    userId: string;
    vehiclePlate: string;
    startTime: string;
    endTime: string | null;
    status: string;
  }>>(`/api/reservations${suffix ? `?${suffix}` : ""}`);
}

export function createReservation(payload: {
  lotId: string;
  spotId: string;
  vehiclePlate: string;
  userId?: string;
  startTime?: string;
  durationMinutes?: number;
}) {
  return sendJson<{
    id: string;
    lotId: string;
    spotId: string;
    userId: string;
    vehiclePlate: string;
    startTime: string;
    endTime: string | null;
    status: string;
  }>("/api/reservations", "POST", payload);
}

export function cancelReservation(reservationId: string, payload?: { reason?: string }) {
  return sendJson<{
    id: string;
    lotId: string;
    spotId: string;
    userId: string;
    vehiclePlate: string;
    startTime: string;
    endTime: string | null;
    status: string;
  }>(`/api/reservations/${reservationId}/cancel`, "POST", payload);
}

export function fetchAdminLots() {
  return getJson<Array<ParkingLot & {
    _count: { spots: number; chargingStations: number; reservations: number };
  }>>("/api/admin/lots");
}

export function createLot(payload: {
  name: string;
  address: string;
  totalSpots: number;
  pricePerHour: number;
  hasEvCharging?: boolean;
  distanceMeters?: number | null;
  timezone?: string;
}) {
  return sendJson<ParkingLot>("/api/admin/lots", "POST", payload);
}

export function deleteLot(lotId: string) {
  return sendJson<void>(`/api/admin/lots/${lotId}`, "DELETE");
}

export function createSpot(payload: {
  lotId: string;
  label: string;
  isAvailable?: boolean;
  supportsEv?: boolean;
}) {
  return sendJson<ParkingSpot>("/api/admin/spots", "POST", payload);
}

export function deleteSpot(spotId: string) {
  return sendJson<void>(`/api/admin/spots/${spotId}`, "DELETE");
}

export function updateSpot(
  spotId: string,
  payload: {
    label?: string;
    isAvailable?: boolean;
    supportsEv?: boolean;
    adminStatus?: "available" | "reserved" | "occupied" | "under_repair" | "vip";
    adminNote?: string | null;
  }
) {
  return sendJson<ParkingSpot>(`/api/admin/spots/${spotId}`, "PATCH", payload);
}

export function createChargingStation(payload: {
  lotId: string;
  name: string;
  connectorType: string;
  maxKw: number;
  isAvailable?: boolean;
}) {
  return sendJson("/api/admin/charging-stations", "POST", payload);
}

export function deleteChargingStation(stationId: string) {
  return sendJson<void>(`/api/admin/charging-stations/${stationId}`, "DELETE");
}

export function createChargingSession(payload: {
  stationId: string;
  reservationId?: string;
  userId?: string;
  energyKwh?: number;
  cost?: number;
}) {
  return sendJson<{
    id: string;
    stationId: string;
    reservationId: string | null;
    userId: string;
    startedAt: string;
    endedAt: string | null;
    status: string;
    energyKwh: number | null;
    cost: number | null;
  }>("/api/charging-sessions", "POST", payload);
}

export function stopChargingSession(
  sessionId: string,
  payload?: { energyKwh?: number; cost?: number }
) {
  return sendJson<{
    id: string;
    stationId: string;
    reservationId: string | null;
    userId: string;
    startedAt: string;
    endedAt: string | null;
    status: string;
    energyKwh: number | null;
    cost: number | null;
  }>(`/api/charging-sessions/${sessionId}/stop`, "POST", payload);
}
