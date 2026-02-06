import type { Component } from "solid-js";
import { createSignal } from "solid-js";
import { importReadingsFromShare } from "./storage";
import { mono } from "./thresholds";
import type { Reading } from "./types";

interface PreviewBannerProps {
	label: string;
	count: number;
	readings: Reading[];
}

export const PreviewBanner: Component<PreviewBannerProps> = (props) => {
	const [importStatus, setImportStatus] = createSignal("");

	const handleImport = () => {
		try {
			const merged = importReadingsFromShare(props.readings);
			setImportStatus(`Imported! ${merged.length} total readings.`);
			setTimeout(() => {
				window.location.href = "/";
			}, 800);
		} catch {
			setImportStatus("Import failed.");
		}
	};

	return (
		<div
			style={{
				background: "#1e3a5f",
				border: "1px solid #2563eb",
				"border-radius": "8px",
				padding: "12px 14px",
				"margin-bottom": "12px",
				display: "flex",
				"flex-direction": "column",
				gap: "8px",
			}}
		>
			<div
				style={{
					display: "flex",
					"justify-content": "space-between",
					"align-items": "center",
					"flex-wrap": "wrap",
					gap: "8px",
				}}
			>
				<div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
					<span
						style={{
							"font-size": "8px",
							color: "#38bdf8",
							...mono,
							background: "#38bdf822",
							padding: "2px 6px",
							"border-radius": "3px",
							"text-transform": "uppercase",
							"letter-spacing": "0.1em",
						}}
					>
						preview
					</span>
					<span style={{ "font-size": "12px", color: "#e2e8f0", ...mono }}>
						{props.label}
					</span>
					<span style={{ "font-size": "10px", color: "#64748b", ...mono }}>
						{props.count} reading{props.count !== 1 ? "s" : ""}
					</span>
				</div>
				<div style={{ display: "flex", gap: "6px", "align-items": "center" }}>
					<button
						type="button"
						onClick={handleImport}
						style={{
							padding: "5px 10px",
							background: "#1d4ed8",
							border: "none",
							"border-radius": "4px",
							color: "#fff",
							"font-size": "10px",
							...mono,
							"font-weight": "600",
							cursor: "pointer",
						}}
					>
						Import to My Data
					</button>
					<a
						href="/"
						style={{
							padding: "5px 10px",
							background: "#1e293b",
							border: "1px solid #334155",
							"border-radius": "4px",
							color: "#94a3b8",
							"font-size": "10px",
							...mono,
							"text-decoration": "none",
							cursor: "pointer",
						}}
					>
						My Dashboard
					</a>
				</div>
			</div>
			{importStatus() && (
				<div
					style={{
						"font-size": "11px",
						...mono,
						color: importStatus().startsWith("Imported")
							? "#22c55e"
							: "#ef4444",
					}}
				>
					{importStatus()}
				</div>
			)}
		</div>
	);
};
