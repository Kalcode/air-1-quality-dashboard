import { useState, useEffect } from "react";

// --- Thresholds & Classification ---

const THRESHOLDS = {
  pm25: [
    { max: 12, label: "Good", color: "#22c55e", advice: "Air quality is great." },
    { max: 35.4, label: "Moderate", color: "#eab308", advice: "Acceptable. Sensitive individuals limit exposure." },
    { max: 55.4, label: "Unhealthy (Sensitive)", color: "#f97316", advice: "Sensitive groups reduce exertion." },
    { max: 150.4, label: "Unhealthy", color: "#ef4444", advice: "Ventilate or run HEPA filter." },
    { max: 250.4, label: "Very Unhealthy", color: "#a855f7", advice: "Health alert. Ventilate immediately." },
    { max: 9999, label: "Hazardous", color: "#991b1b", advice: "Emergency. Purifier on max." },
  ],
  pm10: [
    { max: 54, label: "Good", color: "#22c55e" },
    { max: 154, label: "Moderate", color: "#eab308" },
    { max: 254, label: "Unhealthy (Sensitive)", color: "#f97316" },
    { max: 354, label: "Unhealthy", color: "#ef4444" },
    { max: 424, label: "Very Unhealthy", color: "#a855f7" },
    { max: 9999, label: "Hazardous", color: "#991b1b" },
  ],
  co2: [
    { max: 600, label: "Excellent", color: "#22c55e", advice: "Well-ventilated." },
    { max: 800, label: "Good", color: "#86efac", advice: "Normal occupied room." },
    { max: 1000, label: "Acceptable", color: "#eab308", advice: "Getting stuffy. Open a window." },
    { max: 1500, label: "Poor", color: "#f97316", advice: "Drowsiness & reduced focus likely." },
    { max: 2000, label: "Bad", color: "#ef4444", advice: "Open windows now." },
    { max: 9999, label: "Dangerous", color: "#991b1b", advice: "Ventilate immediately." },
  ],
  humidity: [
    { max: 24.9, label: "Too Dry", color: "#f97316", advice: "Consider a humidifier." },
    { max: 30, label: "Dry", color: "#eab308", advice: "Slightly dry." },
    { max: 50, label: "Comfortable", color: "#22c55e", advice: "Ideal range." },
    { max: 60, label: "Humid", color: "#eab308", advice: "Watch for condensation." },
    { max: 100, label: "Too Humid", color: "#f97316", advice: "Mold risk." },
  ],
  voc: [
    { max: 79, label: "Improved", color: "#38bdf8", advice: "Cleaner than baseline." },
    { max: 149, label: "Normal", color: "#22c55e", advice: "Typical for this environment." },
    { max: 249, label: "Abnormal", color: "#f97316", advice: "Elevated VOCs. Ventilate." },
    { max: 399, label: "Very Abnormal", color: "#ef4444", advice: "High VOCs. Open windows." },
    { max: 9999, label: "Extremely Abnormal", color: "#991b1b", advice: "Ventilate immediately." },
  ],
  temperature: [
    { max: 15, label: "Cold", color: "#38bdf8" },
    { max: 18, label: "Cool", color: "#67e8f9" },
    { max: 24, label: "Comfortable", color: "#22c55e" },
    { max: 27, label: "Warm", color: "#eab308" },
    { max: 99, label: "Hot", color: "#ef4444" },
  ],
};

// VOC quality badge colors from Sensirion's algorithm states
const VOC_QUALITY_COLORS = {
  Normal: "#22c55e",
  Improved: "#38bdf8",
  Abnormal: "#f97316",
  "Very Abnormal": "#ef4444",
  Unknown: "#64748b",
};

const VOC_QUALITY_HINTS = {
  Unknown: "— sensor initializing",
  Abnormal: "— needs more runtime to baseline",
  "Very Abnormal": "— sensor unreliable, needs 24+ hrs",
  Improved: "— air cleaner than baseline",
};

// Metrics where higher = worse (used for delta coloring)
const HIGHER_IS_WORSE = new Set(["pm25", "pm10", "co2", "voc"]);

