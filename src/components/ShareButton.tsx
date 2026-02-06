import type { Component } from "solid-js";
import { createSignal } from "solid-js";
import { encodeSharePayload } from "./share-codec";
import { mono } from "./thresholds";
import type { Reading } from "./types";

interface ShareButtonProps {
	readings: Reading[];
	label: string;
}

export const ShareButton: Component<ShareButtonProps> = (props) => {
	const [status, setStatus] = createSignal("");
	const [sharing, setSharing] = createSignal(false);

	const handleShare = async () => {
		if (sharing()) return;
		setSharing(true);
		setStatus("");

		try {
			const encoded = encodeSharePayload({
				label: props.label || "Shared",
				readings: props.readings,
			});
			const url = `${window.location.origin}/#share=${encoded}`;
			await navigator.clipboard.writeText(url);
			setStatus("Link copied!");
			setTimeout(() => setStatus(""), 3000);
		} catch {
			setStatus("Failed");
		} finally {
			setSharing(false);
		}
	};

	return (
		<div
			style={{ display: "inline-flex", "align-items": "center", gap: "6px" }}
		>
			<button
				type="button"
				onClick={handleShare}
				disabled={sharing()}
				style={{
					background: "none",
					border: "1px solid #1e293b",
					"border-radius": "4px",
					color: "#94a3b8",
					"font-size": "10px",
					...mono,
					padding: "3px 8px",
					cursor: sharing() ? "wait" : "pointer",
					opacity: sharing() ? "0.6" : "1",
				}}
			>
				{sharing() ? "Sharing..." : "Share"}
			</button>
			{status() && (
				<span
					style={{
						"font-size": "10px",
						...mono,
						color: status() === "Link copied!" ? "#22c55e" : "#ef4444",
					}}
				>
					{status()}
				</span>
			)}
		</div>
	);
};
