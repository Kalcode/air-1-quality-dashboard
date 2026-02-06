import type { APIRoute } from "astro";
import type { SharePayload } from "../../components/types";

export const POST: APIRoute = async ({ request, locals }) => {
	const env = (locals as { runtime: { env: { SHARES: KVNamespace } } }).runtime
		.env;

	let body: SharePayload;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: "Invalid JSON" }), {
			status: 400,
			headers: { "content-type": "application/json" },
		});
	}

	if (
		!body.label ||
		typeof body.label !== "string" ||
		body.label.length > 100
	) {
		return new Response(
			JSON.stringify({ error: "Label required (max 100 chars)" }),
			{
				status: 400,
				headers: { "content-type": "application/json" },
			},
		);
	}

	if (
		!Array.isArray(body.readings) ||
		body.readings.length === 0 ||
		body.readings.length > 50
	) {
		return new Response(
			JSON.stringify({ error: "Readings must be an array of 1-50 items" }),
			{
				status: 400,
				headers: { "content-type": "application/json" },
			},
		);
	}

	const bytes = new Uint8Array(5);
	crypto.getRandomValues(bytes);
	const id = Array.from(bytes)
		.map((b) => b.toString(36).padStart(2, "0"))
		.join("")
		.slice(0, 8);

	const payload: SharePayload = {
		label: body.label.trim(),
		readings: body.readings,
	};

	await env.SHARES.put(`share:${id}`, JSON.stringify(payload), {
		expirationTtl: 2592000, // 30 days
	});

	const url = new URL(request.url);
	const shareUrl = `${url.origin}/s/${id}`;

	return new Response(JSON.stringify({ id, url: shareUrl }), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
};
