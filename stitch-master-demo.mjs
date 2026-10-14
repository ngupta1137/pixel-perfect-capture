// Master stitcher: animated opening and closing, chapter slates, and every scenario clip -> one MP4 with chapters.
// NOT run until all clips are final. Usage:
//   node stitch-master-demo.mjs --check        list which clips are present
//   node stitch-master-demo.mjs --slates-only  render only the chapter slates (for review)
//   node stitch-master-demo.mjs                build master-output/verity-master-demo.mp4
// Env: SLATE_SECONDS (default 5.5), CHROME_PATH
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const wingetLinks = path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links");
if (fs.existsSync(wingetLinks) && !process.env.PATH.includes(wingetLinks)) process.env.PATH = `${wingetLinks};${process.env.PATH}`;
let chromium;
try { ({ chromium } = await import("playwright")); } catch { ({ chromium } = await import("/opt/node-tools/node_modules/playwright/index.mjs")); }

const SLATE_S = Number(process.env.SLATE_SECONDS || 5.5);
const OUT = path.resolve("master-output");
const clip = (n) => `scenario${n}-output/scenario-${n}-with-voice.mp4`;
const scene = (s) => `scene-output/${s}/scene-with-voice.mp4`;

// ---- Slate text (edit here). Bridges describe only what the next clip shows. ----
const S = (num, step, title, persona, role, route, bridge, stages) => ({ num, step, title, persona, role, route, bridge, stages });
const SLATES = {
  1: S("SCENARIO 1", "1 OF 9", "AI ingest and author review", "Dana", "Author", "/work", "Next: Dana turns source documents into candidate knowledge units for review.", [0, 1, 2]),
  2: S("SCENARIO 2", "2 OF 9", "Legal impact gate and approval", "Rita", "Legal approver", "/legal", "Next: Rita reviews the draft. Under maker-checker, the proposer cannot approve.", [2, 3]),
  3: S("SCENARIO 3", "3 OF 9", "Advocate search and governed answer", "Priya", "Pharmacy advocate", "/", "Next: Priya searches the prescription pricing disclaimer and gets an approved, verified answer.", [4]),
  4: S("SCENARIO 4", "4 OF 9", "Role-scoped access", "Marcus", "Insurance advocate", "/", "Next: Marcus asks the same kind of question and meets his access boundary.", [4]),
  safety: S("SCENARIO 5", "5 OF 9", "Safety escalation", "Priya", "Pharmacy advocate", "/", "Next: a member describes chest pain. Verity does not search for an answer. It escalates to a person.", [4]),
  5: S("SCENARIO 6", "6 OF 9", "Safe fallbacks and the gap queue", "Priya, then Dana", "Advocate, then author", "/ and /work", "Next: a question no approved unit covers. Verity does not guess, and the gap reaches the author's queue.", [4, 5]),
  6: S("SCENARIO 7", "7 OF 9", "Plan year applicability", "Priya", "Pharmacy advocate", "/", "Next: the same benefit question under plan year 2026 and plan year 2027.", [4]),
  7: S("SCENARIO 8", "8 OF 9", "Audit log and evaluation harness", "Casey and Nitin", "Auditor and AI product owner", "/audit and /evals", "Next: the read-only audit log and the automated evaluation harness.", []),
  8: S("SCENARIO 9", "9 OF 9", "Platform architecture", "Nitin", "AI product owner", "/platform", "Next: the platform behind it, the 13-step pipeline and the change propagation mesh.", [0, 1, 2, 3, 4, 5]),
};

// ---- Running order ----
const ORDER = [
  { chapter: "What Verity is", file: scene("open") },
  { chapter: "The product, live", file: clip(0) },
  { chapter: "How Verity works", file: scene("lifecycle") },
  { slate: 1, chapter: "Scenario 1: AI ingest and author review", file: clip(1) },
  { slate: 2, chapter: "Scenario 2: Legal impact gate and approval", file: clip(2) },
  { slate: 3, chapter: "Scenario 3: Advocate search and governed answer", file: clip(3) },
  { slate: 4, chapter: "Scenario 4: Role-scoped access", file: clip(4) },
  { slate: "safety", chapter: "Scenario 5: Safety escalation", file: "scenario-safety-output/scenario-safety-with-voice.mp4" },
  { slate: 5, chapter: "Scenario 6: Safe fallbacks and the gap queue", file: clip(5) },
  { slate: 6, chapter: "Scenario 7: Plan year applicability", file: clip(6) },
  { slate: 7, chapter: "Scenario 8: Audit log and evaluation harness", file: clip(7) },
  { slate: 8, chapter: "Scenario 9: Platform architecture", file: clip(8) },
  { chapter: "Knowledge as infrastructure", file: scene("close") },
];

const arg = process.argv[2];
if (arg === "--check") {
  for (const o of ORDER) console.log((fs.existsSync(o.file) ? "ok      " : "MISSING ") + o.file);
  process.exit(0);
}
const run = (cmd, args, capture) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", stdio: capture ? ["ignore", "pipe", "inherit"] : "inherit" });
  if (r.error && r.error.code === "ENOENT") throw new Error(`"${cmd}" not found. Install ffmpeg and open a new terminal.`);
  if (r.status !== 0) throw new Error(`${cmd} failed (${r.status})`);
  return r.stdout;
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "slates"), { recursive: true });
fs.mkdirSync(path.join(OUT, "norm"), { recursive: true });

