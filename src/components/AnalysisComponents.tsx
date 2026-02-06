import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import { cardStyle, labelStyle, mono, THRESHOLDS } from "./thresholds";
import type { SensorData } from "./types";

// --- ParticleBreakdown ---

interface ParticleBreakdownProps {
	data: SensorData;
}

export const ParticleBreakdown: Component<ParticleBreakdownProps> = (props) => {
	const pm1 = () => parseFloat(props.data.pm_1um) || 0;
	const pm25 = () => parseFloat(props.data.pm25) || 0;
	const pm10 = () => parseFloat(props.data.pm10) || 0;

	const segments = () => {
		if (pm10() === 0) return null;
		const ultrafine = pm1();
		const fine = Math.max(pm25() - pm1(), 0);
		const coarse = Math.max(pm10() - pm25(), 0);
		const ufPct = ((ultrafine / pm10()) * 100).toFixed(0);
		const fPct = ((fine / pm10()) * 100).toFixed(0);
		const cPct = ((coarse / pm10()) * 100).toFixed(0);

		let signature = "Mixed sources";
		if (parseFloat(ufPct) > 65)
			signature = "Combustion dominant (smoke, fire, candles)";
		else if (parseFloat(cPct) > 40)
			signature = "Dust / mechanical (pets, HVAC, construction)";
		else if (parseFloat(fPct) > 35) signature = "Cooking / mixed combustion";

		return {
			items: [
				{ label: "<1\u00B5m", value: ultrafine, pct: ufPct, color: "#ef4444" },
				{
					label: "1\u20132.5\u00B5m",
					value: fine,
					pct: fPct,
					color: "#f97316",
				},
				{ label: ">2.5\u00B5m", value: coarse, pct: cPct, color: "#eab308" },
			],
			signature,
		};
	};

	return (
		<Show when={segments()}>
			{(seg) => (
				<div style={{ ...cardStyle, "margin-top": "12px" }}>
					<div style={{ ...labelStyle, "margin-bottom": "10px" }}>
						Particle Size Profile
					</div>
					<div
						style={{
							display: "flex",
							height: "10px",
							"border-radius": "5px",
							overflow: "hidden",
							gap: "2px",
							"margin-bottom": "10px",
						}}
					>
						<For each={seg().items}>
							{(s) => (
								<div
									style={{
										width: `${s.pct}%`,
										background: s.color,
										"min-width": parseFloat(s.pct) > 0 ? "4px" : "0",
										transition: "width 0.5s ease",
									}}
								/>
							)}
						</For>
					</div>
					<div style={{ display: "flex", "justify-content": "space-between" }}>
						<For each={seg().items}>
							{(s, i) => (
								<div
									style={{
										"text-align":
											i() === 0 ? "left" : i() === 2 ? "right" : "center",
									}}
								>
									<span
										style={{
											color: s.color,
											"font-size": "14px",
											"font-weight": "700",
										}}
									>
										{s.pct}%
									</span>
									<span
										style={{
											color: "#64748b",
											"font-size": "10px",
											...mono,
											display: "block",
										}}
									>
										{s.label}
									</span>
									<span
										style={{ color: "#475569", "font-size": "9px", ...mono }}
									>
										{s.value.toFixed(1)} µg/m³
									</span>
								</div>
							)}
						</For>
					</div>
					<div
						style={{
							"margin-top": "10px",
							padding: "8px 10px",
							background: "#1e293b",
							"border-radius": "6px",
							"font-size": "12px",
							color: "#cbd5e1",
							...mono,
						}}
					>
						⟐ {seg().signature}
					</div>
				</div>
			)}
		</Show>
	);
};

// --- WHOBars ---

interface WHOBarsProps {
	data: SensorData;
}

