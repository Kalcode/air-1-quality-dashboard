import type { JSX } from "solid-js";
import type { SensorData, ThresholdResult, ThresholdTier } from "./types";

// --- Thresholds & Classification ---

export const THRESHOLDS: Record<string, ThresholdTier[]> = {
	pm25: [
		{
			max: 12,
			label: "Good",
			color: "#22c55e",
			advice: "Air quality is great.",
		},
		{
			max: 35.4,
			label: "Moderate",
			color: "#eab308",
			advice: "Acceptable. Sensitive individuals limit exposure.",
		},
		{
			max: 55.4,
			label: "Unhealthy (Sensitive)",
			color: "#f97316",
			advice: "Sensitive groups reduce exertion.",
		},
		{
			max: 150.4,
			label: "Unhealthy",
			color: "#ef4444",
			advice: "Ventilate or run HEPA filter.",
		},
		{
			max: 250.4,
			label: "Very Unhealthy",
			color: "#a855f7",
			advice: "Health alert. Ventilate immediately.",
		},
		{
			max: 9999,
			label: "Hazardous",
			color: "#991b1b",
			advice: "Emergency. Purifier on max.",
		},
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
		{
			max: 600,
			label: "Excellent",
			color: "#22c55e",
			advice: "Well-ventilated.",
		},
		{
			max: 800,
			label: "Good",
			color: "#86efac",
			advice: "Normal occupied room.",
		},
		{
			max: 1000,
			label: "Acceptable",
			color: "#eab308",
			advice: "Getting stuffy. Open a window.",
		},
		{
			max: 1500,
			label: "Poor",
			color: "#f97316",
			advice: "Drowsiness & reduced focus likely.",
		},
		{ max: 2000, label: "Bad", color: "#ef4444", advice: "Open windows now." },
		{
			max: 9999,
			label: "Dangerous",
			color: "#991b1b",
			advice: "Ventilate immediately.",
		},
	],
	humidity: [
		{
			max: 24.9,
			label: "Too Dry",
			color: "#f97316",
			advice: "Consider a humidifier.",
		},
		{ max: 30, label: "Dry", color: "#eab308", advice: "Slightly dry." },
		{ max: 50, label: "Comfortable", color: "#22c55e", advice: "Ideal range." },
		{
			max: 60,
			label: "Humid",
			color: "#eab308",
			advice: "Watch for condensation.",
		},
		{ max: 100, label: "Too Humid", color: "#f97316", advice: "Mold risk." },
	],
	voc: [
		{
			max: 79,
			label: "Improved",
			color: "#38bdf8",
			advice: "Cleaner than baseline.",
		},
		{
			max: 149,
			label: "Normal",
			color: "#22c55e",
			advice: "Typical for this environment.",
		},
		{
			max: 249,
			label: "Abnormal",
			color: "#f97316",
			advice: "Elevated VOCs. Ventilate.",
		},
		{
			max: 399,
			label: "Very Abnormal",
			color: "#ef4444",
			advice: "High VOCs. Open windows.",
		},
		{
			max: 9999,
			label: "Extremely Abnormal",
			color: "#991b1b",
			advice: "Ventilate immediately.",
		},
	],
	temperature: [
		{ max: 15, label: "Cold", color: "#38bdf8" },
		{ max: 18, label: "Cool", color: "#67e8f9" },
		{ max: 24, label: "Comfortable", color: "#22c55e" },
		{ max: 27, label: "Warm", color: "#eab308" },
		{ max: 99, label: "Hot", color: "#ef4444" },
	],
};

export const VOC_QUALITY_COLORS: Record<string, string> = {
	Normal: "#22c55e",
	Improved: "#38bdf8",
	Abnormal: "#f97316",
	"Very Abnormal": "#ef4444",
	Unknown: "#64748b",
};

export const VOC_QUALITY_HINTS: Record<string, string> = {
	Unknown: "— sensor initializing",
	Abnormal: "— needs more runtime to baseline",
	"Very Abnormal": "— sensor unreliable, needs 24+ hrs",
	Improved: "— air cleaner than baseline",
};

export const HIGHER_IS_WORSE = new Set(["pm25", "pm10", "co2", "voc"]);

export function getThreshold(
	type: string,
	value: string | undefined,
): ThresholdResult | null {
	if (!value && value !== "") return null;
	if (!value) return null;
	const tiers = THRESHOLDS[type];
	if (!tiers) return null;
	const v = parseFloat(value);
	if (Number.isNaN(v)) return null;
	for (const t of tiers) {
		if (v <= t.max) return { ...t, value: v };
	}
	return { ...tiers[tiers.length - 1], value: v };
}

// --- Parser (ESPHome web UI text format) ---

type SensorPattern = [RegExp, string, RegExp];

