// Text preprocessing for KittenTTS — ported from Python preprocess.py
// Expands numbers, currencies, ordinals, etc. into spoken words

const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALE = ["", "thousand", "million", "billion", "trillion"];

const ORDINAL_EXCEPTIONS = {
  one: "first", two: "second", three: "third", four: "fourth",
  five: "fifth", six: "sixth", seven: "seventh", eight: "eighth",
  nine: "ninth", twelve: "twelfth",
};

function threeDigitsToWords(n) {
  if (n === 0) return "";
  const parts = [];
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  if (hundreds) parts.push(`${ONES[hundreds]} hundred`);
  if (remainder < 20) {
    if (remainder) parts.push(ONES[remainder]);
  } else {
    const t = TENS[Math.floor(remainder / 10)];
    const o = ONES[remainder % 10];
    parts.push(o ? `${t}-${o}` : t);
  }
  return parts.join(" ");
}

export function numberToWords(n) {
  if (!Number.isInteger(n)) n = Math.floor(n);
  if (n === 0) return "zero";
  if (n < 0) return `negative ${numberToWords(-n)}`;
  if (n >= 100 && n <= 9999 && n % 100 === 0 && n % 1000 !== 0) {
    const h = Math.floor(n / 100);
    if (h < 20) return `${ONES[h]} hundred`;
  }
  const parts = [];
  let num = n;
  for (let i = 0; i < SCALE.length; i++) {
    const chunk = num % 1000;
    if (chunk) {
      const w = threeDigitsToWords(chunk);
      parts.push(SCALE[i] ? `${w} ${SCALE[i]}` : w);
    }
    num = Math.floor(num / 1000);
    if (num === 0) break;
  }
  return parts.reverse().join(" ");
}

function floatToWords(value, sep = "point") {
  let text = typeof value === "string" ? value : `${value}`;
  const negative = text.startsWith("-");
  if (negative) text = text.slice(1);
  let result;
  if (text.includes(".")) {
    const [intPart, decPart] = text.split(".");
    const intWords = intPart ? numberToWords(parseInt(intPart)) : "zero";
    const digitMap = ["zero", ...ONES.slice(1)];
    const decWords = [...decPart].map(d => digitMap[parseInt(d)]).join(" ");
    result = `${intWords} ${sep} ${decWords}`;
  } else {
    result = numberToWords(parseInt(text));
  }
  return negative ? `negative ${result}` : result;
}

function ordinalSuffix(n) {
  const word = numberToWords(n);
  let prefix, last, joiner;
  if (word.includes("-")) {
    const i = word.lastIndexOf("-");
    prefix = word.slice(0, i); last = word.slice(i + 1); joiner = "-";
  } else {
    const parts = word.split(" ");
    if (parts.length >= 2) {
      last = parts.pop(); prefix = parts.join(" "); joiner = " ";
    } else {
      prefix = ""; last = parts[0]; joiner = "";
    }
  }
  let lastOrd;
  if (ORDINAL_EXCEPTIONS[last]) {
    lastOrd = ORDINAL_EXCEPTIONS[last];
  } else if (last.endsWith("t")) {
    lastOrd = last + "h";
  } else if (last.endsWith("e")) {
    lastOrd = last.slice(0, -1) + "th";
  } else {
    lastOrd = last + "th";
  }
  return prefix ? `${prefix}${joiner}${lastOrd}` : lastOrd;
}

