# KittenTTS Web

Text-to-speech running entirely in your browser. No server, no GPU, no install.

**[Try it live](https://dipflip.github.io/KittenTTSWeb/)**

Built on [KittenTTS](https://github.com/KittenML/KittenTTS) with [ONNX Runtime Web](https://onnxruntime.ai/) and [eSpeak-NG WASM](https://github.com/nickvdh/nickvdh.github.io/tree/master/nickvdh/nickvdh.github.io/tree/master/nickvdh/nickvdh.github.io/tree/master/nickvdh/espeak-ng-wasm).

## How it works

1. Text preprocessing expands numbers, contractions, etc. into words
2. eSpeak-NG (compiled to WebAssembly) converts text to IPA phonemes
3. A token mapper converts phonemes to model input IDs
4. ONNX Runtime Web runs the TTS model in your browser (WASM backend)
5. Audio plays directly — nothing leaves your device

## Models

| Model | Params | Download |
|-------|--------|----------|
| Micro | 40M | ~45 MB (first load) |
| Mini | 80M | ~82 MB (first load) |

Models are fetched from Hugging Face and cached by your browser.

## Voices

Bella, Jasper, Luna, Bruno, Rosie, Hugo, Kiki, Leo
