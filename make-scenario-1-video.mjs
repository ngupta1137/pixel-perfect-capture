// One command: narration audio + paced Playwright recording + ffmpeg merge -> scenario-1-with-voice.mp4
// Run: node make-scenario-1-video.mjs
// Env: TTS_ENGINE=auto|edge|kokoro, EXACT_TRANSCRIPT=1 (use the original wording for cues 3 and 4), OUT_DIR, VIDEO_LAG_MS
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const OUT = path.resolve(process.env.OUT_DIR || "scenario1-output");
// REUSE_AUDIO=1 keeps narration clips from the previous run (saves voice credits when only the video step failed).
const REUSE = process.env.REUSE_AUDIO === "1" && fs.existsSync(path.join(OUT, "audio", "tts.json"));
if (REUSE) {
  for (const f of ["video", "timeline.json", "video-cut.mp4", "scenario-1-with-voice.mp4"]) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
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
  { id: "a0", text: "Now we will see the AI Extraction and Author Review scenario." },
  { id: "c1", text: "In the author workspace, Dana selects our synthetic AEP outreach script and runs extraction." },
  { id: "c2", text: "Verity segments the text into candidate knowledge units rather than raw chunks." },
  { id: "c3x", text: "Dana inspects the pricing disclaimer candidate. The prototype links directly to the source passage in Section 1.0." },
  { id: "c3t", text: "Dana inspects the pricing disclaimer candidate. The prototype records its provenance back to the source document." },
  { id: "c4x", text: "It flags a near-duplicate match against existing unit U-PH-003 with a sixty-seven percent similarity score.", tts: "It flags a near-duplicate match against existing unit U P H zero zero three, with a sixty-seven percent similarity score." },
  { id: "c4t", text: "On this screen the near-duplicate score is not displayed. The match data is returned by the engine but is not yet shown in the unit panel." },
  { id: "c5", text: "Dana reviews the proposed update and submits it into the review queue." },
  { id: "c6", text: "Dana cannot approve her own draft; our synthetic policy matrix enforces maker-checker separation of duties." },
];

// 1. narration audio
fs.writeFileSync(path.join(OUT, "lines.json"), JSON.stringify(LINES.map((l) => ({ id: l.id, tts: l.tts || l.text }))));
if (!REUSE) run(py, ["scenario-1-tts.py", path.join(OUT, "lines.json"), path.join(OUT, "audio"), process.env.TTS_ENGINE || "auto"]);
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
run(process.execPath, ["scenario-1-voice-demo.mjs"], {
  env: { VTY_AUDIO_MANIFEST: path.join(OUT, "manifest.json"), VTY_TIMELINE: timelinePath, VIDEO_DIR: path.join(OUT, "video") },
});
const { timeline, cuts = [], videoPath } = JSON.parse(fs.readFileSync(timelinePath, "utf8"));

// Calibrate: find when the first subtitle pill really appears in the video and shift every cue by the difference.
{
  const fps = 10;
  const r = spawnSync("ffmpeg", ["-v", "error", "-i", videoPath, "-vf", `fps=${fps},crop=40:10:620:655,scale=1:1`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 26 });
  const px = r.stdout;
  let first = -1;
  for (let i = 0; i + 2 < px.length; i += 3) {
    const luma = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
    if (luma < 70) { first = i / 3; break; }
  }
  if (first >= 0) {
    const shift = first / fps - 0.15 - timeline[0].startMs / 1000;
    console.log(`sync: first subtitle at ${(first / fps).toFixed(1)}s in video, timeline said ${(timeline[0].startMs / 1000).toFixed(1)}s, shifting audio by ${shift.toFixed(2)}s`);
    for (const t of timeline) t.startMs += shift * 1000;
    for (const c of cuts) { c.startMs += shift * 1000; c.endMs += shift * 1000; }
  } else console.log("sync: subtitle not detected, using raw timeline");
}

// 3. cut idle waits from the video, move later cues earlier by the same amount, then merge
const cutBefore = (ms) => cuts.reduce((sum, c) => sum + Math.max(0, Math.min(c.endMs, ms) - c.startMs), 0);
for (const t of timeline) t.startMs -= cutBefore(t.startMs);
const final = path.join(OUT, "scenario-1-with-voice.mp4");
// Step A: video only (cuts applied, constant 25 fps)
const silent = path.join(OUT, "video-cut.mp4");
const vf = cuts.length
  ? `fps=25,select='${cuts.map((c) => `not(between(t,${(c.startMs / 1000).toFixed(3)},${(c.endMs / 1000).toFixed(3)}))`).join("*")}',setpts=N/(25*TB)`
  : "fps=25";
run("ffmpeg", ["-v", "error", "-y", "-i", videoPath, "-vf", vf, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", silent]);
const vdur = parseFloat(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", silent], { capture: true }));
// Step B: place each clip at its cue start, mix, and mux with the video
const inputs = ["-i", silent, ...timeline.flatMap((t) => ["-i", t.file])];
const delays = timeline.map((t, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.max(0, Math.round(t.startMs))}|${Math.max(0, Math.round(t.startMs))}[d${i}]`);
const mix = `${delays.join(";")};${timeline.map((_, i) => `[d${i}]`).join("")}amix=inputs=${timeline.length}:normalize=0:duration=longest,apad=whole_dur=${vdur.toFixed(3)}[a]`;
run("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", mix, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", vdur.toFixed(3), "-movflags", "+faststart", final]);
console.log("cuts removed:", cuts.map((c) => ((c.endMs - c.startMs) / 1000).toFixed(1) + "s").join(", ") || "none");
console.log("DONE:", final);
