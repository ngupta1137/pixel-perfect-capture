// Verity demo automation, Scenario 4: Role-scoped access and persona boundaries (Marcus, /).
// Run: node scenario-4-voice-demo.mjs
// Env (optional): VERITY_URL, CHROME_PATH, VIDEO_DIR, SPEECH_WPS (fallback words per second, default 2.6)
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// On a headless Linux box there is no screen: relaunch this same script inside a virtual display.
if (process.platform === "linux" && !process.env.DISPLAY && !process.env.VTY_XVFB) {
  const r = spawnSync(
    "xvfb-run",
    ["-a", "-s", "-screen 0 1440x900x24", process.execPath, fileURLToPath(import.meta.url)],
    { stdio: "inherit", env: { ...process.env, VTY_XVFB: "1" } }
  );
  process.exit(r.status ?? 1);
}

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  ({ chromium } = await import("/opt/node-tools/node_modules/playwright/index.mjs"));
}

const WPS = Number(process.env.SPEECH_WPS || 2.6);
const VIDEO_DIR = process.env.VIDEO_DIR || path.resolve("scenario4-video");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[scenario-4]", ...a);
const deviations = [];

// ---------- URL: 8081, then 8080 ----------
async function pickBase() {
  const list = process.env.VERITY_URL ? [process.env.VERITY_URL] : ["http://localhost:8081", "http://localhost:8080"];
  for (const base of list) {
    try {
      if ((await fetch(base + "/")).ok) return base;
    } catch {}
  }
  throw new Error("Verity UI not reachable on 8081 or 8080. Start it with: npx vite dev --port 8081 --host 127.0.0.1");
}
const BASE = await pickBase();

// ---------- browser ----------
const winChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const linuxChromium = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/opt/pw-browsers/chromium/chrome-linux/chrome"].find((p) =>
  fs.existsSync(p)
);
const executablePath = process.env.CHROME_PATH || (fs.existsSync(winChrome) ? winChrome : linuxChromium);

