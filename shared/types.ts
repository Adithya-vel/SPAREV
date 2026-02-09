export type ReservationStatus = "reserved" | "active" | "completed" | "cancelled";
export type ChargingStatus = "idle" | "active" | "completed" | "failed";

export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  totalSpots: number;
  availableSpots: number;
  pricePerHour: number;
  hasEvCharging: boolean;
  distanceMeters?: number;
}

export interface ParkingSpot {
  id: string;
  lotId: string;
  label: string;
  isAvailable: boolean;
  supportsEv: boolean;
}

export interface Reservation {
  id: string;
  lotId: string;
  spotId: string;
  userId: string;
  vehiclePlate: string;
  startTime: string;
  status: ReservationStatus;
}

export interface ChargingStation {
  id: string;
  lotId: string;
  name: string;
  connectorType: string;
  maxKw: number;
  isAvailable: boolean;
}

export interface ChargingSession {
  id: string;
  stationId: string;
  reservationId?: string;
  userId: string;
  startedAt: string;
  status: ChargingStatus;
  energyKwh?: number;
  cost?: number;
}