function getThreshold(type, value) {
  if (!value && value !== 0) return null;
  const tiers = THRESHOLDS[type];
  if (!tiers) return null;
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  for (const t of tiers) if (v <= t.max) return { ...t, value: v };
  return tiers[tiers.length - 1];
}

// --- Parser (ESPHome web UI text format) ---

const SENSOR_PATTERNS = [
  [/^CO2[\t\s]/, "co2", /[\t\s](-?[\d.]+)\s*ppm/],
  [/^DPS310 Pressure[\t\s]/, "pressure", /[\t\s](-?[\d.]+)\s*hPa/],
  [/^PM\s*<\s*10.*[Ww]eight/, "pm10", /[\t\s](-?[\d.]+)\s*µg/],
  [/^PM\s*<\s*1\s*µ?m\s*[Ww]eight|^PM\s*<\s*1µm\s*[Ww]eight/, "pm_1um", /[\t\s](-?[\d.]+)\s*µg/],
  [/^PM\s*<\s*2[\.\s]*5.*[Ww]eight/, "pm25", /[\t\s](-?[\d.]+)\s*µg/],
  [/^PM\s*<\s*4.*[Ww]eight/, "pm_4um", /[\t\s](-?[\d.]+)\s*µg/],
  [/^RSSI[\t\s]/, "rssi", /[\t\s](-?[\d.]+)\s*dBm/],
  [/^SEN55 Humidity[\t\s]/, "humidity", /Humidity[\t\s]+(-?[\d.]+)\s*%/],
  [/^SEN55 NOX[\t\s]/, "nox", /NOX[\t\s]+(-?[\d.]+)/],
  [/^SEN55 Temperature[\t\s]/, "temperature", /Temperature[\t\s]+(-?[\d.]+)\s*°C/],
  [/^SEN55 VOC[\t\s]/, "voc", /VOC[\t\s]+(-?[\d.]+)/],
  [/^Uptime[\t\s]/, "uptime", /[\t\s](-?[\d.]+)\s*s/],
  [/^VOC Quality[\t\s]/, "vocQuality", /Quality[\t\s]+(.+)/],
];

function parseESPHome(text) {
  const result = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    for (const [matcher, key, extractor] of SENSOR_PATTERNS) {
      if (matcher.test(trimmed)) {
        const m = trimmed.match(extractor);
        if (m) result[key] = m[1].trim();
        break;
      }
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

// --- Storage ---

const STORAGE_KEY = "air-quality-history-v2";

async function saveReading(data, room) {
  const reading = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    data,
    room: room || "",
    timestamp: Date.now(),
    time: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString(),
  };
  let hist = [];
  try {
    const h = await window.storage.get(STORAGE_KEY);
    if (h?.value) hist = JSON.parse(h.value);
  } catch {}
  hist.push(reading);
  if (hist.length > 50) hist = hist.slice(-50);
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(hist));
  } catch (e) {
    console.error("Save error:", e);
  }
  return hist;
}

async function loadHistory() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    if (r?.value) return JSON.parse(r.value);
  } catch {}
  return [];
}

async function deleteReading(id) {
  let hist = [];
  try {
    const h = await window.storage.get(STORAGE_KEY);
    if (h?.value) hist = JSON.parse(h.value);
  } catch {}
  hist = hist.filter(r => r.id !== id);
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(hist));
  } catch {}
  return hist;
}

async function clearAllStorage() {
  try { await window.storage.delete(STORAGE_KEY); } catch {}
}

// --- Utilities ---

const emptyData = {
  co2: "", pm25: "", pm10: "", pm_1um: "", pm_4um: "",
  humidity: "", temperature: "", voc: "", vocQuality: "",
  nox: "", pressure: "", rssi: "", uptime: "",
};

function cToF(c) {
  const v = parseFloat(c);
  return isNaN(v) ? "" : ((v * 9 / 5) + 32).toFixed(1);
}

