"""Shared ElevenLabs delivery controls: voice modulation per line.

Preset via ELEVEN_PRESET = flat | natural | expressive | dramatic (default: expressive).
Overrides: ELEVEN_MODEL, ELEVEN_STABILITY, ELEVEN_SIMILARITY, ELEVEN_STYLE, ELEVEN_SPEED,
ELEVEN_PAUSES=0 (disable <break> tags), ELEVEN_STITCH=0 (disable previous/next text).
"""
import os, re

PRESETS = {
    #            stability similarity style speed
    "flat":       (0.50, 0.80, 0.00, 1.00),   # the old monotone setting
    "natural":    (0.40, 0.78, 0.20, 1.00),
    "expressive": (0.32, 0.75, 0.38, 0.98),
    "dramatic":   (0.24, 0.72, 0.58, 0.96),
    "extreme":    (0.15, 0.65, 0.90, 0.94),   # exaggerated; for v2 when the others sound alike
}

def _f(name, default):
    v = os.environ.get(name)
    return float(v) if v not in (None, "") else default

def _clamp(x, lo, hi):
    return max(lo, min(hi, x))

def _is_v3(model):
    return model.startswith("eleven_v3") or model.startswith("eleven_v4")

def _pauses(text):
    """Sparse natural pauses (multilingual_v2 supports <break>); max 3 per line."""
    n = [0]
    def sub(m):
        if n[0] >= 3:
            return m.group(0)
        n[0] += 1
        return m.group(1) + ' <break time="0.45s" /> ' + m.group(2)
    text = re.sub(r'([.?!])\s+([A-Z"])', sub, text)
    text = re.sub(r'(:)\s+(\S)', lambda m: m.group(1) + ' <break time="0.3s" /> ' + m.group(2), text, count=1)
    return text

NEG = re.compile(r"\b(not|never|no|blocked|cannot|can't|unavailable|refus\w+|stale|conflict|escalat\w+)\b", re.I)
EMPH = re.compile(r"\b(one|approved|every|only|before|never|all|governed)\b", re.I)

def _build_v3(lines, i):
    """eleven_v3: direction comes from audio tags; stability is Creative(0)/Natural(.5)/Robust(1)."""
    text = lines[i]["tts"].strip()
    preset = os.environ.get("ELEVEN_PRESET", "expressive").lower()
    last = i == len(lines) - 1
    tags = []
    if i == 0: tags.append("warmly")
    if text.endswith("?"): tags.append("curious")
    if NEG.search(text): tags.append("serious")
    if last: tags.append("confident")
    if len(EMPH.findall(text)) >= 3 and not tags: tags.append("emphasizing")
    if preset in ("dramatic", "extreme") and not tags: tags.append("thoughtful")
    sents = re.split(r'(?<=[.?!])\s+', text)
    if preset != "flat" and len(sents) > 1:
        text = " ... ".join(sents[:1]) + " ... " + " ".join(sents[1:])
    if preset != "flat" and tags:
        text = "".join(f"[{t}] " for t in tags) + text
    stab = {"flat": 0.5, "natural": 0.5}.get(preset, 0.0)
    stab = _f("ELEVEN_STABILITY", stab)
    return text, {"stability": stab, "similarity_boost": 0.75, "use_speaker_boost": True}, {}

def build(lines, i, model):
    """Return (text, voice_settings, extra_fields) for lines[i]."""
    if _is_v3(model):
        return _build_v3(lines, i)
    text = lines[i]["tts"]
    preset = os.environ.get("ELEVEN_PRESET", "expressive").lower()
    stab, sim, style, speed = PRESETS.get(preset, PRESETS["expressive"])
    last = i == len(lines) - 1
    if preset != "flat":
        if i == 0:                       # opening line: warmer, a touch slower, more presence
            style += 0.10; speed -= 0.02
        if text.strip().endswith("?"):   # questions: livelier, more melodic
            stab -= 0.06; style += 0.10
        if NEG.search(text):             # warnings / blocks: steadier, deliberate
            stab += 0.08; speed -= 0.03
        if last:                         # closing line: land it slowly with weight
            speed -= 0.03; style += 0.08
        if len(EMPH.findall(text)) >= 3:  # key-idea lines get a little more emphasis
            style += 0.05
    stab = _f("ELEVEN_STABILITY", stab)
    sim = _f("ELEVEN_SIMILARITY", sim)
    style = _f("ELEVEN_STYLE", style)
    speed = _f("ELEVEN_SPEED", speed)
    vs = {
        "stability": round(_clamp(stab, 0.10, 1.0), 2),
        "similarity_boost": round(_clamp(sim, 0.0, 1.0), 2),
        "style": round(_clamp(style, 0.0, 1.0), 2),
        "use_speaker_boost": True,
        "speed": round(_clamp(speed, 0.7, 1.2), 2),
    }
    if preset != "flat" and os.environ.get("ELEVEN_PAUSES", "1") != "0" and not _is_v3(model):
        text = _pauses(text)
    extra = {}
    if os.environ.get("ELEVEN_STITCH", "1") != "0":
        if i > 0:
            extra["previous_text"] = lines[i - 1]["tts"]
        if i < len(lines) - 1:
            extra["next_text"] = lines[i + 1]["tts"]
    return text, vs, extra