// --- Regex patterns ---
const RE_NUMBER = /(?<![a-zA-Z])-?[\d,]+(?:\.\d+)?/g;
const RE_ORDINAL = /\b(\d+)(st|nd|rd|th)\b/gi;
const RE_PERCENT = /(-?[\d,]+(?:\.\d+)?)\s*%/g;
const RE_CURRENCY = /([$€£¥₹₩₿])\s*([\d,]+(?:\.\d+)?)\s*([KMBT])?(?![a-zA-Z\d])/g;
const RE_TIME = /\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\b/gi;
const RE_RANGE = /(?<!\w)(\d+)-(\d+)(?!\w)/g;
const RE_MODEL_VER = /\b([a-zA-Z][a-zA-Z0-9]*)-(\d[\d.]*)(?=[^\d.]|$)/g;
const RE_UNIT = /(\d+(?:\.\d+)?)\s*(km|kg|mg|ml|gb|mb|kb|tb|hz|khz|mhz|ghz|mph|kph|°[cCfF]|[cCfF]°|ms|ns|µs)\b/gi;
const RE_SCALE = /(?<![a-zA-Z])(\d+(?:\.\d+)?)\s*([KMBT])(?![a-zA-Z\d])/g;
const RE_SCI = /(?<![a-zA-Z\d])(-?\d+(?:\.\d+)?)[eE]([+-]?\d+)(?![a-zA-Z\d])/g;
const RE_FRACTION = /\b(\d+)\s*\/\s*(\d+)\b/g;
const RE_DECADE = /\b(\d{1,3})0s\b/g;
const RE_LEAD_DEC = /(?<!\d)\.([\d])/g;
const RE_PHONE_11 = /(?<!\d-)(?<!\d)\b(\d{1,2})-(\d{3})-(\d{3})-(\d{4})\b(?!-\d)/g;
const RE_PHONE_10 = /(?<!\d-)(?<!\d)\b(\d{3})-(\d{3})-(\d{4})\b(?!-\d)/g;
const RE_PHONE_7 = /(?<!\d-)\b(\d{3})-(\d{4})\b(?!-\d)/g;
const RE_IP = /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g;

const UNIT_MAP = {
  km: "kilometers", kg: "kilograms", mg: "milligrams", ml: "milliliters",
  gb: "gigabytes", mb: "megabytes", kb: "kilobytes", tb: "terabytes",
  hz: "hertz", khz: "kilohertz", mhz: "megahertz", ghz: "gigahertz",
  mph: "miles per hour", kph: "kilometers per hour",
  ms: "milliseconds", ns: "nanoseconds", "µs": "microseconds",
  "°c": "degrees Celsius", "c°": "degrees Celsius",
  "°f": "degrees Fahrenheit", "f°": "degrees Fahrenheit",
};

const CURRENCY_SYMBOLS = { $: "dollar", "€": "euro", "£": "pound", "¥": "yen", "₹": "rupee", "₩": "won", "₿": "bitcoin" };
const SCALE_MAP = { K: "thousand", M: "million", B: "billion", T: "trillion" };
const DECADE_MAP = { 0: "hundreds", 1: "tens", 2: "twenties", 3: "thirties", 4: "forties", 5: "fifties", 6: "sixties", 7: "seventies", 8: "eighties", 9: "nineties" };

const DIGIT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
function digitsToWords(s) { return [...s].map(c => DIGIT_WORDS[parseInt(c)]).join(" "); }

function r(re) { return new RegExp(re.source, re.flags); } // clone regex to reset lastIndex

