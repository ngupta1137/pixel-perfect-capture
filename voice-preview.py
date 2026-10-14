"""Render a short sample in each preset so you can listen and pick one.
Usage: python voice-preview.py   (needs ELEVENLABS_API_KEY, ELEVEN_VOICE_ID; ~600 chars per preset)
Output: voice-preview/<preset>.mp3
"""
import os, json, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import eleven_voice
for ln in open(".env") if os.path.exists(".env") else []:
    if "=" in ln and not ln.strip().startswith("#"):
        k, v = ln.strip().split("=", 1); os.environ.setdefault(k, v.strip().strip('"\''))
key, voice = os.environ["ELEVENLABS_API_KEY"], os.environ["ELEVEN_VOICE_ID"]
model = os.environ.get("ELEVEN_MODEL", "eleven_multilingual_v2")
lines = [{"tts": t} for t in [
    "Verity is one governed source of approved knowledge, used by AI and by people.",
    "Ask a question the wrong role should not see, and the answer is not a guess. It is blocked, with the owning team named.",
    "Why does that matter? Because every channel gets the same approved truth.",
    "Author once, approve once, retrieve everywhere, stay current.",
]]
os.makedirs("voice-preview", exist_ok=True)
for preset in ["flat", "natural", "expressive", "dramatic"]:
    os.environ["ELEVEN_PRESET"] = preset
    segs = []
    for i in range(len(lines)):
        text, vs, extra = eleven_voice.build(lines, i, model)
        body = json.dumps({"text": text, "model_id": model, "voice_settings": vs, **extra}).encode()
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
            data=body, headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
        segs.append(urllib.request.urlopen(req, timeout=120).read())
    open(f"voice-preview/{preset}.mp3", "wb").write(b"".join(segs))
    print("wrote", preset)