const SENSOR_PATTERNS: SensorPattern[] = [
	[/^CO2[\t\s]/, "co2", /[\t\s](-?[\d.]+)\s*ppm/],
	[/^DPS310 Pressure[\t\s]/, "pressure", /[\t\s](-?[\d.]+)\s*hPa/],
	[/^PM\s*<\s*10.*[Ww]eight/, "pm10", /[\t\s](-?[\d.]+)\s*µg/],
	[
		/^PM\s*<\s*1\s*µ?m\s*[Ww]eight|^PM\s*<\s*1µm\s*[Ww]eight/,
		"pm_1um",
		/[\t\s](-?[\d.]+)\s*µg/,
	],
	[/^PM\s*<\s*2[.\s]*5.*[Ww]eight/, "pm25", /[\t\s](-?[\d.]+)\s*µg/],
	[/^PM\s*<\s*4.*[Ww]eight/, "pm_4um", /[\t\s](-?[\d.]+)\s*µg/],
	[/^RSSI[\t\s]/, "rssi", /[\t\s](-?[\d.]+)\s*dBm/],
	[/^SEN55 Humidity[\t\s]/, "humidity", /Humidity[\t\s]+(-?[\d.]+)\s*%/],
	[/^SEN55 NOX[\t\s]/, "nox", /NOX[\t\s]+(-?[\d.]+)/],
	[
		/^SEN55 Temperature[\t\s]/,
		"temperature",
		/Temperature[\t\s]+(-?[\d.]+)\s*°C/,
	],
	[/^SEN55 VOC[\t\s]/, "voc", /VOC[\t\s]+(-?[\d.]+)/],
	[/^Uptime[\t\s]/, "uptime", /[\t\s](-?[\d.]+)\s*s/],
	[/^VOC Quality[\t\s]/, "vocQuality", /Quality[\t\s]+(.+)/],
];

export function parseESPHome(text: string): Partial<SensorData> | null {
	const result: Record<string, string> = {};
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
	return Object.keys(result).length > 0
		? (result as Partial<SensorData>)
		: null;
}

// --- Utilities ---

export const emptyData: SensorData = {
	co2: "",
	pm25: "",
	pm10: "",
	pm_1um: "",
	pm_4um: "",
	humidity: "",
	temperature: "",
	voc: "",
	vocQuality: "",
	nox: "",
	pressure: "",
	rssi: "",
	uptime: "",
};

export function cToF(c: string): string {
	const v = parseFloat(c);
	return Number.isNaN(v) ? "" : ((v * 9) / 5 + 32).toFixed(1);
}

export function formatUptime(seconds: string): string {
	const s = parseInt(seconds, 10);
	if (Number.isNaN(s)) return "";
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function timeAgo(ts: number): string {
	const mins = Math.floor((Date.now() - ts) / 60000);
	const hrs = Math.floor(mins / 60);
	if (hrs > 24) return `${Math.floor(hrs / 24)}d ago`;
	if (hrs > 0) return `${hrs}h ${mins % 60}m ago`;
	if (mins > 0) return `${mins}m ago`;
	return "just now";
}

// --- RSSI Signal Strength ---

export interface RssiInfo {
	/** Number of signal bars to display (1-4) */
	bars: number;
	label: string;
	color: string;
}

export function getRssiInfo(rssi: string): RssiInfo | null {
	const v = parseFloat(rssi);
	if (Number.isNaN(v)) return null;
	if (v >= -50) return { bars: 4, label: "Excellent", color: "#22c55e" };
	if (v >= -60) return { bars: 3, label: "Good", color: "#86efac" };
	if (v >= -70) return { bars: 2, label: "Fair", color: "#eab308" };
	if (v >= -80) return { bars: 1, label: "Weak", color: "#f97316" };
	return { bars: 1, label: "Very Weak", color: "#ef4444" };
}

// --- Shared Styles ---

export const inputStyle: JSX.CSSProperties = {
	background: "#0f172a",
	border: "1px solid #334155",
	"border-radius": "6px",
	padding: "8px 10px",
	color: "#e2e8f0",
	"font-size": "14px",
	"font-family": "monospace",
	width: "100%",
	"box-sizing": "border-box",
	outline: "none",
};

export const mono: JSX.CSSProperties = { "font-family": "monospace" };

export const cardStyle: JSX.CSSProperties = {
	background: "#0f172a",
	border: "1px solid #1e293b",
	"border-radius": "8px",
	padding: "16px",
};

export const labelStyle: JSX.CSSProperties = {
	color: "#94a3b8",
	"font-size": "11px",
	"font-family": "monospace",
	"text-transform": "uppercase",
	"letter-spacing": "0.08em",
};

export const MANUAL_FIELDS: [keyof SensorData, string][] = [
	["pm25", "PM2.5 µg/m³"],
	["pm10", "PM10 µg/m³"],
	["co2", "CO₂ ppm"],
	["voc", "VOC index"],
	["humidity", "Humidity %"],
	["temperature", "Temp °C"],
	["pm_1um", "PM <1µm"],
	["pm_4um", "PM <4µm"],
	["pressure", "Pressure hPa"],
	["nox", "NOx"],
	["rssi", "RSSI dBm"],
	["uptime", "Uptime sec"],
];
