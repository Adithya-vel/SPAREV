import { useEffect, useMemo, useState } from "react";
import PageContainer from "../components/pagecontainer";
import Card from "../components/card";
import { useSlots } from "../context/SlotContext";

const RATE_PER_KWH = 18; // ₹18 per kWh (demo)
const POWER_KW = 7.2;    // 7.2kW charger (demo)

const Charging = () => {
  const { slots, reserveSlot, releaseSlot } = useSlots();

  const evSlots = useMemo(() => slots.filter((s) => s.type === "EV"), [slots]);

  const [selected, setSelected] = useState("");
  const [isCharging, setIsCharging] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [msg, setMsg] = useState("");

  // timer
  useEffect(() => {
    if (!isCharging) return;

    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isCharging]);

  const minutes = Math.floor(seconds / 60);
  const hours = seconds / 3600;

  const energyKwh = POWER_KW * hours;
  const cost = energyKwh * RATE_PER_KWH;

  const startCharging = () => {
    if (!selected) {
      setMsg("❌ Select an EV charger first");
      return;
    }

    const target = slots.find((s) => s.id === selected);
    if (!target) {
      setMsg("❌ Charger not found");
      return;
    }

    if (target.status === "Occupied") {
      setMsg("❌ Charger already in use");
      return;
    }

    // reserve charger (fake date/time)
    const result = reserveSlot(selected, "CHARGING", "START");
    if (!result.ok) {
      setMsg(`❌ ${result.message}`);
      return;
    }

    setSeconds(0);
    setIsCharging(true);
    setMsg(`✅ Charging started on ${selected}`);
  };

  const stopCharging = () => {
    if (!selected) return;

    setIsCharging(false);
    releaseSlot(selected);

    setMsg(
      `✅ Charging stopped. Energy: ${energyKwh.toFixed(2)} kWh | Cost: ₹${cost.toFixed(0)}`
    );
  };

  return (
    <PageContainer title="EV Charging">
      <div style={{ display: "grid", gap: "16px", width: "100%" }}>
        <Card>
          <h3 style={{ marginTop: 0 }}>Select Charger</h3>

          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Select EV Charger</option>
            {evSlots.map((s) => (
              <option key={s.id} value={s.id} disabled={s.status === "Occupied"}>
                {s.id} — {s.status}
              </option>
            ))}
          </select>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button type="button" onClick={startCharging} disabled={isCharging}>
              Start Charging
            </button>

            <button type="button" onClick={stopCharging} disabled={!isCharging}>
              Stop Charging
            </button>
          </div>

          {msg && <p style={{ marginTop: "10px" }}>{msg}</p>}
        </Card>

        <Card>
          <h3 style={{ marginTop: 0 }}>Live Session</h3>

          <p>
            <strong>Status:</strong> {isCharging ? "Charging ⚡" : "Idle"}
          </p>
          <p>
            <strong>Time:</strong> {minutes} min ({seconds}s)
          </p>
          <p>
            <strong>Power:</strong> {POWER_KW} kW
          </p>
          <p>
            <strong>Energy Used:</strong> {energyKwh.toFixed(2)} kWh
          </p>
          <p>
            <strong>Estimated Cost:</strong> ₹{cost.toFixed(0)}
          </p>

          <p style={{ opacity: 0.8, marginTop: "10px" }}>
            Demo rate: ₹{RATE_PER_KWH}/kWh
          </p>
        </Card>
      </div>
    </PageContainer>
  );
};

export default Charging;
