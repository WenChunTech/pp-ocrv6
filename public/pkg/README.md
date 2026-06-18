# oar-ocr-wasm

Browser WebAssembly bindings for OAR OCR. The crate keeps Rust image
preprocessing and OCR postprocessing, while ONNX inference is executed by
JavaScript sessions such as `onnxruntime-web`.

## Build

```bash
wasm-pack build oar-ocr-wasm --target web --no-default-features
```

For the included browser demo, emit the package next to the examples:

```bash
wasm-pack build oar-ocr-wasm --target web --no-default-features --out-dir examples/pkg
```

## Usage

```js
import init, { OarOcrWasm } from "./pkg/oar_ocr_wasm.js";
import * as ort from "onnxruntime-web";

await init();

ort.env.wasm.wasmPaths = "/ort/";
const [detBytes, recBytes, dict] = await Promise.all([
  fetch(selectedDetectionModelUrl).then((r) => r.arrayBuffer()),
  fetch(selectedRecognitionModelUrl).then((r) => r.arrayBuffer()),
  fetch(selectedDictionaryUrl).then((r) => r.text()),
]);
const det = await ort.InferenceSession.create(new Uint8Array(detBytes), {
  executionProviders: ["wasm"],
});
const rec = await ort.InferenceSession.create(new Uint8Array(recBytes), {
  executionProviders: ["wasm"],
});

const ocr = new OarOcrWasm(det, rec, dict, {
  detInputName: "x",
  recInputName: "x",
  recBatchSize: 8,
  dropScore: 0.0,
});

const bytes = new Uint8Array(await file.arrayBuffer());
const result = await ocr.predictBytes(bytes);
console.log(result.textRegions);
```

`predictBytes` accepts encoded image bytes. `predictRgba(width, height, rgba)`
accepts RGBA pixels from Canvas/ImageData.

## PP-OCRv6 Browser Demo

This app serves PP-OCRv6 tiny, small, and medium through the allow-listed
`/models/:file` proxy. Model files are fetched on demand from the
`greatv/oar-ocr` ModelScope repository instead of being bundled with the
package.

After building with `--out-dir examples/pkg`, serve the examples directory:

```bash
python3 -m http.server 8080 --directory oar-ocr-wasm/examples
```

Then open `http://localhost:8080/browser-demo/`.
