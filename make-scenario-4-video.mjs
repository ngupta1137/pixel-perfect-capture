// One command: narration audio + paced Playwright recording + ffmpeg merge -> scenario-4-with-voice.mp4
// Run: node make-scenario-4-video.mjs
// Env: TTS_ENGINE=auto|elevenlabs|edge|kokoro, REUSE_AUDIO=1, OUT_DIR, VIDEO_LAG_MS
// Read-only scenario: it changes nothing in the database.n the same database so the answer shows the wording Rita approved. This scenario changes nothing.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Auto-load .env
if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    let clean = line.trim();
    if (clean.startsWith("$env:")) clean = clean.slice(5).trim();
    if (clean && !clean.startsWith("#") && clean.includes("=")) {
      const idx = clean.indexOf("=");
      const key = clean.slice(0, idx).trim();
      let val = clean.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

if (!process.env.ELEVEN_VOICE_ID) process.env.ELEVEN_VOICE_ID = "RfKtG66Co2EredaKMj6o";

// Ensure ffmpeg/ffprobe installed via WinGet are discoverable
const wingetLinks = path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links");
if (fs.existsSync(wingetLinks) && !process.env.PATH.includes(wingetLinks)) {
  process.env.PATH = `${wingetLinks};${process.env.PATH}`;
}

const OUT = path.resolve(process.env.OUT_DIR || "scenario4-output");
// REUSE_AUDIO=1 keeps narration clips from the previous run (saves voice credits when only the video step failed).
const REUSE = process.env.REUSE_AUDIO === "1" && fs.existsSync(path.join(OUT, "audio", "tts.json"));
if (REUSE) {
  for (const f of ["video", "timeline.json", "video-cut.mp4", "scenario-4-with-voice.mp4"]) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
  console.log("reusing existing narration clips in", path.join(OUT, "audio"));
} else {
  fs.rmSync(OUT, { recursive: true, force: true });
}
fs.mkdirSync(OUT, { recursive: true });
const py = process.platform === "win32" ? "python" : "python3";
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: opts.capture ? ["ignore", "pipe", "inherit"] : "inherit", encoding: "utf8", env: { ...process.env, ...(opts.env || {}) } });
  if (r.error && r.error.code === "ENOENT") throw new Error(`"${cmd}" was not found. Install it and open a NEW terminal so PATH refreshes (ffmpeg includes ffprobe).`);
  if (r.status !== 0) throw new Error(`${cmd} ${args[0]} failed (${r.status})`);
  return r.stdout;
};

// Every line the demo can speak. "tts" is what the voice reads; "text" is the subtitle and the lookup key.
const LINES = [
  { id: "a0", text: "Now we will see role-scoped access and persona boundaries." },
  { id: "c1", text: "Marcus works as an insurance advocate, and pharmacy topics are flagged as restricted for him." },
  { id: "c2", text: "He asks how to replace an ID card." },
  { id: "c2b", text: "He gets an approved answer, cited to unit U-IN-001.", tts: "He gets an approved answer, cited to unit U I N zero zero one." },
  { id: "c3", text: "Now he asks for the pharmacy pricing disclaimer, which belongs to another team." },
  { id: "c4", text: "Verity shows Outside your access. There is no answer text, only the owning team, Pharmacy Ops, and a warm transfer step." },
];

// 1. narration audio
fs.writeFileSync(path.join(OUT, "lines.json"), JSON.stringify(LINES.map((l) => ({ id: l.id, tts: l.tts || l.text }))));
if (!REUSE) {
  run(py, ["scenario-4-tts.py", path.join(OUT, "lines.json"), path.join(OUT, "audio"), process.env.TTS_ENGINE || "auto"]);
} else {
  console.log("audio: reusing existing cached voice clips");
}
const tts = JSON.parse(fs.readFileSync(path.join(OUT, "audio", "tts.json"), "utf8"));
const manifest = {};
for (const l of LINES) {
  const file = path.join(OUT, "audio", tts.lines.find((t) => t.id === l.id).file);
  const dur = parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { capture: true }));
  manifest[l.text] = { id: l.id, file, durationMs: Math.round(dur * 1000) };
}
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1));
console.log("voice:", tts.engine);

