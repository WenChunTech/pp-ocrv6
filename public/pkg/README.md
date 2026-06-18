# oar-ocr-wasm

Browser WebAssembly bindings for OAR OCR. The crate keeps Rust image preprocessing and OCR postprocessing, while ONNX inference is executed by JavaScript sessions such as `onnxruntime-web`.

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
const det = await ort.InferenceSession.create("/models/pp-ocrv5_mobile_det.onnx", {
  executionProviders: ["wasm"],
});
const rec = await ort.InferenceSession.create("/models/pp-ocrv5_mobile_rec.onnx", {
  executionProviders: ["wasm"],
});
const dict = await fetch("/models/ppocrv5_dict.txt").then((r) => r.text());

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

`predictBytes` accepts encoded image bytes. `predictRgba(width, height, rgba)` accepts RGBA pixels from Canvas/ImageData.

## PP-OCRv6 Browser Demo

A ready-to-run page is available in [`examples/browser-demo`](examples/browser-demo). It can switch between PP-OCRv6 tiny, small, and medium. It is wired to these files:

- `models/pp-ocrv6_tiny_det.onnx`
- `models/pp-ocrv6_tiny_rec.onnx`
- `models/ppocrv6_tiny_dict.txt`
- `models/pp-ocrv6_small_det.onnx`
- `models/pp-ocrv6_small_rec.onnx`
- `models/pp-ocrv6_medium_det.onnx`
- `models/pp-ocrv6_medium_rec.onnx`
- `models/ppocrv6_dict.txt`

After building with `--out-dir examples/pkg`, place the three model files in `oar-ocr-wasm/examples/browser-demo/models/` and serve the examples directory:

```bash
python3 -m http.server 8080 --directory oar-ocr-wasm/examples
```

Then open `http://localhost:8080/browser-demo/`.
