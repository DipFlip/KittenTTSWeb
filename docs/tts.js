// KittenTTS browser inference — phonemization + token mapping + ONNX

// Symbol-to-ID mapping extracted directly from KittenTTS TextCleaner.
// Some indices are orphaned (11, 14, 174) due to duplicate chars in the
// original Python symbol list — this is intentional and matches Python exactly.
const SYMBOL_TO_ID = new Map([
  ["\u0024", 0],  // $
  ["\u003b", 1],  // ;
  ["\u003a", 2],  // :
  ["\u002c", 3],  // ,
  ["\u002e", 4],  // .
  ["\u0021", 5],  // !
  ["\u003f", 6],  // ?
  ["\u00a1", 7],  ["\u00bf", 8],  ["\u2014", 9],  ["\u2026", 10],
  ["\u00ab", 12], ["\u00bb", 13], ["\u0022", 15], ["\u0020", 16],
  ["A", 17], ["B", 18], ["C", 19], ["D", 20], ["E", 21], ["F", 22],
  ["G", 23], ["H", 24], ["I", 25], ["J", 26], ["K", 27], ["L", 28],
  ["M", 29], ["N", 30], ["O", 31], ["P", 32], ["Q", 33], ["R", 34],
  ["S", 35], ["T", 36], ["U", 37], ["V", 38], ["W", 39], ["X", 40],
  ["Y", 41], ["Z", 42],
  ["a", 43], ["b", 44], ["c", 45], ["d", 46], ["e", 47], ["f", 48],
  ["g", 49], ["h", 50], ["i", 51], ["j", 52], ["k", 53], ["l", 54],
  ["m", 55], ["n", 56], ["o", 57], ["p", 58], ["q", 59], ["r", 60],
  ["s", 61], ["t", 62], ["u", 63], ["v", 64], ["w", 65], ["x", 66],
  ["y", 67], ["z", 68],
  ["\u0251", 69],  ["\u0250", 70],  ["\u0252", 71],  ["\u00e6", 72],
  ["\u0253", 73],  ["\u0299", 74],  ["\u03b2", 75],  ["\u0254", 76],
  ["\u0255", 77],  ["\u00e7", 78],  ["\u0257", 79],  ["\u0256", 80],
  ["\u00f0", 81],  ["\u02a4", 82],  ["\u0259", 83],  ["\u0258", 84],
  ["\u025a", 85],  ["\u025b", 86],  ["\u025c", 87],  ["\u025d", 88],
  ["\u025e", 89],  ["\u025f", 90],  ["\u0284", 91],  ["\u0261", 92],
  ["\u0260", 93],  ["\u0262", 94],  ["\u029b", 95],  ["\u0266", 96],
  ["\u0267", 97],  ["\u0127", 98],  ["\u0265", 99],  ["\u029c", 100],
  ["\u0268", 101], ["\u026a", 102], ["\u029d", 103], ["\u026d", 104],
  ["\u026c", 105], ["\u026b", 106], ["\u026e", 107], ["\u029f", 108],
  ["\u0271", 109], ["\u026f", 110], ["\u0270", 111], ["\u014b", 112],
  ["\u0273", 113], ["\u0272", 114], ["\u0274", 115], ["\u00f8", 116],
  ["\u0275", 117], ["\u0278", 118], ["\u03b8", 119], ["\u0153", 120],
  ["\u0276", 121], ["\u0298", 122], ["\u0279", 123], ["\u027a", 124],
  ["\u027e", 125], ["\u027b", 126], ["\u0280", 127], ["\u0281", 128],
  ["\u027d", 129], ["\u0282", 130], ["\u0283", 131], ["\u0288", 132],
  ["\u02a7", 133], ["\u0289", 134], ["\u028a", 135], ["\u028b", 136],
  ["\u2c71", 137], ["\u028c", 138], ["\u0263", 139], ["\u0264", 140],
  ["\u028d", 141], ["\u03c7", 142], ["\u028e", 143], ["\u028f", 144],
  ["\u0291", 145], ["\u0290", 146], ["\u0292", 147], ["\u0294", 148],
  ["\u02a1", 149], ["\u0295", 150], ["\u02a2", 151], ["\u01c0", 152],
  ["\u01c1", 153], ["\u01c2", 154], ["\u01c3", 155], ["\u02c8", 156],
  ["\u02cc", 157], ["\u02d0", 158], ["\u02d1", 159], ["\u02bc", 160],
  ["\u02b4", 161], ["\u02b0", 162], ["\u02b1", 163], ["\u02b2", 164],
  ["\u02b7", 165], ["\u02e0", 166], ["\u02e4", 167], ["\u02de", 168],
  ["\u2193", 169], ["\u2191", 170], ["\u2192", 171], ["\u2197", 172],
  ["\u2198", 173], ["\u0329", 175], ["\u0027", 176], ["\u1d7b", 177],
]);

