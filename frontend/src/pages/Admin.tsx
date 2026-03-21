import { useEffect, useMemo, useState } from "react";
import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import type { ParkingLot, ParkingSpot, SpotAdminStatus } from "@shared/types";
import { fetchAdminLots, fetchSpots, updateSpot } from "../api/client";

type AdminLot = ParkingLot & {
  _count: { spots: number; chargingStations: number; reservations: number };
};

type SpotDraft = {
  label: string;
  status: SpotAdminStatus;
};

const statusOptions: Array<{ value: SpotAdminStatus; label: string; badge: string }> = [
  { value: "available", label: "Available", badge: "success" },
  { value: "reserved", label: "Reserved", badge: "warn" },
  { value: "occupied", label: "Occupied", badge: "danger" },
  { value: "under_repair", label: "Under Repair", badge: "danger" },
  { value: "vip", label: "VIP Only", badge: "warn" }
];

const defaultStatus = (spot: ParkingSpot): SpotAdminStatus => {
  if (spot.adminStatus) {
    return spot.adminStatus;
  }
  return spot.isAvailable ? "available" : "occupied";
};

const Admin = () => {
  const [lots, setLots] = useState<AdminLot[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [selectedLotId, setSelectedLotId] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingSpotId, setSavingSpotId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [spotDrafts, setSpotDrafts] = useState<Record<string, SpotDraft>>({});

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(""), 1800);
  };

  const loadLots = async (preferredLotId?: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminLots();
      setLots(data);

      const nextSelected =
        preferredLotId && data.some((lot) => lot.id === preferredLotId)
          ? preferredLotId
          : "";
      setSelectedLotId(nextSelected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lots");
    } finally {
      setLoading(false);
    }
  };

  const loadLotDetails = async (lotId: string) => {
    if (!lotId) {
      setSpots([]);
      setSpotDrafts({});
      return;
    }

    setError("");
    try {
      const spotList = await fetchSpots(lotId);
      setSpots(spotList);
      setSpotDrafts(
        Object.fromEntries(
          spotList.map((spot) => [
            spot.id,
            {
              label: spot.label,
              status: defaultStatus(spot)
            }
          ])
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lot details");
    }
  };

  useEffect(() => {
    void loadLots();
  }, []);

  useEffect(() => {
    void loadLotDetails(selectedLotId);
  }, [selectedLotId]);

  const stats = useMemo(() => {
    const totalLots = lots.length;
    const totalSpots = lots.reduce((sum, lot) => sum + lot._count.spots, 0);
    const totalChargers = lots.reduce((sum, lot) => sum + lot._count.chargingStations, 0);
    const totalReservations = lots.reduce((sum, lot) => sum + lot._count.reservations, 0);
    return { totalLots, totalSpots, totalChargers, totalReservations };
  }, [lots]);

  const updateDraft = (spotId: string, patch: Partial<SpotDraft>) => {
    setSpotDrafts((prev) => {
      const current = prev[spotId];
      if (!current) {
        return prev;
      }
      return { ...prev, [spotId]: { ...current, ...patch } };
    });
  };

  const handleSaveSpot = async (spot: ParkingSpot) => {
    const draft = spotDrafts[spot.id];
    if (!draft) {
      return;
    }

    setError("");
    setSavingSpotId(spot.id);

    try {
      await updateSpot(spot.id, {
        label: draft.label.trim() || spot.label,
        adminStatus: draft.status,
        isAvailable: draft.status === "available"
      });

      await loadLotDetails(selectedLotId);
      window.dispatchEvent(new Event("sparev:spot-updated"));
      showSuccess(`Updated ${draft.label || spot.label}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update spot");
    } finally {
      setSavingSpotId("");
    }
  };

  const managedSpots = useMemo(
    () => spots.filter((spot) => spot.adminStatus && spot.adminStatus !== "available"),
    [spots]
  );

  return (
    <PageContainer title="Admin Control Room" subtitle="Update-only operations: reserve, mark occupied, set under-repair, and assign VIP spots.">
      <div className="button-row">
        <button onClick={() => void loadLots(selectedLotId)} disabled={loading}>Refresh</button>
      </div>

      <div className="grid three">
        <Card>
          <p className="kpi-label">Lots</p>
          <p className="kpi-value">{stats.totalLots}</p>
        </Card>
        <Card>
          <p className="kpi-label">Spots</p>
          <p className="kpi-value">{stats.totalSpots}</p>
        </Card>
        <Card>
          <p className="kpi-label">EV Chargers</p>
          <p className="kpi-value">{stats.totalChargers}</p>
        </Card>
        <Card>
          <p className="kpi-label">Reservations</p>
          <p className="kpi-value">{stats.totalReservations}</p>
        </Card>
      </div>

      <Card>
        <h3>Lots</h3>
        <div className="stack compact">
          {lots.length === 0 && <p>No lots found.</p>}
          {lots.map((lot) => (
            <div key={lot.id} className="list-item">
              <div>
                <strong>{lot.name}</strong>
                <div>{lot.address}</div>
                <div>Spots: {lot._count.spots} | Chargers: {lot._count.chargingStations}</div>
              </div>
              <button className="button button-ghost" onClick={() => setSelectedLotId(lot.id)}>Manage</button>
            </div>
          ))}
        </div>
      </Card>

      {selectedLotId && (
        <Card>
          <div className="button-row" style={{ justifyContent: "space-between", marginTop: 0 }}>
            <h3>Spot Workspace</h3>
            <button className="button button-ghost" onClick={() => setSelectedLotId("")}>Close</button>
          </div>
          <div className="stack" style={{ marginTop: "0.8rem" }}>
            {spots.length === 0 && <p>No spots for this lot.</p>}
            {spots.map((spot) => {
              const draft = spotDrafts[spot.id];
              const status = draft?.status ?? defaultStatus(spot);
              const selected = statusOptions.find((option) => option.value === status) ?? statusOptions[0];

              return (
                <div key={spot.id} className="list-item" style={{ alignItems: "stretch" }}>
                  <div className="stack compact" style={{ width: "100%" }}>
                    <div className="button-row" style={{ marginTop: 0, justifyContent: "space-between" }}>
                      <div>
                        <p className="eyebrow">{spot.supportsEv ? "EV" : "Parking"}</p>
                        <strong>{spot.label}</strong>
                      </div>
                      <span className={`badge ${selected.badge}`}>{selected.label}</span>
                    </div>

                    <div className="grid two">
                      <div className="form" style={{ marginTop: 0 }}>
                        <label>Spot Label</label>
                        <input
                          value={draft?.label ?? spot.label}
                          onChange={(e) => updateDraft(spot.id, { label: e.target.value })}
                          placeholder="Spot label"
                        />
                      </div>

                      <div className="form" style={{ marginTop: 0 }}>
                        <label>Status</label>
                        <select
                          value={status}
                          onChange={(e) => updateDraft(spot.id, { status: e.target.value as SpotAdminStatus })}
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="button-row" style={{ marginTop: 0 }}>
                      <button onClick={() => void handleSaveSpot(spot)} disabled={savingSpotId === spot.id}>
                        {savingSpotId === spot.id ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        className="button button-ghost"
                        onClick={() => {
                          updateDraft(spot.id, {
                            label: spot.label,
                            status: defaultStatus(spot)
                          });
                        }}
                        disabled={savingSpotId === spot.id}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {managedSpots.length > 0 && (
              <div
                className="stack compact"
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: "12px"
                }}
              >
                <h4>Managed Spots (shown until set to Available)</h4>
                {managedSpots.map((spot) => {
                  const currentStatus = defaultStatus(spot);
                  const option = statusOptions.find((item) => item.value === currentStatus) ?? statusOptions[0];

                  return (
                    <div key={`managed-${spot.id}`} className="list-item">
                      <div>
                        <strong>{spot.label}</strong>
                        <div>{spot.supportsEv ? "EV" : "Parking"}</div>
                      </div>
                      <span className={`badge ${option.badge}`}>{option.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
    </PageContainer>
  );
};

export default Admin;
