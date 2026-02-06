import type { Component } from "solid-js";
import { Show } from "solid-js";
import { getThreshold, mono, timeAgo } from "./thresholds";
import type { Reading } from "./types";

interface HistoryCardProps {
	entry: Reading;
	isViewing: boolean;
	isComparing: boolean;
	onView: () => void;
	onCompare: () => void;
	onClearCompare: () => void;
	onDelete: () => void;
	readOnly?: boolean;
}

export const HistoryCard: Component<HistoryCardProps> = (props) => {
	const pm = () =>
		props.entry.data.pm25
			? parseFloat(props.entry.data.pm25).toFixed(1)
			: "\u2014";
	const co = () =>
		props.entry.data.co2
			? parseFloat(props.entry.data.co2).toFixed(0)
			: "\u2014";
	const pmT = () => getThreshold("pm25", props.entry.data.pm25);
	const highlighted = () => props.isViewing || props.isComparing;

	return (
		<div
			style={{
				background: props.isViewing
					? "#0c1629"
					: props.isComparing
						? "#0f172a"
						: "#080e1a",
				border: `1px solid ${highlighted() ? "#1e3a5f" : "#1e293b"}`,
				"border-radius": "8px",
				padding: "10px 12px",
				display: "flex",
				"flex-direction": "column",
				gap: "6px",
			}}
		>
			<div
				style={{
					display: "flex",
					"justify-content": "space-between",
					"align-items": "center",
				}}
			>
				<div style={{ display: "flex", "align-items": "center", gap: "6px" }}>
					<Show when={props.isViewing}>
						<span
							style={{
								"font-size": "8px",
								color: "#22c55e",
								...mono,
								background: "#22c55e22",
								padding: "1px 5px",
								"border-radius": "3px",
								"text-transform": "uppercase",
								"letter-spacing": "0.1em",
							}}
						>
							viewing
						</span>
					</Show>
					<Show when={props.isComparing}>
						<span
							style={{
								"font-size": "8px",
								color: "#38bdf8",
								...mono,
								background: "#38bdf822",
								padding: "1px 5px",
								"border-radius": "3px",
								"text-transform": "uppercase",
								"letter-spacing": "0.1em",
							}}
						>
							baseline
						</span>
					</Show>
					<span style={{ "font-size": "11px", color: "#64748b", ...mono }}>
						{props.entry.date} {props.entry.time}
					</span>
					<Show when={props.entry.room}>
						<span
							style={{
								"font-size": "11px",
								color: "#94a3b8",
								...mono,
								"font-weight": "600",
							}}
						>
							{props.entry.room}
						</span>
					</Show>
				</div>
				<span style={{ "font-size": "9px", color: "#475569", ...mono }}>
					{timeAgo(props.entry.timestamp)}
				</span>
			</div>
			<div
				style={{ display: "flex", gap: "12px", "font-size": "11px", ...mono }}
			>
				<span style={{ color: "#64748b" }}>
					PM2.5{" "}
					<span
						style={{ color: pmT()?.color || "#94a3b8", "font-weight": "600" }}
					>
						{pm()}
					</span>
				</span>
				<span style={{ color: "#64748b" }}>
					CO₂{" "}
					<span style={{ color: "#94a3b8", "font-weight": "600" }}>{co()}</span>
				</span>
				<Show when={props.entry.data.voc}>
					<span style={{ color: "#64748b" }}>
						VOC{" "}
						<span style={{ color: "#94a3b8", "font-weight": "600" }}>
							{parseFloat(props.entry.data.voc).toFixed(0)}
						</span>
					</span>
				</Show>
				<Show when={props.entry.data.humidity}>
					<span style={{ color: "#64748b" }}>
						RH{" "}
						<span style={{ color: "#94a3b8", "font-weight": "600" }}>
							{parseFloat(props.entry.data.humidity).toFixed(0)}%
						</span>
					</span>
				</Show>
			</div>
			<div style={{ display: "flex", gap: "6px" }}>
				<Show when={!props.isViewing}>
					<button
						type="button"
						onClick={props.onView}
						style={{
							flex: "1",
							padding: "5px",
							background: "#1e293b",
							border: "1px solid #334155",
							"border-radius": "4px",
							color: "#94a3b8",
							"font-size": "10px",
							...mono,
							cursor: "pointer",
						}}
					>
						View
					</button>
				</Show>
				<Show when={!props.readOnly && !props.isComparing && !props.isViewing}>
					<button
						type="button"
						onClick={props.onCompare}
						style={{
							flex: "1",
							padding: "5px",
							background: "#0c1629",
							border: "1px solid #1e3a5f",
							"border-radius": "4px",
							color: "#38bdf8",
							"font-size": "10px",
							...mono,
							cursor: "pointer",
						}}
					>
						Compare
					</button>
				</Show>
				<Show when={!props.readOnly && props.isComparing}>
					<button
						type="button"
						onClick={props.onClearCompare}
						style={{
							flex: "1",
							padding: "5px",
							background: "#38bdf811",
							border: "1px solid #1e3a5f",
							"border-radius": "4px",
							color: "#38bdf8",
							"font-size": "10px",
							...mono,
							cursor: "pointer",
						}}
					>
						✕ Clear Baseline
					</button>
				</Show>
				<Show when={!props.readOnly}>
					<button
						type="button"
						onClick={props.onDelete}
						style={{
							padding: "5px 8px",
							background: "none",
							border: "1px solid #33111188",
							"border-radius": "4px",
							color: "#7f1d1d",
							"font-size": "10px",
							...mono,
							cursor: "pointer",
						}}
					>
						✕
					</button>
				</Show>
			</div>
		</div>
	);
};