function formatUptime(seconds) {
  const s = parseInt(seconds);
  if (isNaN(s)) return "";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 24) return `${Math.floor(hrs / 24)}d ago`;
  if (hrs > 0) return `${hrs}h ${mins % 60}m ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

// --- Shared Styles ---

const inputStyle = {
  background: "#0f172a", border: "1px solid #334155", borderRadius: 6,
  padding: "8px 10px", color: "#e2e8f0", fontSize: 14,
  fontFamily: "monospace", width: "100%", boxSizing: "border-box", outline: "none",
};

const mono = { fontFamily: "monospace" };
const cardStyle = { background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: 16 };
const labelStyle = { color: "#94a3b8", fontSize: 11, ...mono, textTransform: "uppercase", letterSpacing: "0.08em" };

// --- Components ---

function Delta({ current, previous, metric }) {
  if (!current || !previous) return null;
  const c = parseFloat(current), p = parseFloat(previous);
  if (isNaN(c) || isNaN(p) || p === 0) return null;
  const pct = ((c - p) / Math.abs(p)) * 100;
  const diff = c - p;
  if (Math.abs(pct) < 0.5) return null;
  const increased = pct > 0;
  const isWorse = HIGHER_IS_WORSE.has(metric) ? increased : !increased;
  const color = isWorse ? "#ef4444" : "#22c55e";
  const arrow = increased ? "▲" : "▼";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, padding: "4px 8px", background: `${color}11`, borderRadius: 4, border: `1px solid ${color}22` }}>
      <span style={{ fontSize: 12, ...mono, color, fontWeight: 700 }}>
        {arrow} {Math.abs(pct).toFixed(0)}%
      </span>
      <span style={{ fontSize: 10, ...mono, color: "#64748b" }}>
        {diff > 0 ? "+" : ""}{diff.toFixed(1)} from {p.toFixed(1)}
      </span>
    </div>
  );
}

function GaugeBar({ value, thresholdKey, label, unit, prevValue }) {
  const t = getThreshold(thresholdKey, value);
  if (!t) return null;
  const tiers = THRESHOLDS[thresholdKey];
  const scaleMax = tiers[tiers.length - 2]?.max || tiers[tiers.length - 1].max;
  const pct = Math.min((t.value / scaleMax) * 100, 100);
  return (
    <div style={{ marginBottom: 2 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={labelStyle}>{label}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ color: t.color, fontSize: 22, fontWeight: 700 }}>{t.value.toFixed(1)}</span>
          <span style={{ color: "#64748b", fontSize: 11, ...mono }}>{unit}</span>
        </div>
      </div>
      <div style={{ height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${t.color}88, ${t.color})`, borderRadius: 3, transition: "width 0.5s ease" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 10, color: t.color, ...mono, fontWeight: 600 }}>{t.label}</span>
        {t.advice && <span style={{ fontSize: 10, color: "#64748b", ...mono, textAlign: "right", maxWidth: "65%" }}>{t.advice}</span>}
      </div>
      <Delta current={value} previous={prevValue} metric={thresholdKey} />
    </div>
  );
}

function VocQualityBadge({ quality }) {
  if (!quality) return null;
  const color = VOC_QUALITY_COLORS[quality] || "#64748b";
  const hint = VOC_QUALITY_HINTS[quality] || "";
  return (
    <div style={{ marginTop: -10, display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, ...mono, color, fontWeight: 600 }}>Sensor: {quality}</span>
      {hint && <span style={{ fontSize: 10, ...mono, color: "#475569" }}>{hint}</span>}
    </div>
  );
}

