import { Hono } from "hono";
import type { Context } from "hono";

type FileBlob = Blob & { exists?: () => Promise<boolean> };

interface RuntimeDeno {
  env?: { get(name: string): string | undefined };
  readFile?: (path: string | URL) => Promise<Uint8Array>;
  serve?: (
    options: { hostname?: string; port: number },
    handler: (request: Request) => Response | Promise<Response>,
  ) => unknown;
}

interface RuntimeBun {
  env?: Record<string, string | undefined>;
  file?: (path: string | URL) => FileBlob;
}

const runtime = globalThis as typeof globalThis & {
  Bun?: RuntimeBun;
  Deno?: RuntimeDeno;
};

const app = new Hono();
const publicRoot = new URL("../public/", import.meta.url);
const wasmPkgRoot = new URL("pkg/", publicRoot);
const wasmModelsRoot = new URL("models/", publicRoot);
const projectAssetsRoot = new URL("assets/", import.meta.url);

app.get("/", (c) => html(c, homePage()));
app.get("/ocr", (c) => html(c, ocrPage()));
app.get(
  "/assets/:file",
  async (c) => serveStaticFile(c, projectAssetsRoot, c.req.param("file")),
);
app.get(
  "/pkg/:file",
  async (c) => serveStaticFile(c, wasmPkgRoot, c.req.param("file")),
);
app.get(
  "/models/:file",
  async (c) => serveStaticFile(c, wasmModelsRoot, c.req.param("file")),
);

app.notFound((c) => c.html(renderPage(notFoundPage()), 404));

const port = Number(readEnv("PORT") ?? "3000");

if (runtime.Deno?.serve && import.meta.main) {
  runtime.Deno.serve({ port }, app.fetch);
}

export default {
  port,
  fetch: app.fetch,
};

function readEnv(name: string): string | undefined {
  try {
    const value = runtime.Deno?.env?.get(name);
    if (value !== undefined) return value;
  } catch {
    // Deno requires --allow-env. Fall through to Bun or default values.
  }
  return runtime.Bun?.env?.[name];
}

function html(c: Context, body: string): Response {
  return c.html(renderPage(body));
}

async function serveStaticFile(
  c: Context,
  baseUrl: URL,
  fileName: string,
): Promise<Response> {
  fileName = fileName.split("?")[0] ?? fileName;

  if (!isSafeStaticFileName(fileName)) {
    return c.text("Bad request", 400);
  }

  const fileUrl = new URL(fileName, baseUrl);
  const file = await readFile(fileUrl);
  if (!file) return c.text("Not found", 404);

  return new Response(responseBody(file), {
    headers: {
      "content-type": contentType(fileName),
      "cache-control": cacheControl(fileName, c.req.url),
    },
  });
}

async function readFile(fileUrl: URL): Promise<Blob | Uint8Array | null> {
  const bunFile = runtime.Bun?.file?.(fileUrl);
  if (bunFile) {
    if (bunFile.exists && !(await bunFile.exists())) return null;
    return bunFile;
  }

  try {
    return await runtime.Deno?.readFile?.(fileUrl) ?? null;
  } catch {
    return null;
  }
}

function responseBody(file: Blob | Uint8Array): Blob | ArrayBuffer {
  if (file instanceof Blob) return file;
  const buffer = file.buffer.slice(
    file.byteOffset,
    file.byteOffset + file.byteLength,
  );
  return buffer as ArrayBuffer;
}

function isSafeStaticFileName(fileName: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(fileName) && !fileName.includes("..");
}

function cacheControl(fileName: string, requestUrl: string): string {
  if (fileName.endsWith(".onnx") || fileName.endsWith(".wasm")) {
    return "public, max-age=31536000, immutable";
  }

  const hasVersion = new URL(requestUrl).searchParams.has("v");
  if (hasVersion && (fileName.endsWith(".js") || fileName.endsWith(".css"))) {
    return "public, max-age=31536000, immutable";
  }

  if (fileName.endsWith(".js") || fileName.endsWith(".css")) {
    return "public, max-age=3600, stale-while-revalidate=86400";
  }

  return "public, max-age=86400";
}

