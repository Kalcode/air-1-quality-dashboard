import type { Reading, SensorData } from "./types";

const STORAGE_KEY = "air-quality-history-v2";

export function saveReading(
	data: Partial<SensorData>,
	room: string,
): Reading[] {
	const reading: Reading = {
		id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
		data: data as SensorData,
		room: room || "",
		timestamp: Date.now(),
		time: new Date().toLocaleTimeString(),
		date: new Date().toLocaleDateString(),
	};
	let hist: Reading[] = [];
	try {
		const h = localStorage.getItem(STORAGE_KEY);
		if (h) hist = JSON.parse(h);
	} catch {
		/* empty */
	}
	hist.push(reading);
	if (hist.length > 50) hist = hist.slice(-50);
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(hist));
	} catch (e) {
		console.error("Save error:", e);
	}
	return hist;
}

export function loadHistory(): Reading[] {
	try {
		const r = localStorage.getItem(STORAGE_KEY);
		if (r) return JSON.parse(r);
	} catch {
		/* empty */
	}
	return [];
}

export function deleteReading(id: string): Reading[] {
	let hist: Reading[] = [];
	try {
		const h = localStorage.getItem(STORAGE_KEY);
		if (h) hist = JSON.parse(h);
	} catch {
		/* empty */
	}
	hist = hist.filter((r) => r.id !== id);
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(hist));
	} catch {
		/* empty */
	}
	return hist;
}

export function clearAllStorage(): void {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		/* empty */
	}
}

export function exportHistory(): void {
	const hist = loadHistory();
	const blob = new Blob([JSON.stringify(hist, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `air-quality-${new Date().toISOString().slice(0, 10)}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

export function importReadingsFromShare(readings: Reading[]): Reading[] {
	const existing = loadHistory();
	const existingIds = new Set(existing.map((r) => r.id));
	const merged = [
		...existing,
		...readings.filter((r) => r.id && r.data && !existingIds.has(r.id)),
	];
	const trimmed = merged.slice(-50);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
	return trimmed;
}

export function importHistory(file: File): Promise<Reading[]> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const data = JSON.parse(reader.result as string);
				if (!Array.isArray(data)) {
					reject(new Error("Invalid format: expected an array"));
					return;
				}
				// Merge by id — keep existing, add new
				const existing = loadHistory();
				const existingIds = new Set(existing.map((r) => r.id));
				const merged = [
					...existing,
					...data.filter(
						(r: Reading) => r.id && r.data && !existingIds.has(r.id),
					),
				];
				// Keep latest 50
				const trimmed = merged.slice(-50);
				localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
				resolve(trimmed);
			} catch {
				reject(new Error("Could not parse JSON file"));
			}
		};
		reader.onerror = () => reject(new Error("Failed to read file"));
		reader.readAsText(file);
	});
}
