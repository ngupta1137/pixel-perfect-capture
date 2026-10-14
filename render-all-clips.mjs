// Renders every clip with the SAME voice settings, in the order the demo database needs.
// Run on your own computer after `git pull`, with the app running on 8081 and your .env containing
// ELEVENLABS_API_KEY and ELEVEN_VOICE_ID. Usage:
//   node render-all-clips.mjs                 render everything
//   node render-all-clips.mjs --only 3,safety render only these (names below)
//   REUSE_AUDIO=1 node render-all-clips.mjs   reuse voice clips already generated (no new credits)
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const STEPS = [
  ["open", ["make-scene-video.mjs", "open"], "scene-output/open/scene-with-voice.mp4"],
  ["0", ["make-scenario-0-video.mjs"], "scenario0-output/scenario-0-with-voice.mp4"],
  ["lifecycle", ["make-scene-video.mjs", "lifecycle"], "scene-output/lifecycle/scene-with-voice.mp4"],
  ["1", ["make-scenario-1-video.mjs"], "scenario1-output/scenario-1-with-voice.mp4"],
  ["2", ["make-scenario-2-video.mjs"], "scenario2-output/scenario-2-with-voice.mp4"],
  ["3", ["make-scenario-3-video.mjs"], "scenario3-output/scenario-3-with-voice.mp4"],
  ["4", ["make-scenario-4-video.mjs"], "scenario4-output/scenario-4-with-voice.mp4"],
  ["safety", ["make-scenario-safety-video.mjs"], "scenario-safety-output/scenario-safety-with-voice.mp4"],
  ["5", ["make-scenario-5-video.mjs"], "scenario5-output/scenario-5-with-voice.mp4"],
  ["6", ["make-scenario-6-video.mjs"], "scenario6-output/scenario-6-with-voice.mp4"],
  ["7", ["make-scenario-7-video.mjs"], "scenario7-output/scenario-7-with-voice.mp4"],
  ["8", ["make-scenario-8-video.mjs"], "scenario8-output/scenario-8-with-voice.mp4"],
  ["close", ["make-scene-video.mjs", "close"], "scene-output/close/scene-with-voice.mp4"],
];
const onlyArg = process.argv.indexOf("--only");
const only = onlyArg > 0 ? process.argv[onlyArg + 1].split(",") : null;
if (!process.env.TTS_ENGINE) process.env.TTS_ENGINE = "elevenlabs"; // fail loudly instead of silently using a robot voice
const done = [];
for (const [name, args, out] of STEPS) {
  if (only && !only.includes(name)) continue;
  console.log(`\n=== ${name}: node ${args.join(" ")}`);
  const r = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (r.status !== 0) { console.error(`\nSTOPPED at "${name}". Fix it and rerun with --only ${name} (add REUSE_AUDIO=1 to keep voice clips already paid for).`); process.exit(1); }
  done.push([name, out, fs.existsSync(out)]);
}
console.log("\nSummary:"); for (const [n, o, ok] of done) console.log((ok ? "ok      " : "MISSING ") + n + "  " + o);
