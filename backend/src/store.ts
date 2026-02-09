import { randomUUID } from "node:crypto";
import type {
  ParkingLot,
  ParkingSpot,
  Reservation,
  ChargingStation,
  ChargingSession
} from "@shared/types";

export const lots: ParkingLot[] = [
  {
    id: "lot-1",
    name: "Main Gate Lot",
    address: "Campus Main Gate",
    totalSpots: 60,
    availableSpots: 22,
    pricePerHour: 40,
    hasEvCharging: true,
    distanceMeters: 150
  },
  {
    id: "lot-2",
    name: "Library Basement",
    address: "Central Library",
    totalSpots: 80,
    availableSpots: 38,
    pricePerHour: 30,
    hasEvCharging: true,
    distanceMeters: 120
  }
];

export const spots: ParkingSpot[] = [
  { id: "spot-1", lotId: "lot-1", label: "A1", isAvailable: true, supportsEv: true },
  { id: "spot-2", lotId: "lot-1", label: "A2", isAvailable: false, supportsEv: false },
  { id: "spot-3", lotId: "lot-2", label: "B1", isAvailable: true, supportsEv: true },
  { id: "spot-4", lotId: "lot-2", label: "B2", isAvailable: true, supportsEv: false }
];

export const reservations: Reservation[] = [];

export const chargingStations: ChargingStation[] = [
  {
    id: "station-1",
    lotId: "lot-1",
    name: "Charger A",
    connectorType: "CCS2",
    maxKw: 50,
    isAvailable: true
  },
  {
    id: "station-2",
    lotId: "lot-2",
    name: "Charger B",
    connectorType: "Type2",
    maxKw: 22,
    isAvailable: true
  }
];

export const chargingSessions: ChargingSession[] = [];

export function createReservation(params: {
  lotId: string;
  spotId: string;
  userId: string;
  vehiclePlate: string;
}) {
  const reservation: Reservation = {
    id: randomUUID(),
    lotId: params.lotId,
    spotId: params.spotId,
    userId: params.userId,
    vehiclePlate: params.vehiclePlate,
    startTime: new Date().toISOString(),
    status: "reserved"
  };
  reservations.push(reservation);
  return reservation;
}

export function createChargingSession(params: {
  stationId: string;
  reservationId?: string;
  userId: string;
}) {
  const session: ChargingSession = {
    id: randomUUID(),
    stationId: params.stationId,
    reservationId: params.reservationId,
    userId: params.userId,
    startedAt: new Date().toISOString(),
    status: "active"
  };
  chargingSessions.push(session);
  return session;
}