export const WHOBars: Component<WHOBarsProps> = (props) => {
	const items = () => {
		const result: {
			label: string;
			value: number;
			limit: number;
			unit: string;
		}[] = [];
		if (props.data.pm25)
			result.push({
				label: "PM2.5",
				value: parseFloat(props.data.pm25),
				limit: 15,
				unit: "µg/m³",
			});
		if (props.data.pm10)
			result.push({
				label: "PM10",
				value: parseFloat(props.data.pm10),
				limit: 45,
				unit: "µg/m³",
			});
		return result;
	};

	return (
		<Show when={items().length > 0}>
			<div style={{ ...cardStyle, "margin-top": "12px" }}>
				<div style={{ ...labelStyle, "margin-bottom": "10px" }}>
					vs WHO Guidelines (24-hr)
				</div>
				<For each={items()}>
					{(item) => {
						const ratio = () => item.value / item.limit;
						const color = () => (ratio() > 1 ? "#ef4444" : "#22c55e");
						return (
							<div style={{ "margin-bottom": "8px" }}>
								<div
									style={{
										display: "flex",
										"align-items": "center",
										gap: "10px",
									}}
								>
									<span
										style={{
											"font-size": "11px",
											color: "#64748b",
											...mono,
											width: "45px",
										}}
									>
										{item.label}
									</span>
									<div
										style={{
											flex: "1",
											position: "relative",
											height: "20px",
											background: "#1e293b",
											"border-radius": "4px",
											overflow: "hidden",
										}}
									>
										<div
											style={{
												position: "absolute",
												left: `${Math.min((1 / Math.max(ratio(), 1)) * 100, 100)}%`,
												top: "0",
												bottom: "0",
												width: "2px",
												background: "#22c55e88",
												"z-index": "2",
											}}
										/>
										<div
											style={{
												height: "100%",
												width: `${Math.min((ratio() / Math.max(ratio(), 3)) * 100, 100)}%`,
												background: `${color()}44`,
												"border-right": `2px solid ${color()}`,
												transition: "width 0.5s ease",
											}}
										/>
									</div>
									<span
										style={{
											"font-size": "12px",
											color: color(),
											...mono,
											"font-weight": "600",
											width: "50px",
											"text-align": "right",
										}}
									>
										{ratio().toFixed(1)}×
									</span>
								</div>
								<div
									style={{
										"font-size": "9px",
										color: "#475569",
										...mono,
										"margin-left": "55px",
										"margin-top": "2px",
									}}
								>
									yours: {item.value.toFixed(1)} · limit: {item.limit}{" "}
									{item.unit}
								</div>
							</div>
						);
					}}
				</For>
			</div>
		</Show>
	);
};

// --- StatusPanel ---

interface StatusPanelProps {
	data: SensorData;
}

interface Tip {
	e: string;
	t: string;
	indent?: boolean;
}