function ParticleBreakdown({ data }) {
  const pm1 = parseFloat(data.pm_1um) || 0;
  const pm25 = parseFloat(data.pm25) || 0;
  const pm10 = parseFloat(data.pm10) || 0;
  if (pm10 === 0) return null;
  const ultrafine = pm1;
  const fine = Math.max(pm25 - pm1, 0);
  const coarse = Math.max(pm10 - pm25, 0);
  const ufPct = ((ultrafine / pm10) * 100).toFixed(0);
  const fPct = ((fine / pm10) * 100).toFixed(0);
  const cPct = ((coarse / pm10) * 100).toFixed(0);

  let signature = "Mixed sources";
  if (parseFloat(ufPct) > 65) signature = "Combustion dominant (smoke, fire, candles)";
  else if (parseFloat(cPct) > 40) signature = "Dust / mechanical (pets, HVAC, construction)";
  else if (parseFloat(fPct) > 35) signature = "Cooking / mixed combustion";

  const segments = [
    { label: "<1µm", value: ultrafine, pct: ufPct, color: "#ef4444" },
    { label: "1–2.5µm", value: fine, pct: fPct, color: "#f97316" },
    { label: ">2.5µm", value: coarse, pct: cPct, color: "#eab308" },
  ];
  return (
    <div style={{ ...cardStyle, marginTop: 12 }}>
      <div style={{ ...labelStyle, marginBottom: 10 }}>Particle Size Profile</div>
      <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", gap: 2, marginBottom: 10 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ width: `${s.pct}%`, background: s.color, minWidth: parseFloat(s.pct) > 0 ? 4 : 0, transition: "width 0.5s ease" }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {segments.map((s, i) => (
          <div key={i} style={{ textAlign: i === 0 ? "left" : i === 2 ? "right" : "center" }}>
            <span style={{ color: s.color, fontSize: 14, fontWeight: 700 }}>{s.pct}%</span>
            <span style={{ color: "#64748b", fontSize: 10, ...mono, display: "block" }}>{s.label}</span>
            <span style={{ color: "#475569", fontSize: 9, ...mono }}>{s.value.toFixed(1)} µg/m³</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, padding: "8px 10px", background: "#1e293b", borderRadius: 6, fontSize: 12, color: "#cbd5e1", ...mono }}>⟐ {signature}</div>
    </div>
  );
}

function WHOBars({ data }) {
  const items = [];
  if (data.pm25) items.push({ label: "PM2.5", value: parseFloat(data.pm25), limit: 15, unit: "µg/m³" });
  if (data.pm10) items.push({ label: "PM10", value: parseFloat(data.pm10), limit: 45, unit: "µg/m³" });
  if (items.length === 0) return null;
  return (
    <div style={{ ...cardStyle, marginTop: 12 }}>
      <div style={{ ...labelStyle, marginBottom: 10 }}>vs WHO Guidelines (24-hr)</div>
      {items.map((item, i) => {
        const ratio = item.value / item.limit;
        const color = ratio > 1 ? "#ef4444" : "#22c55e";
        return (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, color: "#64748b", ...mono, width: 45 }}>{item.label}</span>
              <div style={{ flex: 1, position: "relative", height: 20, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: `${Math.min((1 / Math.max(ratio, 1)) * 100, 100)}%`, top: 0, bottom: 0, width: 2, background: "#22c55e88", zIndex: 2 }} />
                <div style={{ height: "100%", width: `${Math.min(ratio / Math.max(ratio, 3) * 100, 100)}%`, background: `${color}44`, borderRight: `2px solid ${color}`, transition: "width 0.5s ease" }} />
              </div>
              <span style={{ fontSize: 12, color, ...mono, fontWeight: 600, width: 50, textAlign: "right" }}>{ratio.toFixed(1)}×</span>
            </div>
            <div style={{ fontSize: 9, color: "#475569", ...mono, marginLeft: 55, marginTop: 2 }}>yours: {item.value.toFixed(1)} · limit: {item.limit} {item.unit}</div>
          </div>
        );
      })}
    </div>
  );
}

