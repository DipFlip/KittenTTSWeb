# KittenTTS Web

A web UI for [KittenTTS](https://github.com/KittenML/KittenTTS) — tiny, fast text-to-speech that runs on CPU.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn webui:app --host 127.0.0.1 --port 8000
```

Open http://localhost:8000.

## Models

| Model | Params | Size |
|-------|--------|------|
| Micro | 40M | 41 MB |
| Mini | 80M | 80 MB |

Weights download automatically on first use from Hugging Face.

## Voices

Bella, Jasper, Luna, Bruno, Rosie, Hugo, Kiki, Leo