// Unicode-aware tokenizer — JS \w only matches ASCII, but Python \w matches
// all Unicode letters/digits. Use \p{L}\p{N}\p{M} to match IPA characters.
function basicTokenize(text) {
  return text.match(/[\p{L}\p{N}\p{M}_]+|[^\s\p{L}\p{N}\p{M}_]/gu) || [];
}

function textToTokenIds(phonemes) {
  const tokens = basicTokenize(phonemes);
  const joined = tokens.join(" ");
  const ids = [0]; // start token
  for (const ch of joined) {
    const id = SYMBOL_TO_ID.get(ch);
    if (id !== undefined) ids.push(id);
  }
  ids.push(0); // end token
  return ids;
}

// --- Voice loading from pre-converted .bin files ---
async function loadVoicesFromBin(baseUrl) {
  const manifestResp = await fetch(`${baseUrl}/manifest.json`);
  const manifest = await manifestResp.json();

  const voices = {};
  const entries = Object.entries(manifest);
  const results = await Promise.all(
    entries.map(([key, info]) =>
      fetch(`${baseUrl}/${info.file}`).then(r => r.arrayBuffer()).then(buf => [key, buf, info.shape])
    )
  );
  for (const [key, buf, shape] of results) {
    voices[key] = { data: new Float32Array(buf), shape };
  }
  return voices;
}

// --- Chunking ---
function ensurePunctuation(text) {
  text = text.trim();
  if (!text) return text;
  if (!".!?,;:".includes(text[text.length - 1])) text += ",";
  return text;
}

function chunkText(text, maxLen = 400) {
  const sentences = text.split(/[.!?]+/);
  const chunks = [];
  for (let sentence of sentences) {
    sentence = sentence.trim();
    if (!sentence) continue;
    if (sentence.length <= maxLen) {
      chunks.push(ensurePunctuation(sentence));
    } else {
      const words = sentence.split(/\s+/);
      let temp = "";
      for (const word of words) {
        if (temp.length + word.length + 1 <= maxLen) {
          temp = temp ? temp + " " + word : word;
        } else {
          if (temp) chunks.push(ensurePunctuation(temp));
          temp = word;
        }
      }
      if (temp) chunks.push(ensurePunctuation(temp));
    }
  }
  return chunks.length ? chunks : [ensurePunctuation(text)];
}

// Phonemize with punctuation preservation (the Xenova phonemizer strips
// punctuation, but KittenTTS expects it). We strip trailing punctuation
// before phonemizing, then re-append it.
async function phonemizeWithPunctuation(phonemizeFn, text) {
  const punctMatch = text.match(/([.!?,;:]+)\s*$/);
  const trailingPunct = punctMatch ? punctMatch[1] : "";
  const cleanText = trailingPunct ? text.slice(0, -trailingPunct.length).trim() : text;

  const results = await phonemizeFn(cleanText, "en-us");
  let phonemes = results.join(" ").trim();
  if (trailingPunct) {
    phonemes += trailingPunct + " ";
  }
  return phonemes;
}

// --- Main TTS class ---
export class KittenTTSBrowser {
  constructor() {
    this.session = null;
    this.voices = null;
    this.phonemizer = null;
    this.modelKey = null;
    this.voiceAliases = {};
  }

