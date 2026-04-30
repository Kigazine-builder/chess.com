import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, "club.config.json");
const OUTPUT_DIR = path.join(__dirname, "docs");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "index.html");

async function loadConfig() {
  const raw = await readFile(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(raw);

  return {
    clubSlug: String(parsed.clubSlug || "").trim(),
    title: String(parsed.title || "Newest Members").trim(),
    count: Math.max(1, Number(parsed.count || 3))
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "chess-club-newest-members-generator/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

function dedupeMembers(payload) {
  const buckets = [
    ...(payload?.weekly || []),
    ...(payload?.monthly || []),
    ...(payload?.all_time || [])
  ];

  const byUsername = new Map();
  for (const member of buckets) {
    const username = String(member?.username || "").trim();
    if (!username) continue;

    const joined = Number(member?.joined || 0);
    const existing = byUsername.get(username);
    if (!existing || joined > existing.joined) {
      byUsername.set(username, { username, joined });
    }
  }

  return Array.from(byUsername.values())
    .sort((a, b) => b.joined - a.joined);
}

async function enrichMember(member) {
  const player = await fetchJson(`https://api.chess.com/pub/player/${encodeURIComponent(member.username)}`);
  return {
    ...member,
    avatar: player.avatar || "",
    url: player.url || `https://www.chess.com/member/${member.username}`,
    displayName: player.username || member.username
  };
}

function formatJoined(unixSeconds) {
  if (!unixSeconds) return "Joined date unavailable";
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getInitials(name = "") {
  const clean = String(name || "").replace(/[^a-z0-9]+/gi, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return "C";
  return parts.map(part => part[0].toUpperCase()).join("");
}

function renderMemberCard(member, index) {
  const safeName = escapeHtml(member.displayName);
  const safeUrl = escapeHtml(member.url);
  const joinedLabel = escapeHtml(formatJoined(member.joined));
  const positionLabel = index === 0 ? "Newest join" : `#${index + 1} newest join`;
  const avatarMarkup = member.avatar
    ? `<img src="${escapeHtml(member.avatar)}" alt="${safeName} avatar" class="avatar-image" />`
    : `<div class="avatar-fallback" aria-hidden="true">${escapeHtml(getInitials(member.displayName))}</div>`;

  return `
    <a class="member-card" href="${safeUrl}" target="_blank" rel="noopener noreferrer">
      <div class="avatar-wrap">
        ${avatarMarkup}
      </div>
      <div class="member-copy">
        <div class="member-topline">${escapeHtml(positionLabel)}</div>
        <h2>${safeName}</h2>
        <p>Joined ${joinedLabel}</p>
      </div>
    </a>
  `;
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPage({ title, clubSlug, members }) {
  const cards = members.length
    ? members.map((member, index) => renderMemberCard(member, index)).join("\n")
    : `
      <div class="empty-state">
        No public member data is available right now.
      </div>
    `;

  const updatedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0f172a;
      --panel: #162033;
      --panel-2: #1e293b;
      --line: rgba(148, 163, 184, 0.2);
      --text: #e2e8f0;
      --muted: #94a3b8;
      --gold: #fbbf24;
      --blue: #60a5fa;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Segoe UI", Arial, sans-serif;
      background:
        radial-gradient(circle at top, rgba(96, 165, 250, 0.18), transparent 34%),
        linear-gradient(180deg, #0b1120, var(--bg));
      color: var(--text);
      padding: 20px;
    }

    .wrap {
      width: min(100%, 420px);
      margin: 0 auto;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.9));
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 18px;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
    }

    .eyebrow {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(251, 191, 36, 0.14);
      color: #fde68a;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }

    h1 {
      margin: 0 0 6px;
      font-size: 28px;
      line-height: 1.05;
    }

    .sub {
      margin: 0 0 18px;
      color: var(--muted);
      line-height: 1.5;
      font-size: 14px;
    }

    .list {
      display: grid;
      gap: 12px;
    }

    .member-card {
      display: grid;
      grid-template-columns: 62px 1fr;
      gap: 14px;
      align-items: center;
      padding: 14px;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(30, 41, 59, 0.94), rgba(15, 23, 42, 0.94));
      border: 1px solid var(--line);
      text-decoration: none;
      color: inherit;
    }

    .avatar-wrap {
      width: 62px;
      height: 62px;
      border-radius: 18px;
      overflow: hidden;
      background: rgba(96, 165, 250, 0.14);
      border: 1px solid rgba(96, 165, 250, 0.18);
      display: grid;
      place-items: center;
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .avatar-fallback {
      color: white;
      font-weight: 800;
      font-size: 22px;
    }

    .member-copy h2 {
      margin: 2px 0 6px;
      font-size: 20px;
      line-height: 1.1;
    }

    .member-copy p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
    }

    .member-topline {
      color: var(--blue);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .footer {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.5;
    }

    .empty-state {
      padding: 18px;
      border-radius: 18px;
      background: rgba(30, 41, 59, 0.9);
      border: 1px solid var(--line);
      color: var(--muted);
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <main class="wrap">
    <div class="eyebrow">Live Club Widget</div>
    <h1>${escapeHtml(title)}</h1>
    <p class="sub">The 3 newest public joins for <strong>${escapeHtml(clubSlug)}</strong>.</p>
    <section class="list">
      ${cards}
    </section>
    <div class="footer">
      Updated ${escapeHtml(updatedAt)}. Data comes from the Chess.com public API and may refresh on its own cache schedule.
    </div>
  </main>
</body>
</html>`;
}

async function main() {
  const config = await loadConfig();
  if (!config.clubSlug) {
    throw new Error("clubSlug is missing in club.config.json");
  }

  const membersPayload = await fetchJson(`https://api.chess.com/pub/club/${encodeURIComponent(config.clubSlug)}/members`);
  const newestMembers = dedupeMembers(membersPayload).slice(0, config.count);
  const enrichedMembers = await Promise.all(newestMembers.map(enrichMember));

  const html = renderPage({
    title: config.title,
    clubSlug: config.clubSlug,
    members: enrichedMembers
  });

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_PATH, html, "utf8");
  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
