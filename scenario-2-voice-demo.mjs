// Verity demo automation, Scenario 2: Legal Review and Impact Analysis (Rita, /legal).
// Run: node scenario-2-voice-demo.mjs
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
const VIDEO_DIR = process.env.VIDEO_DIR || path.resolve("scenario2-video");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[scenario-2]", ...a);
const deviations = [];

// ---------- URL: 8081, then 8080 ----------
async function pickBase() {
  const list = process.env.VERITY_URL ? [process.env.VERITY_URL] : ["http://localhost:8081", "http://localhost:8080"];
  for (const base of list) {
    try {
      if ((await fetch(base + "/legal")).ok) return base;
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

// Session injection for Rita (Legal / Compliance approver), before any page script runs.
await context.addInitScript(() => {
  sessionStorage.setItem("verity_authenticated", "true");
  sessionStorage.setItem("verity_active_persona", "rita");
  sessionStorage.setItem("verity_session_token", "vty_sess_demo_rita");
  try {
    localStorage.setItem("verity_authenticated", "true");
    localStorage.setItem("verity_active_persona", "rita");
    localStorage.setItem("verity_session_token", "vty_sess_demo_rita");
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

// Audio-sync mode (used by make-scenario-2-video.mjs): pre-generated narration drives the pacing.
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
    // make-scenario-2-video.mjs reads it back from the recording to align audio exactly, then paints it out.
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
await page.goto(BASE + "/legal", { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "Approval workspace" }).waitFor({ timeout: 30000 });
// The queue is filled by a client-side sync after load; wait for the pricing draft (or an empty queue) before narrating.
const card = page.locator("article").filter({ hasText: /pricing disclaimer/i }).first();
if (!(await visible(card, 20000))) {
  throw new Error('No pending pricing disclaimer draft in "To decide". The draft is consumed by approving it: stop the dev server, delete the .data folder, start it again, then re-run.');
}
await page.mouse.click(640, 4).catch(() => {});
await sleep(600);

// [Announcement] header + "To decide" tab
const h1 = page.getByRole("heading", { name: "Approval workspace" });
const decideTab = page.getByRole("tab", { name: /To decide/ });
await Promise.all([
  speak("Now we will see the Legal Review and Impact Analysis scenario."),
  (async () => {
    const a = await centerOf(h1);
    await glideTo(a.x, a.y);
    await spot(h1, { zoom: 1.04, pad: 8 });
    await sleep(1000);
    await unspot(h1);
    const b = await centerOf(decideTab);
    await glideTo(b.x, b.y);
    await spot(decideTab, { zoom: 1.08, pad: 4 });
    await sleep(900);
    await unspot(decideTab);
  })(),
]);
mark("cue 0 done");

// [Cue 1] Pending draft card, with the Needs Legal badge and the Verbatim chip
const needsLegal = card.getByText("Needs Legal", { exact: true }).first();
const verbatim = card.getByText("Verbatim", { exact: true }).first();
await Promise.all([
  speak("Rita, our legal approver, opens the Legal queue and finds the pending pricing disclaimer draft."),
  (async () => {
    const t = card.getByRole("heading").first();
    const c = await centerOf(t);
    await glideTo(c.x, c.y);
    await spot(card, { zoom: 1.05, pad: 4 });
    await sleep(1300);
    await unspot(card);
    if (await visible(needsLegal, 800)) await hover(needsLegal, { zoom: 1.2, pad: 4 }, 900);
    else deviations.push('Cue 1: no "Needs Legal" badge on the card.');
    if (await visible(verbatim, 800)) await hover(verbatim, { zoom: 1.2, pad: 4 }, 900);
    else deviations.push('Cue 1: no "Verbatim" chip on the card.');
  })(),
]);
mark("cue 1 done");

// [Cue 2] Side-by-side comparison (Current approved | Proposed, with the word diff)
const diffGrid = card.locator("div.grid").first();
await Promise.all([
  speak("The side-by-side view shows the approved wording against the proposal, additions in green and removals in red."),
  (async () => {
    const c = await centerOf(diffGrid);
    await glideTo(c.x, c.y);
    await spot(diffGrid, { zoom: 1.04, pad: 4 });
    await sleep(2500);
    await unspot(diffGrid);
  })(),
]);
mark("cue 2 done");

// From here the Approve and publish button sits where the bottom subtitle pill would be, so the pill moves to the top.
await page.evaluate(() => { const s = document.getElementById("vty-sub"); if (s) { s.style.bottom = "auto"; s.style.top = "14px"; } });
deviations.push("Cues 3 to 5: the subtitle pill moves to the top of the screen so it does not cover Approve and publish.");
// [Cue 3] Impact gate. If the draft is still unreviewed we click "Run impact check"; if it was already run (the seeded state), we show the result.
const runBtn = card.getByRole("button", { name: "Run impact check" });
const impactOk = card.getByText(/Impact: checked \d+ cases/);
const ranNow = await visible(runBtn, 800);
if (!ranNow) deviations.push('Cue 3: the draft already shows its impact result, so there is no "Run impact check" button to click; the script spotlights the existing result and narrates it as already run.');
await Promise.all([
  speak(
    ranNow
      ? "Before approving, Rita runs the impact check, which blocks publication if any downstream case would break."
      : "The impact check tested the change against downstream cases, and none are blocking."
  ),
  (async () => {
    if (ranNow) {
      await clickWithSpot(runBtn, { zoom: 1.08 }, 900);
      await impactOk.or(card.getByText(/blocking/)).first().waitFor({ timeout: 60000 });
      await sleep(500);
    }
    const res = card.locator("p").filter({ hasText: /Impact: checked|blocking/ }).first();
    await hover(res, { zoom: 1.03, pad: 4 }, 2000);
  })(),
]);
const gateText = ((await card.locator("p").filter({ hasText: /checked \d+ cases/ }).first().innerText().catch(() => "")) || "").replace(/\s+/g, " ");
log("impact gate reads:", gateText);
const clean = /0 blocking/.test(gateText);
if (!clean) deviations.push(`Cue 3: the impact gate did not read "0 blocking" (it read: ${gateText}); approval is disabled, so Cue 4 narrates the block instead of approving.`);
mark("cue 3 done");

// [Cue 4] Approve and publish
const approve = card.getByRole("button", { name: "Approve and publish" });
const enabled = clean && (await approve.isEnabled().catch(() => false));
await Promise.all([
  speak(
    enabled
      ? "With zero blocking cases, Rita approves and publishes the unit, and Verity notifies the downstream channels."
      : "The gate reports a blocking case, so Approve and publish stays disabled until the wording is fixed."
  ),
  (async () => {
    if (!enabled) { await hover(approve, { zoom: 1.08 }, 2000); return; }
    await clickWithSpot(approve, { zoom: 1.1 }, 1200);
  })(),
]);
mark("cue 4 done");

// [Cue 5] Published banner, then the Decided tab with the lifecycle
if (enabled) {
  const banner = page.getByText(/published\s*[—-]\s*consumers refreshed/i).first();
  const gotBanner = await visible(banner, 10000);
  if (!gotBanner) deviations.push("Cue 5: the published confirmation banner did not appear.");
  const decidedTab = page.getByRole("tab", { name: /Decided/ });
  await Promise.all([
    speak("The unit is published, the channels are told to refresh, and the decision moves to Decided."),
    (async () => {
      if (gotBanner) { await page.evaluate(() => window.scrollTo(0, 0)); await hover(banner, { zoom: 1.03, pad: 4 }, 1800); }
      await clickWithSpot(decidedTab, { zoom: 1.08 }, 600);
      const lc = page.locator('[aria-label="Lifecycle"]').first();
      if (await visible(lc, 3000)) await hover(lc, { zoom: 1.05, pad: 6 }, 2200);
      else deviations.push("Cue 5: no lifecycle strip visible under Decided.");
    })(),
  ]);
}

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
log("SCENARIO 2 FINISHED");
