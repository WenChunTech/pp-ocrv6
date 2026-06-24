import init, { OarOcrWasm } from "/pkg/oar_ocr_wasm.js";
import * as ort from "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/ort.webgpu.min.mjs";

export const MODEL_BASE_URL = "/models";
export const MODEL_REGISTRY = {
  "pp-ocrv6_medium_det.onnx": {
    sha256: "eb13b44b25bb36f89528b68720af8a61d9cf381176107f465db1757b65d086e1",
    size: 62032837,
  },
  "pp-ocrv6_medium_rec.onnx": {
    sha256: "9c09abf0957f7968c7586464b7397b84ad2387a0497a351af40e9acc71b673ba",
    size: 76554979,
  },
  "pp-ocrv6_small_det.onnx": {
    sha256: "d73e0058b7a8086bbd57f3d10b8bcd4ff95363f67e06e2762b5e814fe9c9410e",
    size: 9880512,
  },
  "pp-ocrv6_small_rec.onnx": {
    sha256: "5435fd747c9e0efe15a96d0b378d5bd157e9492ed8fd80edf08f30d02fa24634",
    size: 21159378,
  },
  "pp-ocrv6_tiny_det.onnx": {
    sha256: "193bab7a04fca699a6c82e6abb5b81bdb28177f0abd4062552b04908dafb19f8",
    size: 1780590,
  },
  "pp-ocrv6_tiny_rec.onnx": {
    sha256: "9ef676d6ed3c88256a2d92c640c44f25b0c40947e111b14b8be8f594091563e6",
    size: 4462639,
  },
  "ppocrv6_dict.txt": {
    sha256: "b5f2bfe2bdd9448429e3e82b51c789775d9b42f2403d082b00662eb77e401c5d",
    size: 74947,
  },
  "ppocrv6_tiny_dict.txt": {
    sha256: "c5cbe34ef40c29c4df07ed012bf96569cb69a2d2a01a07027e9f13cb832bd9cd",
    size: 27156,
  },
};

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
    det: modelFile(preset.det),
    rec: modelFile(preset.rec),
    dict: modelFile(preset.dict),
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
  const [detModelBytes, recModelBytes, dict] = await Promise.all([
    fetchVerifiedBytes(urls.det.url, urls.det),
    fetchVerifiedBytes(urls.rec.url, urls.rec),
    fetchText(urls.dict.url, urls.dict),
  ]);
  const detSession = await createSession(detModelBytes);
  const recSession = await createSession(recModelBytes);

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
    configureOrtWasm();
    initPromise = init();
  }
  await initPromise;
}

function configureOrtWasm() {
  ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/";
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
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

function modelFile(fileName) {
  const entry = MODEL_REGISTRY[fileName];
  if (!entry) throw new Error(`未注册模型文件: ${fileName}`);
  return {
    fileName,
    url: `${MODEL_BASE_URL}/${fileName}`,
    ...entry,
  };
}

async function createSession(modelBytes) {
  if (navigator.gpu) {
    try {
      return await createSessionWithProviders(modelBytes, ["webgpu"]);
    } catch (error) {
      console.warn("WebGPU 初始化失败，回退到 WASM。", error);
    }
  }
  return createSessionWithProviders(modelBytes, ["wasm"]);
}

function createSessionWithProviders(modelBytes, executionProviders) {
  return ort.InferenceSession.create(modelBytes, {
    executionProviders,
    graphOptimizationLevel: "all",
  });
}

async function fetchText(url, expected) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`无法加载 ${url}: HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  await verifyBytes(bytes, expected);
  return new TextDecoder().decode(bytes);
}

async function fetchVerifiedBytes(url, expected) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`无法加载 ${url}: HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  await verifyBytes(bytes, expected);
  return bytes;
}

async function verifyBytes(bytes, expected) {
  if (bytes.byteLength !== expected.size) {
    throw new Error(`模型文件 ${expected.fileName} 大小不匹配: ${bytes.byteLength} != ${expected.size}`);
  }

  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  if (hash !== expected.sha256) {
    throw new Error(`模型文件 ${expected.fileName} SHA-256 校验失败`);
  }
}

function firstInputName(session, fallback) {
  return Array.isArray(session.inputNames) && session.inputNames.length > 0
    ? session.inputNames[0]
    : fallback;
}
