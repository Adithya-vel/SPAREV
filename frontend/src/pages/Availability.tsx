import { useEffect, useMemo, useState } from "react";
import type { ParkingLot, ParkingSpot } from "@shared/types";
import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { fetchLots, fetchReservations, fetchSpots } from "../api/client";

function statusBadgeClass(status: string) {
  if (status === "Available") return "badge success";
  if (status === "Reserved") return "badge warn";
  return "badge danger";
}

type SpotStatus = "Available" | "Reserved" | "Occupied" | "Under Repair" | "VIP Only";

type LiveReservation = {
  id: string;
  lotId: string;
  spotId: string;
  startTime: string;
  endTime: string | null;
  status: string;
};

function statusFromAdmin(spot: ParkingSpot): SpotStatus | null {
  if (!spot.adminStatus || spot.adminStatus === "available") {
    return null;
  }

  if (spot.adminStatus === "reserved") return "Reserved";
  if (spot.adminStatus === "under_repair") return "Under Repair";
  if (spot.adminStatus === "vip") return "VIP Only";
  return "Occupied";
}

function statusFromReservations(spotId: string, reservationsBySpot: Map<string, LiveReservation[]>): SpotStatus {
  const reservations = reservationsBySpot.get(spotId) ?? [];
  if (reservations.length === 0) {
    return "Available";
  }

  const now = Date.now();
  const hasActive = reservations.some((reservation) => {
    const start = new Date(reservation.startTime).getTime();
    const end = reservation.endTime ? new Date(reservation.endTime).getTime() : Number.POSITIVE_INFINITY;
    return start <= now && now < end;
  });

  if (hasActive) {
    return "Occupied";
  }

  return "Reserved";
}

const Availability = () => {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [spotsByLot, setSpotsByLot] = useState<Record<string, ParkingSpot[]>>({});
  const [reservations, setReservations] = useState<LiveReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLiveData = async () => {
    setLoading(true);
    setError("");
    try {
      const lotList = await fetchLots();
      const [reservationList, perLotSpots] = await Promise.all([
        fetchReservations(),
        Promise.all(lotList.map((lot) => fetchSpots(lot.id)))
      ]);

      const nextSpotsByLot: Record<string, ParkingSpot[]> = {};
      lotList.forEach((lot, index) => {
        nextSpotsByLot[lot.id] = perLotSpots[index];
      });

      setLots(lotList);
      setReservations(reservationList);
      setSpotsByLot(nextSpotsByLot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLiveData();

    const handleRefresh = () => {
      void loadLiveData();
    };

    const pollId = window.setInterval(() => {
      void loadLiveData();
    }, 15000);

    window.addEventListener("sparev:spot-updated", handleRefresh);
    return () => {
      window.removeEventListener("sparev:spot-updated", handleRefresh);
      window.clearInterval(pollId);
    };
  }, []);

  const reservationsBySpot = useMemo(() => {
    const now = Date.now();
    const map = new Map<string, LiveReservation[]>();
    for (const reservation of reservations) {
      if (reservation.status === "cancelled" || reservation.status === "completed") {
        continue;
      }

      const end = reservation.endTime ? new Date(reservation.endTime).getTime() : Number.POSITIVE_INFINITY;
      if (end <= now) {
        continue;
      }

      const list = map.get(reservation.spotId) ?? [];
      list.push(reservation);
      map.set(reservation.spotId, list);
    }
    return map;
  }, [reservations]);

  return (
    <PageContainer title="Availability" subtitle="Monitor all parking and EV slots in real time.">
      <div className="button-row">
        <button onClick={() => void loadLiveData()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <section className="stack">
        {lots.map((lot) => {
          const lotSlots = spotsByLot[lot.id] ?? [];
          const reservedCount = lotSlots.filter((spot) => {
            const adminStatus = statusFromAdmin(spot);
            if (adminStatus && adminStatus !== "Available") {
              return adminStatus !== "Under Repair" && adminStatus !== "VIP Only";
            }
            const reservationStatus = statusFromReservations(spot.id, reservationsBySpot);
            return reservationStatus === "Reserved" || reservationStatus === "Occupied";
          }).length;

          return (
            <Card key={lot.id}>
              <div className="list-item no-border">
                <div>
                  <h3>{lot.name}</h3>
                  <p>{lot.address}</p>
                </div>
                <div className="button-row" style={{ marginTop: 0 }}>
                  <span className="badge success">{lotSlots.length} Spots</span>
                  <span className="badge warn">{reservedCount} Reserved</span>
                </div>
              </div>

              <div className="grid three" style={{ marginTop: "0.9rem" }}>
                {lotSlots.map((slot) => {
                  const status = statusFromAdmin(slot) ?? statusFromReservations(slot.id, reservationsBySpot);
                  return (
                    <Card key={slot.id} className="slot-card">
                      <p className="eyebrow">{slot.supportsEv ? "ev" : "parking"}</p>
                      <h3>{slot.label}</h3>
                      <span className={statusBadgeClass(status)}>
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