  async loadModel(modelKey, baseUrl = ".") {
    if (this.modelKey === modelKey && this.session) return;

    const configs = {
      "nano-int8-15M": {
        repo: "KittenML/kitten-tts-nano-0.8-int8",
        onnx: "kitten_tts_nano_v0_8.onnx",
        voiceDir: "nano-int8",
      },
      "nano-15M": {
        repo: "KittenML/kitten-tts-nano-0.8-fp32",
        onnx: "kitten_tts_nano_v0_8.onnx",
        voiceDir: "nano",
      },
      "micro-40M": {
        repo: "KittenML/kitten-tts-micro-0.8",
        onnx: "kitten_tts_micro_v0_8.onnx",
        voiceDir: "micro",
      },
      "mini-80M": {
        repo: "KittenML/kitten-tts-mini-0.8",
        onnx: "kitten_tts_mini_v0_8.onnx",
        voiceDir: "mini",
      },
    };

    const cfg = configs[modelKey];
    if (!cfg) throw new Error(`Unknown model: ${modelKey}`);

    const hfBase = `https://huggingface.co/${cfg.repo}/resolve/main`;

    // Load config from local pre-converted voices
    const configResp = await fetch(`${baseUrl}/voices/${cfg.voiceDir}/config.json`);
    const config = await configResp.json();
    this.voiceAliases = config.voice_aliases || {};
    this.speedPriors = config.speed_priors || {};

    // Load ONNX model from HuggingFace + voices from local .bin files
    const ort = window.ort;
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/";

    const [session, voices] = await Promise.all([
      ort.InferenceSession.create(`${hfBase}/${cfg.onnx}`, {
        executionProviders: ["wasm"],
      }),
      loadVoicesFromBin(`${baseUrl}/voices/${cfg.voiceDir}`),
    ]);

    this.session = session;
    this.voices = voices;
    this.modelKey = modelKey;
  }

  async ensurePhonemizerReady() {
    if (this.phonemizer) return;
    // Polyfill: Safari/iOS lack ReadableStream async iteration, which phonemizer needs
    if (typeof ReadableStream !== "undefined" && !ReadableStream.prototype[Symbol.asyncIterator]) {
      ReadableStream.prototype[Symbol.asyncIterator] = async function* () {
        const reader = this.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            yield value;
          }
        } finally {
          reader.releaseLock();
        }
      };
    }
    const mod = await import("https://cdn.jsdelivr.net/npm/phonemizer@1.2.1/+esm");
    this.phonemizer = mod.phonemize;
  }

  async generate(text, voice = "Jasper", speed = 1.0) {
    await this.ensurePhonemizerReady();
    if (!this.session) throw new Error("Model not loaded");

    // Resolve voice alias
    const voiceId = this.voiceAliases[voice] || voice;
    const voiceData = this.voices[voiceId];
    if (!voiceData) throw new Error(`Voice '${voice}' not found. Available: ${Object.keys(this.voices).join(", ")}`);

    const chunks = chunkText(text);
    const audioChunks = [];

    for (const chunk of chunks) {
      // Phonemize with punctuation preservation
      const phonemes = await phonemizeWithPunctuation(this.phonemizer, chunk);

      // Tokenize
      const tokenIds = textToTokenIds(phonemes);

      // Get style vector based on text length
      const refId = Math.min(text.length, voiceData.shape[0] - 1);
      const styleOffset = refId * voiceData.shape[1];
      const styleSlice = voiceData.data.slice(styleOffset, styleOffset + voiceData.shape[1]);

      // Apply speed prior if model defines one for this voice
      let effectiveSpeed = speed;
      if (this.speedPriors[voiceId]) {
        effectiveSpeed *= this.speedPriors[voiceId];
      }

      // Build tensors
      const ort = window.ort;
      const inputIds = new ort.Tensor("int64", BigInt64Array.from(tokenIds.map(BigInt)), [1, tokenIds.length]);
      const style = new ort.Tensor("float32", styleSlice, [1, voiceData.shape[1]]);
      const speedTensor = new ort.Tensor("float32", new Float32Array([effectiveSpeed]), [1]);

      // Run inference
      const results = await this.session.run({
        input_ids: inputIds,
        style: style,
        speed: speedTensor,
      });

      const waveform = results.waveform.data;
      // Trim trailing silence (match Python: audio[..., :-5000])
      const trimmed = waveform.slice(0, Math.max(0, waveform.length - 5000));
      audioChunks.push(trimmed);
    }

    // Concatenate chunks
    const totalLen = audioChunks.reduce((s, c) => s + c.length, 0);
    const audio = new Float32Array(totalLen);
    let offset = 0;
    for (const chunk of audioChunks) {
      audio.set(chunk, offset);
      offset += chunk.length;
    }
    return audio;
  }
}
