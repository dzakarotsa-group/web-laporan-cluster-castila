const { createHmac, timingSafeEqual } = require("node:crypto");

const SOURCES_KEY = "dashboard:sources";
const MARKETING_PEOPLE_KEY = "dashboard:marketing-people";
const TEAM_SHEETS_KEY = "dashboard:team-sheets";
const SESSION_COOKIE = "dashboard_admin";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

const DEFAULT_SOURCES = [
  {
    id: "1VvpCQJUNC_eGqUeaSpDiUjZF9DN_JyXVRKZ6iaNbRq0",
    name: "Rekap metrik",
    type: "summary"
  },
  {
    id: "19ft2Fh1kr4cST-88psoqeKnltQsCmomIj-wQYMo6Ctk",
    name: "Daftar lead",
    type: "leads"
  }
];
const DEFAULT_MARKETING_PEOPLE = ["Anggi", "Nanik", "Anggia", "Laudia", "Nisa"];

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

async function redisCommand(parts) {
  const config = redisConfig();
  if (!config) {
    throw new Error("Penyimpanan admin belum dikonfigurasi. Atur UPSTASH_REDIS_REST_URL dan UPSTASH_REDIS_REST_TOKEN.");
  }

  const path = parts.map((part) => encodeURIComponent(String(part))).join("/");
  const response = await fetch(`${config.url}/${path}`, {
    headers: { Authorization: `Bearer ${config.token}` }
  });
  if (!response.ok) {
    throw new Error(`Penyimpanan admin merespons ${response.status}.`);
  }

  const body = await response.json();
  if (body.error) throw new Error("Penyimpanan admin gagal memproses permintaan.");
  return body.result;
}

async function getSources() {
  if (!redisConfig()) return DEFAULT_SOURCES;
  const stored = await redisCommand(["GET", SOURCES_KEY]);
  if (stored === null) return DEFAULT_SOURCES;

  let sources;
  try {
    sources = JSON.parse(stored);
  } catch {
    throw new Error("Pengaturan spreadsheet yang tersimpan tidak valid.");
  }
  if (!Array.isArray(sources)) throw new Error("Format pengaturan spreadsheet tidak valid.");
  return sources;
}

async function getMarketingPeople() {
  if (!redisConfig()) return DEFAULT_MARKETING_PEOPLE;
  const stored = await redisCommand(["GET", MARKETING_PEOPLE_KEY]);
  if (stored === null) return DEFAULT_MARKETING_PEOPLE;
  let people;
  try {
    people = JSON.parse(stored);
  } catch {
    throw new Error("Daftar anggota marketing yang tersimpan tidak valid.");
  }
  if (!Array.isArray(people)) throw new Error("Format daftar anggota marketing tidak valid.");
  return people;
}

async function getTeamSheets() {
  if (!redisConfig()) return [];
  const stored = await redisCommand(["GET", TEAM_SHEETS_KEY]);
  if (stored === null) return [];
  let teamSheets;
  try {
    teamSheets = JSON.parse(stored);
  } catch {
    throw new Error("Pengaturan spreadsheet per anggota yang tersimpan tidak valid.");
  }
  if (!Array.isArray(teamSheets)) throw new Error("Format spreadsheet per anggota tidak valid.");
  return teamSheets;
}

async function saveDashboardSettings(sources, marketingPeople, teamSheets) {
  await redisCommand([
    "MSET",
    SOURCES_KEY,
    JSON.stringify(sources),
    MARKETING_PEOPLE_KEY,
    JSON.stringify(marketingPeople),
    TEAM_SHEETS_KEY,
    JSON.stringify(teamSheets)
  ]);
}

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET belum diatur atau panjangnya kurang dari 32 karakter.");
  }
  return secret;
}

function signature(payload) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

function createSessionToken() {
  const payload = Buffer.from(JSON.stringify({
    expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000
  })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

function getCookie(req, name) {
  const cookies = String(req.headers.cookie || "").split(";");
  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === name) {
      return cookie.slice(separator + 1).trim();
    }
  }
  return "";
}

function isAuthenticated(req) {
  const token = getCookie(req, SESSION_COOKIE);
  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;

  const payload = token.slice(0, separator);
  const providedSignature = Buffer.from(token.slice(separator + 1));
  const expectedSignature = Buffer.from(signature(payload));
  if (providedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(providedSignature, expectedSignature)) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isFinite(session.expiresAt) && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${SESSION_DURATION_SECONDS}${secure}`
  );
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${secure}`
  );
}

function requireAdmin(req, res) {
  if (isAuthenticated(req)) return true;
  res.status(401).json({ error: "Sesi admin tidak valid atau sudah berakhir. Silakan masuk kembali." });
  return false;
}

function setNoStore(res) {
  res.setHeader("Cache-Control", "no-store");
}

module.exports = {
  DEFAULT_SOURCES,
  DEFAULT_MARKETING_PEOPLE,
  SESSION_COOKIE,
  clearSessionCookie,
  createSessionToken,
  getSources,
  getMarketingPeople,
  getTeamSheets,
  isAuthenticated,
  redisConfig,
  requireAdmin,
  saveDashboardSettings,
  setNoStore,
  setSessionCookie
};
