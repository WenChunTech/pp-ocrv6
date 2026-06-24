import {
  filterByScore,
  getOcr,
  normalizeModel,
  selectedPreset,
} from "./ocr-engine.js";

const ui = globalThis.PPOCRV6_UI;
const translate = (key, values) => ui?.t?.(key, values) ?? key;

const state = {
  ocr: null,
  wasmReady: false,
  selectedModel: "tiny",
  loadedModel: null,
  file: null,
  imageBitmap: null,
  lastResult: null,
  lastElapsedMs: 0,
  busy: false,
  status: null,
};

const elements = {
  modelSelect: document.querySelector("#modelSelect"),
  currentModelName: document.querySelector("#currentModelName"),
  imageInput: document.querySelector("#imageInput"),
  runButton: document.querySelector("#runButton"),
  clearButton: document.querySelector("#clearButton"),
  copyButton: document.querySelector("#copyButton"),
  dropScore: document.querySelector("#dropScore"),
  statusDot: document.querySelector("#statusDot"),
  statusTitle: document.querySelector("#statusTitle"),
  statusText: document.querySelector("#statusText"),
  canvas: document.querySelector("#previewCanvas"),
  emptyPreview: document.querySelector("#emptyPreview"),
  imageMeta: document.querySelector("#imageMeta"),
  resultList: document.querySelector("#resultList"),
  emptyResults: document.querySelector("#emptyResults"),
};

const canvasContext = elements.canvas.getContext("2d");

updateModelName();

ui?.onLanguageChange?.(() => {
  updateModelName();
  refreshTranslatedState();
});

elements.modelSelect.addEventListener("change", handleModelChange);
elements.imageInput.addEventListener("change", handleFileChange);
elements.runButton.addEventListener("click", runOcr);
elements.clearButton.addEventListener("click", clearAll);
elements.copyButton.addEventListener("click", copyResultText);
elements.dropScore.addEventListener("change", () => {
  if (!state.lastResult) return;
  state.lastResult = filterByScore(state.lastResult.raw ?? state.lastResult, Number(elements.dropScore.value));
  drawResult(state.lastResult);
  renderResults(state.lastResult, state.lastElapsedMs);
});

boot().catch((error) => {
  console.error(error);
  setStatus("status.failed.title", errorMessage(error), "error");
});

async function boot() {
  state.wasmReady = true;
  setStatus("status.readyToLoad.title", "status.readyToLoad.text", "ready");
  updateControls();
}

async function loadSelectedModel() {
  if (state.ocr && state.loadedModel === state.selectedModel) return state.ocr;

  const preset = selectedPreset(state.selectedModel);
  state.ocr = null;
  state.loadedModel = null;
  state.lastResult = null;
  state.lastElapsedMs = 0;
  elements.resultList.replaceChildren();
  elements.emptyResults.hidden = false;
  elements.emptyResults.textContent = translate("ocr.emptyResults");
  elements.copyButton.disabled = true;
  updateModelName();
  updateControls();

  setStatus("status.loadingModel.title", "status.loadingModel.text", "loading", { model: preset.label });
  const ocr = await getOcr(state.selectedModel, {
    detScoreThreshold: 0.2,
    detBoxThreshold: 0.45,
    detUnclipRatio: 1.4,
    recBatchSize: 8,
    dropScore: Number(elements.dropScore.value),
  });
  state.ocr = ocr;
  state.loadedModel = state.selectedModel;

  setStatus("status.modelReady.title", "status.modelReady.text", "ready", { model: preset.label });
  updateControls();
  return ocr;
}

function handleModelChange(event) {
  state.selectedModel = normalizeModel(event.target.value);
  state.ocr = null;
  state.loadedModel = null;
  state.lastResult = null;
  state.lastElapsedMs = 0;
  elements.resultList.replaceChildren();
  elements.emptyResults.hidden = false;
  elements.emptyResults.textContent = translate("ocr.emptyResults");
  elements.copyButton.disabled = true;
  updateModelName();
  setStatus("status.readyToLoad.title", "status.readyToLoad.text", "ready");
  updateControls();
}

function updateModelName() {
  const preset = selectedPreset(state.selectedModel);
  elements.currentModelName.textContent = preset.label;
}

async function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  state.file = file;
  state.lastResult = null;
  state.lastElapsedMs = 0;
  elements.resultList.replaceChildren();
  elements.emptyResults.hidden = false;
  elements.emptyResults.textContent = translate("ocr.emptyResults");
  elements.copyButton.disabled = true;

  state.imageBitmap = await createImageBitmap(file);
  drawImageOnly();
  elements.imageMeta.textContent = translate("ocr.imageMeta", {
    name: file.name,
    width: state.imageBitmap.width,
    height: state.imageBitmap.height,
  });
  setStatus("status.imageSelected.title", "status.imageSelected.text", "ready");
  updateControls();
}

async function runOcr() {
  if (!state.file || state.busy) return;

  state.busy = true;
  updateControls();
  const startedAt = performance.now();

  try {
    const ocr = await loadSelectedModel();
    setStatus("status.running.title", "status.running.text", "loading");
    const bytes = new Uint8Array(await state.file.arrayBuffer());
    const rawResult = await ocr.predictBytes(bytes);
    const result = filterByScore(rawResult, Number(elements.dropScore.value));
    result.raw = rawResult;
    state.lastResult = result;
    state.lastElapsedMs = performance.now() - startedAt;
    drawResult(result);
    renderResults(result, state.lastElapsedMs);
    setStatus("status.done.title", "status.done.text", "ready", {
      count: result.textRegions.length,
      time: formatMs(state.lastElapsedMs),
    });
  } catch (error) {
    console.error(error);
    setStatus("status.failed.title", errorMessage(error), "error");
  } finally {
    state.busy = false;
    updateControls();
  }
}

