const {
  getSources,
  getMarketingPeople,
  getTeamSheets,
  requireAdmin,
  saveDashboardSettings,
  setNoStore
} = require("../lib/admin");

function parseSource(source) {
  if (!source || typeof source !== "object") {
    throw new Error("Setiap sumber spreadsheet harus memiliki nama, jenis, dan link.");
  }
  const name = typeof source.name === "string" ? source.name.trim() : "";
  const type = source.type;
  const url = typeof source.url === "string" ? source.url.trim() : "";
  if (!name || name.length > 80) {
    throw new Error("Nama sumber wajib diisi dan maksimal 80 karakter.");
  }
  if (type !== "summary" && type !== "leads") {
    throw new Error("Jenis sumber harus berupa Rekap metrik atau Daftar lead.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Link untuk "${name}" bukan URL yang valid.`);
  }
  const match = parsedUrl.hostname === "docs.google.com" &&
    parsedUrl.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (!match) {
    throw new Error(`Link untuk "${name}" harus berupa link Google Sheets.`);
  }
  return { id: match[1], name, type };
}

function parseTeamSheet(entry) {
  if (!entry || typeof entry !== "object") {
    throw new Error("Setiap spreadsheet anggota harus memiliki divisi, nama, dan link.");
  }
  const division = typeof entry.division === "string" ? entry.division.trim() : "";
  const name = typeof entry.name === "string" ? entry.name.trim() : "";
  const url = typeof entry.url === "string" ? entry.url.trim() : "";
  if (!division || division.length > 80 || !name || name.length > 80) {
    throw new Error("Divisi dan nama anggota wajib diisi, maksimal 80 karakter.");
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Link spreadsheet untuk "${name}" bukan URL yang valid.`);
  }
  const match = parsedUrl.hostname === "docs.google.com" &&
    parsedUrl.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  if (!match) {
    throw new Error(`Link untuk "${name}" harus berupa link Google Sheets.`);
  }
  return { division, name, id: match[1] };
}

module.exports = async function handler(req, res) {
  setNoStore(res);

  if (req.method === "GET") {
    try {
      const [sources, marketingPeople, teamSheets] = await Promise.all([
        getSources(), getMarketingPeople(), getTeamSheets()
      ]);
      return res.status(200).json({ sources, marketingPeople, teamSheets });
    } catch (error) {
      console.error("Gagal membaca konfigurasi spreadsheet:", error);
      return res.status(502).json({ error: error.message });
    }
  }

  if (req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Metode tidak diizinkan." });
  }
  if (!requireAdmin(req, res)) return;

  const input = req.body && req.body.sources;
  const peopleInput = req.body && req.body.marketingPeople;
  const teamSheetsInput = req.body && req.body.teamSheets;
  if (!Array.isArray(input) || input.length < 1 || input.length > 20) {
    return res.status(400).json({ error: "Tambahkan antara 1 sampai 20 spreadsheet." });
  }
  if (peopleInput !== undefined &&
      (!Array.isArray(peopleInput) || peopleInput.length < 1 || peopleInput.length > 30)) {
    return res.status(400).json({ error: "Daftar marketing harus berisi 1 sampai 30 nama." });
  }
  if (teamSheetsInput !== undefined &&
      (!Array.isArray(teamSheetsInput) || teamSheetsInput.length > 60)) {
    return res.status(400).json({ error: "Pengaturan harus berisi maksimal 60 spreadsheet anggota." });
  }

  try {
    const sources = input.map(parseSource);
    const marketingPeople = peopleInput === undefined ? null : peopleInput.map((person) => {
      if (typeof person !== "string" || !person.trim() || person.trim().length > 80) {
        throw new Error("Nama anggota marketing wajib diisi dan maksimal 80 karakter.");
      }
      return person.trim();
    });
    const teamSheets = teamSheetsInput === undefined ? null : teamSheetsInput.map(parseTeamSheet);
    if (marketingPeople) {
      const uniquePeople = new Set(marketingPeople.map((person) => person.toLocaleLowerCase("id-ID")));
      if (uniquePeople.size !== marketingPeople.length) {
        return res.status(400).json({ error: "Nama anggota marketing tidak boleh duplikat." });
      }
    }
    const uniqueIds = new Set(sources.map((source) => source.id));
    if (uniqueIds.size !== sources.length) {
      return res.status(400).json({ error: "Link spreadsheet yang sama tidak boleh ditambahkan lebih dari sekali." });
    }
    if (teamSheets) {
      const teamKeys = new Set(teamSheets.map((entry) =>
        `${entry.division.toLocaleLowerCase("id-ID")}\u0000${entry.name.toLocaleLowerCase("id-ID")}`
      ));
      if (teamKeys.size !== teamSheets.length) {
        return res.status(400).json({ error: "Nama orang tidak boleh duplikat dalam divisi yang sama." });
      }
      const teamIds = new Set(teamSheets.map((entry) => entry.id));
      if (teamIds.size !== teamSheets.length) {
        return res.status(400).json({ error: "Spreadsheet orang yang sama tidak boleh dipakai lebih dari sekali." });
      }
    }

    const savedPeople = marketingPeople || await getMarketingPeople();
    const savedTeamSheets = teamSheets || await getTeamSheets();
    await saveDashboardSettings(sources, savedPeople, savedTeamSheets);
    return res.status(200).json({
      sources,
      marketingPeople: savedPeople,
      teamSheets: savedTeamSheets
    });
  } catch (error) {
    console.error("Gagal menyimpan konfigurasi spreadsheet:", error);
    const status = error.message.startsWith("Link") ||
      error.message.startsWith("Nama") ||
      error.message.startsWith("Jenis") ||
      error.message.startsWith("Nama anggota") ||
      error.message.startsWith("Divisi") ||
      error.message.startsWith("Link spreadsheet") ||
      error.message.startsWith("Setiap") ||
      error.message.startsWith("Nama orang") ||
      error.message.startsWith("Spreadsheet orang")
      ? 400
      : 502;
    return res.status(status).json({ error: error.message });
  }
};
