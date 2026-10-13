"""Generate narration clips for Scenario 1.
Usage: python3 scenario-1-tts.py lines.json out_dir [auto|edge|kokoro]
lines.json: [{"id": "c1", "tts": "text to speak"}]
Engines: edge (edge-tts, en-US-JennyNeural, needs internet) or kokoro (local ONNX voice, af_heart).
auto tries edge first and falls back to kokoro."""
import asyncio, json, os, sys

lines = json.load(open(sys.argv[1]))
out = sys.argv[2]
engine = sys.argv[3] if len(sys.argv) > 3 else "auto"
os.makedirs(out, exist_ok=True)
EDGE_VOICE = os.environ.get("EDGE_VOICE", "en-US-JennyNeural")
KOKORO_VOICE = os.environ.get("KOKORO_VOICE", "af_heart")
KDIR = os.environ.get("KOKORO_DIR", "/home/claude/tts-models")

async def edge():
    import edge_tts
    for l in lines:
        await edge_tts.Communicate(l["tts"], EDGE_VOICE, rate="-4%").save(os.path.join(out, l["id"] + ".mp3"))
        l["file"] = l["id"] + ".mp3"

def kokoro():
    import soundfile as sf
    from kokoro_onnx import Kokoro
    k = Kokoro(os.path.join(KDIR, "kokoro-v1.0.int8.onnx"), os.path.join(KDIR, "voices-v1.0.bin"))
    for l in lines:
        samples, sr = k.create(l["tts"], voice=KOKORO_VOICE, speed=0.96, lang="en-us")
        sf.write(os.path.join(out, l["id"] + ".wav"), samples, sr)
        l["file"] = l["id"] + ".wav"

used = None
if engine in ("auto", "edge"):
    try:
        asyncio.run(edge()); used = "edge-tts " + EDGE_VOICE
    except Exception as e:
        print("edge-tts failed:", type(e).__name__, file=sys.stderr)
        if engine == "edge":
            sys.exit(2)
if used is None:
    kokoro(); used = "kokoro " + KOKORO_VOICE
json.dump({"engine": used, "lines": lines}, open(os.path.join(out, "tts.json"), "w"), indent=1)
print("TTS engine:", used)
