// The uca-control-v1 API, the two SSO doors and the UCA ID hub sync against a real local backend.
//   cd backend && npx nest build && node test/uca-control.test.mjs
// It makes a temp data dir, migrates + seeds it, starts dist/src/main on a free port with test secrets, runs a fake
// UCA ID hub, and checks every endpoint. Nothing here touches production.
import { spawn, execSync } from "node:child_process";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const free = () => new Promise((r) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TOKEN = crypto.randomBytes(32).toString("hex");
const ADMIN_SECRET = crypto.randomBytes(32).toString("hex");
const ID_SECRET = crypto.randomBytes(32).toString("hex");
const HUB_TOKEN = crypto.randomBytes(24).toString("hex");
const data = fs.mkdtempSync(path.join(os.tmpdir(), "share-control-"));
const port = await free(), hubPort = await free();
const BASE = `http://127.0.0.1:${port}`;
let passed = 0;
const ok = (m) => { passed++; console.log("  ok -", m); };

// ---------- a fake UCA ID hub ----------
const hubSeen = [];
const hub = http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
    if (req.headers.authorization !== "Bearer " + HUB_TOKEN) { res.writeHead(401); return res.end("{}"); }
    hubSeen.push(JSON.parse(b)); res.writeHead(200, { "Content-Type": "application/json" }); res.end('{"ok":true}');
  });
}).listen(hubPort);

// ---------- the backend ----------
const env = { ...process.env, DATA_DIRECTORY: data, DATABASE_URL: `file:${path.join(data, "pingvin-share.db")}`, CONFIG_FILE: path.join(data, "none.yaml"),
  BACKEND_PORT: String(port), PORT: String(port), CONTROL_TOKEN: TOKEN, ADMIN_SSO_SECRET: ADMIN_SECRET, UCA_ID_SSO_SECRET: ID_SECRET,
  HUB_URL: `http://127.0.0.1:${hubPort}`, HUB_TOKEN, UCA_IMG_DIR: data, UCA_REVISION: "test", PV_LOG_LEVEL: "warn" };
fs.writeFileSync(path.join(data, "logo.svg"), "<svg/>");
execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
execSync("npx prisma db seed", { env, stdio: "ignore" });
const logFile = fs.openSync(path.join(data, "backend.log"), "w");
const app = spawn(process.execPath, ["dist/src/main"], { env, stdio: ["ignore", logFile, logFile] });
const stop = () => { try { app.kill(); } catch { /* gone */ } hub.close(); };
process.on("exit", stop);
let up = false;
for (let i = 0; i < 240 && !up; i++) { try { up = (await fetch(BASE + "/api/health")).ok; } catch { /* starting */ } if (!up) await sleep(250); }
if (!up) { console.error(fs.readFileSync(path.join(data, "backend.log"), "utf8").slice(-3000)); stop(); process.exit(1); }

