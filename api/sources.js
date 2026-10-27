const {
  getSources,
  getMarketingPeople,
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

module.exports = async function handler(req, res) {
  setNoStore(res);

  if (req.method === "GET") {
    try {
      const [sources, marketingPeople] = await Promise.all([getSources(), getMarketingPeople()]);
      return res.status(200).json({ sources, marketingPeople });
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
  if (!Array.isArray(input) || input.length < 1 || input.length > 20) {
    return res.status(400).json({ error: "Tambahkan antara 1 sampai 20 spreadsheet." });
  }
  if (peopleInput !== undefined &&
      (!Array.isArray(peopleInput) || peopleInput.length < 1 || peopleInput.length > 30)) {
    return res.status(400).json({ error: "Daftar marketing harus berisi 1 sampai 30 nama." });
  }

  try {
    const sources = input.map(parseSource);
    const marketingPeople = peopleInput === undefined ? null : peopleInput.map((person) => {
      if (typeof person !== "string" || !person.trim() || person.trim().length > 80) {
        throw new Error("Nama anggota marketing wajib diisi dan maksimal 80 karakter.");
      }
      return person.trim();
    });
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

    const savedPeople = marketingPeople || await getMarketingPeople();
    await saveDashboardSettings(sources, savedPeople);
    return res.status(200).json({
      sources,
      marketingPeople: savedPeople
    });
  } catch (error) {
    console.error("Gagal menyimpan konfigurasi spreadsheet:", error);
    const status = error.message.startsWith("Link") ||
      error.message.startsWith("Nama") ||
      error.message.startsWith("Jenis") ||
      error.message.startsWith("Nama anggota") ||
      error.message.startsWith("Setiap")
      ? 400
      : 502;
    return res.status(status).json({ error: error.message });
  }
};