function drawImageOnly() {
  if (!state.imageBitmap) return;
  elements.canvas.width = state.imageBitmap.width;
  elements.canvas.height = state.imageBitmap.height;
  canvasContext.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
  canvasContext.drawImage(state.imageBitmap, 0, 0);
  elements.emptyPreview.hidden = true;
}

function drawResult(result) {
  drawImageOnly();
  canvasContext.lineWidth = Math.max(2, Math.round(elements.canvas.width / 480));
  canvasContext.font = `${Math.max(14, Math.round(elements.canvas.width / 52))}px sans-serif`;
  canvasContext.textBaseline = "top";

  result.textRegions.forEach((region, index) => {
    const points = region.boundingBox;
    if (!points.length) return;

    canvasContext.beginPath();
    canvasContext.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => canvasContext.lineTo(point.x, point.y));
    canvasContext.closePath();
    canvasContext.strokeStyle = "#0f9f6e";
    canvasContext.fillStyle = "rgba(15, 159, 110, 0.12)";
    canvasContext.fill();
    canvasContext.stroke();

    const label = `${index + 1}`;
    const labelX = Math.max(0, Math.min(...points.map((point) => point.x)));
    const labelY = Math.max(0, Math.min(...points.map((point) => point.y)) - 24);
    const labelWidth = canvasContext.measureText(label).width + 12;
    canvasContext.fillStyle = "#0f9f6e";
    canvasContext.fillRect(labelX, labelY, labelWidth, 22);
    canvasContext.fillStyle = "#ffffff";
    canvasContext.fillText(label, labelX + 6, labelY + 3);
  });
}

function renderResults(result, elapsedMs) {
  elements.resultList.replaceChildren();
  elements.emptyResults.hidden = result.textRegions.length > 0;
  elements.copyButton.disabled = result.textRegions.length === 0;

  result.textRegions.forEach((region, index) => {
    const item = document.createElement("li");
    item.className = "result-item";

    const text = document.createElement("strong");
    text.textContent = `${index + 1}. ${region.text}`;

    const meta = document.createElement("span");
    meta.textContent = `${translate("ocr.confidence")}: ${region.confidence.toFixed(3)} · ${formatBox(region.boundingBox)}`;

    item.append(text, meta);
    elements.resultList.append(item);
  });

  if (result.textRegions.length === 0) {
    elements.emptyResults.textContent = elapsedMs > 0
      ? translate("ocr.noThresholdResults", { time: formatMs(elapsedMs) })
      : translate("ocr.noThresholdResultsNoTime");
  }
}

async function copyResultText() {
  const text = state.lastResult?.textRegions.map((region) => region.text).join("\n") ?? "";
  if (!text) return;
  await navigator.clipboard.writeText(text);
  setStatus("status.copied.title", "status.copied.text", "ready");
}

function clearAll() {
  state.file = null;
  state.imageBitmap = null;
  state.lastResult = null;
  state.lastElapsedMs = 0;
  elements.imageInput.value = "";
  elements.canvas.width = 0;
  elements.canvas.height = 0;
  elements.emptyPreview.hidden = false;
  elements.imageMeta.textContent = translate("ocr.imageMetaEmpty");
  elements.resultList.replaceChildren();
  elements.emptyResults.hidden = false;
  elements.emptyResults.textContent = translate("ocr.emptyResults");
  elements.copyButton.disabled = true;
  const preset = selectedPreset(state.selectedModel);
  setStatus(
    state.ocr ? "status.modelReady.title" : "status.readyToLoad.title",
    state.ocr ? "status.modelReady.text" : "status.readyToLoad.text",
    "ready",
    state.ocr ? { model: preset.label } : {},
  );
  updateControls();
}

function updateControls() {
  elements.runButton.disabled = !state.file || state.busy;
  elements.clearButton.disabled = !state.file && !state.lastResult;
  elements.imageInput.disabled = state.busy;
  elements.modelSelect.disabled = !state.wasmReady || state.busy;
}

function setStatus(titleKey, textKeyOrValue, kind, values = {}) {
  state.status = { titleKey, textKeyOrValue, kind, values };
  elements.statusTitle.textContent = translate(titleKey, values);
  elements.statusText.textContent = isTranslationKey(textKeyOrValue)
    ? translate(textKeyOrValue, values)
    : textKeyOrValue;
  elements.statusDot.className = `status-dot ${kind === "ready" ? "ready" : kind === "error" ? "error" : ""}`;
}

function refreshTranslatedState() {
  if (state.status) {
    setStatus(state.status.titleKey, state.status.textKeyOrValue, state.status.kind, state.status.values);
  }
  if (!state.file) {
    elements.imageMeta.textContent = translate("ocr.imageMetaEmpty");
  } else if (state.imageBitmap) {
    elements.imageMeta.textContent = translate("ocr.imageMeta", {
      name: state.file.name,
      width: state.imageBitmap.width,
      height: state.imageBitmap.height,
    });
  }
  if (state.lastResult) {
    renderResults(state.lastResult, state.lastElapsedMs);
  } else {
    elements.emptyResults.textContent = translate("ocr.emptyResults");
  }
}

function isTranslationKey(value) {
  return typeof value === "string" && value.includes(".");
}

function formatMs(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

function formatBox(points) {
  if (!points.length) return "[]";
  return points.map((point) => `[${Math.round(point.x)}, ${Math.round(point.y)}]`).join(" ");
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
