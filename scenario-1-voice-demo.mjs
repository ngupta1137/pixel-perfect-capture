// Verity demo automation, Scenario 1: AI Extraction, Provenance, and Draft Review.
// Run: node scenario-1-voice-demo.mjs
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
const VIDEO_DIR = process.env.VIDEO_DIR || path.resolve("scenario1-video");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log("[scenario-1]", ...a);
const deviations = [];

// ---------- URL: 8081, then 8080 ----------
async function pickBase() {
  const list = process.env.VERITY_URL ? [process.env.VERITY_URL] : ["http://localhost:8081", "http://localhost:8080"];
  for (const base of list) {
    try {
      if ((await fetch(base + "/work")).ok) return base;
    } catch {}
  }
  throw new Error("Verity UI not reachable on 8081 or 8080. Start it with: npx vite dev --port 8081");
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
// Full-page exception: lay the app out at 100% size in a tall 16:9 viewport (no scrolling) and record it at 1920x1080.
// The whole Review page needs about 1300px of height, so the viewport is 2400x1350; the video scales it by 0.8.
const VIEW_W = Number(process.env.VIEW_W || 2400), VIEW_H = Number(process.env.VIEW_H || 1350);
const SC = VIEW_W / 1280;
const context = await browser.newContext({
  viewport: { width: VIEW_W, height: VIEW_H },
  recordVideo: { dir: VIDEO_DIR, size: { width: 1920, height: 1080 } },
});

// Session injection for Dana (Knowledge author), before any page script runs.
await context.addInitScript(() => {
  sessionStorage.setItem("verity_authenticated", "true");
  sessionStorage.setItem("verity_active_persona", "dana");
  sessionStorage.setItem("verity_session_token", "vty_sess_demo_dana");
});

// Overlay: green cursor, spotlight ring, subtitle pill, and speech helper.
await context.addInitScript((SC) => {
  const build = () => {
    if (document.getElementById("vty-layer") || !document.body) return;
    const st = document.createElement("style");
    st.textContent = `
      #vty-layer{position:fixed;left:0;top:0;width:${100/SC}vw;height:${100/SC}vh;transform:scale(${SC});transform-origin:0 0;z-index:2147483647;pointer-events:none;font-family:Inter,system-ui,sans-serif}
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
      cur.style.transform = `translate(${e.clientX / SC}px,${e.clientY / SC}px)`;
      clk.style.left = e.clientX / SC + "px";
      clk.style.top = e.clientY / SC + "px";
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
}, SC);

// Audio-sync mode (used by make-scenario-1-video.mjs): pre-generated narration drives the pacing.
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
async function speak(text) {
  if (MANIFEST) {
    const m = MANIFEST[text];
    if (!m) throw new Error("No audio generated for line: " + text);
    await page.evaluate((t) => { const s = document.getElementById("vty-sub"); if (s) { s.textContent = t; s.classList.add("on"); } }, text);
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
  await sleep(250);
  const b = await el.boundingBox();
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
    Object.assign(ring.style, { display: "block", left: (r.x - pad) / r.SC + "px", top: (r.y - pad) / r.SC + "px", width: (r.width + pad * 2) / r.SC + "px", height: (r.height + pad * 2) / r.SC + "px" });
  }, [{ ...b, SC }, pad]);
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
await page.goto(BASE + "/work", { waitUntil: "networkidle" });
await page.getByText("Recent uploads").first().waitFor({ timeout: 30000 });
await page.mouse.click(640, 4).catch(() => {}); // user activation so speechSynthesis may speak
await sleep(600);

// [Announcement]
const table = page.locator("table").first();
await Promise.all([
  speak("Now we will see the AI Extraction and Author Review scenario."),
  (async () => { const { x, y } = await centerOf(table); await glideTo(x, y); })(),
]);

// [Cue 1] Trigger extract
const firstRow = page.locator("tbody tr").first();
const actionsBtn = firstRow.getByRole("button", { name: "Actions" });
await Promise.all([
  speak("In the author workspace, Dana loads the AEP sample policy and clicks Extract candidate units."),
  (async () => {
    await hover(actionsBtn, { zoom: 1.25, pad: 4 }, 500);
    await actionsBtn.click();
    const item = page.getByRole("menuitem", { name: "Extract units" });
    await item.waitFor({ timeout: 5000 });
    const rowIsAep = /AEP/i.test(await firstRow.innerText());
    if (rowIsAep) {
      await clickWithSpot(item, { zoom: 1.12 });
    } else {
      // The first fixture row (S01) has no extractable text in this build, so show the menu and use the AEP sample path.
      deviations.push("Cue 1: first Recent uploads row is a fixture without extractable text; used Paste content > Load AEP Sample Policy instead of clicking Extract units.");
      await hover(item, { zoom: 1.12 }, 900);
      await page.keyboard.press("Escape");
      await clickWithSpot(page.getByText("Paste content").first(), { zoom: 1.08 }, 500);
      await clickWithSpot(page.getByText("Load AEP Sample Policy").first(), { zoom: 1.1 }, 500);
      await clickWithSpot(page.getByRole("button", { name: /Extract candidate units/ }).first(), { zoom: 1.06 }, 600);
    }
  })(),
]);

mark("cue 1 done");
// [Cue 2] Unit segmentation
const reviewReady = page.getByText(/Extracted candidate units/);
const tWait = Date.now() - T0;
await reviewReady.first().waitFor({ timeout: 90000 });
{ const tDone = Date.now() - T0; if (tDone - tWait > 4000) cuts.push({ startMs: tWait + 1500, endMs: tDone - 300 }); }
await sleep(800);
const unitsCol = page.locator("div.overflow-y-auto").filter({ has: page.getByRole("checkbox") }).first();
await Promise.all([
  speak("Verity lists the candidate knowledge units it extracted from the document."),
  hover(unitsCol, { zoom: 1.02, pad: 4 }, 2200),
]);

mark("cue 2 done");
// [Cue 3] Candidate inspection (pricing disclaimer)
const candidate = page.getByRole("heading", { name: /prices i give you today/i }).first();
// The citation lives in the "Source reference" field of the unit panel (for example "AEP contact-center script 2027 - Section 1.2").
await candidate.click();
await sleep(500);
const sourceRef = page.locator("input#edit-source-ref, input[value*='Section']").first();
const refValue = (await visible(sourceRef, 1500)) ? await sourceRef.inputValue() : "";
const sectionLabel = (refValue.match(/Section\s*\d[\d.]*/i) || [""])[0];
if (!sectionLabel) deviations.push(`Cue 3: the Source reference field reads "${refValue}" with no numbered section (not "Section 1.0"); narration says it records provenance to the source document.`);
else if (!/1\.0$/.test(sectionLabel)) deviations.push(`Cue 3: the screen cites "${sectionLabel}" for this candidate, not "Section 1.0"; narration uses the on-screen value.`);
deviations.push('Cue 3: this candidate is titled "The prices i give you today" and shows no "U-PH-003" id in the candidate list.');
await Promise.all([
  speak(EXACT
    ? "Dana inspects the pricing disclaimer candidate. The prototype links directly to the source passage in Section 1.0."
    : sectionLabel
    ? `Dana inspects the pricing disclaimer candidate. The prototype links directly to the source passage in ${sectionLabel}.`
    : "Dana opens the pricing disclaimer candidate. Its unit details show a source reference to the AEP contact-center script."),
  (async () => {
    await glideTo(...Object.values((({ x, y }) => ({ x, y }))(await centerOf(candidate))));
    await spot(candidate, { zoom: 1.04 });
    await sleep(900);
    await unspot(candidate);
    const cite = refValue ? sourceRef : page.getByText("Parsed Document Contents").first().locator("xpath=ancestor::div[2]");
    await hover(cite, { zoom: 1.03, pad: 4 }, 1800);
  })(),
]);

mark("cue 3 done");
// [Cue 4] Duplicate match
const dup = page.getByText(/near-duplicate|similar:|0\.67|67%/i);
const hasDup = await visible(dup, 800);
if (!hasDup) deviations.push("Cue 4: this screen does not render a near-duplicate card or 0.67 similarity score for the extracted unit; spoke a truthful line and spotlighted Unit details.");
await Promise.all([
  speak(EXACT || hasDup
    ? "It flags a near-duplicate match against existing unit U-PH-003 with a sixty-seven percent similarity score."
    : "The unit details list the type, the content, the key points and a suggested effective date."),
  hover(hasDup ? dup : page.getByText("Unit details").first().locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]"), { zoom: 1.03, pad: 4 }, 2200),
]);

mark("cue 4 done");
// [Cue 5] Proposal submission (only the pricing disclaimer selected)
const others = ["Fragment a", "Fragment b", "For plan year 2027, maintenance supply", "Mail order packages can be delivered"];
const propose = page.getByRole("button", { name: /Propose selected/ });
await Promise.all([
  speak("Dana proposes the selected unit. It appears under My drafts as Proposed."),
  (async () => {
    mark("cue 5 actions start");
    for (const name of others) {
      const cb = page.getByRole("checkbox", { name: "Select " + name });
      if (await visible(cb, 500)) {
        const { x, y } = await centerOf(cb);
        await glideTo(x, y, 18);
        await cb.click();
      }
    }
    mark("deselected others");
    await sleep(400);
    {
      const { x, y } = await centerOf(propose);
      await glideTo(x, y);
      await spot(propose, { zoom: 1.08 });
      await sleep(1000);
      const tClick = Date.now() - T0;
      await propose.first().click();
      await unspot(propose);
      const tBack = Date.now() - T0;
      // The app can take a while to answer; the video builder cuts that dead time (keeping 1.5s of it) so the narration stays tight.
      if (tBack - tClick > 4000) cuts.push({ startMs: tClick + 1500, endMs: tBack - 300 });
    }
    mark("propose clicked");
  })(),
]);

// [Cue 6] Maker-checker governance on My drafts
const draftsIndicator = page.getByText(/My active draft proposals|Waiting on|A second person approves/i);
let draftsVisible = await visible(draftsIndicator, 8000);
if (!draftsVisible) {
  const draftsTab = page.getByRole("tab", { name: "My drafts" });
  if (await visible(draftsTab, 3000)) {
    await draftsTab.click();
  }
  await draftsIndicator.first().waitFor({ timeout: 45000 }).catch(() => {});
}
await sleep(600);
mark("drafts tab loaded");
const needsLegal = page.getByText(/Needs Legal/i);
const hasBadge = await visible(needsLegal, 1000);
const gate = hasBadge
  ? needsLegal
  : (await visible(page.getByText(/A second person approves/i), 800))
  ? page.getByText(/A second person approves/i)
  : page.locator("li").first();
if (!hasBadge) deviations.push('Cue 6: no "Needs Legal" badge on My drafts; spotlighted the lifecycle line "Waiting on: Unassigned, A second person approves" instead.');
const lifecycle = page.locator('[aria-label="Lifecycle"]').first();
await Promise.all([
  speak("Dana cannot approve her own draft. The lifecycle line says it is waiting on a second person to approve."),
  (async () => {
    await hover(gate, { zoom: 1.08 }, 1500);
    const approveBtns = await page.getByRole("button", { name: /approve|publish/i }).count();
    log("approve/publish controls visible for Dana on My drafts:", approveBtns);
    if (await visible(lifecycle, 800)) await hover(lifecycle, { zoom: 1.04 }, 1800);
  })(),
]);

// ---------- Part B: second document (retail refill rules) ----------
const REFILL = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "demo-assets", "S01_source_Retail_Refill_Rules_2026.md");
await sleep(1200);
await clickWithSpot(page.getByRole("link", { name: "Ingest" }).first(), { zoom: 1.04 }, 400);
{
  const srcTab = page.getByRole("tab", { name: "Sources" });
  if (!(await visible(page.getByRole("button", { name: /Choose file/ }), 1500)) && (await visible(srcTab, 1500))) await clickWithSpot(srcTab, { zoom: 1.06 }, 300);
  await page.getByRole("button", { name: /Choose file/ }).first().waitFor({ timeout: 30000 });
}
await sleep(800);
const chooseBtn = page.getByRole("button", { name: /Choose file/ }).first();
await Promise.all([
  speak("Next, Dana uploads a second document, the retail refill rules, with Choose file."),
  (async () => {
    const { x, y } = await centerOf(chooseBtn);
    await glideTo(x, y);
    await spot(chooseBtn, { zoom: 1.1 });
    await sleep(900);
    const [chooser] = await Promise.all([page.waitForEvent("filechooser"), chooseBtn.click()]);
    await chooser.setFiles(REFILL);
    await unspot(chooseBtn);
    await sleep(1200);
    await clickWithSpot(page.getByRole("button", { name: /Extract candidate units/ }).first(), { zoom: 1.06 }, 500);
  })(),
]);
mark("cue 7 done");
{
  const tW = Date.now() - T0;
  await page.getByText(/Extracted candidate units/).first().waitFor({ timeout: 90000 });
  const tD = Date.now() - T0;
  if (tD - tW > 4000) cuts.push({ startMs: tW + 1500, endMs: tD - 300 });
}
await sleep(800);
const col2 = page.locator("div.overflow-y-auto").filter({ has: page.getByRole("checkbox") }).first();
const legalBadge = col2.getByText("Legal", { exact: true }).first();
await Promise.all([
  speak("Verity extracts four units. Three are tagged Policy. The vaccine fee is tagged Legal, because it is verbatim wording."),
  (async () => {
    await hover(col2, { zoom: 1.02, pad: 4 }, 1800);
    await hover(legalBadge, { zoom: 1.25, pad: 6 }, 1800);
  })(),
]);
mark("cue 8 done");
const propose2 = page.getByRole("button", { name: /Propose selected/ });
await Promise.all([
  speak("Dana proposes all four. On My drafts, the policy units wait on Pharmacy Ops, and the vaccine fee waits on Legal."),
  (async () => {
    const { x, y } = await centerOf(propose2);
    await glideTo(x, y);
    await spot(propose2, { zoom: 1.06 });
    await sleep(800);
    const tC = Date.now() - T0;
    await propose2.first().click();
    await unspot(propose2);
    await page.getByText(/My active draft proposals/).first().waitFor({ timeout: 60000 });
    const tB = Date.now() - T0;
    if (tB - tC > 4000) cuts.push({ startMs: tC + 1500, endMs: tB - 300 });
    await sleep(500);
    const pharm = page.locator("p").filter({ hasText: /Waiting on:\s*Pharmacy Ops/ }).first();
    await hover(pharm, { zoom: 1.06, pad: 4 }, 1500);
    const leg = page.locator("p").filter({ hasText: /Waiting on:\s*Legal/ }).first();
    await hover(leg, { zoom: 1.06, pad: 4 }, 1800);
  })(),
]);
mark("cue 9 done");

await sleep(2500);
await page.evaluate(() => { document.getElementById("vty-sub")?.classList.remove("on"); });
const video = page.video();
await context.close();
await browser.close();
const vpath = video ? await video.path() : "(none)";
if (process.env.VTY_TIMELINE) fs.writeFileSync(process.env.VTY_TIMELINE, JSON.stringify({ timeline, cuts, videoPath: vpath }, null, 2));
log("speech completion modes:", speechResults.join(", "));
log("deviations from the requested script:", deviations.length ? "\n  - " + deviations.join("\n  - ") : "none");
log("video:", vpath);
log("SCENARIO 1 FINISHED");
