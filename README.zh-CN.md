# pp-ocrv6

[English](./README.md)

## 项目介绍

`pp-ocrv6` 是一个基于 Hono 和 `oar-ocr-wasm` WebAssembly 包构建的浏览器端
OCR 演示与部署应用。它提供首页和 OCR 页面，从 ModelScope 按需获取 PP-OCRv6 ONNX
模型，并通过 `onnxruntime-web` 在用户浏览器中直接完成文字检测与识别。

该项目适合部署到 Cloudflare Workers、Deno Deploy
等偏静态资源托管的运行环境。图片会在浏览器本地处理，不会上传到后端 OCR 服务。

## 功能

- `GET /`：首页，展示浏览器 OCR 能力。
- `GET /ocr`：OCR 工作台，支持图片上传、模型选择、置信度过滤、Canvas
  标注和复制文本。
- PP-OCRv6 模型预设：`tiny`、`small`、`medium`。
- `GET /models/:file`：按需代理 `greatv/oar-ocr` ModelScope 仓库中的 PP-OCRv6
  模型文件。
- `GET /pkg/:file`：托管 `oar-ocr-wasm` 的 Wasm 产物。
- 主题切换：`跟随系统`、`浅色`、`深色`，默认跟随浏览器/系统主题。
- 语言切换：默认英文，可切换中文。
- 为版本化 JS/CSS、Wasm、代理的 ONNX 模型等资源添加缓存策略。

## 实现

项目尽量保持轻后端设计：

- `src/index.ts` 定义 Hono 应用、页面路由、静态资源路由和白名单 ModelScope
  模型代理。
- `public/assets/ui.js` 负责主题切换、语言切换、持久化和系统主题监听。
- `public/assets/ocr-engine.js` 初始化 `oar-ocr-wasm`，通过 `onnxruntime-web`
  从 `/models/:file` 加载 ONNX session，缓存 OCR 模型实例，并提供预测方法。
- `public/assets/ocr.js` 驱动 OCR 页面 UI，包括文件选择、按需模型加载、OCR
  执行、结果渲染和复制文本。
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

### Cloudflare Workers

Cloudflare Workers 配置位于 `wrangler.jsonc`。Worker 入口为 `src/index.ts`，
静态文件通过 `ASSETS` 绑定从 `public` 目录提供；PP-OCRv6 模型会通过
`/models/:file` 从 ModelScope 按需获取。

```sh
wrangler dev
wrangler deploy --dry-run
wrangler deploy
```

也可以使用等价的 package scripts：

```sh
bun run cf:dev
bun run cf:deploy:dry-run
bun run cf:deploy
```

### 模型加载

模型文件不随应用提交。`/models/:file` 路由只允许访问 `src/index.ts`
中登记过的文件，并使用与 Rust `oar-ocr` 自动下载注册表相同的 `greatv/oar-ocr`
ModelScope 来源和 SHA-256 元数据进行代理。浏览器只会在用户点击 `开始识别`
时加载所选模型，因此打开 OCR 页面或切换模型预设都不会下载 ONNX 文件。

## 缓存策略

应用会为静态文件设置缓存头：

- ONNX 和 Wasm 文件：`public, max-age=31536000, immutable`。
- 带版本号的 JS/CSS，例如
  `/assets/ui.js?v=...`：`public, max-age=31536000, immutable`。
- 未带版本号的 JS/CSS：短缓存并启用 stale-while-revalidate。
- 其它静态文件：缓存一天。
