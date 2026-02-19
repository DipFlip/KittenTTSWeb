import io
import time
import numpy as np
import soundfile as sf
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, Response
from kittentts import KittenTTS

app = FastAPI()

MODELS = {
    "mini-80M": "KittenML/kitten-tts-mini-0.8",
    "micro-40M": "KittenML/kitten-tts-micro-0.8",
}

_cache: dict[str, KittenTTS] = {}


def get_model(key: str) -> KittenTTS:
    if key not in _cache:
        print(f"Loading {key}...")
        t0 = time.time()
        _cache[key] = KittenTTS(MODELS[key])
        print(f"  loaded in {time.time() - t0:.2f}s")
    return _cache[key]


@app.post("/api/generate")
async def generate(req: Request):
    body = await req.json()
    text = body.get("text", "").strip()
    voice = body.get("voice", "Jasper")
    model_key = body.get("model", "micro-40M")
    speed = float(body.get("speed", 1.0))

    if not text:
        return Response(status_code=400, content="No text provided")

    m = get_model(model_key)
    t0 = time.time()
    audio = m.generate(text, voice=voice, speed=speed)
    gen_time = time.time() - t0
    duration = len(audio) / 24000

    buf = io.BytesIO()
    sf.write(buf, audio, 24000, format="WAV")
    buf.seek(0)

    return Response(
        content=buf.read(),
        media_type="audio/wav",
        headers={
            "X-Gen-Time": f"{gen_time:.3f}",
            "X-Audio-Duration": f"{duration:.3f}",
        },
    )


@app.get("/", response_class=HTMLResponse)
async def index():
    return open("static/index.html").read()
