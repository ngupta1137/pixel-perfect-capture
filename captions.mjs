// Caption band for screen clips: the app picture is scaled to 1920x1000 (16:9 at 1778x1000, centred) and the
// narration text sits in a dedicated 80px band below it, so subtitles never cover any part of the UI.
import fs from "node:fs";
import path from "node:path";

const W = 1920, H = 1080, BAND = 80, PH = H - BAND, PW = Math.round((PH * 16) / 9 / 2) * 2;
const FONT = "demo-assets/Inter-Medium.otf";

function wrap(text, max = 100) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > 2) { const all = words; const half = Math.ceil(all.length / 2); return [all.slice(0, half).join(" "), all.slice(half).join(" ")].join("\n"); }
  return lines.join("\n");
}

// Returns a filtergraph fragment that turns [v] into [vf] (picture + caption band).
export function captionGraph({ timeline, textById, outDir }) {
  const dir = path.join(outDir, "captions");
  fs.mkdirSync(dir, { recursive: true });
  const rel = (p) => path.relative(process.cwd(), p).split(path.sep).join("/");
  let g = `;[v]scale=${PW}:${PH}:flags=lanczos,pad=${W}:${H}:(${W}-${PW})/2:0:color=0x0c1811,drawbox=x=0:y=${PH}:w=${W}:h=2:color=0x22c55e:t=fill`;
  timeline.forEach((t, i) => {
    const text = textById[t.id];
    if (!text) return;
    const f = path.join(dir, `c${i}.txt`);
    fs.writeFileSync(f, wrap(text));
    const s = (t.startMs / 1000).toFixed(3), e = ((t.startMs + t.durationMs) / 1000 + 0.3).toFixed(3);
    g += `,drawtext=fontfile=${FONT}:textfile=${rel(f)}:fontcolor=white:fontsize=28:line_spacing=6:x=(w-text_w)/2:y=${PH + 2}+(${BAND - 2}-text_h)/2:enable='between(t,${s},${e})'`;
  });
  return g + "[vf]";
}
