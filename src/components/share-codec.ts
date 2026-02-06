import { deflateSync, inflateSync } from "fflate";
import type { SharePayload } from "./types";

export function encodeSharePayload(payload: SharePayload): string {
	const json = JSON.stringify(payload);
	const compressed = deflateSync(new TextEncoder().encode(json), { level: 9 });
	return btoa(String.fromCharCode(...compressed))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

export function decodeSharePayload(encoded: string): SharePayload {
	const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(base64);
	const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
	const json = new TextDecoder().decode(inflateSync(bytes));
	return JSON.parse(json);
}
