# pp-ocrv6

[简体中文](./README.zh-CN.md)

## Project Overview

`pp-ocrv6` is a browser-side OCR demo and deployment app built with Deno, Hono, and the `oar-ocr-wasm` WebAssembly package. It serves a landing page and an OCR page, bundles PP-OCRv6 ONNX models locally, and runs text detection and recognition directly in the user's browser through `onnxruntime-web`.

The app is designed for static-friendly deployment targets such as Deno Deploy. Images are processed locally in the browser and are not uploaded to a backend OCR service.

## Features

- Landing page at `GET /` with an overview of the browser OCR capabilities.
- OCR workspace at `GET /ocr` with image upload, model selection, confidence filtering, canvas overlays, and text copy support.
- PP-OCRv6 model presets: `tiny`, `small`, and `medium`.
- Local static serving for bundled model files under `GET /models/:file`.
- Local static serving for `oar-ocr-wasm` artifacts under `GET /pkg/:file`.
- Theme switcher with `System`, `Light`, and `Dark`; defaults to the browser/system theme.
- Language switcher with English as the default and Chinese as an option.
- Static asset caching for versioned JS/CSS, Wasm, and ONNX model files.

## Implementation

The project is intentionally backend-light:

- `src/index.ts` defines the Hono app, page routes, and static file routes.
- `src/assets/ui.js` handles theme switching, language switching, persistence, and system theme updates.
- `src/assets/ocr-engine.js` initializes `oar-ocr-wasm`, loads ONNX sessions through `onnxruntime-web`, caches OCR model instances, and exposes prediction helpers.
- `src/assets/ocr.js` powers the OCR page UI: file selection, model loading, OCR execution, result rendering, and copy-to-clipboard.
- `public/models` contains PP-OCRv6 ONNX detection/recognition models and dictionary files.
- `public/pkg` contains the `wasm-pack` output for `oar-ocr-wasm`.

There is no `/api/ocr` backend OCR endpoint. OCR inference happens in the browser.

## Installation

### Deno

```sh
deno task dev
```

### Bun

```sh
bun install
bun run dev
```

The app listens on <http://localhost:3000> by default.

To change the port:

```sh
PORT=8080 deno task start
PORT=8080 bun run start
```

## Deployment

### Deno Deploy

Deploy settings are stored in `deno.json` under the required `deploy` namespace, so the default `deployctl deploy` command works without guessing the project name. The required Wasm and model files are already included in the project under `public`.

```sh
deployctl deploy --token=<DENO_DEPLOY_TOKEN>
```

The deploy config includes these paths:

```text
pp-ocrv6/public/models
pp-ocrv6/public/pkg
pp-ocrv6/src/assets
```

### Size Note

`public/models` is large because it includes the `tiny`, `small`, and `medium` PP-OCRv6 presets. If your deployment target has project-size or per-file limits, keep only the `tiny` preset and remove the `small`/`medium` options from the OCR page.

## Caching

The app sets cache headers for static files:

- ONNX and Wasm files: `public, max-age=31536000, immutable`.
- Versioned JS/CSS assets, such as `/assets/ui.js?v=...`: `public, max-age=31536000, immutable`.
- Non-versioned JS/CSS assets: short cache with stale-while-revalidate.
- Other static files: one-day cache.
