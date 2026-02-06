import type { Component } from "solid-js";
import { createSignal, For, onMount, Show } from "solid-js";
import { ParticleBreakdown, StatusPanel, WHOBars } from "./AnalysisComponents";
import { GaugeBar, VocQualityBadge } from "./GaugeComponents";
import { HistoryCard } from "./HistoryCard";
import { PreviewBanner } from "./PreviewBanner";
import { ShareButton } from "./ShareButton";
import { decodeSharePayload } from "./share-codec";
import {
	clearAllStorage,
	deleteReading,
	exportHistory,
	importHistory,
	loadHistory,
	saveReading,
} from "./storage";
import {
	cardStyle,
	cToF,
	emptyData,
	formatUptime,
	getRssiInfo,
	inputStyle,
	labelStyle,
	MANUAL_FIELDS,
	mono,
	parseESPHome,
	timeAgo,
} from "./thresholds";
import type { Reading, SensorData } from "./types";

const Dashboard: Component = () => {
	const [data, setData] = createSignal<SensorData>({ ...emptyData });
	const [history, setHistory] = createSignal<Reading[]>([]);
	const [compareId, setCompareId] = createSignal<string | null>(null);
	const [paste, setPaste] = createSignal("");
	const [status, setStatus] = createSignal("");
	const [showManual, setShowManual] = createSignal(false);
	const [ts, setTs] = createSignal<string | null>(null);
	const [room, setRoom] = createSignal("");
	const [loading, setLoading] = createSignal(true);
	const [viewingId, setViewingId] = createSignal<string | null>(null);
	const [previewMode, setPreviewMode] = createSignal(false);
	const [previewLabel, setPreviewLabel] = createSignal("");

	// Derived signals
	const hasData = () => data().pm25 || data().co2 || data().humidity;
	const compareReading = () => {
		const cid = compareId();
		return cid ? (history().find((h) => h.id === cid) ?? null) : null;
	};
	const compData = () => compareReading()?.data ?? null;

	onMount(() => {
		const hash = window.location.hash;
		if (hash.startsWith("#share=")) {
			try {
				const payload = decodeSharePayload(hash.slice(7));
				setPreviewMode(true);
				setPreviewLabel(payload.label);
				setHistory(payload.readings);
				if (payload.readings.length > 0) {
					const latest = payload.readings[payload.readings.length - 1];
					setData({ ...emptyData, ...latest.data });
					setRoom(latest.room || "");
					setTs(latest.time);
					setViewingId(latest.id);
					if (payload.readings.length > 1)
						setCompareId(payload.readings[payload.readings.length - 2].id);
				}
				setLoading(false);
				return;
			} catch {
				// Invalid share data — fall through to normal load
			}
		}

		const hist = loadHistory();
		setHistory(hist);
		if (hist.length > 0) {
			const latest = hist[hist.length - 1];
			setData({ ...emptyData, ...latest.data });
			setRoom(latest.room || "");
			setTs(latest.time);
			setViewingId(latest.id);
			if (hist.length > 1) setCompareId(hist[hist.length - 2].id);
			setStatus(
				`✓ Loaded latest: ${latest.date} ${latest.time}${latest.room ? ` (${latest.room})` : ""}`,
			);
		}
		setLoading(false);
	});

	const handleParse = () => {
		const parsed = parseESPHome(paste().trim());
		if (parsed) {
			setData({ ...emptyData, ...(parsed as SensorData) });
			setTs(new Date().toLocaleTimeString());
			const hist = saveReading(parsed, room());
			const newLatest = hist[hist.length - 1];
			setHistory(hist);
			setViewingId(newLatest.id);
			if (hist.length > 1) setCompareId(hist[hist.length - 2].id);
			setStatus(`✓ Saved! ${Object.keys(parsed).length} values parsed`);
			setPaste("");
		} else {
			setStatus(
				"✕ Could not parse. Paste the full page from the sensor web UI.",
			);
		}
	};

	const handleView = (entry: Reading) => {
		setData({ ...emptyData, ...entry.data });
		setRoom(entry.room || "");
		setTs(entry.time);
		setViewingId(entry.id);
		const idx = history().findIndex((h) => h.id === entry.id);
		setCompareId(idx > 0 ? history()[idx - 1].id : null);
		setStatus(
			`✓ Viewing: ${entry.date} ${entry.time}${entry.room ? ` (${entry.room})` : ""}`,
		);
	};

	const handleDelete = (id: string) => {
		const hist = deleteReading(id);
		setHistory(hist);
		if (id === viewingId() && hist.length > 0) {
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
		if (id === compareId()) setCompareId(null);
	};

	const handleClearAll = () => {
		clearAllStorage();
		setData({ ...emptyData });
		setHistory([]);
		setTs(null);
		setRoom("");
		setStatus("Cleared all data.");
		setCompareId(null);
		setViewingId(null);
	};

	const handleExport = () => {
		exportHistory();
		setStatus(`✓ Exported ${history().length} readings`);
	};

	let fileInput!: HTMLInputElement;

	const handleImport = async (file: File) => {
		try {
			const hist = await importHistory(file);
			setHistory(hist);
			if (hist.length > 0) {
				const latest = hist[hist.length - 1];
				setData({ ...emptyData, ...latest.data });
				setRoom(latest.room || "");
				setTs(latest.time);
				setViewingId(latest.id);
				if (hist.length > 1) setCompareId(hist[hist.length - 2].id);
			}
			setStatus(`✓ Imported! ${hist.length} total readings`);
		} catch (e) {
			setStatus(`✕ ${e instanceof Error ? e.message : "Import failed"}`);
		}
	};

	return (
		<Show
			when={!loading()}
			fallback={
				<div
					style={{
						"min-height": "100vh",
						background: "#020617",
						display: "flex",
						"align-items": "center",
						"justify-content": "center",
					}}
				>
					<div style={{ color: "#475569", ...mono, "font-size": "13px" }}>
						Loading...
					</div>
				</div>
			}
		>
			<div
				style={{
					"min-height": "100vh",
					background: "#020617",
					color: "#e2e8f0",
					padding: "20px 16px 40px",
					"max-width": "480px",
					margin: "0 auto",
					"font-family":
						"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
				}}
			>
				{/* Preview Banner */}
				<Show when={previewMode()}>
					<PreviewBanner
						label={previewLabel()}
						count={history().length}
						readings={history()}
					/>
				</Show>

				{/* Header */}
				<div style={{ "text-align": "center", "margin-bottom": "20px" }}>
					<div
						style={{
							display: "inline-block",
							padding: "3px 10px",
							background: "#0f172a",
							border: "1px solid #1e293b",
							"border-radius": "20px",
							"font-size": "10px",
							color: "#64748b",
							...mono,
							"letter-spacing": "0.15em",
							"text-transform": "uppercase",
							"margin-bottom": "8px",
						}}
					>
						Apollo AIR-1
					</div>
					<h1
						style={{
							"font-size": "24px",
							"font-weight": "700",
							margin: "0",
							color: "#f1f5f9",
						}}
					>
						Air Quality Dashboard
					</h1>
					<div
						style={{
							display: "flex",
							"justify-content": "center",
							gap: "6px",
							"margin-top": "8px",
							"flex-wrap": "wrap",
						}}
					>
						<Show when={ts()}>
							<span
								style={{
									"font-size": "10px",
									color: "#475569",
									...mono,
									background: "#0f172a",
									padding: "2px 8px",
									"border-radius": "4px",
								}}
							>
								{ts()}
							</span>
						</Show>
						<Show when={data().uptime}>
							<span
								style={{
									"font-size": "10px",
									color: "#475569",
									...mono,
									background: "#0f172a",
									padding: "2px 8px",
									"border-radius": "4px",
								}}
							>
								↑{formatUptime(data().uptime)}
							</span>
						</Show>
						<Show when={data().rssi && getRssiInfo(data().rssi)}>
							{(() => {
								const info = () => getRssiInfo(data().rssi)!;
								return (
									<span
										style={{
											"font-size": "10px",
											color: info().color,
											...mono,
											background: "#0f172a",
											padding: "2px 8px",
											"border-radius": "4px",
											display: "inline-flex",
											"align-items": "center",
											gap: "4px",
										}}
									>
										<span
											style={{
												display: "inline-flex",
												"align-items": "flex-end",
												gap: "1px",
												height: "12px",
											}}
										>
											{[4, 7, 10, 12].map((h, i) => (
												<span
													style={{
														width: "3px",
														height: `${h}px`,
														"border-radius": "1px",
														background:
															i < info().bars ? info().color : "#334155",
													}}
												/>
											))}
										</span>
										{info().label}
									</span>
								);
							})()}
						</Show>
						<Show when={room()}>
							<span
								style={{
									"font-size": "10px",
									color: "#94a3b8",
									...mono,
									background: "#1e293b",
									padding: "2px 8px",
									"border-radius": "4px",
								}}
							>
								📍 {room()}
							</span>
						</Show>
					</div>
				</div>

				{/* Input — hidden in preview mode */}
				<Show when={!previewMode()}>
					<div
						style={{ ...cardStyle, padding: "14px", "margin-bottom": "12px" }}
					>
						<div
							style={{
								display: "flex",
								"justify-content": "space-between",
								"align-items": "center",
								"margin-bottom": "8px",
							}}
						>
							<span style={labelStyle}>New Reading</span>
							<span style={{ "font-size": "10px", color: "#475569", ...mono }}>
								paste from 192.168.50.20
							</span>
						</div>
						<input
							type="text"
							value={room()}
							onInput={(e) => setRoom(e.currentTarget.value)}
							placeholder="Room label (Kitchen, Bedroom, etc.)"
							style={{
								...inputStyle,
								"font-size": "12px",
								padding: "6px 10px",
								"margin-bottom": "8px",
							}}
						/>
						<textarea
							value={paste()}
							onInput={(e) => {
								setPaste(e.currentTarget.value);
								setStatus("");
							}}
							placeholder="Select All → Copy from sensor web page, paste here."
							style={{
								...inputStyle,
								height: "80px",
								resize: "vertical",
								"margin-bottom": "8px",
								"font-size": "12px",
							}}
						/>
						<div style={{ display: "flex", gap: "8px" }}>
							<button
								type="button"
								onClick={handleParse}
								style={{
									flex: "2",
									padding: "10px",
									background: "#1d4ed8",
									border: "none",
									"border-radius": "6px",
									color: "#fff",
									"font-size": "13px",
									...mono,
									"font-weight": "600",
									cursor: "pointer",
								}}
							>
								Save & Analyze
							</button>
							<button
								type="button"
								onClick={() => setShowManual(!showManual())}
								style={{
									flex: "1",
									padding: "10px",
									background: "#1e293b",
									border: "1px solid #334155",
									"border-radius": "6px",
									color: "#94a3b8",
									"font-size": "12px",
									...mono,
									cursor: "pointer",
								}}
							>
								{showManual() ? "Hide" : "Manual"}
							</button>
						</div>
						<Show when={status()}>
							<div
								style={{
									"margin-top": "8px",
									"font-size": "11px",
									...mono,
									color: status().startsWith("✓")
										? "#22c55e"
										: status().startsWith("✕")
											? "#ef4444"
											: "#94a3b8",
								}}
							>
								{status()}
							</div>
						</Show>
					</div>

					{/* Manual Entry */}
					<Show when={showManual()}>
						<div
							style={{ ...cardStyle, padding: "14px", "margin-bottom": "12px" }}
						>
							<div
								style={{
									display: "grid",
									"grid-template-columns": "1fr 1fr",
									gap: "8px",
								}}
							>
								<For each={MANUAL_FIELDS}>
									{([key, label]) => (
										<label style={{ display: "block" }}>
											<span
												style={{
													display: "block",
													"font-size": "10px",
													color: "#64748b",
													...mono,
													"margin-bottom": "3px",
												}}
											>
												{label}
											</span>
											<input
												type="number"
												step="any"
												value={data()[key]}
												onInput={(e) => {
													setData((p) => ({
														...p,
														[key]: e.currentTarget.value,
													}));
													if (!ts()) setTs(new Date().toLocaleTimeString());
												}}
												style={inputStyle}
											/>
										</label>
									)}
								</For>
							</div>
						</div>
					</Show>
				</Show>

				{/* Compare Indicator */}
				<Show when={compareReading() && hasData()}>
					<div
						style={{
							background: "#0c1629",
							border: "1px solid #1e3a5f",
							"border-radius": "8px",
							padding: "10px",
							"margin-bottom": "4px",
							display: "flex",
							"justify-content": "space-between",
							"align-items": "center",
						}}
					>
						<div
							style={{ display: "flex", "align-items": "center", gap: "8px" }}
						>
							<span
								style={{
									"font-size": "10px",
									color: "#38bdf8",
									...mono,
									"text-transform": "uppercase",
									"letter-spacing": "0.08em",
								}}
							>
								Comparing vs
							</span>
							<span style={{ "font-size": "11px", color: "#94a3b8", ...mono }}>
								{compareReading()?.room || compareReading()?.date} ·{" "}
								{compareReading()?.time}
							</span>
							<span style={{ "font-size": "9px", color: "#475569", ...mono }}>
								{timeAgo(compareReading()?.timestamp)}
							</span>
						</div>
						<button
							type="button"
							onClick={() => setCompareId(null)}
							style={{
								background: "none",
								border: "none",
								color: "#475569",
								"font-size": "14px",
								cursor: "pointer",
								padding: "0 4px",
							}}
						>
							✕
						</button>
					</div>
				</Show>

				{/* Dashboard */}
				<Show when={hasData()}>
					<StatusPanel data={data()} />
					<div
						style={{
							...cardStyle,
							"margin-top": "12px",
							display: "flex",
							"flex-direction": "column",
							gap: "16px",
						}}
					>
						<Show when={data().pm25}>
							<GaugeBar
								value={data().pm25}
								thresholdKey="pm25"
								label="PM2.5"
								unit="µg/m³"
								prevValue={compData()?.pm25}
							/>
						</Show>
						<Show when={data().pm10}>
							<GaugeBar
								value={data().pm10}
								thresholdKey="pm10"
								label="PM10"
								unit="µg/m³"
								prevValue={compData()?.pm10}
							/>
						</Show>
						<Show when={data().co2}>
							<GaugeBar
								value={data().co2}
								thresholdKey="co2"
								label="CO₂"
								unit="ppm"
								prevValue={compData()?.co2}
							/>
						</Show>
						<Show when={data().voc}>
							<GaugeBar
								value={data().voc}
								thresholdKey="voc"
								label="VOC"
								unit="index"
								prevValue={compData()?.voc}
							/>
						</Show>
						<VocQualityBadge quality={data().vocQuality} />
						<Show when={data().humidity}>
							<GaugeBar
								value={data().humidity}
								thresholdKey="humidity"
								label="Humidity"
								unit="%"
								prevValue={compData()?.humidity}
							/>
						</Show>
						<Show when={data().temperature}>
							<GaugeBar
								value={data().temperature}
								thresholdKey="temperature"
								label="Temperature"
								unit={`°C (${cToF(data().temperature)}°F)`}
								prevValue={compData()?.temperature}
							/>
						</Show>
					</div>
					<Show when={data().pm_1um && data().pm25 && data().pm10}>
						<ParticleBreakdown data={data()} />
					</Show>
					<WHOBars data={data()} />
					<Show when={data().pressure || data().nox}>
						<div
							style={{
								"margin-top": "12px",
								display: "flex",
								"flex-wrap": "wrap",
								gap: "8px",
							}}
						>
							<Show when={data().pressure}>
								<div
									style={{
										...cardStyle,
										padding: "8px 12px",
										"font-size": "11px",
										...mono,
									}}
								>
									<span style={{ color: "#64748b" }}>Pressure </span>
									<span style={{ color: "#94a3b8" }}>
										{data().pressure} hPa
									</span>
								</div>
							</Show>
							<Show when={data().nox}>
								<div
									style={{
										...cardStyle,
										padding: "8px 12px",
										"font-size": "11px",
										...mono,
									}}
								>
									<span style={{ color: "#64748b" }}>NOx </span>
									<span style={{ color: "#94a3b8" }}>{data().nox}</span>
								</div>
							</Show>
						</div>
					</Show>
				</Show>

				{/* Empty State — only in normal mode */}
				<Show when={!previewMode() && !hasData() && history().length === 0}>
					<div
						style={{
							"text-align": "center",
							padding: "50px 20px",
							color: "#334155",
						}}
					>
						<div
							style={{
								"font-size": "48px",
								"margin-bottom": "16px",
								opacity: "0.4",
							}}
						>
							◉
						</div>
						<div
							style={{
								...mono,
								"font-size": "13px",
								color: "#475569",
								"line-height": "1.8",
							}}
						>
							Copy the full page from
							<br />
							<span
								style={{
									color: "#94a3b8",
									background: "#0f172a",
									padding: "2px 8px",
									"border-radius": "4px",
								}}
							>
								http://192.168.50.20
							</span>
							<br />
							and paste above
						</div>
					</div>
				</Show>

				{/* Hidden file input for import — only in normal mode */}
				<Show when={!previewMode()}>
					<input
						ref={fileInput}
						type="file"
						accept=".json"
						style={{ display: "none" }}
						onChange={(e) => {
							const file = e.currentTarget.files?.[0];
							if (file) handleImport(file);
							e.currentTarget.value = "";
						}}
					/>
				</Show>

				{/* History */}
				<div style={{ "margin-top": "20px" }}>
					<div
						style={{
							display: "flex",
							"justify-content": "space-between",
							"align-items": "center",
							"margin-bottom": "8px",
						}}
					>
						<span style={labelStyle}>History ({history().length})</span>
						<Show when={!previewMode()}>
							<div
								style={{ display: "flex", gap: "6px", "align-items": "center" }}
							>
								<Show when={history().length > 0}>
									<ShareButton
										readings={history()}
										label={room() || "Shared"}
									/>
								</Show>
								<button
									type="button"
									onClick={() => fileInput.click()}
									style={{
										background: "none",
										border: "1px solid #1e293b",
										"border-radius": "4px",
										color: "#94a3b8",
										"font-size": "10px",
										...mono,
										padding: "3px 8px",
										cursor: "pointer",
									}}
								>
									Import
								</button>
								<Show when={history().length > 0}>
									<button
										type="button"
										onClick={handleExport}
										style={{
											background: "none",
											border: "1px solid #1e293b",
											"border-radius": "4px",
											color: "#94a3b8",
											"font-size": "10px",
											...mono,
											padding: "3px 8px",
											cursor: "pointer",
										}}
									>
										Export
									</button>
									<button
										type="button"
										onClick={handleClearAll}
										style={{
											background: "none",
											border: "1px solid #331111",
											"border-radius": "4px",
											color: "#7f1d1d",
											"font-size": "10px",
											...mono,
											padding: "3px 8px",
											cursor: "pointer",
										}}
									>
										Clear All
									</button>
								</Show>
							</div>
						</Show>
					</div>
					<Show when={history().length > 0}>
						<div
							style={{
								display: "flex",
								"flex-direction": "column",
								gap: "4px",
							}}
						>
							<For each={[...history()].reverse()}>
								{(entry) => (
									<HistoryCard
										entry={entry}
										isViewing={entry.id === viewingId()}
										isComparing={entry.id === compareId()}
										onView={() => handleView(entry)}
										onCompare={() => setCompareId(entry.id)}
										onClearCompare={() => setCompareId(null)}
										onDelete={() => handleDelete(entry.id)}
										readOnly={previewMode()}
									/>
								)}
							</For>
						</div>
					</Show>
				</div>
			</div>
		</Show>
	);
};

export default Dashboard;