export function preprocessText(text) {
  // Normalize unicode
  text = text.normalize("NFC");
  // Remove HTML
  text = text.replace(/<[^>]+>/g, " ");
  // Remove URLs
  text = text.replace(/https?:\/\/\S+|www\.\S+/g, "");
  // Remove emails
  text = text.replace(/\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/gi, "");
  // Expand contractions
  text = text.replace(/\bcan't\b/gi, "cannot");
  text = text.replace(/\bwon't\b/gi, "will not");
  text = text.replace(/\bshan't\b/gi, "shall not");
  text = text.replace(/\bain't\b/gi, "is not");
  text = text.replace(/\blet's\b/gi, "let us");
  text = text.replace(/\b(\w+)n't\b/gi, "$1 not");
  text = text.replace(/\b(\w+)'re\b/gi, "$1 are");
  text = text.replace(/\b(\w+)'ve\b/gi, "$1 have");
  text = text.replace(/\b(\w+)'ll\b/gi, "$1 will");
  text = text.replace(/\b(\w+)'d\b/gi, "$1 would");
  text = text.replace(/\b(\w+)'m\b/gi, "$1 am");
  text = text.replace(/\bit's\b/gi, "it is");
  // IP addresses
  text = text.replace(r(RE_IP), (_, a, b, c, d) => [a, b, c, d].map(digitsToWords).join(" dot "));
  // Leading decimals
  text = text.replace(/(?<!\d)(-)\.([\d])/g, "$1" + "0.$2");
  text = text.replace(r(RE_LEAD_DEC), "0.$1");
  // Currency
  text = text.replace(r(RE_CURRENCY), (_, sym, raw, scale) => {
    raw = raw.replace(/,/g, "");
    const unit = CURRENCY_SYMBOLS[sym] || "";
    if (scale) {
      const num = raw.includes(".") ? floatToWords(raw) : numberToWords(parseInt(raw));
      return `${num} ${SCALE_MAP[scale]} ${unit}s`.trim();
    }
    if (raw.includes(".")) {
      const [intP, decP] = raw.split(".");
      const decVal = parseInt((decP + "00").slice(0, 2));
      let result = `${numberToWords(parseInt(intP))} ${unit}s`;
      if (decVal) result += ` and ${numberToWords(decVal)} cent${decVal !== 1 ? "s" : ""}`;
      return result;
    }
    const val = parseInt(raw);
    return `${numberToWords(val)} ${unit}${val !== 1 && unit ? "s" : ""}`;
  });
  // Percentages
  text = text.replace(r(RE_PERCENT), (_, raw) => {
    raw = raw.replace(/,/g, "");
    return (raw.includes(".") ? floatToWords(parseFloat(raw)) : numberToWords(parseInt(raw))) + " percent";
  });
  // Scientific notation
  text = text.replace(r(RE_SCI), (_, coeff, exp) => {
    const cw = coeff.includes(".") ? floatToWords(coeff) : numberToWords(parseInt(coeff));
    const e = parseInt(exp);
    return `${cw} times ten to the ${e < 0 ? "negative " : ""}${numberToWords(Math.abs(e))}`;
  });
  // Time
  text = text.replace(r(RE_TIME), (_, h, mins, _secs, ampm) => {
    const hi = parseInt(h), mi = parseInt(mins);
    const suffix = ampm ? " " + ampm.toLowerCase() : "";
    const hw = numberToWords(hi);
    if (mi === 0) return ampm ? `${hw}${suffix}` : `${hw} hundred${suffix}`;
    if (mi < 10) return `${hw} oh ${numberToWords(mi)}${suffix}`;
    return `${hw} ${numberToWords(mi)}${suffix}`;
  });
  // Ordinals
  text = text.replace(r(RE_ORDINAL), (_, n) => ordinalSuffix(parseInt(n)));
  // Units
  text = text.replace(r(RE_UNIT), (_, raw, unit) => {
    const expanded = UNIT_MAP[unit.toLowerCase()] || unit;
    const num = raw.includes(".") ? floatToWords(parseFloat(raw)) : numberToWords(parseInt(raw));
    return `${num} ${expanded}`;
  });
  // Scale suffixes
  text = text.replace(r(RE_SCALE), (_, raw, suf) => {
    const num = raw.includes(".") ? floatToWords(raw) : numberToWords(parseInt(raw));
    return `${num} ${SCALE_MAP[suf]}`;
  });
  // Fractions
  text = text.replace(r(RE_FRACTION), (_, num, den) => {
    const n = parseInt(num), d = parseInt(den);
    if (d === 0) return `${num}/${den}`;
    const nw = numberToWords(n);
    let dw;
    if (d === 2) dw = n === 1 ? "half" : "halves";
    else if (d === 4) dw = n === 1 ? "quarter" : "quarters";
    else { dw = ordinalSuffix(d); if (n !== 1) dw += "s"; }
    return `${nw} ${dw}`;
  });
  // Decades
  text = text.replace(r(RE_DECADE), (_, base) => {
    const b = parseInt(base), digit = b % 10;
    const dw = DECADE_MAP[digit] || "";
    return b < 10 ? dw : `${numberToWords(Math.floor(b / 10))} ${dw}`;
  });
  // Phone numbers
  text = text.replace(r(RE_PHONE_11), (_, a, b, c, d) => [a, b, c, d].map(digitsToWords).join(" "));
  text = text.replace(r(RE_PHONE_10), (_, a, b, c) => [a, b, c].map(digitsToWords).join(" "));
  text = text.replace(r(RE_PHONE_7), (_, a, b) => [a, b].map(digitsToWords).join(" "));
  // Ranges
  text = text.replace(r(RE_RANGE), (_, lo, hi) => `${numberToWords(parseInt(lo))} to ${numberToWords(parseInt(hi))}`);
  // Model names (GPT-3 → GPT 3)
  text = text.replace(r(RE_MODEL_VER), (_, name, ver) => `${name} ${ver}`);
  // Replace remaining numbers
  text = text.replace(r(RE_NUMBER), m => {
    const raw = m.replace(/,/g, "");
    if (raw.includes(".")) return floatToWords(raw);
    return numberToWords(parseInt(raw));
  });
  // Remove punctuation (keep spaces)
  text = text.replace(/[^\w\s]/g, " ");
  // Lowercase
  text = text.toLowerCase();
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text;
}
