// Verity demo automation, Scenario 8: Platform architecture (Nitin, /platform).
// Run: node scenario-8-voice-demo.mjs
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
const VIDEO_DIR = process.env.VIDEO_DIR || path.resolve("scenario8-video");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[scenario-8]", ...a);
const deviations = [];

// ---------- URL: 8081, then 8080 ----------
async function pickBase() {
  const list = process.env.VERITY_URL ? [process.env.VERITY_URL] : ["http://localhost:8081", "http://localhost:8080"];
  for (const base of list) {
    try {
      if ((await fetch(base + "/platform")).ok) return base;
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

// Session injection for Nitin (AI product owner), before any page script runs.
await context.addInitScript(() => {
  if (sessionStorage.getItem("verity_authenticated") === "true") return; // keep the persona the script switched to
  sessionStorage.setItem("verity_authenticated", "true");
  sessionStorage.setItem("verity_active_persona", "nitin");
  sessionStorage.setItem("verity_session_token", "vty_sess_demo_nitin");
  try {
    localStorage.setItem("verity_authenticated", "true");
    localStorage.setItem("verity_active_persona", "nitin");
    localStorage.setItem("verity_session_token", "vty_sess_demo_nitin");
    localStorage.setItem("vty_session_token", "vty_sess_demo_nitin");
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
      #vty-sub.on{opacity:0}
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

// Audio-sync mode (used by make-scenario-8-video.mjs): pre-generated narration drives the pacing.
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
    // make-scenario-8-video.mjs reads it back from the recording to align audio exactly, then paints it out.
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
await page.goto(BASE + "/platform", { waitUntil: "networkidle" });
const h1 = page.getByRole("heading", { name: /Single Governed Kernel/ }).first();
await h1.waitFor({ timeout: 30000 });
await page.mouse.click(640, 4).catch(() => {});
await sleep(700);

// [Announcement] header
await Promise.all([
  speak("Now the platform view: how this scales beyond the prototype."),
  (async () => {
    const a = await centerOf(h1);
    await glideTo(a.x, a.y);
    await spot(h1, { zoom: 1.03, pad: 8 });
    await sleep(2400);
    await unspot(h1);
  })(),
]);
mark("cue 0 done");

// [Cue 1] banner cards that are actually on screen
const gateCard = page.getByText("Deterministic Policy Gate", { exact: true }).first().locator("xpath=ancestor::div[1]");
const protoCard = page.getByText("Supported Protocols", { exact: true }).first().locator("xpath=ancestor::div[1]");
await Promise.all([
  speak("The banner says the deterministic policy gate covers steps seven to nine, and the design supports REST, MCP and SSE."),
  (async () => {
    await hover(gateCard, { zoom: 1.04, pad: 4 }, 2200);
    await hover(protoCard, { zoom: 1.04, pad: 4 }, 2200);
  })(),
]);
mark("cue 1 done");

// [Cue 2] the pipeline tab (open by default)
const pipeTab = page.getByRole("tab", { name: /13-Step Serving Pipeline/ }).first();
const legend = page.getByText("Deterministic Code [D]", { exact: true }).first().locator("xpath=ancestor::div[1]");
const phase1 = page.getByText("Phase 1: Ingress", { exact: true }).first();
await Promise.all([
  speak("The thirteen-step pipeline is grouped into phases, each step marked deterministic or model-assisted."),
  (async () => {
    await clickWithSpot(pipeTab, { zoom: 1.08 }, 500);
    const grid = phase1.locator("xpath=ancestor::div[3]");
    if (await visible(phase1, 1500)) {
      const a = await centerOf(grid);
      await glideTo(a.x, a.y);
      await spot(grid, { zoom: 1.02, pad: 4 });
      await sleep(1800);
      await unspot(grid);
    } else deviations.push("Cue 2: Phase 1 header not found.");
    if (await visible(legend, 1500)) await hover(legend, { zoom: 1.06, pad: 4 }, 2200);
    else deviations.push("Cue 2: legend not found.");
  })(),
]);
mark("cue 2 done");

// [Cue 3] Change Propagation & Maturity tab: the four channels
const meshTab = page.getByRole("tab", { name: /Change Propagation & Maturity/ }).first();
await page.evaluate(() => window.scrollTo(0, 0));
await Promise.all([
  speak("On the Change Propagation tab, the mesh shows how a change would reach four subscriber channels: Agent Assist, Member Chat, IVR Voice Bot and Advocate Portal."),
  (async () => {
    await clickWithSpot(meshTab, { zoom: 1.08 }, 600);
    await page.getByText(/Change Propagation getByText("Real-time Change Propagation & Invalidation Mesh") Invalidation Mesh/).first().waitFor({ timeout: 10000 });
    await sleep(500);
    for (const ch of ["Agent Assist", "Member Chat", "IVR Voice Bot", "Advocate Portal"]) {
      const card = page.getByText(ch, { exact: true }).first().locator("xpath=ancestor::div[2]");
      if (await visible(card, 1000)) await hover(card, { zoom: 1.04, pad: 3 }, 900);
      else deviations.push(`Cue 3: channel card ${ch} not found.`);
    }
  })(),
]);
mark("cue 3 done");

// [Cue 4] the log row
const row = page.locator("tr").filter({ hasText: /U-PH-003/ }).first();
const rowText = ((await row.innerText().catch(() => "")) || "").replace(/\s+/g, " ");
log("log row reads:", rowText);
await Promise.all([
  speak("The log illustrates the flow: U-PH-003 approved by Rita, with all four proposed channels shown as notified and the cache invalidated. None of these channels is connected yet."),
  (async () => {
    if (await visible(row, 1500)) await hover(row, { zoom: 1.02, pad: 3 }, 4200);
    else deviations.push("Cue 4: no U-PH-003 row in the invalidation log.");
  })(),
]);
if (!/Rita/.test(rowText) || !/Invalidated/.test(rowText)) deviations.push(`Cue 4: the log row reads "${rowText}"; narration may not match.`);
mark("cue 4 done");

// [Cue 5] the certified list
const certHead = page.getByText(/^(Built & Certified in Production|Working in this prototype)$/).first();
const certList = certHead.locator("xpath=ancestor::div[2]");
await Promise.all([
  speak("Below, the capability list marks the engine, access control, drift detection and golden evals as working in this prototype. The REST API and MCP are listed as the next build."),
  (async () => {
    const a = await centerOf(certHead);
    await glideTo(a.x, a.y);
    await spot(certList, { zoom: 1.02, pad: 4 });
    await sleep(4200);
    await unspot(certList);
  })(),
]);
mark("cue 5 done");

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
log("SCENARIO 8 FINISHED");
