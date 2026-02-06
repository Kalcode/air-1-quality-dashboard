#!/usr/bin/env bun
/**
 * Create a pull request on Gitea/Forgejo.
 *
 * Usage:
 *   bun scripts/create-pr.ts "PR Title" "PR Body" [base-branch] [head-branch]
 */
import { $ } from "bun";
import { existsSync } from "node:fs";

// --- Config ---

const API_BASE = "https://code.clausens.cloud/api/v1";

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

// --- Args ---

const [title, body, base, headArg] = process.argv.slice(2);

if (!title) {
	console.log(`Usage: bun scripts/create-pr.ts "Title" "Body" [base] [head]`);
	console.log(`\nExample:`);
	console.log(`  bun scripts/create-pr.ts "feat: add new feature" "Description"`);
	process.exit(1);
}

const head = headArg || (await $`git branch --show-current`.text()).trim();
const baseBranch = base || "main";

// --- Resolve repo path from git remote ---

const remoteUrl = (await $`git remote get-url origin`.text()).trim();
const match = remoteUrl.match(/kalcode\/([^/]+?)(?:\.git)?$/);
if (!match) {
	console.error(`Error: could not parse repo from remote: ${remoteUrl}`);
	process.exit(1);
}
const repoPath = `kalcode/${match[1]}`;

// --- Create PR ---

console.log("Creating PR...");
console.log(`  Title: ${title}`);
console.log(`  Base:  ${baseBranch}`);
console.log(`  Head:  ${head}`);
console.log(`  Repo:  ${repoPath}\n`);

const response = await fetch(`${API_BASE}/repos/${repoPath}/pulls`, {
	method: "POST",
	headers: {
		Authorization: `token ${token}`,
		"Content-Type": "application/json",
	},
	body: JSON.stringify({
		title,
		body: body || "",
		head,
		base: baseBranch,
	}),
});

if (response.ok) {
	const data = (await response.json()) as { html_url?: string };
	console.log(`PR created: ${data.html_url}`);
} else {
	const text = await response.text();
	console.error(`Failed to create PR (${response.status}):`);
	console.error(text);
	process.exit(1);
}
