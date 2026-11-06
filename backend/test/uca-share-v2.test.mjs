// UCA Share v2 against a real local backend: plans (UCA Pro / UCA Max / none from a fake ucagg.de), the two link modes,
// the 3-day cap, the download limit, the download log, quotas per plan, space back after delete / expiry, the app API
// (uca-share-v1: tokens, upload, resume, events), the control endpoints for ucagg.de and the three disk levels.
//   cd backend && npx nest build && node test/uca-share-v2.test.mjs
import { spawn, execSync } from "node:child_process";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const free = () => new Promise((r) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TOKEN = crypto.randomBytes(32).toString("hex");
const HUB_TOKEN = crypto.randomBytes(24).toString("hex");
const APP_KEY = crypto.randomBytes(32).toString("hex");
const data = fs.mkdtempSync(path.join(os.tmpdir(), "share-v2-"));
const DISK = path.join(data, "free-gb.txt");
fs.writeFileSync(DISK, "50");
const port = await free(), hubPort = await free();
const BASE = `http://127.0.0.1:${port}`;
let passed = 0;
const ok = (m) => { passed++; console.log("  ok -", m); };

// ---------- a fake ucagg.de: the hub (accounts) and the bundle check ----------
const bundles = { "pro@test.de": { plan: "pro", until: null }, "max@test.de": { plan: "max", until: Date.now() + 86400_000 } };
let bundleCalls = 0;
const hub = http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
    if (req.headers.authorization !== "Bearer " + HUB_TOKEN) { res.writeHead(401); return res.end("{}"); }
    res.writeHead(200, { "Content-Type": "application/json" });
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/api/hub/v1/bundle") {
      bundleCalls++;
      const e = String(u.searchParams.get("email") || "").toLowerCase();
      const x = bundles[e] || { plan: "none", until: null };
      return res.end(JSON.stringify({ email: e, plan: x.plan, until: x.until, owner: false }));
    }
    res.end('{"ok":true}');
  });
}).listen(hubPort);

// ---------- the backend ----------
const env = { ...process.env, DATA_DIRECTORY: data, DATABASE_URL: `file:${path.join(data, "pingvin-share.db")}`, CONFIG_FILE: path.join(data, "none.yaml"),
  BACKEND_PORT: String(port), PORT: String(port), CONTROL_TOKEN: TOKEN, HUB_URL: `http://127.0.0.1:${hubPort}`, HUB_TOKEN,
  SHARE_APP_KEY_AI: APP_KEY, UCA_DISK_FAKE_FILE: DISK, UCA_IMG_DIR: data, PV_LOG_LEVEL: "warn" };
execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
execSync("npx prisma db seed", { env, stdio: "ignore" });
const logFile = fs.openSync(path.join(data, "backend.log"), "w");
const app = spawn(process.execPath, ["dist/src/main"], { env, stdio: ["ignore", logFile, logFile] });
const stop = () => { try { app.kill(); } catch { /* gone */ } hub.close(); };
process.on("exit", stop);
let up = false;
for (let i = 0; i < 240 && !up; i++) { try { up = (await fetch(BASE + "/api/health")).ok; } catch { /* starting */ } if (!up) await sleep(250); }
if (!up) { console.error(fs.readFileSync(path.join(data, "backend.log"), "utf8").slice(-3000)); stop(); process.exit(1); }
process.on("unhandledRejection", (e) => { console.error("FAILED:", e); try { console.error(fs.readFileSync(path.join(data, "backend.log"), "utf8").slice(-3000)); } catch { /* none */ } stop(); process.exit(1); });
const db = new DatabaseSync(path.join(data, "pingvin-share.db"));