// 2. record the visuals, paced to the audio durations
const timelinePath = path.join(OUT, "timeline.json");
run(process.execPath, ["scenario-4-voice-demo.mjs"], {
  env: { VTY_AUDIO_MANIFEST: path.join(OUT, "manifest.json"), VTY_TIMELINE: timelinePath, VIDEO_DIR: path.join(OUT, "video") },
});
let { timeline, cuts = [], endMs = 0, videoPath } = JSON.parse(fs.readFileSync(timelinePath, "utf8"));

// Align: the demo paints a grey marker (level 30 x cue number) in the bottom-left corner at every cue.
// Read it back from the recording so each clip starts exactly when its subtitle appears, even if the
// recording clock drifts during slow server calls. Falls back to the first subtitle when no marker is found.
{
  const fps = 25;
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", videoPath, "-vf", `fps=${fps},crop=4:4:2:714,scale=1:1`, "-f", "rawvideo", "-pix_fmt", "gray", "-"], { maxBuffer: 1 << 28 });
  const g = r.stdout;
  const raw = timeline.map((t) => t.startMs);
  const found = [];
  let from = 0;
  for (let k = 0; k < timeline.length; k++) {
    const want = 30 * (k + 1);
    let hit = -1;
    for (let f = from; f + 3 < g.length; f++) {
      if (Math.abs(g[f] - want) <= 9 && Math.abs(g[f + 1] - want) <= 9 && Math.abs(g[f + 2] - want) <= 9 && Math.abs(g[f + 3] - want) <= 9) { hit = f; break; }
    }
    if (hit < 0) break;
    found.push(hit / fps);
    from = hit + 1;
  }
  if (found.length === timeline.length) {
    const lastDrift = found[found.length - 1] * 1000 - raw[raw.length - 1];
    for (const c of cuts) {
      const j = raw.findIndex((x) => x >= c.endMs - 500);
      const drift = j >= 0 ? found[j] * 1000 - raw[j] : 0;
      const pre = found.map((f, k) => f * 1000 - raw[k]);
      const before = [...pre.keys()].filter((k) => raw[k] <= c.startMs).pop();
      c.startMs += before !== undefined ? pre[before] : 0;
      c.endMs += drift;
    }
    endMs += lastDrift;
    timeline.forEach((t, k) => { t.startMs = found[k] * 1000; });
    console.log("sync: cue starts read from the video marker; drift vs clock (s):", found.map((f, k) => (f - raw[k] / 1000).toFixed(2)).join(", "));
  } else {
    console.log(`sync: found ${found.length} of ${timeline.length} markers; falling back to first-subtitle calibration`);
    const fps2 = 10;
    const r2 = spawnSync("ffmpeg", ["-v", "error", "-i", videoPath, "-vf", `fps=${fps2},crop=40:10:620:655,scale=1:1`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 26 });
    const px = r2.stdout;
    let first = -1;
    for (let i = 0; i + 2 < px.length; i += 3) { if (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2] < 70) { first = i / 3; break; } }
    if (first >= 0) {
      const shift = first / fps2 - 0.15 - timeline[0].startMs / 1000;
      for (const t of timeline) t.startMs += shift * 1000;
      for (const c of cuts) { c.startMs += shift * 1000; c.endMs += shift * 1000; }
      endMs += shift * 1000;
    }
  }
}

