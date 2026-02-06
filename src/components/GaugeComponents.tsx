import type { Component } from "solid-js";
import { Show } from "solid-js";
import {
	getThreshold,
	HIGHER_IS_WORSE,
	labelStyle,
	mono,
	THRESHOLDS,
	VOC_QUALITY_COLORS,
	VOC_QUALITY_HINTS,
} from "./thresholds";

// --- Delta ---

interface DeltaProps {
	current: string | undefined;
	previous: string | undefined;
	metric: string;
}

export const Delta: Component<DeltaProps> = (props) => {
	const result = () => {
		if (!props.current || !props.previous) return null;
		const c = parseFloat(props.current);
		const p = parseFloat(props.previous);
		if (Number.isNaN(c) || Number.isNaN(p) || p === 0) return null;
		const pct = ((c - p) / Math.abs(p)) * 100;
		const diff = c - p;
		if (Math.abs(pct) < 0.5) return null;
		const increased = pct > 0;
		const isWorse = HIGHER_IS_WORSE.has(props.metric) ? increased : !increased;
		return { pct, diff, increased, isWorse, prev: p };
	};

	return (
		<Show when={result()}>
			{(r) => {
				const color = () => (r().isWorse ? "#ef4444" : "#22c55e");
				const arrow = () => (r().increased ? "\u25B2" : "\u25BC");
				return (
					<div
						style={{
							display: "flex",
							"align-items": "center",
							gap: "8px",
							"margin-top": "4px",
							padding: "4px 8px",
							background: `${color()}11`,
							"border-radius": "4px",
							border: `1px solid ${color()}22`,
						}}
					>
						<span
							style={{
								"font-size": "12px",
								...mono,
								color: color(),
								"font-weight": "700",
							}}
						>
							{arrow()} {Math.abs(r().pct).toFixed(0)}%
						</span>
						<span style={{ "font-size": "10px", ...mono, color: "#64748b" }}>
							{r().diff > 0 ? "+" : ""}
							{r().diff.toFixed(1)} from {r().prev.toFixed(1)}
						</span>
					</div>
				);
			}}
		</Show>
	);
};

// --- GaugeBar ---

interface GaugeBarProps {
	value: string;
	thresholdKey: string;
	label: string;
	unit: string;
	prevValue?: string;
}

export const GaugeBar: Component<GaugeBarProps> = (props) => {
	const t = () => getThreshold(props.thresholdKey, props.value);

	return (
		<Show when={t()}>
			{(threshold) => {
				const tiers = THRESHOLDS[props.thresholdKey];
				const scaleMax =
					tiers[tiers.length - 2]?.max || tiers[tiers.length - 1].max;
				const pct = () => Math.min((threshold().value / scaleMax) * 100, 100);
				return (
					<div style={{ "margin-bottom": "2px" }}>
						<div
							style={{
								display: "flex",
								"justify-content": "space-between",
								"align-items": "baseline",
								"margin-bottom": "4px",
							}}
						>
							<span style={labelStyle}>{props.label}</span>
							<div
								style={{
									display: "flex",
									"align-items": "baseline",
									gap: "4px",
								}}
							>
								<span
									style={{
										color: threshold().color,
										"font-size": "22px",
										"font-weight": "700",
									}}
								>
									{threshold().value.toFixed(1)}
								</span>
								<span
									style={{ color: "#64748b", "font-size": "11px", ...mono }}
								>
									{props.unit}
								</span>
							</div>
						</div>
						<div
							style={{
								height: "6px",
								background: "#1e293b",
								"border-radius": "3px",
								overflow: "hidden",
							}}
						>
							<div
								style={{
									height: "100%",
									width: `${pct()}%`,
									background: `linear-gradient(90deg, ${threshold().color}88, ${threshold().color})`,
									"border-radius": "3px",
									transition: "width 0.5s ease",
								}}
							/>
						</div>
						<div
							style={{
								display: "flex",
								"justify-content": "space-between",
								"margin-top": "3px",
							}}
						>
							<span
								style={{
									"font-size": "10px",
									color: threshold().color,
									...mono,
									"font-weight": "600",
								}}
							>
								{threshold().label}
							</span>
							<Show when={threshold().advice}>
								<span
									style={{
										"font-size": "10px",
										color: "#64748b",
										...mono,
										"text-align": "right",
										"max-width": "65%",
									}}
								>
									{threshold().advice}
								</span>
							</Show>
						</div>
						<Delta
							current={props.value}
							previous={props.prevValue}
							metric={props.thresholdKey}
						/>
					</div>
				);
			}}
		</Show>
	);
};

// --- VocQualityBadge ---

interface VocQualityBadgeProps {
	quality: string | undefined;
}

export const VocQualityBadge: Component<VocQualityBadgeProps> = (props) => {
	return (
		<Show when={props.quality}>
			{(quality) => {
				const color = () => VOC_QUALITY_COLORS[quality()] || "#64748b";
				const hint = () => VOC_QUALITY_HINTS[quality()] || "";
				return (
					<div
						style={{
							"margin-top": "-10px",
							display: "flex",
							"align-items": "center",
							gap: "6px",
						}}
					>
						<div
							style={{
								width: "6px",
								height: "6px",
								"border-radius": "50%",
								background: color(),
								"flex-shrink": "0",
							}}
						/>
						<span
							style={{
								"font-size": "11px",
								...mono,
								color: color(),
								"font-weight": "600",
							}}
						>
							Sensor: {quality()}
						</span>
						<Show when={hint()}>
							<span style={{ "font-size": "10px", ...mono, color: "#475569" }}>
								{hint()}
							</span>
						</Show>
					</div>
				);
			}}
		</Show>
	);
};