function StatusPanel({ data }) {
  const tips = [];
  const pm = parseFloat(data.pm25), co = parseFloat(data.co2), hu = parseFloat(data.humidity), vo = parseFloat(data.voc);

  if (!isNaN(pm)) {
    if (pm > 150) tips.push({ e: "🔴", t: "PM2.5 is Unhealthy+. Run HEPA filter and ventilate." });
    else if (pm > 55) tips.push({ e: "🟠", t: "PM2.5 elevated. Open a window or run air purifier." });
    else if (pm > 35) tips.push({ e: "🟡", t: "PM2.5 moderate. Sensitive individuals take note." });
    else if (pm <= 12) tips.push({ e: "🟢", t: "PM2.5 is within healthy range." });
    if (pm > 15) tips.push({ e: "", t: `→ ${(pm / 15).toFixed(1)}× WHO 24-hr guideline (15 µg/m³)`, indent: true });
  }
  if (!isNaN(co)) {
    if (co < 350) tips.push({ e: "⚠️", t: "CO2 below outdoor ambient (~420ppm). Sensor may need calibration." });
    else if (co > 1500) tips.push({ e: "🔴", t: "CO2 very high. Ventilate urgently." });
    else if (co > 1000) tips.push({ e: "🟠", t: "CO2 elevated. Getting stuffy." });
  }
  if (!isNaN(hu)) {
    if (hu < 25) tips.push({ e: "🟠", t: "Humidity very low. Humidifier recommended." });
    else if (hu > 60) tips.push({ e: "🟠", t: "Humidity high. Watch for mold." });
  }
  if (!isNaN(vo) && vo >= 150) tips.push({ e: "🟠", t: "VOC index abnormal. Ventilate." });
  if (data.vocQuality === "Abnormal" || data.vocQuality === "Very Abnormal") {
    tips.push({ e: "⚠️", t: `VOC sensor ${data.vocQuality}. May need 24+ hrs to baseline.` });
  }
  if (tips.length === 0) tips.push({ e: "🟢", t: "Everything looks good." });

  // Compute worst severity across all metrics
  const checks = [
    { type: "pm25", value: data.pm25 },
    { type: "co2", value: data.co2 },
    { type: "voc", value: data.voc },
    { type: "humidity", value: data.humidity },
  ];
  let worstTier = 0;
  for (const { type, value } of checks) {
    if (!value) continue;
    const v = parseFloat(value);
    if (isNaN(v)) continue;
    const tiers = THRESHOLDS[type];
    for (let i = 0; i < tiers.length; i++) {
      if (v <= tiers[i].max) { worstTier = Math.max(worstTier, i); break; }
    }
  }

  const statuses = [
    { label: "All Clear", color: "#22c55e", icon: "✓", msg: "Air quality looks great." },
    { label: "Fair", color: "#eab308", icon: "~", msg: "Mostly fine, minor concerns." },
    { label: "Caution", color: "#f97316", icon: "!", msg: "Some metrics need attention." },
    { label: "Poor", color: "#ef4444", icon: "✕", msg: "Significant issues detected." },
    { label: "Hazardous", color: "#991b1b", icon: "☠", msg: "Dangerous air quality." },
  ];
  const st = statuses[Math.min(worstTier, statuses.length - 1)];

  return (
    <div style={{ background: `linear-gradient(135deg, ${st.color}11, ${st.color}05)`, border: `1px solid ${st.color}33`, borderRadius: 8, padding: 16, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${st.color}22`, border: `2px solid ${st.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: st.color, flexShrink: 0 }}>{st.icon}</div>
        <div>
          <div style={{ color: st.color, fontSize: 18, fontWeight: 700 }}>{st.label}</div>
          <div style={labelStyle}>{st.msg}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {tips.map((tip, i) => (
          <div key={i} style={{ fontSize: 12, color: "#cbd5e1", ...mono, paddingLeft: tip.indent ? 24 : 10, borderLeft: tip.indent ? "none" : `2px solid ${st.color}33`, lineHeight: 1.5 }}>
            {tip.e ? `${tip.e} ` : ""}{tip.t}
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryCard({ entry, isViewing, isComparing, onView, onCompare, onClearCompare, onDelete }) {
  const pm = entry.data.pm25 ? parseFloat(entry.data.pm25).toFixed(1) : "—";
  const co = entry.data.co2 ? parseFloat(entry.data.co2).toFixed(0) : "—";
  const pmT = getThreshold("pm25", entry.data.pm25);
  const highlighted = isViewing || isComparing;

  return (
    <div style={{ background: isViewing ? "#0c1629" : isComparing ? "#0f172a" : "#080e1a", border: `1px solid ${highlighted ? "#1e3a5f" : "#1e293b"}`, borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isViewing && <span style={{ fontSize: 8, color: "#22c55e", ...mono, background: "#22c55e22", padding: "1px 5px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.1em" }}>viewing</span>}
          {isComparing && <span style={{ fontSize: 8, color: "#38bdf8", ...mono, background: "#38bdf822", padding: "1px 5px", borderRadius: 3, textTransform: "uppercase", letterSpacing: "0.1em" }}>baseline</span>}
          <span style={{ fontSize: 11, color: "#64748b", ...mono }}>{entry.date} {entry.time}</span>
          {entry.room && <span style={{ fontSize: 11, color: "#94a3b8", ...mono, fontWeight: 600 }}>{entry.room}</span>}
        </div>
        <span style={{ fontSize: 9, color: "#475569", ...mono }}>{timeAgo(entry.timestamp)}</span>
      </div>
      <div style={{ display: "flex", gap: 12, fontSize: 11, ...mono }}>
        <span style={{ color: "#64748b" }}>PM2.5 <span style={{ color: pmT?.color || "#94a3b8", fontWeight: 600 }}>{pm}</span></span>
        <span style={{ color: "#64748b" }}>CO₂ <span style={{ color: "#94a3b8", fontWeight: 600 }}>{co}</span></span>
        {entry.data.voc && <span style={{ color: "#64748b" }}>VOC <span style={{ color: "#94a3b8", fontWeight: 600 }}>{parseFloat(entry.data.voc).toFixed(0)}</span></span>}
        {entry.data.humidity && <span style={{ color: "#64748b" }}>RH <span style={{ color: "#94a3b8", fontWeight: 600 }}>{parseFloat(entry.data.humidity).toFixed(0)}%</span></span>}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {!isViewing && (
          <button onClick={onView} style={{ flex: 1, padding: "5px", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, color: "#94a3b8", fontSize: 10, ...mono, cursor: "pointer" }}>View</button>
        )}
        {!isComparing && !isViewing && (
          <button onClick={onCompare} style={{ flex: 1, padding: "5px", background: "#0c1629", border: "1px solid #1e3a5f", borderRadius: 4, color: "#38bdf8", fontSize: 10, ...mono, cursor: "pointer" }}>Compare</button>
        )}
        {isComparing && (
          <button onClick={onClearCompare} style={{ flex: 1, padding: "5px", background: "#38bdf811", border: "1px solid #1e3a5f", borderRadius: 4, color: "#38bdf8", fontSize: 10, ...mono, cursor: "pointer" }}>✕ Clear Baseline</button>
        )}
        <button onClick={onDelete} style={{ padding: "5px 8px", background: "none", border: "1px solid #33111188", borderRadius: 4, color: "#7f1d1d", fontSize: 10, ...mono, cursor: "pointer" }}>✕</button>
      </div>
    </div>
  );
}

// --- Main App ---

const MANUAL_FIELDS = [
  ["pm25", "PM2.5 µg/m³"], ["pm10", "PM10 µg/m³"], ["co2", "CO₂ ppm"],
  ["voc", "VOC index"], ["humidity", "Humidity %"], ["temperature", "Temp °C"],
  ["pm_1um", "PM <1µm"], ["pm_4um", "PM <4µm"], ["pressure", "Pressure hPa"],
  ["nox", "NOx"], ["rssi", "RSSI dBm"], ["uptime", "Uptime sec"],
];

export default function App() {
  const [data, setData] = useState({ ...emptyData });
  const [history, setHistory] = useState([]);
  const [compareId, setCompareId] = useState(null);
  const [paste, setPaste] = useState("");
  const [status, setStatus] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [ts, setTs] = useState(null);
  const [room, setRoom] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState(null);

  const hasData = data.pm25 || data.co2 || data.humidity;
  const compareReading = compareId ? history.find(h => h.id === compareId) : null;
  const compData = compareReading?.data || null;

  // Load history on mount
  useEffect(() => {
    (async () => {
      const hist = await loadHistory();
      setHistory(hist);
      if (hist.length > 0) {
        const latest = hist[hist.length - 1];
        setData({ ...emptyData, ...latest.data });
        setRoom(latest.room || "");
        setTs(latest.time);
        setViewingId(latest.id);
        if (hist.length > 1) setCompareId(hist[hist.length - 2].id);
        setStatus(`✓ Loaded latest: ${latest.date} ${latest.time}${latest.room ? ` (${latest.room})` : ""}`);
      }
      setLoading(false);
    })();
  }, []);

  const handleParse = async () => {
    const parsed = parseESPHome(paste.trim());
    if (parsed) {
      setData({ ...emptyData, ...parsed });
      setTs(new Date().toLocaleTimeString());
      const hist = await saveReading(parsed, room);
      const newLatest = hist[hist.length - 1];
      setHistory(hist);
      setViewingId(newLatest.id);
      if (hist.length > 1) setCompareId(hist[hist.length - 2].id);
      setStatus(`✓ Saved! ${Object.keys(parsed).length} values parsed`);
      setPaste("");
    } else {
      setStatus("✕ Could not parse. Paste the full page from the sensor web UI.");
    }
  };

  const handleView = (entry) => {
    setData({ ...emptyData, ...entry.data });
    setRoom(entry.room || "");
    setTs(entry.time);
    setViewingId(entry.id);
    const idx = history.findIndex(h => h.id === entry.id);
    setCompareId(idx > 0 ? history[idx - 1].id : null);
    setStatus(`✓ Viewing: ${entry.date} ${entry.time}${entry.room ? ` (${entry.room})` : ""}`);
  };

  const handleDelete = async (id) => {
    const hist = await deleteReading(id);
    setHistory(hist);
    if (id === viewingId && hist.length > 0) {
      const latest = hist[hist.length - 1];
      setData({ ...emptyData, ...latest.data });
      setViewingId(latest.id);
      setTs(latest.time);
      setRoom(latest.room || "");
    } else if (hist.length === 0) {
      setData({ ...emptyData });
      setViewingId(null);
      setTs(null);
    }
    if (id === compareId) setCompareId(null);
  };

  const handleClearAll = async () => {
    await clearAllStorage();
    setData({ ...emptyData });
    setHistory([]);
    setTs(null);
    setRoom("");
    setStatus("Cleared all data.");
    setCompareId(null);
    setViewingId(null);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#020617", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#475569", ...mono, fontSize: 13 }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "#e2e8f0", padding: "20px 16px 40px", maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ display: "inline-block", padding: "3px 10px", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 20, fontSize: 10, color: "#64748b", ...mono, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>Apollo AIR-1</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#f1f5f9" }}>Air Quality Dashboard</h1>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {ts && <span style={{ fontSize: 10, color: "#475569", ...mono, background: "#0f172a", padding: "2px 8px", borderRadius: 4 }}>{ts}</span>}
          {data.uptime && <span style={{ fontSize: 10, color: "#475569", ...mono, background: "#0f172a", padding: "2px 8px", borderRadius: 4 }}>↑{formatUptime(data.uptime)}</span>}
          {data.rssi && <span style={{ fontSize: 10, color: "#475569", ...mono, background: "#0f172a", padding: "2px 8px", borderRadius: 4 }}>📶{data.rssi}dBm</span>}
          {room && <span style={{ fontSize: 10, color: "#94a3b8", ...mono, background: "#1e293b", padding: "2px 8px", borderRadius: 4 }}>📍 {room}</span>}
        </div>
      </div>

      {/* Input */}
      <div style={{ ...cardStyle, padding: 14, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={labelStyle}>New Reading</span>
          <span style={{ fontSize: 10, color: "#475569", ...mono }}>paste from 192.168.50.20</span>
        </div>
        <input type="text" value={room} onChange={e => setRoom(e.target.value)} placeholder="Room label (Kitchen, Bedroom, etc.)" style={{ ...inputStyle, fontSize: 12, padding: "6px 10px", marginBottom: 8 }} />
        <textarea value={paste} onChange={e => { setPaste(e.target.value); setStatus(""); }}
          placeholder="Select All → Copy from sensor web page, paste here."
          style={{ ...inputStyle, height: 80, resize: "vertical", marginBottom: 8, fontSize: 12 }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleParse} style={{ flex: 2, padding: "10px", background: "#1d4ed8", border: "none", borderRadius: 6, color: "#fff", fontSize: 13, ...mono, fontWeight: 600, cursor: "pointer" }}>Save & Analyze</button>
          <button onClick={() => setShowManual(!showManual)} style={{ flex: 1, padding: "10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#94a3b8", fontSize: 12, ...mono, cursor: "pointer" }}>
            {showManual ? "Hide" : "Manual"}
          </button>
        </div>
        {status && <div style={{ marginTop: 8, fontSize: 11, ...mono, color: status.startsWith("✓") ? "#22c55e" : status.startsWith("✕") ? "#ef4444" : "#94a3b8" }}>{status}</div>}
      </div>

      {/* Manual Entry */}
      {showManual && (
        <div style={{ ...cardStyle, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {MANUAL_FIELDS.map(([key, label]) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 10, color: "#64748b", ...mono, marginBottom: 3 }}>{label}</label>
                <input type="number" step="any" value={data[key]} onChange={e => { setData(p => ({ ...p, [key]: e.target.value })); if (!ts) setTs(new Date().toLocaleTimeString()); }} style={inputStyle} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compare Indicator */}
      {compareReading && hasData && (
        <div style={{ background: "#0c1629", border: "1px solid #1e3a5f", borderRadius: 8, padding: 10, marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#38bdf8", ...mono, textTransform: "uppercase", letterSpacing: "0.08em" }}>Comparing vs</span>
            <span style={{ fontSize: 11, color: "#94a3b8", ...mono }}>
              {compareReading.room || compareReading.date} · {compareReading.time}
            </span>
            <span style={{ fontSize: 9, color: "#475569", ...mono }}>{timeAgo(compareReading.timestamp)}</span>
          </div>
          <button onClick={() => setCompareId(null)} style={{ background: "none", border: "none", color: "#475569", fontSize: 14, cursor: "pointer", padding: "0 4px" }}>✕</button>
        </div>
      )}

      {/* Dashboard */}
      {hasData && (
        <>
          <StatusPanel data={data} />
          <div style={{ ...cardStyle, marginTop: 12, display: "flex", flexDirection: "column", gap: 16 }}>
            {data.pm25 && <GaugeBar value={data.pm25} thresholdKey="pm25" label="PM2.5" unit="µg/m³" prevValue={compData?.pm25} />}
            {data.pm10 && <GaugeBar value={data.pm10} thresholdKey="pm10" label="PM10" unit="µg/m³" prevValue={compData?.pm10} />}
            {data.co2 && <GaugeBar value={data.co2} thresholdKey="co2" label="CO₂" unit="ppm" prevValue={compData?.co2} />}
            {data.voc && <GaugeBar value={data.voc} thresholdKey="voc" label="VOC" unit="index" prevValue={compData?.voc} />}
            <VocQualityBadge quality={data.vocQuality} />
            {data.humidity && <GaugeBar value={data.humidity} thresholdKey="humidity" label="Humidity" unit="%" prevValue={compData?.humidity} />}
            {data.temperature && <GaugeBar value={data.temperature} thresholdKey="temperature" label="Temperature" unit={`°C (${cToF(data.temperature)}°F)`} prevValue={compData?.temperature} />}
          </div>
          {data.pm_1um && data.pm25 && data.pm10 && <ParticleBreakdown data={data} />}
          <WHOBars data={data} />
          {(data.pressure || data.nox) && (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {data.pressure && <div style={{ ...cardStyle, padding: "8px 12px", fontSize: 11, ...mono }}><span style={{ color: "#64748b" }}>Pressure </span><span style={{ color: "#94a3b8" }}>{data.pressure} hPa</span></div>}
              {data.nox && <div style={{ ...cardStyle, padding: "8px 12px", fontSize: 11, ...mono }}><span style={{ color: "#64748b" }}>NOx </span><span style={{ color: "#94a3b8" }}>{data.nox}</span></div>}
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!hasData && history.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#334155" }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>◉</div>
          <div style={{ ...mono, fontSize: 13, color: "#475569", lineHeight: 1.8 }}>
            Copy the full page from<br />
            <span style={{ color: "#94a3b8", background: "#0f172a", padding: "2px 8px", borderRadius: 4 }}>http://192.168.50.20</span><br />
            and paste above
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={labelStyle}>History ({history.length})</span>
            <button onClick={handleClearAll} style={{ background: "none", border: "1px solid #331111", borderRadius: 4, color: "#7f1d1d", fontSize: 10, ...mono, padding: "3px 8px", cursor: "pointer" }}>Clear All</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[...history].reverse().map((entry) => (
              <HistoryCard
                key={entry.id}
                entry={entry}
                isViewing={entry.id === viewingId}
                isComparing={entry.id === compareId}
                onView={() => handleView(entry)}
                onCompare={() => setCompareId(entry.id)}
                onClearCompare={() => setCompareId(null)}
                onDelete={() => handleDelete(entry.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
