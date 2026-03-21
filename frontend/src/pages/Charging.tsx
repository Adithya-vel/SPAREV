import { useEffect, useMemo, useState } from "react";
import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { useSlots } from "../context/SlotContext";

const RATE_PER_KWH = 18; // ₹18 per kWh (demo)
const POWER_KW = 7.2;    // 7.2kW charger (demo)

const Charging = () => {
  const {
    lots,
    chargingSessions,
    startCharging,
    stopCharging,
    getSlotsByLot,
    getSlotStatus
  } = useSlots();

  const [selectedLotId, setSelectedLotId] = useState(lots[0]?.id ?? "");
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [targetKwh, setTargetKwh] = useState(12);
  const [msg, setMsg] = useState("");
  const [tick, setTick] = useState(Date.now());

  const evSlots = useMemo(
    () => getSlotsByLot(selectedLotId).filter((s) => s.type === "EV"),
    [getSlotsByLot, selectedLotId]
  );

  const activeSession = useMemo(
    () => chargingSessions.find((session) => session.status === "active"),
    [chargingSessions]
  );

  useEffect(() => {
    if (!activeSession) {
      return;
    }
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activeSession]);

  const elapsedSeconds = activeSession
    ? Math.max(0, Math.floor((tick - activeSession.pluggedInAt) / 1000))
    : 0;
  const liveKwh = activeSession
    ? Math.min(activeSession.targetKwh, (elapsedSeconds / 3600) * activeSession.powerKw)
    : 0;
  const liveAmount = activeSession
    ? liveKwh * activeSession.ratePerKwh
    : 0;

  const plugIn = () => {
    if (!selectedSlotId) {
      setMsg("❌ Select an EV slot first");
      return;
    }

    if (activeSession) {
      setMsg("❌ Only one live charging session is allowed in this demo");
      return;
    }

    if (targetKwh <= 0) {
      setMsg("❌ Enter a valid kWh target");
      return;
    }

    const result = startCharging(selectedSlotId, {
      targetKwh,
      ratePerKwh: RATE_PER_KWH,
      powerKw: POWER_KW
    });

    if (!result.ok) {
      setMsg(`❌ ${result.message}`);
      return;
    }

    setMsg(`✅ Plug-in successful on ${selectedSlotId}`);
  };

  const plugOut = () => {
    if (!activeSession) {
      setMsg("❌ No active session to stop");
      return;
    }

    const result = stopCharging(activeSession.id);
    if (!result.ok) {
      setMsg(`❌ ${result.message}`);
      return;
    }

    setMsg("✅ Plug-out complete. Session summary updated below.");
  };

  const latestCompleted = chargingSessions.find((session) => session.status === "completed");

  return (
    <PageContainer title="EV Charging" subtitle="Plug in, run, and plug out with live session telemetry.">
      <div className="grid two">
        <Card>
          <h3>Plug Control</h3>

          <select value={selectedLotId} onChange={(e) => {
            setSelectedLotId(e.target.value);
            setSelectedSlotId("");
          }}>
            {lots.map((lot) => (
              <option key={lot.id} value={lot.id}>{lot.name}</option>
            ))}
          </select>

          <select value={selectedSlotId} onChange={(e) => setSelectedSlotId(e.target.value)}>
            <option value="">Select EV Slot</option>
            {evSlots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} - {getSlotStatus(s.id)}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            step={0.5}
            value={targetKwh}
            onChange={(e) => setTargetKwh(Number(e.target.value))}
            placeholder="Target Energy (kWh)"
          />

          <div className="button-row">
            <button type="button" onClick={plugIn} disabled={Boolean(activeSession)}>
              Plug In
            </button>

            <button type="button" onClick={plugOut} disabled={!activeSession}>
              Plug Out
            </button>
          </div>

          {msg && <div className={msg.startsWith("❌") ? "alert error" : "alert success"}>{msg}</div>}
        </Card>

        <Card>
          <h3>Live Session</h3>

          <div className="stats-list">
            <p><strong>Status:</strong> {activeSession ? "Charging" : "Idle"}</p>
            <p><strong>Session Slot:</strong> {activeSession?.slotId ?? "-"}</p>
            <p><strong>Elapsed:</strong> {Math.floor(elapsedSeconds / 60)} min ({elapsedSeconds}s)</p>
            <p><strong>Power:</strong> {POWER_KW} kW</p>
            <p><strong>Target Energy:</strong> {activeSession?.targetKwh ?? 0} kWh</p>
            <p><strong>Delivered Energy:</strong> {liveKwh.toFixed(2)} kWh</p>
            <p><strong>Live Amount:</strong> ₹{liveAmount.toFixed(0)}</p>
          </div>

          <p className="muted-note">Demo rate: ₹{RATE_PER_KWH}/kWh</p>

          {latestCompleted && (
            <div className="alert success" style={{ marginTop: "0.85rem" }}>
              Last Session: {latestCompleted.slotId} | {latestCompleted.deliveredKwh?.toFixed(2)} kWh | ₹{latestCompleted.amount?.toFixed(0)}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
};

export default Charging;
