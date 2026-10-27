const { timingSafeEqual } = require("node:crypto");
const { createSessionToken, setNoStore, setSessionCookie } = require("../../lib/admin");

function passwordsMatch(provided, expected) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);
}

module.exports = async function handler(req, res) {
  setNoStore(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metode tidak diizinkan." });
  }

  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    return res.status(503).json({ error: "ADMIN_PASSWORD belum dikonfigurasi di pengaturan environment Vercel." });
  }

  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!passwordsMatch(password, expectedPassword)) {
    return res.status(401).json({ error: "Kata sandi admin salah." });
  }

  try {
    const token = createSessionToken();
    setSessionCookie(res, token);
    return res.status(200).json({ authenticated: true });
  } catch (error) {
    console.error("Gagal membuat sesi admin:", error);
    return res.status(503).json({ error: error.message });
  }
};
