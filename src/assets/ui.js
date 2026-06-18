const STORAGE_KEYS = {
  language: "ppocrv6.language",
  legacyTheme: "ppocrv6.theme",
  themePreference: "ppocrv6.themePreference",
};

const THEME_CHOICES = ["system", "light", "dark"];
const systemThemeQuery = globalThis.matchMedia?.("(prefers-color-scheme: dark)");

const TRANSLATIONS = {
  en: {
    "nav.home": "Home",
    "nav.ocr": "OCR",
    "controls.language": "Language",
    "controls.theme": "Theme",
    "theme.system": "System",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "home.eyebrow": "OAR OCR · WebAssembly · Hono",
    "home.title": "PP-OCRv6 browser OCR",
    "home.subtitle": "Run text detection and recognition locally in your browser with oar-ocr-wasm, onnxruntime-web, and bundled PP-OCRv6 models.",
    "home.start": "Start OCR",
    "home.defaultModel": "Default model",
    "home.featureLocalTitle": "Local-first OCR",
    "home.featureLocalText": "Images stay in the browser. OCR runs through WebAssembly and onnxruntime-web.",
    "home.featureModelsTitle": "Three model presets",
    "home.featureModelsText": "Choose tiny, small, or medium to balance speed and accuracy.",
    "home.featureGpuTitle": "WebGPU fallback",
    "home.featureGpuText": "The page tries WebGPU first and falls back to Wasm when needed.",
    "home.featureVisualTitle": "Visual results",
    "home.featureVisualText": "Preview detected text boxes, confidence scores, and recognized text.",
    "ocr.eyebrow": "OAR OCR · WebAssembly",
    "ocr.title": "Browser OCR recognition",
    "ocr.subtitle": "Use the bundled oar-ocr-wasm module with onnxruntime-web and PP-OCRv6 tiny/small/medium models directly in your browser.",
    "ocr.currentModel": "Current model",
    "ocr.model": "Model",
    "ocr.modelTiny": "tiny · faster",
    "ocr.modelSmall": "small · balanced",
    "ocr.modelMedium": "medium · higher accuracy",
    "ocr.chooseImage": "Choose image",
    "ocr.run": "Run OCR",
    "ocr.clear": "Clear",
    "ocr.minConfidence": "Min confidence",
    "ocr.initialStatusTitle": "Preparing model",
    "ocr.initialStatusText": "The first load downloads the Wasm runtime and the selected model.",
    "ocr.previewTitle": "Image preview",
    "ocr.imageMetaEmpty": "No image selected",
    "ocr.previewEmpty": "Choose an image to preview detected text boxes.",
    "ocr.resultsTitle": "OCR results",
    "ocr.copy": "Copy text",
    "ocr.emptyResults": "No results yet",
    "status.init.title": "Initializing Wasm",
    "status.init.text": "Loading the oar-ocr-wasm module…",
    "status.loadingModel.title": "Loading {model}",
    "status.loadingModel.text": "Downloading detection, recognition, and dictionary files…",
    "status.modelReady.title": "{model} is ready",
    "status.modelReady.text": "Choose an image and run OCR.",
    "status.imageSelected.title": "Image selected",
    "status.imageSelected.text": "Click Run OCR to start recognition.",
    "status.running.title": "Recognizing",
    "status.running.text": "Encoding the image, running model inference, and post-processing in the browser…",
    "status.done.title": "Recognition complete",
    "status.done.text": "Detected {count} text regions in {time}.",
    "status.failed.title": "Recognition failed",
    "status.copied.title": "Copied",
    "status.copied.text": "Recognized text has been copied to the clipboard.",
    "status.loadingFallback.title": "Preparing model",
    "status.loadingFallback.text": "The model is still loading.",
    "ocr.imageMeta": "{name} · {width}×{height}",
    "ocr.noThresholdResults": "No text regions passed the current confidence threshold in {time}.",
    "ocr.noThresholdResultsNoTime": "No text regions passed the current confidence threshold.",
    "ocr.confidence": "confidence",
    "notFound.title": "Page not found",
    "notFound.subtitle": "Return home or open the OCR page.",
    "notFound.home": "Home",
    "notFound.ocr": "Open OCR",
  },
  zh: {
    "nav.home": "首页",
    "nav.ocr": "OCR",
    "controls.language": "语言",
    "controls.theme": "主题",
    "theme.system": "跟随系统",
    "theme.light": "浅色",
    "theme.dark": "深色",
    "home.eyebrow": "OAR OCR · WebAssembly · Hono",
    "home.title": "PP-OCRv6 浏览器端 OCR",
    "home.subtitle": "使用 oar-ocr-wasm、onnxruntime-web 和内置 PP-OCRv6 模型，在浏览器本地完成文字检测与识别。",
    "home.start": "开始识别",
    "home.defaultModel": "默认模型",
    "home.featureLocalTitle": "本地优先 OCR",
    "home.featureLocalText": "图片保留在浏览器中，通过 WebAssembly 和 onnxruntime-web 执行 OCR。",
    "home.featureModelsTitle": "三档模型预设",
    "home.featureModelsText": "可选择 tiny、small 或 medium，在速度与精度之间平衡。",
    "home.featureGpuTitle": "WebGPU 回退",
    "home.featureGpuText": "页面优先尝试 WebGPU，必要时自动回退到 Wasm。",
    "home.featureVisualTitle": "可视化结果",
    "home.featureVisualText": "预览文本检测框、置信度分数和识别文本。",
    "ocr.eyebrow": "OAR OCR · WebAssembly",
    "ocr.title": "浏览器端 OCR 识别",
    "ocr.subtitle": "使用内置 oar-ocr-wasm 模块，搭配 onnxruntime-web 和 PP-OCRv6 tiny/small/medium 模型在浏览器中完成识别。",
    "ocr.currentModel": "当前模型",
    "ocr.model": "模型",
    "ocr.modelTiny": "tiny · 更快",
    "ocr.modelSmall": "small · 均衡",
    "ocr.modelMedium": "medium · 更高精度",
    "ocr.chooseImage": "选择图片",
    "ocr.run": "开始识别",
    "ocr.clear": "清空",
    "ocr.minConfidence": "最低置信度",
    "ocr.initialStatusTitle": "准备加载模型",
    "ocr.initialStatusText": "首次加载需要下载 Wasm runtime 与所选模型。",
    "ocr.previewTitle": "图片预览",
    "ocr.imageMetaEmpty": "未选择图片",
    "ocr.previewEmpty": "选择一张图片后将在此展示识别框。",
    "ocr.resultsTitle": "识别结果",
    "ocr.copy": "复制文本",
    "ocr.emptyResults": "暂无结果",
    "status.init.title": "正在初始化 Wasm",
    "status.init.text": "加载 oar-ocr-wasm 模块…",
    "status.loadingModel.title": "正在加载 {model}",
    "status.loadingModel.text": "下载 detection、recognition 与字典文件…",
    "status.modelReady.title": "{model} 已就绪",
    "status.modelReady.text": "请选择图片并点击开始识别。",
    "status.imageSelected.title": "图片已选择",
    "status.imageSelected.text": "点击开始识别运行 OCR。",
    "status.running.title": "正在识别",
    "status.running.text": "图片编码、模型推理和后处理正在浏览器中运行…",
    "status.done.title": "识别完成",
    "status.done.text": "检测到 {count} 个文本区域，用时 {time}。",
    "status.failed.title": "识别失败",
    "status.copied.title": "已复制",
    "status.copied.text": "识别文本已复制到剪贴板。",
    "status.loadingFallback.title": "准备加载模型",
    "status.loadingFallback.text": "模型仍在加载。",
    "ocr.imageMeta": "{name} · {width}×{height}",
    "ocr.noThresholdResults": "没有超过当前置信度阈值的文本区域，用时 {time}。",
    "ocr.noThresholdResultsNoTime": "没有超过当前置信度阈值的文本区域。",
    "ocr.confidence": "置信度",
    "notFound.title": "页面不存在",
    "notFound.subtitle": "请返回首页，或打开 OCR 页面继续使用。",
    "notFound.home": "返回首页",
    "notFound.ocr": "打开 OCR",
  },
};