// 1. render the slates (animated HTML recorded for a few seconds)
const win = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const lin = ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => fs.existsSync(p));
const executablePath = process.env.CHROME_PATH || (fs.existsSync(win) ? win : lin);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}), args: ["--no-sandbox"] });
const slateFiles = {};
for (const [n, d] of Object.entries(SLATES)) {
  const dir = path.join(OUT, "slates", "raw" + n);
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir, size: { width: 1280, height: 720 } } });
  const pg = await ctx.newPage();
  await pg.goto(pathToFileURL(path.resolve("scenes", "slate.html")).href + "#" + encodeURIComponent(JSON.stringify(d)));
  await pg.waitForTimeout(Math.round((SLATE_S + 1.2) * 1000));
  const v = pg.video(); await ctx.close();
  const raw = await v.path();
  const mp4 = path.join(OUT, "slates", `slate${n}.mp4`);
  // skip the page-load lead-in, fade in and out
  run("ffmpeg", ["-v", "error", "-y", "-ss", "0.6", "-i", raw, "-t", String(SLATE_S), "-vf", `fps=25,fade=t=in:st=0:d=0.5,fade=t=out:st=${SLATE_S - 0.5}:d=0.5`, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", mp4]);
  slateFiles[n] = mp4;
}
await browser.close();
if (arg === "--slates-only") { console.log("slates in", path.join(OUT, "slates")); process.exit(0); }

// 1b. voice the slates: "Scenario N. Title." (kept outside master-output so a re-stitch does not re-pay for the voice)
const SLATE_AUDIO = path.resolve("slate-audio");
const slateLines = Object.entries(SLATES).map(([n, d]) => ({ id: "slate" + n, tts: `${d.num[0]}${d.num.slice(1).toLowerCase()}. ${d.title}.` }));
let slateVoice = {};
try {
  let reuse = false;
  try {
    const old = JSON.parse(fs.readFileSync(path.join(SLATE_AUDIO, "tts.json"), "utf8")).lines;
    reuse = slateLines.every((l) => { const o = old.find((x) => x.id === l.id); return o && o.tts === l.tts && fs.existsSync(path.join(SLATE_AUDIO, o.file)); });
  } catch {}
  if (reuse) console.log("slate voice: reusing cached clips in", SLATE_AUDIO);
  else {
    fs.mkdirSync(SLATE_AUDIO, { recursive: true });
    fs.writeFileSync(path.join(SLATE_AUDIO, "lines.json"), JSON.stringify(slateLines));
    run(process.platform === "win32" ? "python" : "python3", ["scenario-8-tts.py", path.join(SLATE_AUDIO, "lines.json"), SLATE_AUDIO, process.env.TTS_ENGINE || "auto"]);
  }
  const tts = JSON.parse(fs.readFileSync(path.join(SLATE_AUDIO, "tts.json"), "utf8"));
  for (const l of slateLines) slateVoice[l.id] = path.join(SLATE_AUDIO, tts.lines.find((t) => t.id === l.id).file);
  console.log("slate voice:", tts.engine);
} catch (e) {
  console.log("slate voice unavailable, slates will be silent:", e.message);
  slateVoice = {};
}

// 2. normalise everything to 1920x1080, 25 fps, AAC 48 kHz stereo
const parts = [];
for (const o of ORDER) {
  if (o.slate) parts.push({ file: slateFiles[o.slate], silent: true, voice: slateVoice["slate" + o.slate], chapter: null });
  if (!fs.existsSync(o.file)) throw new Error("Missing clip: " + o.file + " (run --check)");
  parts.push({ file: o.file, silent: false, chapter: o.chapter, slateBefore: !!o.slate });
}
parts.forEach((p, i) => {
  const out = path.join(OUT, "norm", String(i).padStart(2, "0") + ".mp4");
  const vf = "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x111827,fps=25,format=yuv420p";
  const args = p.silent && p.voice
    ? ["-v", "error", "-y", "-i", p.file, "-i", p.voice, "-filter_complex", "[1:a]aformat=channel_layouts=stereo,adelay=900|900,apad[a]", "-map", "0:v", "-map", "[a]", "-shortest", "-vf", vf, "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-ar", "48000", "-ac", "2", out]
    : p.silent
    ? ["-v", "error", "-y", "-i", p.file, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-shortest", "-vf", vf, "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-ar", "48000", "-ac", "2", out]
    : ["-v", "error", "-y", "-i", p.file, "-vf", vf, "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-ar", "48000", "-ac", "2", out];
  run("ffmpeg", args);
  p.norm = out;
  p.dur = parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], true));
});

// 3. concat + chapter markers (a slate belongs to the chapter that follows it)
const list = path.join(OUT, "list.txt");
fs.writeFileSync(list, parts.map((p) => `file '${p.norm.replace(/\\/g, "/")}'`).join("\n"));
let t = 0, meta = ";FFMETADATA1\ntitle=Verity demo\n";
for (let i = 0; i < parts.length; i++) {
  const p = parts[i];
  let start = t;
  if (p.chapter) {
    if (p.slateBefore) start = t - parts[i - 1].dur;
    const ms = (x) => Math.round(x * 1000);
    meta += `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${ms(start)}\nEND=${ms(t + p.dur)}\ntitle=${p.chapter}\n`;
  }
  t += p.dur;
}
const metaFile = path.join(OUT, "chapters.txt");
fs.writeFileSync(metaFile, meta);
const final = path.join(OUT, "verity-master-demo.mp4");
run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-i", metaFile, "-map_metadata", "1", "-map_chapters", "1", "-c", "copy", "-movflags", "+faststart", final]);
console.log(`DONE: ${final}  (${(t / 60).toFixed(1)} min, ${ORDER.length} chapters)`);
