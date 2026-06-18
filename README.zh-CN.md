# pp-ocrv6

[English](./README.md)

## 项目介绍

`pp-ocrv6` 是一个基于 Deno、Hono 和 `oar-ocr-wasm` WebAssembly 包构建的浏览器端 OCR 演示与部署应用。它提供首页和 OCR 页面，在项目内携带 PP-OCRv6 ONNX 模型，并通过 `onnxruntime-web` 在用户浏览器中直接完成文字检测与识别。

该项目适合部署到 Deno Deploy 等偏静态资源托管的运行环境。图片会在浏览器本地处理，不会上传到后端 OCR 服务。

## 功能

- `GET /`：首页，展示浏览器 OCR 能力。
- `GET /ocr`：OCR 工作台，支持图片上传、模型选择、置信度过滤、Canvas 标注和复制文本。
- PP-OCRv6 模型预设：`tiny`、`small`、`medium`。
- `GET /models/:file`：托管项目内的 PP-OCRv6 模型文件。
- `GET /pkg/:file`：托管 `oar-ocr-wasm` 的 Wasm 产物。
- 主题切换：`跟随系统`、`浅色`、`深色`，默认跟随浏览器/系统主题。
- 语言切换：默认英文，可切换中文。
- 为版本化 JS/CSS、Wasm、ONNX 模型等静态资源添加缓存策略。

## 实现

项目尽量保持轻后端设计：

- `src/index.ts` 定义 Hono 应用、页面路由和静态资源路由。
- `src/assets/ui.js` 负责主题切换、语言切换、持久化和系统主题监听。
- `src/assets/ocr-engine.js` 初始化 `oar-ocr-wasm`，通过 `onnxruntime-web` 加载 ONNX session，缓存 OCR 模型实例，并提供预测方法。
- `src/assets/ocr.js` 驱动 OCR 页面 UI，包括文件选择、模型加载、OCR 执行、结果渲染和复制文本。
- `public/models` 包含 PP-OCRv6 检测/识别 ONNX 模型和字典文件。
- `public/pkg` 包含 `oar-ocr-wasm` 的 `wasm-pack` 构建产物。

项目不提供 `/api/ocr` 后端 OCR 接口。OCR 推理发生在浏览器端。

## 安装

### Deno

```sh
deno task dev
```

### Bun

```sh
bun install
bun run dev
```

默认访问地址：<http://localhost:3000>。

如需修改端口：

```sh
PORT=8080 deno task start
PORT=8080 bun run start
```

## 部署

### Deno Deploy

部署配置已经写入 `deno.json` 的 `deploy` 命名空间，因此默认的 `deployctl deploy` 命令不会再猜测项目名。所需的 Wasm 和模型文件已经包含在项目 `public` 目录内。

```sh
deployctl deploy --token=<DENO_DEPLOY_TOKEN>
```

部署配置会包含以下路径：

```text
pp-ocrv6/public/models
pp-ocrv6/public/pkg
pp-ocrv6/src/assets
```

### 体积说明

`public/models` 体积较大，因为它包含 `tiny`、`small`、`medium` 三档 PP-OCRv6 模型。如果部署平台有项目体积或单文件大小限制，可以只保留 `tiny` 模型，并从 OCR 页面中移除 `small`/`medium` 选项。

## 缓存策略

应用会为静态文件设置缓存头：

- ONNX 和 Wasm 文件：`public, max-age=31536000, immutable`。
- 带版本号的 JS/CSS，例如 `/assets/ui.js?v=...`：`public, max-age=31536000, immutable`。
- 未带版本号的 JS/CSS：短缓存并启用 stale-while-revalidate。
- 其它静态文件：缓存一天。
