const { isAuthenticated, setNoStore } = require("../../lib/admin");

module.exports = function handler(req, res) {
  setNoStore(res);
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Metode tidak diizinkan." });
  }

  return res.status(200).json({ authenticated: isAuthenticated(req) });
};