const languageCallbacks = new Set();
let currentLanguage = normalizeLanguage(localStorage.getItem(STORAGE_KEYS.language) ?? "en");
let currentThemePreference = normalizeThemePreference(
  localStorage.getItem(STORAGE_KEYS.themePreference) ?? migrateLegacyThemePreference(),
);

function t(key, values = {}) {
  const template = TRANSLATIONS[currentLanguage]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
}

function setLanguage(language) {
  currentLanguage = normalizeLanguage(language);
  localStorage.setItem(STORAGE_KEYS.language, currentLanguage);
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
  document.querySelectorAll("[data-language]").forEach((button) => {
    const active = button.dataset.language === currentLanguage;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  languageCallbacks.forEach((callback) => callback(currentLanguage));
}

function setTheme(themePreference) {
  currentThemePreference = normalizeThemePreference(themePreference);
  localStorage.setItem(STORAGE_KEYS.themePreference, currentThemePreference);
  localStorage.removeItem(STORAGE_KEYS.legacyTheme);
  applyThemePreference();
}

function applyThemePreference() {
  const resolvedTheme = resolveTheme(currentThemePreference);
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themePreference = currentThemePreference;
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    const active = button.dataset.themeChoice === currentThemePreference;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function resolveTheme(themePreference) {
  if (themePreference === "dark" || themePreference === "light") return themePreference;
  return systemThemeQuery?.matches ? "dark" : "light";
}

function normalizeLanguage(language) {
  return language === "zh" ? "zh" : "en";
}

function migrateLegacyThemePreference() {
  const legacyTheme = localStorage.getItem(STORAGE_KEYS.legacyTheme);
  localStorage.removeItem(STORAGE_KEYS.legacyTheme);
  return legacyTheme === "dark" || legacyTheme === "light" ? "system" : "system";
}

function normalizeThemePreference(themePreference) {
  return THEME_CHOICES.includes(themePreference) ? themePreference : "system";
}

function initControls() {
  document.addEventListener("click", (event) => {
    const languageButton = event.target.closest?.("[data-language]");
    if (languageButton) {
      setLanguage(languageButton.dataset.language);
      return;
    }

    const themeButton = event.target.closest?.("[data-theme-choice]");
    if (themeButton) setTheme(themeButton.dataset.themeChoice);
  });

  setTheme(currentThemePreference);
  setLanguage(currentLanguage);
}

systemThemeQuery?.addEventListener("change", () => {
  if (currentThemePreference === "system") applyThemePreference();
});

globalThis.PPOCRV6_UI = {
  t,
  getLanguage: () => currentLanguage,
  setLanguage,
  getTheme: () => resolveTheme(currentThemePreference),
  getThemePreference: () => currentThemePreference,
  setTheme,
  onLanguageChange(callback) {
    languageCallbacks.add(callback);
    return () => languageCallbacks.delete(callback);
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initControls, { once: true });
} else {
  initControls();
}