fs.mkdirSync(VIDEO_DIR, { recursive: true });
const browser = await chromium.launch({
  headless: false,
  ...(executablePath ? { executablePath } : {}),
  args: ["--start-maximized", "--autoplay-policy=no-user-gesture-required", "--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
});

// Session injection for Marcus (Insurance advocate), before any page script runs.
await context.addInitScript(() => {
  sessionStorage.setItem("verity_authenticated", "true");
  sessionStorage.setItem("verity_active_persona", "marcus");
  sessionStorage.setItem("verity_session_token", "vty_sess_demo_marcus");
  try {
    localStorage.setItem("verity_authenticated", "true");
    localStorage.setItem("verity_active_persona", "marcus");
    localStorage.setItem("verity_session_token", "vty_sess_demo_marcus");
  } catch {}
});

// Overlay: green cursor, spotlight ring, subtitle pill, and speech helper.
await context.addInitScript(() => {
  const build = () => {
    if (document.getElementById("vty-layer") || !document.body) return;
    const st = document.createElement("style");
    st.textContent = `
      #vty-layer{position:fixed;inset:0;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,sans-serif}
      #vty-cursor{position:fixed;left:0;top:0;width:30px;height:30px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))}
      #vty-ring{position:fixed;display:none;border:3px solid #22c55e;border-radius:12px;
        box-shadow:0 0 0 9999px rgba(8,20,12,.25),0 0 22px 6px rgba(34,197,94,.8);animation:vtyp 1s ease-in-out infinite}
      @keyframes vtyp{0%,100%{box-shadow:0 0 0 9999px rgba(8,20,12,.25),0 0 14px 3px rgba(34,197,94,.6)}50%{box-shadow:0 0 0 9999px rgba(8,20,12,.25),0 0 30px 10px rgba(34,197,94,1)}}
      #vty-sub{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:920px;padding:12px 24px;border-radius:999px;
        background:rgba(12,24,17,.93);color:#fff;font-size:18px;line-height:1.35;text-align:center;border:1px solid #22c55e;
        box-shadow:0 6px 22px rgba(0,0,0,.4);opacity:0;transition:opacity .25s}
      #vty-sub.on{opacity:1}
      #vty-click{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid #22c55e;opacity:0}
      #vty-click.go{animation:vtyc .5s ease-out}
      @keyframes vtyc{0%{opacity:1;transform:scale(.3)}100%{opacity:0;transform:scale(2.4)}}`;
    document.head.appendChild(st);
    const l = document.createElement("div");
    l.id = "vty-layer";
    l.innerHTML = `<div id="vty-ring"></div><div id="vty-click"></div>
      <svg id="vty-cursor" viewBox="0 0 24 24"><path d="M3 2l7.5 19 2.7-7.8L21 10.5z" fill="#22c55e" stroke="#064e22" stroke-width="1.6" stroke-linejoin="round"/></svg>
      <div id="vty-sub"></div>`;
    document.body.appendChild(l);
    const cur = l.querySelector("#vty-cursor");
    const clk = l.querySelector("#vty-click");
    cur.style.transform = "translate(640px,360px)";
    window.addEventListener("mousemove", (e) => {
      cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
      clk.style.left = e.clientX + "px";
      clk.style.top = e.clientY + "px";
    }, true);
    window.addEventListener("mousedown", () => {
      clk.classList.remove("go"); void clk.offsetWidth; clk.classList.add("go");
    }, true);
  };
  const boot = () => {
    build();
    new MutationObserver(build).observe(document.body, { childList: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  // Speech: resolves on utterance.onend (or onerror / safety timeout when the machine has no voices).
  window.__vtySpeak = (text, fallbackMs) =>
    new Promise((resolve) => {
      const sub = document.getElementById("vty-sub");
      if (sub) { sub.textContent = text; sub.classList.add("on"); }
      let done = false;
      const finish = (why) => { if (!done) { done = true; clearTimeout(t); resolve(why); } };
      const t = setTimeout(() => finish("timeout"), fallbackMs + 4000);
      try {
        const synth = window.speechSynthesis;
        if (!synth) return setTimeout(() => finish("no-synth"), fallbackMs);
        synth.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.98; u.pitch = 1; u.volume = 1; u.lang = "en-US";
        const v = synth.getVoices().find((x) => /en[-_]US/i.test(x.lang) && /(natural|google|samantha|zira|aria)/i.test(x.name));
        if (v) u.voice = v;
        u.onend = () => finish("onend");
        u.onerror = () => setTimeout(() => finish("onerror"), fallbackMs);
        synth.speak(u);
        // Some machines (no voices installed) never fire onend: fall back to a words-per-second estimate.
        setTimeout(() => { if (!synth.speaking && !done) finish("silent-fallback"); }, fallbackMs + 1500);
      } catch { setTimeout(() => finish("exception"), fallbackMs); }
    });
});

// Audio-sync mode (used by make-scenario-4-video.mjs): pre-generated narration drives the pacing.
const MANIFEST = process.env.VTY_AUDIO_MANIFEST ? JSON.parse(fs.readFileSync(process.env.VTY_AUDIO_MANIFEST, "utf8")) : null;
const LAG = Number(process.env.VIDEO_LAG_MS || 0);
const EXACT = process.env.EXACT_TRANSCRIPT === "1"; // force the original transcript for cues 3 and 4
const timeline = [];
const cuts = [];
const T0 = Date.now();
const page = await context.newPage();
let mx = 640, my = 360;
const mark = (n) => log(`t=${((Date.now() - T0) / 1000).toFixed(1)}s ${n}`);

// ---------- helpers ----------
const speechResults = [];
let cueSeq = 0;
async function speak(text) {
  if (MANIFEST) {
    const m = MANIFEST[text];
    if (!m) throw new Error("No audio generated for line: " + text);
    // Each cue also paints a small grey marker block in the bottom-left corner (grey level = 30 x cue number).
    // make-scenario-4-video.mjs reads it back from the recording to align audio exactly, then paints it out.
    cueSeq += 1;
    await page.evaluate(([t, g]) => {
      const s = document.getElementById("vty-sub"); if (s) { s.textContent = t; s.classList.add("on"); }
      let mk = document.getElementById("vty-mk");
      if (!mk) { mk = document.createElement("div"); mk.id = "vty-mk"; mk.style.cssText = "position:fixed;left:0;bottom:0;width:8px;height:8px;z-index:2147483647;pointer-events:none"; (document.getElementById("vty-layer") || document.body).appendChild(mk); }
      mk.style.background = `rgb(${g},${g},${g})`;
    }, [text, 30 * cueSeq]);
    timeline.push({ id: m.id, file: m.file, startMs: Date.now() - T0 + LAG, durationMs: m.durationMs });
    await sleep(m.durationMs + 350);
    return;
  }
  const est = Math.round((text.split(/\s+/).length / WPS) * 1000);
  const why = await page.evaluate(([t, ms]) => window.__vtySpeak(t, ms), [text, est]);
  speechResults.push(why);
  await sleep(250);
}
async function visible(loc, ms = 1500) {
  try { await loc.first().waitFor({ state: "visible", timeout: ms }); return true; } catch { return false; }
}
async function centerOf(loc) {
  const el = loc.first();
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(250);
  let b = await el.boundingBox();
  if (b && b.height < 200 && (b.y + b.height > 600 || b.y < 90)) {
    await el.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" })).catch(() => {});
    await sleep(350);
    b = await el.boundingBox();
  }
  if (!b) throw new Error("no bounding box");
  return { x: b.x + b.width / 2, y: b.y + Math.min(b.height / 2, 60), b };
}
async function glideTo(x, y, steps = 38) {
  const sx = mx, sy = my;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
    await sleep(16);
  }
  mx = x; my = y;
}
async function spot(loc, { zoom = 1.05, pad = 6 } = {}) {
  const { b } = await centerOf(loc);
  if (b.width > 300) zoom = Math.min(zoom, 1.04); // large panels get only a subtle lift so text never blurs or crops
  await page.evaluate(([r, pad]) => {
    const ring = document.getElementById("vty-ring");
    Object.assign(ring.style, { display: "block", left: r.x - pad + "px", top: r.y - pad + "px", width: r.width + pad * 2 + "px", height: r.height + pad * 2 + "px" });
  }, [b, pad]);
  await loc.first().evaluate((el, z) => {
    el.__vtyPrev = [el.style.transform, el.style.transition, el.style.position];
    el.style.transition = "transform .3s ease";
    el.style.transformOrigin = "center";
    el.style.transform = `scale(${z})`;
  }, zoom).catch(() => {});
}
async function unspot(loc) {
  await page.evaluate(() => { document.getElementById("vty-ring").style.display = "none"; });
  if (loc) await loc.first().evaluate((el) => {
    if (el.__vtyPrev) { el.style.transform = el.__vtyPrev[0]; el.style.transition = el.__vtyPrev[1]; }
  }).catch(() => {});
}
async function hover(loc, opts, hold = 1400) {
  const { x, y } = await centerOf(loc);
  await glideTo(x, y);
  await spot(loc, opts);
  await sleep(hold);
  await unspot(loc);
}
async function clickWithSpot(loc, opts, hold = 700) {
  const { x, y } = await centerOf(loc);
  await glideTo(x, y);
  await spot(loc, opts);
  await sleep(hold);
  const tClick = Date.now() - T0;
  await loc.first().click();
  await unspot(loc);
  const tBack = Date.now() - T0;
  if (tBack - tClick > 4000) cuts.push({ startMs: tClick + 1500, endMs: tBack - 300 }); // idle wait the video builder trims
}

// ---------- run ----------
log("base url:", BASE);
await page.goto(BASE + "/", { waitUntil: "networkidle" });
const ask = page.locator("#ask");
await ask.waitFor({ timeout: 30000 });
await page.mouse.click(640, 4).catch(() => {});
await sleep(600);

async function typeQuery(q) {
  const a = await centerOf(ask);
  await glideTo(a.x, a.y);
  await ask.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await sleep(250);
  await page.keyboard.type(q, { delay: 70 });
  await sleep(600);
}
const submit = page.locator('button[type="submit"]').first();

const pill = (top) => page.evaluate((t) => { const s = document.getElementById("vty-sub"); if (s) { s.style.bottom = t ? "auto" : "24px"; s.style.top = t ? "14px" : "auto"; } }, top);

// [Announcement] persona badge
const badge = page.getByText("Insurance advocate", { exact: true }).first().locator("xpath=ancestor::button[1]");
const badgeLoc = (await badge.count()) ? badge : page.getByText("Insurance advocate", { exact: true }).first();
await Promise.all([
  speak("Now we will see role-scoped access and persona boundaries."),
  (async () => {
    const a = await centerOf(badgeLoc);
    await glideTo(a.x, a.y);
    await spot(badgeLoc, { zoom: 1.08, pad: 4 });
    await sleep(2200);
    await unspot(badgeLoc);
  })(),
]);
mark("cue 0 done");

// [Cue 1] restricted pharmacy tiles on Marcus's home screen
const rxTile = page.getByText(/^restricted$/i).first().locator("xpath=ancestor::*[self::a or self::button or @role='button'][1]");
const rxLoc = (await rxTile.count()) ? rxTile : page.getByText(/^restricted$/i).first();
if (!(await rxTile.count())) deviations.push("Cue 1: could not find the clickable Restricted tile; spotlighted the label only.");
await pill(true); // the restricted tile sits where the bottom pill would be
await Promise.all([
  speak("Marcus works as an insurance advocate, and pharmacy topics are flagged as restricted for him."),
  (async () => {
    const a = await centerOf(rxLoc);
    await glideTo(a.x, a.y);
    await spot(rxLoc, { zoom: 1.04, pad: 4 });
    await sleep(2600);
    await unspot(rxLoc);
  })(),
]);
await pill(false);
mark("cue 1 done");

// [Cue 2] in-scope question
await Promise.all([
  speak("He asks how to replace an ID card."),
  (async () => {
    await typeQuery("replace id card");
    await clickWithSpot(submit, { zoom: 1.08 }, 600);
  })(),
]);
const approved = page.getByText("Approved answer", { exact: true }).first();
{
  const t1 = Date.now() - T0;
  await approved.waitFor({ timeout: 60000 });
  const t2 = Date.now() - T0;
  if (t2 - t1 > 4000) cuts.push({ startMs: t1 + 1500, endMs: t2 - 300 });
}
await sleep(500);
const banner = approved.locator("xpath=ancestor::div[3]");
const srcChip = page.getByText(/^Source: U-IN-001$/).first();
await Promise.all([
  speak("He gets an approved answer, cited to unit U-IN-001."),
  (async () => {
    const a = await centerOf(banner);
    await glideTo(a.x, a.y);
    await spot(banner, { zoom: 1.03, pad: 4 });
    await sleep(1900);
    await unspot(banner);
    if (await visible(srcChip, 800)) await hover(srcChip, { zoom: 1.15, pad: 4 }, 1500);
    else deviations.push("Cue 2: no 'Source: U-IN-001' chip found.");
  })(),
]);
mark("cue 2 done");

// [Cue 3] out-of-scope question
await Promise.all([
  speak("Now he asks for the pharmacy pricing disclaimer, which belongs to another team."),
  (async () => {
    const back = page.getByRole("button", { name: /Back to search/ }).first();
    await clickWithSpot(back, { zoom: 1.08 }, 500);
    await ask.waitFor({ timeout: 15000 });
    await typeQuery("Rx pricing disclaimer");
    await clickWithSpot(submit, { zoom: 1.08 }, 600);
  })(),
]);
const outside = page.getByText("Outside your access", { exact: true }).first();
{
  const t1 = Date.now() - T0;
  await outside.waitFor({ timeout: 60000 });
  const t2 = Date.now() - T0;
  if (t2 - t1 > 4000) cuts.push({ startMs: t1 + 1500, endMs: t2 - 300 });
}
await page.getByText(/Transfer or ask that team/).first().waitFor({ timeout: 15000 }).catch(() => {});
await sleep(500);
mark("cue 3 done");

// [Cue 4] the refusal card: no answer text, only owner and transfer step
const card = outside.locator("xpath=ancestor::div[3]");
const owner = page.getByText(/Owned by Pharmacy Ops/).first();
const nextStep = page.getByText(/^Next step:/).first();
await Promise.all([
  speak("Verity shows Outside your access. There is no answer text, only the owning team, Pharmacy Ops, and a warm transfer step."),
  (async () => {
    const a = await centerOf(card);
    await glideTo(a.x, a.y);
    await spot(card, { zoom: 1.03, pad: 4 });
    await sleep(1900);
    await unspot(card);
    if (await visible(owner, 800)) await hover(owner, { zoom: 1.1, pad: 4 }, 1300);
    if (await visible(nextStep, 800)) await hover(nextStep, { zoom: 1.03, pad: 4 }, 1800);
  })(),
]);
mark("cue 4 done");

await sleep(2000);
await page.evaluate(() => { document.getElementById("vty-sub")?.classList.remove("on"); });
await sleep(600);
const endMs = Date.now() - T0;
const video = page.video();
await context.close();
await browser.close();
const vpath = video ? await video.path() : "(none)";
if (process.env.VTY_TIMELINE) fs.writeFileSync(process.env.VTY_TIMELINE, JSON.stringify({ timeline, cuts, endMs, videoPath: vpath }, null, 2));
log("speech completion modes:", speechResults.join(", "));
log("deviations from the requested script:", deviations.length ? "\n  - " + deviations.join("\n  - ") : "none");
log("video:", vpath);
log("SCENARIO 4 FINISHED");
