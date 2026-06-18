import init, { OarOcrWasm } from "/pkg/oar_ocr_wasm.js";
import * as ort from "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/ort.webgpu.min.mjs";

export const MODEL_BASE_URL = "/models";
export const MODEL_PRESETS = {
  tiny: {
    label: "PP-OCRv6 tiny",
    det: "pp-ocrv6_tiny_det.onnx",
    rec: "pp-ocrv6_tiny_rec.onnx",
    dict: "ppocrv6_tiny_dict.txt",
  },
  small: {
    label: "PP-OCRv6 small",
    det: "pp-ocrv6_small_det.onnx",
    rec: "pp-ocrv6_small_rec.onnx",
    dict: "ppocrv6_dict.txt",
  },
  medium: {
    label: "PP-OCRv6 medium",
    det: "pp-ocrv6_medium_det.onnx",
    rec: "pp-ocrv6_medium_rec.onnx",
    dict: "ppocrv6_dict.txt",
  },
};

const DEFAULT_OPTIONS = {
  detScoreThreshold: 0.2,
  detBoxThreshold: 0.45,
  detUnclipRatio: 1.4,
  recBatchSize: 8,
  dropScore: 0.3,
};

let initPromise;
const modelCache = new Map();

export function normalizeModel(model) {
  return Object.hasOwn(MODEL_PRESETS, model) ? model : "tiny";
}

export function selectedPreset(model) {
  return MODEL_PRESETS[normalizeModel(model)];
}

export function selectedModelUrls(model) {
  const preset = selectedPreset(model);
  return {
    det: `${MODEL_BASE_URL}/${preset.det}`,
    rec: `${MODEL_BASE_URL}/${preset.rec}`,
    dict: `${MODEL_BASE_URL}/${preset.dict}`,
  };
}

export async function getOcr(model = "tiny", options = {}) {
  const normalizedModel = normalizeModel(model);
  const resolvedOptions = { ...DEFAULT_OPTIONS, ...sanitizeOptions(options) };
  const cacheKey = `${normalizedModel}:${JSON.stringify(resolvedOptions)}`;

  if (!modelCache.has(cacheKey)) {
    modelCache.set(cacheKey, createOcr(normalizedModel, resolvedOptions));
  }

  return modelCache.get(cacheKey);
}

export async function predictImageBytes(bytes, options = {}) {
  const model = normalizeModel(options.model);
  const ocr = await getOcr(model, options);
  const result = await ocr.predictBytes(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  return filterByScore(result, options.dropScore ?? DEFAULT_OPTIONS.dropScore);
}

export function filterByScore(result, dropScore = DEFAULT_OPTIONS.dropScore) {
  const minScore = Number(dropScore) || 0;
  return {
    ...result,
    textRegions: result.textRegions.filter((region) => region.confidence >= minScore),
  };
}

export function modelNames() {
  return Object.keys(MODEL_PRESETS);
}

async function createOcr(model, options) {
  await ensureWasmReady();

  const urls = selectedModelUrls(model);
  const [detSession, recSession, dict] = await Promise.all([
    createSession(urls.det),
    createSession(urls.rec),
    fetchText(urls.dict),
  ]);

  return new OarOcrWasm(wrapOrtSession(detSession), wrapOrtSession(recSession), dict, {
    detInputName: firstInputName(detSession, "x"),
    recInputName: firstInputName(recSession, "x"),
    detScoreThreshold: options.detScoreThreshold,
    detBoxThreshold: options.detBoxThreshold,
    detUnclipRatio: options.detUnclipRatio,
    recBatchSize: options.recBatchSize,
    dropScore: options.dropScore,
  });
}

async function ensureWasmReady() {
  if (!initPromise) {
    initPromise = init().then(() => {
      ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/";
    });
  }
  await initPromise;
}

function sanitizeOptions(options) {
  return {
    detScoreThreshold: finiteNumber(options.detScoreThreshold, DEFAULT_OPTIONS.detScoreThreshold),
    detBoxThreshold: finiteNumber(options.detBoxThreshold, DEFAULT_OPTIONS.detBoxThreshold),
    detUnclipRatio: finiteNumber(options.detUnclipRatio, DEFAULT_OPTIONS.detUnclipRatio),
    recBatchSize: Math.max(1, Math.floor(finiteNumber(options.recBatchSize, DEFAULT_OPTIONS.recBatchSize))),
    dropScore: finiteNumber(options.dropScore, DEFAULT_OPTIONS.dropScore),
  };
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function wrapOrtSession(session) {
  return {
    inputNames: session.inputNames,
    outputNames: session.outputNames,
    async run(feeds) {
      const ortFeeds = {};
      for (const [name, tensor] of Object.entries(feeds)) {
        ortFeeds[name] =
          tensor instanceof ort.Tensor
            ? tensor
            : new ort.Tensor(tensor.type ?? "float32", tensor.data, tensor.dims);
      }
      return session.run(ortFeeds);
    },
  };
}

async function createSession(url) {
  const providers = navigator.gpu ? ["webgpu", "wasm"] : ["wasm"];
  return ort.InferenceSession.create(url, {
    executionProviders: providers,
    graphOptimizationLevel: "all",
  }).catch((error) => {
    if (!providers.includes("webgpu")) throw error;
    console.warn("WebGPU 初始化失败，回退到 WASM。", error);
    return ort.InferenceSession.create(url, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    });
  });
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`无法加载 ${url}: HTTP ${response.status}`);
  }
  return response.text();
}

function firstInputName(session, fallback) {
  return Array.isArray(session.inputNames) && session.inputNames.length > 0
    ? session.inputNames[0]
    : fallback;
}
