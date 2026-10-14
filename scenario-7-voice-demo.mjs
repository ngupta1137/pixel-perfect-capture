// Verity demo automation, Scenario 7: Audit log (Casey, /audit) and the evaluation harness (Nitin, /evals).
// Run: node scenario-7-voice-demo.mjs
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
const VIDEO_DIR = process.env.VIDEO_DIR || path.resolve("scenario7-video");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[scenario-7]", ...a);
const deviations = [];

// ---------- URL: 8081, then 8080 ----------
async function pickBase() {
  const list = process.env.VERITY_URL ? [process.env.VERITY_URL] : ["http://localhost:8081", "http://localhost:8080"];
  for (const base of list) {
    try {
      if ((await fetch(base + "/audit")).ok) return base;
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

// Session injection for Casey first; the script switches to Nitin for the evaluation cues, before any page script runs.
await context.addInitScript(() => {
  if (sessionStorage.getItem("verity_authenticated") === "true") return; // keep the persona the script switched to
  sessionStorage.setItem("verity_authenticated", "true");
  sessionStorage.setItem("verity_active_persona", "casey");
  sessionStorage.setItem("verity_session_token", "vty_sess_demo_casey");
  try {
    localStorage.setItem("verity_authenticated", "true");
    localStorage.setItem("verity_active_persona", "casey");
    localStorage.setItem("verity_session_token", "vty_sess_demo_casey");
    localStorage.setItem("vty_session_token", "vty_sess_demo_casey");
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

// Audio-sync mode (used by make-scenario-7-video.mjs): pre-generated narration drives the pacing.
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
    // make-scenario-7-video.mjs reads it back from the recording to align audio exactly, then paints it out.
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
await page.goto(BASE + "/audit", { waitUntil: "networkidle" });
const h1 = page.getByRole("heading", { name: "Audit", exact: true }).first();
await h1.waitFor({ timeout: 30000 });
await page.mouse.click(640, 4).catch(() => {});
await sleep(700);

// [Announcement] header and filters
const filters = page.getByRole("combobox").first().locator("xpath=ancestor::div[1]");
await Promise.all([
  speak("Now we will see the audit log and the automated evaluation harness."),
  (async () => {
    const a = await centerOf(h1);
    await glideTo(a.x, a.y);
    await spot(h1, { zoom: 1.04, pad: 8 });
    await sleep(1000);
    await unspot(h1);
    const f = (await filters.count()) ? filters : page.getByRole("combobox").first();
    const b = await centerOf(f);
    await glideTo(b.x, b.y);
    await spot(f, { zoom: 1.02, pad: 4 });
    await sleep(1100);
    await unspot(f);
  })(),
]);
mark("cue 0 done");

// [Cue 1] the event table
const table = page.locator("table").first();
await Promise.all([
  speak("Casey, our compliance auditor, opens the read-only audit log of who did what, and when."),
  (async () => {
    const a = await centerOf(table);
    await glideTo(a.x, a.y);
    await spot(table, { zoom: 1.02, pad: 4 });
    await sleep(2400);
    await unspot(table);
  })(),
]);
mark("cue 1 done");

// [Cue 2] Rita's approval and Dana's denied self-approval
const ritaRow = page.locator("tr").filter({ hasText: /Rita/ }).filter({ hasText: /approve/i }).first();
const danaRow = page.locator("tr").filter({ hasText: /Dana/ }).filter({ hasText: /Denied/ }).first();
const hasRita = await visible(ritaRow, 1500);
const hasDana = await visible(danaRow, 1500);
if (!hasRita) deviations.push("Cue 2: no Rita approval row on the audit page.");
if (!hasDana) deviations.push("Cue 2: no Dana denied row on the audit page.");
await Promise.all([
  speak("It shows Rita's legal approval, and Dana's denied attempt to approve her own unit under maker-checker."),
  (async () => {
    if (hasRita) await hover(ritaRow, { zoom: 1.03, pad: 3 }, 1700);
    if (hasDana) await hover(danaRow, { zoom: 1.03, pad: 3 }, 1900);
  })(),
]);
mark("cue 2 done");

// [Cue 3] as-of lookup
const asOfHead = page.getByRole("heading", { name: "As-of lookup" }).first();
const asOfBox = page.getByText(/was live on/).first().locator("xpath=ancestor::div[1]");
await Promise.all([
  speak("The as-of lookup shows which version of a unit was live on a given date."),
  (async () => {
    const a = await centerOf(asOfHead);
    await glideTo(a.x, a.y);
    await spot(asOfHead, { zoom: 1.04, pad: 6 });
    await sleep(1000);
    await unspot(asOfHead);
    if (await visible(asOfBox, 1500)) await hover(asOfBox, { zoom: 1.03, pad: 4 }, 2000);
  })(),
]);
mark("cue 3 done");

// Switch to Nitin and open the evaluations page
await page.evaluate(() => {
  sessionStorage.setItem("verity_authenticated", "true");
  sessionStorage.setItem("verity_active_persona", "nitin");
  sessionStorage.setItem("verity_session_token", "vty_sess_demo_nitin");
  try {
    localStorage.setItem("verity_active_persona", "nitin");
    localStorage.setItem("verity_session_token", "vty_sess_demo_nitin");
    localStorage.setItem("vty_session_token", "vty_sess_demo_nitin");
  } catch {}
  const s = document.getElementById("vty-sub"); if (s) s.classList.remove("on");
});
await sleep(400);
{
  const t1 = Date.now() - T0;
  await page.goto(BASE + "/evals", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: /Quality & evaluations/ }).first().waitFor({ timeout: 30000 });
  const t2 = Date.now() - T0;
  if (t2 - t1 > 4000) cuts.push({ startMs: t1 + 1500, endMs: t2 - 300 });
}
mx = 640; my = 360;
await sleep(900);

// [Cue 4] run the golden suite
const runBtn = page.getByRole("button", { name: /Run Golden evaluation/ }).first();
await Promise.all([
  speak("Nitin, the AI product owner, runs the golden evaluation suite."),
  (async () => {
    await clickWithSpot(runBtn, { zoom: 1.08 }, 800);
    await page.getByText(/cases correct/).first().waitFor({ timeout: 60000 });
    await sleep(600);
  })(),
]);
mark("cue 4 done");

// [Cue 5] results
const score = page.getByText(/cases correct/).first();
const scoreBox = score.locator("xpath=ancestor::div[2]");
const gates = page.getByText(/^Release gates: /).first();
const leaks = page.getByText("permission leaks", { exact: true }).first().locator("xpath=ancestor::div[1]");
const scoreText = ((await score.innerText().catch(() => "")) || "").trim();
log("score reads:", scoreText);
if (!/26\/27/.test(scoreText)) deviations.push(`Cue 5: the golden score reads "${scoreText}", not 26/27; narration may not match.`);
await Promise.all([
  speak("Twenty-six of twenty-seven golden cases pass, with zero permission leaks. Release gates pass, with one open failure."),
  (async () => {
    const a = await centerOf(scoreBox);
    await glideTo(a.x, a.y);
    await spot(scoreBox, { zoom: 1.03, pad: 4 });
    await sleep(2200);
    await unspot(scoreBox);
    if (await visible(leaks, 1000)) await hover(leaks, { zoom: 1.04, pad: 4 }, 1600);
    if (await visible(gates, 1000)) await hover(gates, { zoom: 1.08, pad: 4 }, 1800);
  })(),
]);
mark("cue 5 done");

// [Cue 6] production readiness
const blocked = page.getByText(/Production Readiness: BLOCKED/).first();
const hasBlocked = await visible(blocked, 1500);
if (!hasBlocked) deviations.push("Cue 6: no 'Production Readiness: BLOCKED' banner; narration may not match.");
await page.evaluate(() => window.scrollTo(0, 0));
await Promise.all([
  speak("Production readiness stays blocked until the blind set is evaluated."),
  (async () => {
    if (hasBlocked) {
      const box = blocked.locator("xpath=ancestor::div[2]");
      const a = await centerOf(box);
      await glideTo(a.x, a.y);
      await spot(box, { zoom: 1.03, pad: 4 });
      await sleep(1800);
      await unspot(box);
    }
  })(),
]);
mark("cue 6 done");

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
log("SCENARIO 7 FINISHED");