// ---------- helpers ----------
const j = async (r) => ({ status: r.status, json: await r.json().catch(() => ({})), headers: r.headers });
const c = async (method, p, body) => j(await fetch(BASE + "/api/control/v1" + p, { method, headers: { Authorization: "Bearer " + TOKEN, "X-UCA-Admin": "owner@test.de", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }));
async function account(email, username) {
  const r = await fetch(BASE + "/api/auth/signUp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, username, password: "correct-horse-" + username }) });
  assert.equal(r.status, 201, "sign-up " + email);
  return r.headers.getSetCookie().map((x) => x.split(";")[0]).filter((x) => /^access_token=/.test(x)).join("; ");
}
const web = (cookie) => async (method, p, body, type = "application/json") => j(await fetch(BASE + "/api" + p, { method, headers: { cookie, ...(body != null ? { "Content-Type": type } : {}) }, body: body == null ? undefined : type === "application/json" ? JSON.stringify(body) : body }));
async function sendWeb(w, id, dto, bytes) {
  const s = await w("POST", "/shares", { id, expiration: "7-days", recipients: [], security: {}, ...dto });
  if (s.status !== 201) return s;
  const fid = crypto.randomUUID();
  const up = await w("POST", `/shares/${id}/files?id=${fid}&name=hello.txt&chunkIndex=0&totalChunks=1`, bytes, "application/octet-stream");
  if (up.status >= 300) return up;
  const done = await w("POST", `/shares/${id}/complete`, {});
  return { ...done, fid };
}
// a visitor: the share page's token (one visit), then the file
async function visit(id) {
  const t = await fetch(BASE + `/api/shares/${id}/token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  if (t.status !== 200) return { status: t.status, cookie: null };
  return { status: 200, cookie: t.headers.getSetCookie().map((x) => x.split(";")[0]).join("; ") };
}
const getFile = (id, fid, cookie, ua = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36") =>
  fetch(BASE + `/api/shares/${id}/files/${fid}`, { headers: { ...(cookie ? { cookie } : {}), "User-Agent": ua } });
const appToken = (payload, key = APP_KEY) => {
  const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return p + "." + crypto.createHmac("sha256", key).update("uca-share-app-v1\n" + p).digest("base64url");
};
const tok = (email, extra = {}) => appToken({ v: 1, iss: "ai", aud: "localhost:3000", email, sub: "pc-1", iat: Date.now(), exp: Date.now() + 3600_000, ...extra });
const api = (t) => async (method, p, body, type = "application/json") => j(await fetch(BASE + "/api/app/v1" + p, { method, headers: { Authorization: "Bearer " + t, ...(body != null ? { "Content-Type": type } : {}) }, body: body == null ? undefined : type === "application/json" ? JSON.stringify(body) : body }));

try {
  const admin = web(await account("admin@test.de", "admin"));    // the first account is Share's admin
  const pro = web(await account("pro@test.de", "prouser"));
  const max = web(await account("max@test.de", "maxuser"));
  const none = web(await account("none@test.de", "noneuser"));

  console.log("plans");
  const st = await j(await fetch(BASE + "/api/uca/status"));
  assert.equal(st.json.disk, "ok"); assert.equal(st.json.plans.pro.perLinkBytes, 250 * 1024 ** 2); assert.equal(st.json.plans.max.storageBytes, Math.round(2.5 * 1024 ** 3));
  assert.equal(st.json.maxDays, 3); assert.equal(st.json.maxDownloads, 10); assert.equal(st.json.upgrade.url, "https://ucagg.de/account#bundles");
  ok("public status: Pro 250 MB / 1 GB, Max 750 MB / 2.5 GB, 3 days, 10 downloads");
  const mp = await pro("GET", "/uca/me"), mm = await max("GET", "/uca/me"), mn = await none("GET", "/uca/me"), ma = await admin("GET", "/uca/me");
  assert.equal(mp.json.plan, "pro"); assert.equal(mp.json.limits.storageBytes, 1024 ** 3);
  assert.equal(mm.json.plan, "max"); assert.ok(mm.json.until); assert.equal(mm.json.limits.perLinkBytes, 750 * 1024 ** 2);
  assert.equal(mn.json.plan, "none"); assert.equal(mn.json.canSend, false); assert.equal(mn.json.upgrade.text, "Send files with one link: UCA Pro");
  assert.equal(ma.json.plan, "admin"); assert.equal(ma.json.limits.perLinkBytes, null);
  ok("each person's plan from ucagg.de (pro, max with until, none with the hint, admin unlimited)");
  const calls = bundleCalls; await pro("GET", "/uca/me"); assert.equal(bundleCalls, calls); ok("the bundle answer is cached");

  console.log("link modes");
  let r = await sendWeb(none, "nonelink", { mode: "days", days: 1 }, Buffer.from("x"));
  assert.equal(r.status, 402); assert.equal(r.json.code, "plan_required"); ok("no plan: refused (402, plan_required)");
  assert.equal((await pro("POST", "/shares", { id: "toolong", expiration: "1-days", recipients: [], security: {}, mode: "days", days: 4 })).status, 400);
  assert.equal((await pro("POST", "/shares", { id: "toomany", expiration: "1-days", recipients: [], security: {}, mode: "downloads", maxDownloads: 11 })).status, 400);
  assert.equal((await pro("POST", "/shares", { id: "zerodl", expiration: "1-days", recipients: [], security: {}, mode: "downloads", maxDownloads: 0 })).status, 400);
  ok("days 4 / downloads 11 / downloads 0: 400");
  r = await pro("POST", "/shares", { id: "cap3days", expiration: "7-days", recipients: [], security: {}, mode: "days", days: 3 });
  assert.equal(r.status, 201);
  const exp = new Date(r.json.expiration).getTime();
  assert.ok(Math.abs(exp - (Date.now() + 3 * 86400_000)) < 60_000); ok("days 3: expiry in 3 days (the client's 7 days ignored)");
  r = await pro("POST", "/shares", { id: "nomode", expiration: "7-days", recipients: [], security: {} });
  assert.equal(r.status, 201); assert.ok(new Date(r.json.expiration).getTime() <= Date.now() + 3 * 86400_000 + 60_000); ok("no mode from a plan user = days, at most 3 days");
  r = await pro("POST", "/shares", { id: "dlcap", expiration: "1-days", recipients: [], security: {}, mode: "downloads", maxDownloads: 2 });
  assert.ok(Math.abs(new Date(r.json.expiration).getTime() - (Date.now() + 3 * 86400_000)) < 60_000); assert.equal(r.json.mode, "downloads"); assert.equal(r.json.maxDownloads, 2);
  ok("downloads mode: ends after 3 days at the latest");
  r = await admin("POST", "/shares", { id: "adminold", expiration: "30-days", recipients: [], security: {} });
  assert.equal(r.status, 201); assert.ok(new Date(r.json.expiration).getTime() > Date.now() + 29 * 86400_000); ok("an admin keeps full access (no mode, 30 days)");
  assert.equal((await pro("POST", "/shares", { id: "big1", expiration: "1-days", recipients: [], security: {}, mode: "days", days: 1, totalSize: 300 * 1024 ** 2 })).status, 413);
  assert.equal((await max("POST", "/shares", { id: "big2", expiration: "1-days", recipients: [], security: {}, mode: "days", days: 1, totalSize: 300 * 1024 ** 2 })).status, 201);
  assert.equal((await max("POST", "/shares", { id: "big3", expiration: "1-days", recipients: [], security: {}, mode: "days", days: 1, totalSize: 800 * 1024 ** 2 })).status, 413);
  ok("per link: 300 MB refused for Pro, fine for Max; 800 MB refused for Max");

  console.log("downloads");
  r = await sendWeb(pro, "once1", { mode: "downloads", maxDownloads: 1, name: "Once" }, Buffer.from("hello world"));
  assert.equal(r.status, 202, JSON.stringify(r.json));
  const fid = r.fid;
  const v1 = await visit("once1"); assert.equal(v1.status, 200);
  assert.equal((await (await getFile("once1", fid, v1.cookie)).text()), "hello world");
  let mine = (await pro("GET", "/shares")).json.find((s) => s.id === "once1");
  assert.equal(mine.downloads, 1); assert.equal(mine.downloadLog.length, 1); assert.equal(mine.downloadLog[0].device, "Android phone · Chrome");
  ok("download 1 recorded: number, time, device label");
  const row = db.prepare("SELECT * FROM ShareDownload WHERE shareId = 'once1'").get();
  assert.ok(!Object.keys(row).some((k) => /ip|agent|location/i.test(k)) && !JSON.stringify(row).includes("127.0.0.1")); ok("no IP, no user agent, no location stored");
  assert.equal((await getFile("once1", fid, v1.cookie)).status, 200);
  assert.equal(db.prepare("SELECT downloads FROM Share WHERE id = 'once1'").get().downloads, 1); ok("the same visit again: allowed, not counted twice");
  const v2 = await visit("once1"); assert.equal(v2.status, 410);
  assert.equal((await getFile("once1", fid, null)).status, 410); ok("a second download (new visitor, direct link): refused (410)");
  assert.equal((await fetch(BASE + "/api/shares/once1/metaData")).status, 410);
  mine = (await pro("GET", "/shares")).json.find((s) => s.id === "once1");
  assert.ok(mine.endedAt); ok("an ended link stays in My shares as ended (until the cleanup)");

  r = await sendWeb(pro, "days1", { mode: "days", days: 1 }, Buffer.from("abc"));
  for (const ua of ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36 Edg/130", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Version/17.0 Mobile/15E148 Safari/604.1", "curl/8.0"]) {
    const v = await visit("days1"); assert.equal((await getFile("days1", r.fid, v.cookie, ua)).status, 200);
  }
  mine = (await pro("GET", "/shares")).json.find((s) => s.id === "days1");
  assert.deepEqual(mine.downloadLog.map((d) => d.device), ["Windows PC · Edge", "iPhone · Safari", "Download tool"]); assert.deepEqual(mine.downloadLog.map((d) => d.n), [1, 2, 3]);
  ok("days mode: no download limit, every download listed (Windows PC · Edge, iPhone · Safari, Download tool)");

  console.log("space");
  await c("POST", "/settings", { "plans.proPerLink": 1_000_000, "plans.proStorage": 2_000_000 });
  r = await sendWeb(pro, "spaceA", { mode: "days", days: 1 }, crypto.randomBytes(1_200_000));
  assert.equal(r.status, 413); assert.equal(r.json.code, "link_too_large"); ok("a chunk over the plan's size per link: 413");
  await c("POST", "/settings", { "plans.proPerLink": 2_000_000 });
  r = await sendWeb(pro, "spaceA2", { mode: "days", days: 1 }, crypto.randomBytes(1_200_000)); assert.equal(r.status, 202);
  r = await sendWeb(pro, "spaceB", { mode: "days", days: 1 }, crypto.randomBytes(1_000_000));
  assert.equal(r.status, 413); assert.equal(r.json.code, "storage_full"); ok("space full (1.2 MB of 2 MB used, +1 MB): 413 storage_full");
  assert.equal((await pro("DELETE", "/shares/spaceA2")).status, 200);
  assert.equal((await pro("GET", "/uca/me")).json.usedBytes, 3);
  r = await sendWeb(pro, "spaceC", { mode: "days", days: 1 }, crypto.randomBytes(1_000_000)); assert.equal(r.status, 202);
  ok("deleted: the space comes back at once");
  db.prepare("UPDATE Share SET expiration = ? WHERE id = 'spaceC'").run(Date.now() - 1000);
  assert.equal((await pro("GET", "/uca/me")).json.usedBytes, 3); ok("expired: counts no more at once");
  const cl = await c("POST", "/cleanup", {});
  assert.ok(cl.json.deleted >= 1); assert.ok(!fs.existsSync(path.join(data, "uploads/shares/spaceC"))); assert.equal(db.prepare("SELECT COUNT(*) n FROM Share WHERE id = 'spaceC'").get().n, 0);
  db.prepare("UPDATE Share SET endedAt = ? WHERE id = 'once1'").run(Date.now() - 20 * 60_000);
  await c("POST", "/cleanup", {});
  assert.ok(!fs.existsSync(path.join(data, "uploads/shares/once1"))); ok("cleanup: expired and used-up links deleted with their files");
  await c("POST", "/settings", { "plans.proPerLink": 250 * 1024 ** 2, "plans.proStorage": 1024 ** 3 });

  console.log("app API (uca-share-v1)");
  assert.equal((await api("nope")("GET", "/me")).status, 401);
  assert.equal((await api(tok("pro@test.de", { aud: "other.ucagg.de" }))("GET", "/me")).status, 401);
  assert.equal((await api(tok("pro@test.de", { exp: Date.now() - 1 }))("GET", "/me")).status, 401);
  assert.equal((await api(tok("pro@test.de", { iat: Date.now() - 10, exp: Date.now() + 2 * 3600_000 }))("GET", "/me")).status, 401);
  assert.equal((await api(appToken({ v: 1, iss: "ai", aud: "localhost:3000", email: "pro@test.de", iat: Date.now(), exp: Date.now() + 60000 }, crypto.randomBytes(32).toString("hex")))("GET", "/me")).status, 401);
  assert.equal((await api(appToken({ v: 1, iss: "tidy", aud: "localhost:3000", email: "pro@test.de", iat: Date.now(), exp: Date.now() + 60000 }))("GET", "/me")).status, 401);
  ok("app token: bad / other audience / expired / over 1 hour / wrong key / issuer without a key: 401");
  const pa = api(tok("Pro@Test.de"));
  const me = await pa("GET", "/me");
  assert.equal(me.status, 200); assert.equal(me.json.plan, "pro"); assert.equal(me.json.email, "pro@test.de"); assert.ok(me.json.limits.chunkBytes > 0);
  const na = api(tok("fresh@test.de"));
  const nme = await na("GET", "/me"); assert.equal(nme.json.plan, "none"); assert.equal(nme.json.upgrade.url, "https://ucagg.de/account#bundles");
  assert.equal((await na("POST", "/shares", { mode: "days", days: 1, files: [{ name: "a.txt", size: 1 }] })).status, 402);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM User WHERE email = 'fresh@test.de'").get().n, 0);
  ok("me: plan, limits, used; an email without a plan gets the hint, a send 402 and no account");
  assert.equal((await pa("POST", "/shares", { mode: "weeks", files: [{ name: "a", size: 1 }] })).status, 400);
  assert.equal((await pa("POST", "/shares", { mode: "days", days: 1, files: [] })).status, 400);
  assert.equal((await pa("POST", "/shares", { mode: "days", days: 1, files: [{ name: "big.iso", size: 300 * 1024 ** 2 }] })).status, 413);
  ok("bad mode / no files / over the link size: refused");
  const payload = crypto.randomBytes(25_000);
  const cr = await pa("POST", "/shares", { name: "From the PC", mode: "downloads", downloads: 2, files: [{ name: "photo.jpg", size: payload.length }, { name: "empty.txt", size: 0 }] });
  assert.equal(cr.status, 201, JSON.stringify(cr.json)); assert.equal(cr.json.status, "uploading"); assert.equal(cr.json.files.length, 2);
  const sid = cr.json.id, f1 = cr.json.files[0].id;
  assert.equal((await pa("POST", `/shares/${sid}/complete`)).status, 409);
  let pu = await pa("PUT", `/shares/${sid}/files/${f1}?offset=0`, payload.subarray(0, 10_000), "application/octet-stream");
  assert.equal(pu.json.received, 10_000); assert.equal(pu.json.done, false);
  assert.equal((await pa("PUT", `/shares/${sid}/files/${f1}?offset=0`, payload.subarray(0, 10_000), "application/octet-stream")).status, 409);
  assert.equal((await pa("GET", `/shares/${sid}/files/${f1}`)).json.received, 10_000);
  pu = await pa("PUT", `/shares/${sid}/files/${f1}?offset=10000`, payload.subarray(10_000), "application/octet-stream");
  assert.equal(pu.json.done, true);
  ok("chunked upload: wrong offset 409, resume from received, done at the announced size");
  const done = await pa("POST", `/shares/${sid}/complete`);
  assert.equal(done.status, 200); assert.equal(done.json.status, "live"); assert.equal(done.json.downloadsLeft, 2); assert.ok(done.json.url.endsWith("/s/" + sid));
  assert.ok(db.prepare("SELECT COUNT(*) n FROM User WHERE email = 'pro@test.de'").get().n === 1);
  ok("complete: a live link with 2 downloads left");
  const ev0 = await pa("GET", "/events?after=0");
  const last = ev0.json.last;
  const waiting = pa("GET", `/events?after=${last}&wait=10`);
  await sleep(300);
  const v3 = await visit(sid);
  const got = await fetch(BASE + `/api/shares/${sid}/files/${f1}`, { headers: { cookie: v3.cookie, "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605 Version/17 Safari/605" } });
  assert.deepEqual(Buffer.from(await got.arrayBuffer()), payload);
  const evs = await waiting;
  assert.equal(evs.json.events.length, 1); assert.equal(evs.json.events[0].n, 1); assert.equal(evs.json.events[0].device, "Mac · Safari"); assert.equal(evs.json.events[0].left, 1); assert.equal(evs.json.events[0].shareName, "From the PC");
  ok("long poll: \"your file was downloaded (1st)\" arrives live, with device and downloads left");
  // the stream (SSE): replays after Last-Event-ID, then live
  const ac = new AbortController();
  const sse = await fetch(BASE + "/api/app/v1/events", { headers: { Authorization: "Bearer " + tok("pro@test.de"), Accept: "text/event-stream", "Last-Event-ID": String(last) }, signal: ac.signal });
  assert.equal(sse.headers.get("content-type").split(";")[0], "text/event-stream");
  const reader = sse.body.getReader(); let text = "";
  const v4 = await visit(sid); await fetch(BASE + `/api/shares/${sid}/files/${f1}`, { headers: { cookie: v4.cookie } }).then((x) => x.arrayBuffer());
  for (let i = 0; i < 20 && (text.match(/event: download/g) || []).length < 2; i++) { const { value } = await reader.read(); text += Buffer.from(value).toString(); }
  ac.abort();
  assert.equal((text.match(/event: download/g) || []).length, 2); assert.ok(/"n":2/.test(text) && /"ended":true/.test(text));
  ok("stream: the 1st replayed, the 2nd (the last one, ended) live");
  const one = await pa("GET", `/shares/${sid}`);
  assert.equal(one.json.downloadList.length, 2); assert.equal(one.json.status, "ended"); assert.equal(one.json.downloadsLeft, 0);
  assert.equal((await pa("GET", "/shares")).json.shares.find((s) => s.id === sid).status, "ended");
  ok("share detail: the download list; an ended link is listed as ended");
  const cr2 = await pa("POST", "/shares", { mode: "days", days: 2, files: [{ name: "x.bin", size: 5 }] });
  assert.ok((await pa("GET", "/shares")).json.shares.some((s) => s.id === cr2.json.id && s.status === "uploading"));
  assert.equal((await api(tok("max@test.de"))("DELETE", `/shares/${cr2.json.id}`)).status, 404);
  assert.equal((await pa("DELETE", `/shares/${cr2.json.id}`)).status, 200);
  ok("delete: only the owner");

  console.log("control (ucagg.de)");
  const ps = await c("GET", "/people/" + encodeURIComponent("PRO@test.de") + "/shares");
  assert.equal(ps.status, 200); assert.equal(ps.json.plan, "pro"); assert.ok(ps.json.shares.some((s) => s.id === "days1" && s.downloadList.length === 3));
  assert.equal((await c("GET", "/people/nobody%40test.de/shares")).json.account, false);
  const us = await c("GET", "/share-usage");
  assert.ok(us.json.people.some((p) => p.email === "pro@test.de" && p.liveShares >= 1 && p.downloads7 >= 3)); assert.equal(us.json.disk.level, "ok");
  assert.equal((await c("DELETE", "/people/max%40test.de/shares/days1")).status, 404);
  assert.equal((await c("DELETE", "/people/pro%40test.de/shares/days1")).status, 200);
  ok("people/:email/shares (plan, links, downloads), share-usage per person, delete only the owner's link");

  console.log("disk levels");
  const keep = await sendWeb(max, "keepdl", { mode: "days", days: 1 }, Buffer.from("still here"));
  fs.writeFileSync(DISK, "8");
  let h = await c("GET", "/health");
  let dk = h.json.checks.find((x) => x.name === "disk");
  assert.equal(dk.level, "low"); assert.equal(dk.ok, false); assert.match(dk.detail, /^8 GB free/);
  assert.equal((await pro("GET", "/uca/me")).json.limits.perLinkBytes, 125 * 1024 ** 2);
  assert.equal((await j(await fetch(BASE + "/api/uca/status"))).json.disk, "low");
  ok("under 10 GB: low, new links get half the limits (Pro 125 MB per link)");
  fs.writeFileSync(DISK, "4");
  r = await pro("POST", "/shares", { id: "fullx", expiration: "1-days", recipients: [], security: {}, mode: "days", days: 1 });
  assert.equal(r.status, 503); assert.equal(r.json.message, "Uploads are paused for a moment. We'll be back online very soon - support is already on it. Sorry for the trouble.");
  assert.equal((await pa("POST", "/shares", { mode: "days", days: 1, files: [{ name: "a", size: 1 }] })).json.code, "uploads_paused");
  const sNow = (await j(await fetch(BASE + "/api/uca/status"))).json; assert.equal(sNow.disk, "full"); assert.ok(sNow.message);
  const dl = await admin("GET", "/uca/admin/disk"); assert.equal(dl.json.level, "full"); assert.equal(dl.json.freeGB, 4);
  assert.equal((await pro("GET", "/uca/admin/disk")).status, 403);
  const vd = await visit("keepdl"); assert.equal(await (await getFile("keepdl", keep.fid, vd.cookie)).text(), "still here");
  h = await c("GET", "/health"); dk = h.json.checks.find((x) => x.name === "disk"); assert.equal(dk.level, "full");
  ok("under 5 GB: full, uploads paused with the message (web and app), downloads keep working, the admin sees it");
  fs.writeFileSync(DISK, "41");
  dk = (await c("GET", "/health")).json.checks.find((x) => x.name === "disk");
  assert.equal(dk.level, "ok"); assert.equal(dk.ok, true); assert.equal(dk.detail, "41 GB free");
  ok("41 GB: ok (\"41 GB free\")");

  console.log(`\n${passed} passed`);
} catch (e) {
  console.error("FAILED:", e);
  try { console.error(fs.readFileSync(path.join(data, "backend.log"), "utf8").slice(-2000)); } catch { /* none */ }
  process.exitCode = 1;
} finally {
  try { db.close(); } catch { /* closed */ }
  stop();
  setTimeout(() => { try { fs.rmSync(data, { recursive: true, force: true }); } catch { /* windows keeps the db open a moment */ } process.exit(); }, 500);
}
