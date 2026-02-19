# KittenTTS Web

Text-to-speech running entirely in your browser. No server, no GPU, no install.

**[Try it live](https://dipflip.github.io/KittenTTSWeb/)**

Built on [KittenTTS](https://github.com/KittenML/KittenTTS) using [ONNX Runtime Web](https://onnxruntime.ai/) and [eSpeak-NG WASM](https://github.com/nickvdh/phonemize-wasm) for phonemization. Everything runs client-side — nothing leaves your device.

## Models

| Model | Params | First load |
|-------|--------|------------|
| Micro | 40M | ~45 MB |
| Mini | 80M | ~82 MB |

Models are fetched from Hugging Face and cached by your browser.

## Voices

Bella, Jasper, Luna, Bruno, Rosie, Hugo, Kiki, Leo

## Run locally

```bash
git clone https://github.com/DipFlip/KittenTTSWeb.git
cd KittenTTSWeb/docs
python3 -m http.server 8080
```

Open http://localhost:8080.