function contentType(fileName: string): string {
  if (fileName.endsWith(".css")) return "text/css; charset=utf-8";
  if (fileName.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (fileName.endsWith(".wasm")) return "application/wasm";
  if (fileName.endsWith(".d.ts")) return "text/plain; charset=utf-8";
  if (fileName.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (fileName.endsWith(".onnx")) return "application/octet-stream";
  if (fileName.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function renderPage(body: string): string {
  return `<!doctype html>
<html lang="en" data-theme="light" data-theme-preference="system">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>PP-OCRv6 · OAR OCR</title>
    <script>
      (() => {
        try {
          const preference = localStorage.getItem('ppocrv6.themePreference') || 'system';
          const systemDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
          const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
          document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';
          document.documentElement.dataset.themePreference = ['system', 'light', 'dark'].includes(preference) ? preference : 'system';
        } catch {
          document.documentElement.dataset.theme = 'light';
          document.documentElement.dataset.themePreference = 'system';
        }
      })();
    </script>
    <link rel="stylesheet" href="/assets/styles.css?v=20260619-polish1" />
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function nav(active: "home" | "ocr"): string {
  const item = (
    href: string,
    key: typeof active,
    labelKey: string,
    fallback: string,
  ) =>
    `<a class="${
      active === key ? "active" : ""
    }" href="${href}" data-i18n="${labelKey}">${fallback}</a>`;

  return `<nav class="top-nav card">
    <a class="brand" href="/">PP-OCRv6</a>
    <div class="nav-links">
      ${item("/", "home", "nav.home", "Home")}
      ${item("/ocr", "ocr", "nav.ocr", "OCR")}
    </div>
    <div class="nav-controls" aria-label="Display settings">
      <span class="nav-controls-title">UI</span>
      <div class="toggle-group" aria-label="Language">
        <span class="toggle-label" data-i18n="controls.language">Language</span>
        <div class="segmented-control" role="group" aria-label="Language">
          <button type="button" data-language="en" aria-pressed="false">EN</button>
          <button type="button" data-language="zh" aria-pressed="false">中</button>
        </div>
      </div>
      <div class="toggle-group" aria-label="Theme">
        <span class="toggle-label" data-i18n="controls.theme">Theme</span>
        <div class="segmented-control theme-control" role="group" aria-label="Theme">
          <button type="button" data-theme-choice="system" aria-pressed="false" data-i18n="theme.system">System</button>
          <button type="button" data-theme-choice="light" aria-pressed="false" data-i18n="theme.light">Light</button>
          <button type="button" data-theme-choice="dark" aria-pressed="false" data-i18n="theme.dark">Dark</button>
        </div>
      </div>
    </div>
  </nav>`;
}

function homePage(): string {
  return `<main class="app-shell">
    ${nav("home")}
    <section class="hero card">
      <div>
        <p class="eyebrow" data-i18n="home.eyebrow">OAR OCR · WebAssembly · Hono</p>
        <h1 data-i18n="home.title">PP-OCRv6 browser OCR</h1>
        <p class="subtitle" data-i18n="home.subtitle">
          Run text detection and recognition locally in your browser with oar-ocr-wasm, onnxruntime-web, and bundled PP-OCRv6 models.
        </p>
        <div class="hero-actions">
          <a class="button" href="/ocr" data-i18n="home.start">Start OCR</a>
        </div>
      </div>
      <div class="model-card" aria-label="Default model">
        <span data-i18n="home.defaultModel">Default model</span>
        <strong>PP-OCRv6 tiny</strong>
        <small>det + rec + dict</small>
      </div>
    </section>

    <section class="feature-grid">
      <article class="card feature">
        <span>01</span>
        <h2 data-i18n="home.featureLocalTitle">Local-first OCR</h2>
        <p data-i18n="home.featureLocalText">Images stay in the browser. OCR runs through WebAssembly and onnxruntime-web.</p>
      </article>
      <article class="card feature">
        <span>02</span>
        <h2 data-i18n="home.featureModelsTitle">Three model presets</h2>
        <p data-i18n="home.featureModelsText">Choose tiny, small, or medium to balance speed and accuracy.</p>
      </article>
      <article class="card feature">
        <span>03</span>
        <h2 data-i18n="home.featureGpuTitle">WebGPU fallback</h2>
        <p data-i18n="home.featureGpuText">The page tries WebGPU first and falls back to Wasm when needed.</p>
      </article>
      <article class="card feature">
        <span>04</span>
        <h2 data-i18n="home.featureVisualTitle">Visual results</h2>
        <p data-i18n="home.featureVisualText">Preview detected text boxes, confidence scores, and recognized text.</p>
      </article>
    </section>
  </main>
  <script type="module" src="/assets/ui.js?v=20260619-polish1"></script>`;
}

function ocrPage(): string {
  return `<main class="app-shell">
    ${nav("ocr")}
    <section class="hero card">
      <div>
        <p class="eyebrow" data-i18n="ocr.eyebrow">OAR OCR · WebAssembly</p>
        <h1 data-i18n="ocr.title">Browser OCR recognition</h1>
        <p class="subtitle" data-i18n="ocr.subtitle">
          Use the bundled oar-ocr-wasm module with onnxruntime-web and PP-OCRv6 tiny/small/medium models directly in your browser.
        </p>
      </div>
      <div class="model-card" aria-label="Current model">
        <span data-i18n="ocr.currentModel">Current model</span>
        <strong id="currentModelName">PP-OCRv6 tiny</strong>
        <small>det + rec + dict</small>
      </div>
    </section>

    <section class="toolbar card">
      <label class="model-picker">
        <span data-i18n="ocr.model">Model</span>
        <select id="modelSelect">
          <option value="tiny" data-i18n="ocr.modelTiny">tiny · faster</option>
          <option value="small" data-i18n="ocr.modelSmall">small · balanced</option>
          <option value="medium" data-i18n="ocr.modelMedium">medium · higher accuracy</option>
        </select>
      </label>
      <label class="file-picker">
        <input id="imageInput" type="file" accept="image/*" />
        <span data-i18n="ocr.chooseImage">Choose image</span>
      </label>
      <button id="runButton" type="button" disabled data-i18n="ocr.run">Run OCR</button>
      <button id="clearButton" class="secondary" type="button" disabled data-i18n="ocr.clear">Clear</button>
      <label class="score-filter">
        <span data-i18n="ocr.minConfidence">Min confidence</span>
        <input id="dropScore" type="number" min="0" max="1" step="0.05" value="0.30" />
      </label>
    </section>

    <section class="status card" aria-live="polite">
      <div>
        <span class="status-dot" id="statusDot"></span>
        <strong id="statusTitle" data-i18n="ocr.initialStatusTitle">Preparing model</strong>
      </div>
      <p id="statusText" data-i18n="ocr.initialStatusText">The first load downloads the Wasm runtime and the selected model.</p>
    </section>

    <section class="workspace">
      <div class="preview card">
        <div class="section-header">
          <h2 data-i18n="ocr.previewTitle">Image preview</h2>
          <span id="imageMeta" data-i18n="ocr.imageMetaEmpty">No image selected</span>
        </div>
        <div class="canvas-wrap">
          <canvas id="previewCanvas"></canvas>
          <p id="emptyPreview" data-i18n="ocr.previewEmpty">Choose an image to preview detected text boxes.</p>
        </div>
      </div>

      <div class="results card">
        <div class="section-header">
          <h2 data-i18n="ocr.resultsTitle">OCR results</h2>
          <button id="copyButton" class="secondary compact" type="button" disabled data-i18n="ocr.copy">Copy text</button>
        </div>
        <ol id="resultList" class="result-list"></ol>
        <p id="emptyResults" class="empty-results" data-i18n="ocr.emptyResults">No results yet</p>
      </div>
    </section>
  </main>
  <script type="module" src="/assets/ui.js?v=20260619-polish1"></script>
  <script type="module" src="/assets/ocr.js?v=20260619-polish1"></script>`;
}

function notFoundPage(): string {
  return `<main class="app-shell">
    ${nav("home")}
    <section class="hero card">
      <div>
        <p class="eyebrow">404</p>
        <h1 data-i18n="notFound.title">Page not found</h1>
        <p class="subtitle" data-i18n="notFound.subtitle">Return home or open the OCR page.</p>
        <div class="hero-actions">
          <a class="button" href="/" data-i18n="notFound.home">Home</a>
          <a class="button secondary" href="/ocr" data-i18n="notFound.ocr">Open OCR</a>
        </div>
      </div>
    </section>
  </main>
  <script type="module" src="/assets/ui.js?v=20260619-polish1"></script>`;
}