const c = async (method, p, body, token = TOKEN) => {
  const r = await fetch(BASE + "/api/control/v1" + p, { method, headers: { ...(token ? { Authorization: "Bearer " + token } : {}), "X-UCA-Admin": "owner@test.de", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
const ticket = (secret, label, payload) => {
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return p + "." + crypto.createHmac("sha256", secret).update(label + "\n" + p).digest("base64url");
};
const fresh = (aud, email, extra = {}) => ({ v: 1, aud, email, iat: Date.now(), exp: Date.now() + 60000, nonce: crypto.randomBytes(16).toString("hex"), ...extra });

try {
  console.log("uca-control-v1");
  assert.equal((await c("GET", "/health", null, "")).status, 401);
  assert.equal((await c("GET", "/health", null, "x".repeat(64))).status, 401);
  ok("no token / a wrong token: 401");
  const h = await c("GET", "/health");
  assert.equal(h.status, 200); assert.equal(h.json.app, "share"); assert.equal(h.json.revision, "test");
  assert.ok(h.json.checks.some((x) => x.name === "database" && x.ok)); assert.ok(h.json.host.cpus > 0);
  ok("health: checks, host, version " + h.json.version);

  // the first sign-up is Share's admin (Pingvin rule); it reaches the hub
  let r = await fetch(BASE + "/api/auth/signUp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "Admin@Test.de", username: "admin", password: "correct-horse-1" }) });
  assert.equal(r.status, 201);
  r = await fetch(BASE + "/api/auth/signUp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "user@test.de", username: "user1", password: "correct-horse-2" }) });
  assert.equal(r.status, 201);
  await sleep(400);
  assert.ok(hubSeen.some((x) => x.email === "admin@test.de" && x.product === "share" && x.manageUrl === "https://share.ucagg.de/account"));
  ok("sign-ups reported to the UCA ID hub (product share, lower-case email)");

  const s = await c("GET", "/stats");
  assert.equal(s.json.people, 2); assert.equal(s.json.active1, 2); assert.equal(s.json.signups30.length, 30); assert.equal(s.json.onlineLabel, "active today");
  ok("stats: people, active (last seen on sign-up), shares numbers");
  const pl = await c("GET", "/people?q=test");
  assert.equal(pl.json.total, 2); assert.ok(pl.json.people.every((p) => !("password" in p)));
  const one = await c("GET", "/people/" + encodeURIComponent("ADMIN@test.de"));
  assert.equal(one.status, 200); assert.equal(one.json.isAdmin, true); assert.equal(one.json.shares, 0);
  assert.equal((await c("GET", "/people/nobody%40x.de")).status, 404);
  ok("people list + one person (case-insensitive), 404 for an unknown email");
  assert.deepEqual((await c("GET", "/plans")).json.plans.map((p) => p.id), ["access"]);

  const g = await c("POST", "/grant", { email: "new@test.de", plan: "access", invite: false, note: "smoke" });
  assert.equal(g.status, 200); assert.equal(g.json.created, true); assert.equal(g.json.username, "new");
  const g2 = await c("POST", "/grant", { email: "new@test.de", plan: "access", invite: false });
  assert.equal(g2.json.created, false);
  assert.equal((await c("POST", "/grant", { email: "x@test.de", plan: "access", invite: true })).status, 409);   // SMTP is off here
  assert.equal((await c("POST", "/grant", { email: "bad", plan: "access" })).status, 400);
  ok("grant: creates once (idempotent), invite refused while SMTP is off, bad email 400");
  assert.equal((await c("POST", "/revoke", { email: "admin@test.de" })).status, 409);
  const rv = await c("POST", "/revoke", { email: "new@test.de" });
  assert.equal(rv.status, 200); await sleep(300);
  assert.ok(hubSeen.some((x) => x.email === "new@test.de" && x.status === "deleted"));
  ok("revoke: an admin is refused, an account without shares is removed (and leaves the hub)");

  const a = await c("GET", "/admins");
  assert.equal(a.json.admins.length, 1); assert.ok(a.json.note);
  assert.equal((await c("DELETE", "/admins/admin%40test.de")).status, 409);
  assert.equal((await c("POST", "/admins", { email: "user@test.de", role: "viewer" })).status, 400);
  assert.equal((await c("POST", "/admins", { email: "user@test.de", role: "admin" })).json.ok, true);
  assert.equal((await c("DELETE", "/admins/user%40test.de")).status, 200);
  ok("admins: list with note, last admin 409, viewer refused, add + remove");

  const st = await c("GET", "/settings");
  const ms = st.json.settings.find((x) => x.key === "share.maxSize");
  assert.equal(ms.type, "bytes"); assert.equal(ms.value, 1000000000);
  assert.equal(st.json.settings.find((x) => x.key === "share.maxExpiration").value, 0);
  assert.ok(!st.json.settings.some((x) => /password/i.test(x.key)));
  assert.equal((await c("POST", "/settings", { "smtp.password": "x" })).status, 400);
  assert.equal((await c("POST", "/settings", { "share.zipCompressionLevel": 11 })).status, 400);
  assert.equal((await c("POST", "/settings", { "share.allowRegistration": "yes" })).status, 400);
  const sv = await c("POST", "/settings", { "share.maxSize": 2000000000, "share.maxExpiration": 7 * 86400, "share.allowRegistration": false });
  assert.equal(sv.status, 200); assert.equal(sv.json.changed, 3);
  assert.equal(sv.json.settings.find((x) => x.key === "share.maxExpiration").value, 604800);
  const pub = await (await fetch(BASE + "/api/configs")).json();
  assert.equal(pub.find((x) => x.key === "share.maxSize").value, "2000000000");
  assert.equal(pub.find((x) => x.key === "share.maxExpiration").value, "1 weeks");
  r = await fetch(BASE + "/api/auth/signUp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "late@test.de", username: "late", password: "correct-horse-3" }) });
  assert.equal(r.status, 403);
  await c("POST", "/settings", { "share.allowRegistration": true });
  ok("settings: typed list without the password, bad values 400, a change is live at once (public config + sign-up off)");

  const m = await c("POST", "/messages", { audience: "all", title: "Hi", body: "Text" });
  assert.equal(m.status, 409);   // email only, SMTP off
  const d0 = await c("GET", "/daily"); assert.equal(d0.json.everyHours, 24);
  const d = await c("POST", "/daily", {});
  assert.equal(d.status, 200); assert.ok(Array.isArray(d.json.report.problems)); assert.ok(d.json.report.checks.some((x) => x.name === "smtp login"));
  assert.ok(d.json.report.problems.some((p) => p.startsWith("smtp login")));   // SMTP is off in this test
  assert.equal((await c("GET", "/daily")).json.report.at, d.json.report.at);
  const ck = await c("POST", "/check", {}); assert.equal(typeof ck.json.ok, "boolean");
  ok("daily (last report, run now) and check now: { at, ok, problems }");
  const lg = await c("GET", "/logs?limit=50");
  assert.ok(lg.json.logs.some((l) => l.kind === "control.settings via ucagg.de" && l.actor === "owner@test.de"));
  ok("logs: every write audited with X-UCA-Admin");
  assert.equal((await c("GET", "/threads")).status, 501); assert.equal((await c("GET", "/registrations")).status, 501);
  ok("threads / registrations: 501");

  console.log("admin SSO door");
  const t1 = ticket(ADMIN_SECRET, "uca-admin-sso-v1", fresh("localhost:3000/admin", "admin@test.de"));
  r = await fetch(BASE + "/api/uca/admin-sso?t=" + encodeURIComponent(t1), { redirect: "manual" });
  assert.equal(r.status, 302); assert.equal(r.headers.get("location"), "/admin");
  const cookies = r.headers.getSetCookie().join("; ");
  assert.ok(/access_token=ey/.test(cookies) && /refresh_token=/.test(cookies));
  const me = await (await fetch(BASE + "/api/users/me", { headers: { cookie: cookies.match(/access_token=[^;]+/)[0] } })).json();
  assert.equal(me.isAdmin, true);
  ok("a fresh ticket: 302 to /admin with Share's own session cookies (an admin session)");
  assert.equal((await fetch(BASE + "/api/uca/admin-sso?t=" + encodeURIComponent(t1), { redirect: "manual" })).status, 401);
  ok("the same ticket again: refused");
  assert.equal((await fetch(BASE + "/api/uca/admin-sso?t=" + encodeURIComponent(ticket(ADMIN_SECRET, "uca-admin-sso-v1", fresh("localhost:3000/admin", "user@test.de"))), { redirect: "manual" })).status, 401);
  assert.equal((await fetch(BASE + "/api/uca/admin-sso?t=" + encodeURIComponent(ticket(ID_SECRET, "uca-admin-sso-v1", fresh("localhost:3000/admin", "admin@test.de"))), { redirect: "manual" })).status, 401);
  assert.equal((await fetch(BASE + "/api/uca/admin-sso?t=" + encodeURIComponent(ticket(ADMIN_SECRET, "uca-admin-sso-v1", fresh("other.ucagg.de/admin", "admin@test.de"))), { redirect: "manual" })).status, 401);
  assert.equal((await fetch(BASE + "/api/uca/admin-sso?t=" + encodeURIComponent(ticket(ADMIN_SECRET, "uca-admin-sso-v1", { ...fresh("localhost:3000/admin", "admin@test.de"), exp: Date.now() - 1 })), { redirect: "manual" })).status, 401);
  ok("not an admin / wrong secret / other app / expired: refused");

  console.log("UCA ID door");
  r = await fetch(BASE + "/api/uca/id-sso?t=" + encodeURIComponent(ticket(ID_SECRET, "uca-id-sso-v1", fresh("localhost:3000/uca-id", "user@test.de", { product: "share", next: "/account/shares" }))), { redirect: "manual" });
  assert.equal(r.status, 302); assert.equal(r.headers.get("location"), "/account/shares");
  r = await fetch(BASE + "/api/uca/id-sso?t=" + encodeURIComponent(ticket(ID_SECRET, "uca-id-sso-v1", fresh("localhost:3000/uca-id", "user@test.de", { product: "share", next: "//evil.example" }))), { redirect: "manual" });
  assert.equal(r.headers.get("location"), "/account");
  assert.equal((await fetch(BASE + "/api/uca/id-sso?t=" + encodeURIComponent(ticket(ADMIN_SECRET, "uca-admin-sso-v1", fresh("localhost:3000/uca-id", "user@test.de"))), { redirect: "manual" })).status, 401);
  ok("UCA ID ticket: signed in to next, //host refused as next, an admin ticket never opens it");

  console.log(`\n${passed} passed`);
} catch (e) {
  console.error("FAILED:", e);
  process.exitCode = 1;
} finally {
  stop();
  setTimeout(() => { try { fs.rmSync(data, { recursive: true, force: true }); } catch { /* windows keeps the db open a moment */ } process.exit(); }, 500);
}
