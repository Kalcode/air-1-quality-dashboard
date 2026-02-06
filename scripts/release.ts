#!/usr/bin/env bun
/**
 * Release script — replaces GitHub Actions release workflow.
 * Uses bunx git-cliff for versioning + changelog, Gitea API for releases.
 *
 * Usage:
 *   bun scripts/release.ts              # full release
 *   bun scripts/release.ts --dry-run    # preview only, no changes
 */
import { $ } from "bun";
import { existsSync } from "node:fs";

// --- Config ---

const API_BASE = "https://code.clausens.cloud/api/v1";
const dryRun = process.argv.includes("--dry-run");

// --- Load .env ---

if (existsSync(".env")) {
	const envText = await Bun.file(".env").text();
	for (const line of envText.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;
		const eq = trimmed.indexOf("=");
		if (eq > 0) {
			process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
		}
	}
}

const token = process.env.GITEA_TOKEN;
if (!token) {
	console.error("Error: GITEA_TOKEN not found in .env");
	process.exit(1);
}

// --- Resolve repo path from git remote ---

const remoteUrl = (await $`git remote get-url origin`.text()).trim();
const match = remoteUrl.match(/kalcode\/([^/]+?)(?:\.git)?$/);
if (!match) {
	console.error(`Error: could not parse repo from remote: ${remoteUrl}`);
	process.exit(1);
}
const repoPath = `kalcode/${match[1]}`;

// --- Get next version ---

const version = (await $`bunx git-cliff --bumped-version`.text()).trim();
console.log(`Next version: ${version}`);

// --- Generate changelog ---

await $`bunx git-cliff --tag ${version} -o CHANGELOG.md`;
console.log("Generated CHANGELOG.md");

// --- Generate release notes (latest tag only, no header) ---

const releaseNotes = (
	await $`bunx git-cliff --latest --strip header --tag ${version}`.text()
).trim();

console.log("\n--- Release notes ---");
console.log(releaseNotes);
console.log("--- End release notes ---\n");

if (dryRun) {
	console.log("[dry-run] Would commit, tag, push, and create release.");
	console.log("[dry-run] Restoring CHANGELOG.md...");
	await $`git checkout -- CHANGELOG.md`.nothrow();
	process.exit(0);
}

// --- Commit changelog ---

await $`git add CHANGELOG.md`;
await $`git commit -m ${`chore(release): ${version}`}`;
console.log(`Committed changelog for ${version}`);

// --- Tag ---

await $`git tag -a ${version} -m ${`Release ${version}`}`;
console.log(`Created tag ${version}`);

// --- Push commit + tag ---

await $`git push`;
await $`git push origin ${version}`;
console.log("Pushed commit and tag");

// --- Create Gitea release ---

const response = await fetch(`${API_BASE}/repos/${repoPath}/releases`, {
	method: "POST",
	headers: {
		Authorization: `token ${token}`,
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		tag_name: version,
		name: version,
		body: releaseNotes,
		draft: false,
		prerelease: false,
	}),
});

if (response.ok) {
	const data = (await response.json()) as { html_url?: string };
	console.log(`\nRelease created: ${data.html_url}`);
} else {
	const body = await response.text();
	console.error(`\nFailed to create release (${response.status}):`);
	console.error(body);
	process.exit(1);
}
