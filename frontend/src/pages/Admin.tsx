import { useEffect, useMemo, useState } from "react";
import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import type { ChargingStation, ParkingLot, ParkingSpot } from "@shared/types";
import {
  createChargingStation,
  createLot,
  createSpot,
  deleteChargingStation,
  deleteLot,
  deleteSpot,
  fetchAdminLots,
  fetchChargingStations,
  fetchSpots
} from "../api/client";

type AdminLot = ParkingLot & {
  _count: { spots: number; chargingStations: number; reservations: number };
};

const standardLots = [
  { name: "North Atrium", address: "Block A" },
  { name: "Library Deck", address: "Central Library" },
  { name: "Sports Hub", address: "Stadium Wing" },
  { name: "Innovation Yard", address: "Tech Park" }
];

const Admin = () => {
  const [lots, setLots] = useState<AdminLot[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [stations, setStations] = useState<ChargingStation[]>([]);
  const [selectedLotId, setSelectedLotId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [lotForm, setLotForm] = useState({
    name: "",
    address: "",
    pricePerHour: 20,
    distanceMeters: 100
  });

  const [spotForm, setSpotForm] = useState({
    label: "",
    supportsEv: false,
    isAvailable: true
  });

  const [stationForm, setStationForm] = useState({
    name: "",
    connectorType: "CCS2",
    maxKw: 50,
    isAvailable: true
  });

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
          : data[0]?.id ?? "";
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
      setStations([]);
      return;
    }

    setError("");
    try {
      const [spotList, stationList] = await Promise.all([
        fetchSpots(lotId),
        fetchChargingStations()
      ]);
      setSpots(spotList);
      setStations(stationList.filter((station) => station.lotId === lotId));
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

  const handleCreateLot = async () => {
    setError("");
    try {
      const created = await createLot({
        name: lotForm.name,
        address: lotForm.address,
        totalSpots: 0,
        pricePerHour: Number(lotForm.pricePerHour),
        hasEvCharging: false,
        distanceMeters: Number(lotForm.distanceMeters),
        timezone: "Asia/Kolkata"
      });
      setLotForm({ name: "", address: "", pricePerHour: 20, distanceMeters: 100 });
      await loadLots(created.id);
      showSuccess("Lot created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lot");
    }
  };

  const handleDeleteLot = async (lotId: string) => {
    if (!confirm("Delete lot and all related data?")) {
      return;
    }
    setError("");
    try {
      await deleteLot(lotId);
      await loadLots();
      showSuccess("Lot deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete lot");
    }
  };

  const handleCreateSpot = async () => {
    if (!selectedLotId) {
      setError("Select a lot first");
      return;
    }

    setError("");
    try {
      await createSpot({
        lotId: selectedLotId,
        label: spotForm.label,
        isAvailable: spotForm.isAvailable,
        supportsEv: spotForm.supportsEv
      });
      setSpotForm({ label: "", supportsEv: false, isAvailable: true });
      await Promise.all([loadLots(selectedLotId), loadLotDetails(selectedLotId)]);
      showSuccess("Spot created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create spot");
    }
  };

  const handleDeleteSpot = async (spotId: string) => {
    if (!confirm("Delete this spot and linked reservations?")) {
      return;
    }
    setError("");
    try {
      await deleteSpot(spotId);
      await Promise.all([loadLots(selectedLotId), loadLotDetails(selectedLotId)]);
      showSuccess("Spot deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete spot");
    }
  };

  const handleCreateStation = async () => {
    if (!selectedLotId) {
      setError("Select a lot first");
      return;
    }

    setError("");
    try {
      await createChargingStation({
        lotId: selectedLotId,
        name: stationForm.name,
        connectorType: stationForm.connectorType,
        maxKw: Number(stationForm.maxKw),
        isAvailable: stationForm.isAvailable
      });
      setStationForm({ name: "", connectorType: "CCS2", maxKw: 50, isAvailable: true });
      await Promise.all([loadLots(selectedLotId), loadLotDetails(selectedLotId)]);
      showSuccess("Charging station created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create station");
    }
  };

  const handleDeleteStation = async (stationId: string) => {
    if (!confirm("Delete this charging station?")) {
      return;
    }

    setError("");
    try {
      await deleteChargingStation(stationId);
      await Promise.all([loadLots(selectedLotId), loadLotDetails(selectedLotId)]);
      showSuccess("Charging station deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete station");
    }
  };

  const handleGenerateStandardLayout = async () => {
    if (!confirm("Create 4 lots with 7 spots each (2 EV spots in each lot)?")) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      for (const lotTemplate of standardLots) {
        const lot = await createLot({
          name: lotTemplate.name,
          address: lotTemplate.address,
          totalSpots: 0,
          pricePerHour: 25,
          distanceMeters: 120,
          timezone: "Asia/Kolkata"
        });

        for (let i = 1; i <= 7; i += 1) {
          await createSpot({
            lotId: lot.id,
            label: `${lot.name.slice(0, 1)}-${i}`,
            isAvailable: true,
            supportsEv: i <= 2
          });
        }
      }

      await loadLots();
      showSuccess("Standard 4x7 layout created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create standard layout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Admin Control Room" subtitle="Clean operations board for lots, spots, and EV chargers.">
      <div className="button-row">
        <button onClick={() => void loadLots(selectedLotId)} disabled={loading}>Refresh</button>
        <button className="button button-ghost" onClick={() => void handleGenerateStandardLayout()} disabled={loading}>
          Create 4 Lots x 7 Spots Template
        </button>
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

      <div className="grid two">
        <Card>
          <h3>Create Lot</h3>
          <div className="form">
            <input
              value={lotForm.name}
              onChange={(e) => setLotForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Lot name"
            />
            <input
              value={lotForm.address}
              onChange={(e) => setLotForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Address"
            />
            <input
              type="number"
              value={lotForm.pricePerHour}
              onChange={(e) => setLotForm((prev) => ({ ...prev, pricePerHour: Number(e.target.value) }))}
              placeholder="Price per hour"
            />
            <input
              type="number"
              value={lotForm.distanceMeters}
              onChange={(e) => setLotForm((prev) => ({ ...prev, distanceMeters: Number(e.target.value) }))}
              placeholder="Distance (m)"
            />
            <button onClick={() => void handleCreateLot()} disabled={!lotForm.name || !lotForm.address}>Create Lot</button>
          </div>
        </Card>

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
                <div className="button-row" style={{ marginTop: 0 }}>
                  <button className="button button-ghost" onClick={() => setSelectedLotId(lot.id)}>Manage</button>
                  <button className="button button-danger" onClick={() => void handleDeleteLot(lot.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h3>Lot Workspace</h3>
        {!selectedLotId ? (
          <p>Select a lot to manage spots and chargers.</p>
        ) : (
          <div className="grid two" style={{ marginTop: "0.8rem" }}>
            <div className="stack">
              <Card>
                <h3>Add Spot</h3>
                <div className="form">
                  <input
                    value={spotForm.label}
                    onChange={(e) => setSpotForm((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder="Spot label"
                  />
                  <div className="button-row">
                    <button
                      type="button"
                      className="button button-ghost"
                      onClick={() => setSpotForm((prev) => ({ ...prev, supportsEv: !prev.supportsEv }))}
                    >
                      {spotForm.supportsEv ? "EV Spot" : "Parking Spot"}
                    </button>
                    <button onClick={() => void handleCreateSpot()} disabled={!spotForm.label}>Add Spot</button>
                  </div>
                </div>
              </Card>

              <Card>
                <h3>Spots</h3>
                <div className="stack compact">
                  {spots.length === 0 && <p>No spots for this lot.</p>}
                  {spots.map((spot) => (
                    <div key={spot.id} className="list-item">
                      <div>
                        <strong>{spot.label}</strong>
                        <div>{spot.supportsEv ? "EV Spot" : "Parking Spot"}</div>
                        <div>{spot.isAvailable ? "Available" : "Occupied"}</div>
                      </div>
                      <button className="button button-danger" onClick={() => void handleDeleteSpot(spot.id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="stack">
              <Card>
                <h3>Add Charger</h3>
                <div className="form">
                  <input
                    value={stationForm.name}
                    onChange={(e) => setStationForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Charger name"
                  />
                  <input
                    value={stationForm.connectorType}
                    onChange={(e) => setStationForm((prev) => ({ ...prev, connectorType: e.target.value }))}
                    placeholder="Connector type"
                  />
                  <input
                    type="number"
                    value={stationForm.maxKw}
                    onChange={(e) => setStationForm((prev) => ({ ...prev, maxKw: Number(e.target.value) }))}
                    placeholder="Max kW"
                  />
                  <button onClick={() => void handleCreateStation()} disabled={!stationForm.name}>Add Charger</button>
                </div>
              </Card>

              <Card>
                <h3>Chargers</h3>
                <div className="stack compact">
                  {stations.length === 0 && <p>No chargers for this lot.</p>}
                  {stations.map((station) => (
                    <div key={station.id} className="list-item">
                      <div>
                        <strong>{station.name}</strong>
                        <div>{station.connectorType} | {station.maxKw} kW</div>
                      </div>
                      <button className="button button-danger" onClick={() => void handleDeleteStation(station.id)}>Delete</button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </Card>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}
    </PageContainer>
  );
};

export default Admin;
