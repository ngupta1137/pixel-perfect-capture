"""Generate narration clips for Scenario 4.
Usage: python3 scenario-4-tts.py lines.json out_dir [auto|edge|kokoro]
lines.json: [{"id": "c1", "tts": "text to speak"}]
Engines: elevenlabs (your cloned voice; needs ELEVENLABS_API_KEY and ELEVEN_VOICE_ID env vars), edge (edge-tts, en-US-GuyNeural, male, needs internet) or kokoro (local ONNX voice, am_michael, male).
auto tries elevenlabs first when ELEVENLABS_API_KEY is set, then edge, then kokoro.
The API key is read only from the environment and is never printed or written to disk."""
import asyncio, json, os, sys

def load_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("$env:"):
                    line = line[5:].strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip()
                    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                        v = v[1:-1]
                    if k not in os.environ:
                        os.environ[k] = v

load_env()

lines = json.load(open(sys.argv[1]))
out = sys.argv[2]
engine = sys.argv[3] if len(sys.argv) > 3 else "auto"
os.makedirs(out, exist_ok=True)
EDGE_VOICE = os.environ.get("EDGE_VOICE", "en-US-GuyNeural")
KOKORO_VOICE = os.environ.get("KOKORO_VOICE", "am_michael")
KDIR = os.environ.get("KOKORO_DIR", "/home/claude/tts-models")

def elevenlabs():
    import urllib.request, urllib.error
    key = os.environ.get("ELEVENLABS_API_KEY")
    voice = os.environ.get("ELEVEN_VOICE_ID")
    if not key or not voice:
        raise RuntimeError("Set ELEVENLABS_API_KEY and ELEVEN_VOICE_ID")
    base = os.environ.get("ELEVEN_BASE", "https://api.elevenlabs.io")
    model = os.environ.get("ELEVEN_MODEL", "eleven_multilingual_v2")
    for l in lines:
        body = json.dumps({
            "text": l["tts"],
            "model_id": model,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.0, "use_speaker_boost": True},
        }).encode()
        req = urllib.request.Request(
            f"{base}/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
            data=body, method="POST",
            headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"ElevenLabs HTTP {e.code} on line {l['id']}: {e.read()[:200].decode(errors='replace')}")
        open(os.path.join(out, l["id"] + ".mp3"), "wb").write(data)
        l["file"] = l["id"] + ".mp3"

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
if engine == "elevenlabs" or (engine == "auto" and os.environ.get("ELEVENLABS_API_KEY") and os.environ.get("ELEVEN_VOICE_ID")):
    try:
        elevenlabs(); used = "elevenlabs voice " + os.environ.get("ELEVEN_VOICE_ID", "")[:6] + "..."
    except Exception as e:
        print("elevenlabs failed:", e, file=sys.stderr)
        if engine == "elevenlabs":
            sys.exit(2)
if used is None and engine in ("auto", "edge"):
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