// 3. Edit list: drop idle waits and the silent lead-in, play long un-narrated stretches faster, then merge with the audio
const SPEED = Number(process.env.GAP_SPEED || 3);
const PAD = 0.4;
const firstCue = timeline[0].startMs / 1000;
if (firstCue - 0.8 > 1.5) cuts.push({ startMs: 0, endMs: (firstCue - 0.8) * 1000 });
const windows = timeline.map((t) => [t.startMs / 1000 - 0.1, (t.startMs + t.durationMs) / 1000 + PAD]);
const endT = Math.max(Math.max(...windows.map((w) => w[1]), ...cuts.map((c) => c.endMs / 1000)) + 1.8, endMs / 1000 - 0.2); // keep every on-screen action, not just the narration
const pts = [...new Set([0, endT, ...cuts.flatMap((c) => [c.startMs / 1000, c.endMs / 1000]), ...windows.flat()].map((x) => +x.toFixed(3)))]
  .filter((x) => x >= 0 && x <= endT)
  .sort((x, y) => x - y);
const inCut = (m) => cuts.some((c) => m >= c.startMs / 1000 && m < c.endMs / 1000);
const inWin = (m) => windows.some((w) => m >= w[0] && m < w[1]);
const pieces = [];
for (let i = 0; i + 1 < pts.length; i++) {
  const a = pts[i], b = pts[i + 1], m = (a + b) / 2;
  if (b - a < 0.04 || inCut(m)) continue;
  pieces.push({ a, b, speed: !inWin(m) && b - a > 3 ? SPEED : 1 });
}
let acc = 0;
for (const p of pieces) { p.o = acc; acc += (p.b - p.a) / p.speed; }
const mapT = (t) => { for (const p of pieces) if (t >= p.a && t < p.b) return p.o + (t - p.a) / p.speed; return acc; };
for (const t of timeline) t.startMs = mapT(t.startMs / 1000) * 1000;
// Safety: the picture must outlast the last spoken word, so hold the final frame if the edit ends early.
const audioEnd = Math.max(...timeline.map((t) => t.startMs / 1000 + t.durationMs / 1000));
const holdLast = Math.max(0, audioEnd + 1.2 - acc);
console.log(`edit: picture ${acc.toFixed(1)}s, last narration ends ${audioEnd.toFixed(1)}s, holding final frame ${holdLast.toFixed(1)}s`);
const final = path.join(OUT, "scenario-4-with-voice.mp4");
// Step A: video only
const silent = path.join(OUT, "video-cut.mp4");
const vgraph = `[0:v]fps=25,drawbox=x=0:y=712:w=8:h=8:color=white:t=fill,split=${pieces.length}${pieces.map((_, i) => `[s${i}]`).join("")};` +
  pieces.map((p, i) => `[s${i}]trim=start=${p.a.toFixed(3)}:end=${p.b.toFixed(3)},setpts=(PTS-STARTPTS)/${p.speed}[c${i}]`).join(";") +
  `;${pieces.map((_, i) => `[c${i}]`).join("")}concat=n=${pieces.length}:v=1:a=0[vc]` + (holdLast > 0 ? `;[vc]tpad=stop_mode=clone:stop_duration=${holdLast.toFixed(3)}[v]` : `;[vc]null[v]`);
run("ffmpeg", ["-v", "error", "-y", "-i", videoPath, "-filter_complex", vgraph, "-map", "[v]", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", silent]);
const vdur = parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", silent], { capture: true }));
// Step B: place each clip at its cue start, mix, and mux with the video
const inputs = ["-i", silent, ...timeline.flatMap((t) => ["-i", t.file])];
const delays = timeline.map((t, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.max(0, Math.round(t.startMs))}|${Math.max(0, Math.round(t.startMs))}[d${i}]`);
const mix = `${delays.join(";")};${timeline.map((_, i) => `[d${i}]`).join("")}amix=inputs=${timeline.length}:normalize=0:duration=longest,apad=whole_dur=${vdur.toFixed(3)}[a]`;
run("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", mix, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", vdur.toFixed(3), "-movflags", "+faststart", final]);
console.log("removed:", cuts.map((c) => ((c.endMs - c.startMs) / 1000).toFixed(1) + "s").join(", ") || "none", "| sped up", SPEED + "x:", pieces.filter((p) => p.speed > 1).map((p) => ((p.b - p.a)).toFixed(1) + "s").join(", ") || "none");
console.log("DONE:", final);
