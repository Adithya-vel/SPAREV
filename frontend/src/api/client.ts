import type { ParkingLot, ParkingSpot } from "@shared/types";

const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function fetchLots() {
  return getJson<ParkingLot[]>("/api/lots");
}

export function fetchSpots(lotId: string) {
  return getJson<ParkingSpot[]>(`/api/lots/${lotId}/spots`);
}
