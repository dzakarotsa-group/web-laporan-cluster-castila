const { clearSessionCookie, requireAdmin, setNoStore } = require("../../lib/admin");

module.exports = function handler(req, res) {
  setNoStore(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metode tidak diizinkan." });
  }
  if (!requireAdmin(req, res)) return;

  clearSessionCookie(res);
  return res.status(200).json({ authenticated: false });
};