export const StatusPanel: Component<StatusPanelProps> = (props) => {
	const computed = () => {
		const tips: Tip[] = [];
		const pm = parseFloat(props.data.pm25);
		const co = parseFloat(props.data.co2);
		const hu = parseFloat(props.data.humidity);
		const vo = parseFloat(props.data.voc);

		if (!Number.isNaN(pm)) {
			if (pm > 150)
				tips.push({
					e: "\uD83D\uDD34",
					t: "PM2.5 is Unhealthy+. Run HEPA filter and ventilate.",
				});
			else if (pm > 55)
				tips.push({
					e: "\uD83D\uDFE0",
					t: "PM2.5 elevated. Open a window or run air purifier.",
				});
			else if (pm > 35)
				tips.push({
					e: "\uD83D\uDFE1",
					t: "PM2.5 moderate. Sensitive individuals take note.",
				});
			else if (pm <= 12)
				tips.push({ e: "\uD83D\uDFE2", t: "PM2.5 is within healthy range." });
			if (pm > 15)
				tips.push({
					e: "",
					t: `\u2192 ${(pm / 15).toFixed(1)}\u00D7 WHO 24-hr guideline (15 \u00B5g/m\u00B3)`,
					indent: true,
				});
		}
		if (!Number.isNaN(co)) {
			if (co < 350)
				tips.push({
					e: "\u26A0\uFE0F",
					t: "CO2 below outdoor ambient (~420ppm). Sensor may need calibration.",
				});
			else if (co > 1500)
				tips.push({
					e: "\uD83D\uDD34",
					t: "CO2 very high. Ventilate urgently.",
				});
			else if (co > 1000)
				tips.push({ e: "\uD83D\uDFE0", t: "CO2 elevated. Getting stuffy." });
		}
		if (!Number.isNaN(hu)) {
			if (hu < 25)
				tips.push({
					e: "\uD83D\uDFE0",
					t: "Humidity very low. Humidifier recommended.",
				});
			else if (hu > 60)
				tips.push({ e: "\uD83D\uDFE0", t: "Humidity high. Watch for mold." });
		}
		if (!Number.isNaN(vo) && vo >= 150)
			tips.push({ e: "\uD83D\uDFE0", t: "VOC index abnormal. Ventilate." });
		if (
			props.data.vocQuality === "Abnormal" ||
			props.data.vocQuality === "Very Abnormal"
		) {
			tips.push({
				e: "\u26A0\uFE0F",
				t: `VOC sensor ${props.data.vocQuality}. May need 24+ hrs to baseline.`,
			});
		}
		if (tips.length === 0)
			tips.push({ e: "\uD83D\uDFE2", t: "Everything looks good." });

		// Compute worst severity
		const checks = [
			{ type: "pm25", value: props.data.pm25 },
			{ type: "co2", value: props.data.co2 },
			{ type: "voc", value: props.data.voc },
			{ type: "humidity", value: props.data.humidity },
		];
		let worstTier = 0;
		for (const { type, value } of checks) {
			if (!value) continue;
			const v = parseFloat(value);
			if (Number.isNaN(v)) continue;
			const tiers = THRESHOLDS[type];
			for (let i = 0; i < tiers.length; i++) {
				if (v <= tiers[i].max) {
					worstTier = Math.max(worstTier, i);
					break;
				}
			}
		}

		const statuses = [
			{
				label: "All Clear",
				color: "#22c55e",
				icon: "\u2713",
				msg: "Air quality looks great.",
			},
			{
				label: "Fair",
				color: "#eab308",
				icon: "~",
				msg: "Mostly fine, minor concerns.",
			},
			{
				label: "Caution",
				color: "#f97316",
				icon: "!",
				msg: "Some metrics need attention.",
			},
			{
				label: "Poor",
				color: "#ef4444",
				icon: "\u2715",
				msg: "Significant issues detected.",
			},
			{
				label: "Hazardous",
				color: "#991b1b",
				icon: "\u2620",
				msg: "Dangerous air quality.",
			},
		];
		const st = statuses[Math.min(worstTier, statuses.length - 1)];

		return { tips, st };
	};

	return (
		<div
			style={{
				background: `linear-gradient(135deg, ${computed().st.color}11, ${computed().st.color}05)`,
				border: `1px solid ${computed().st.color}33`,
				"border-radius": "8px",
				padding: "16px",
				"margin-top": "12px",
			}}
		>
			<div
				style={{
					display: "flex",
					"align-items": "center",
					gap: "10px",
					"margin-bottom": "10px",
				}}
			>
				<div
					style={{
						width: "36px",
						height: "36px",
						"border-radius": "50%",
						background: `${computed().st.color}22`,
						border: `2px solid ${computed().st.color}`,
						display: "flex",
						"align-items": "center",
						"justify-content": "center",
						"font-size": "18px",
						"font-weight": "700",
						color: computed().st.color,
						"flex-shrink": "0",
					}}
				>
					{computed().st.icon}
				</div>
				<div>
					<div
						style={{
							color: computed().st.color,
							"font-size": "18px",
							"font-weight": "700",
						}}
					>
						{computed().st.label}
					</div>
					<div style={labelStyle}>{computed().st.msg}</div>
				</div>
			</div>
			<div style={{ display: "flex", "flex-direction": "column", gap: "4px" }}>
				<For each={computed().tips}>
					{(tip) => (
						<div
							style={{
								"font-size": "12px",
								color: "#cbd5e1",
								...mono,
								"padding-left": tip.indent ? "24px" : "10px",
								"border-left": tip.indent
									? "none"
									: `2px solid ${computed().st.color}33`,
								"line-height": "1.5",
							}}
						>
							{tip.e ? `${tip.e} ` : ""}
							{tip.t}
						</div>
					)}
				</For>
			</div>
		</div>
	);
};
