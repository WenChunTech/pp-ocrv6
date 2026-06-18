# pp-ocrv6

[简体中文](./README.zh-CN.md)

## Project Overview

`pp-ocrv6` is a browser-side OCR demo and deployment app built with Deno, Hono,
and the `oar-ocr-wasm` WebAssembly package. It serves a landing page and an OCR
page, fetches PP-OCRv6 ONNX models on demand from ModelScope, and runs text
detection and recognition directly in the user's browser through
`onnxruntime-web`.

The app is designed for static-friendly deployment targets such as Deno Deploy.
Images are processed locally in the browser and are not uploaded to a backend
OCR service.

## Features

- Landing page at `GET /` with an overview of the browser OCR capabilities.
- OCR workspace at `GET /ocr` with image upload, model selection, confidence
  filtering, canvas overlays, and text copy support.
- PP-OCRv6 model presets: `tiny`, `small`, and `medium`.
- On-demand model proxy under `GET /models/:file`, backed by the
  `greatv/oar-ocr` ModelScope repository.
- Local static serving for `oar-ocr-wasm` artifacts under `GET /pkg/:file`.
- Theme switcher with `System`, `Light`, and `Dark`; defaults to the
  browser/system theme.
- Language switcher with English as the default and Chinese as an option.
- Static asset caching for versioned JS/CSS, Wasm, and proxied ONNX model files.

## Implementation

The project is intentionally backend-light:

- `src/index.ts` defines the Hono app, page routes, static file routes, and the
  allow-listed ModelScope model proxy.
- `src/assets/ui.js` handles theme switching, language switching, persistence,
  and system theme updates.
- `src/assets/ocr-engine.js` initializes `oar-ocr-wasm`, loads ONNX sessions
  through `onnxruntime-web` from `/models/:file`, caches OCR model instances,
  and exposes prediction helpers.
- `src/assets/ocr.js` powers the OCR page UI: file selection, on-demand model
  loading, OCR execution, result rendering, and copy-to-clipboard.
- `public/pkg` contains the `wasm-pack` output for `oar-ocr-wasm`.

There is no `/api/ocr` backend OCR endpoint. OCR inference happens in the
browser.

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

Deploy settings are stored in `deno.json` under the required `deploy` namespace,
so the default `deployctl deploy` command works without guessing the project
name. The required Wasm files are included in the project under `public/pkg`;
PP-OCRv6 model files are fetched on demand from ModelScope through
`/models/:file`.

```sh
deployctl deploy --token=<DENO_DEPLOY_TOKEN>
```

The deploy config includes these paths:

```text
pp-ocrv6/public/pkg
pp-ocrv6/src/assets
```

### Model Loading

Model files are not committed with the app. The `/models/:file` route only
serves files listed in `src/index.ts` and proxies them from ModelScope using the
same `greatv/oar-ocr` source and SHA-256 metadata as the Rust `oar-ocr`
auto-download registry. The browser loads the selected preset only when the user
clicks `Run OCR`, so opening the OCR page or switching presets does not download
ONNX files.

## Caching

The app sets cache headers for static files:

- ONNX and Wasm files: `public, max-age=31536000, immutable`.
- Versioned JS/CSS assets, such as `/assets/ui.js?v=...`:
  `public, max-age=31536000, immutable`.
- Non-versioned JS/CSS assets: short cache with stale-while-revalidate.
- Other static files: one-day cache.
