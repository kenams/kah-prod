const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");

const SITE_ID = process.env.SITE_ID || "kah-prod";
const TABLE = process.env.SUPABASE_TABLE || "site_content";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "kah-prod-admin" } }
  });
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function verifyToken(req) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) return false;
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "").trim();
  if (!token) return false;
  try {
    jwt.verify(token, jwtSecret);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = async (req, res) => {
  const supabase = getSupabase();
  if (!supabase) {
    sendJson(res, 200, { data: null, error: "not_configured" });
    return;
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from(TABLE)
      .select("payload")
      .eq("id", SITE_ID)
      .maybeSingle();

    if (error) {
      sendJson(res, 500, { error: "fetch_failed" });
      return;
    }
    sendJson(res, 200, { data: data ? data.payload : null });
    return;
  }

  if (req.method !== "POST" && req.method !== "PUT") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }

  if (!verifyToken(req)) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (error) {
      body = {};
    }
  }

  const payload = body.data || null;
  if (!payload) {
    sendJson(res, 400, { error: "Missing data" });
    return;
  }

  const { error } = await supabase.from(TABLE).upsert({
    id: SITE_ID,
    payload,
    updated_at: new Date().toISOString()
  });

  if (error) {
    sendJson(res, 500, { error: "save_failed" });
    return;
  }

  sendJson(res, 200, { ok: true });
};
