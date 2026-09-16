# dsh-replay ⚡

> **DSH (DeepSeek Harness) 会话日志的可视化回放器**  
> 把不可读的 `session.jsonl.zstd` 变成可播放、可定位、可分享的会话时间线。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependency](https://img.shields.io/badge/Dependencies-Zero%20Heavy%20Deps-brightgreen.svg)](#)
[![Cordis Plugin](https://img.shields.io/badge/Cordis-Plugin-orange.svg)](#)

---

## 📖 设计原则与核心功能

- **小而美、只读、本地、零依赖**：专注于将 DSH 底层 append-only 日志还原为交互式时间线，不依赖远程服务，完全本地处理。
- **多帧 Zstandard & JSONL 流解析**：支持多帧 `.jsonl.zstd` 解压（Node 24 原生加速 + 纯 JS 回退）与未压缩 `.jsonl`。
- **智能重构**：将扁平事件流重组为清晰的 `Session → Turn → Step → Event` 层级，并完整支持 DeepSeek R1 思维链推理块、工具调用与结果、用户审批请求、错误堆栈等。
- **三栏时间线交互回放**：
  - **顶部**：播放/暂停、上一帧/下一帧、1x/2x/4x/8x 变速、时间线进度滑块、精确 seq 跳转、全局正则搜索与过滤胶囊。
  - **左侧**：会话轮次树（Turn / Step），直观展示各轮 Prompt、工具调用计数与耗时。
  - **中间**：差异色标事件卡片（用户蓝、助手绿、推理紫、工具橙、报错红），支持思维链一键折叠/展开。
  - **右侧**：详情检查器，支持格式化卡片视图与语法高亮 Raw JSON 切换、Token 明细、耗时统计、工具参数与返回值查看、关联调用一键跳转。
- **键盘快捷键**：
  - `Space`：播放 / 暂停
  - `←` / `→`：上一步 / 下一步
  - `J` / `K`：上一个 / 下一个工具调用
  - `/`：聚焦搜索框
  - `Esc`：关闭弹窗 / 取消聚焦
- **隐私脱敏与单文件 HTML 导出**：
  - 一键导出完全自包含的单文件 `.html`（内嵌完整回放器与数据），接收方直接用任何浏览器离线打开，无需安装 DSH 或插件。
  - 导出前支持 API Key、环境变量、家目录路径脱敏与自定义正则表达式替换，并支持实时前后差异对比。

---

## 🚀 快速上手

### 1. 作为 DSH 插件使用
在 DSH 项目中安装：
```bash
dsh plugin add dsh-replay
```
在 DSH 中直接回放：
```bash
dsh replay session.jsonl.zstd
```

### 2. 作为独立 CLI 工具使用
```bash
# 本地快速启动浏览器回放
npx dsh-replay session.jsonl.zstd

# 指定端口启动
npx dsh-replay session.jsonl -p 8080

# 直接导出自包含离线 HTML 并启用敏感信息脱敏
npx dsh-replay session.jsonl.zstd --export replay.html --mask
```

### 3. CLI 参数说明
```text
使用方法:
  dsh-replay <session.jsonl | session.jsonl.zstd> [选项]

选项:
  -p, --port <port>       指定本地回放服务端口 (默认: 3721)
  -e, --export <file>     直接导出自包含离线回放 HTML 文件，不启动服务
  -m, --mask              导出时启用默认隐私脱敏 (API Key、环境变量、家目录路径)
  --no-open               启动本地服务时不自动打开浏览器
  -v, --version           查看版本号
  -h, --help              查看帮助信息
```

---

## 💻 编程接口 (API)

```typescript
import {
  loadSessionFromFile,
  buildSessionTree,
  generateStandaloneHtml,
  maskObject
} from 'dsh-replay'

// 1. 从文件直接加载并解析会话
const session = loadSessionFromFile('./session.jsonl.zstd')
console.log(`Session ID: ${session.sessionId}, Turns: ${session.turns.length}`)

// 2. 导出内嵌单文件 HTML (可配置脱敏)
const html = generateStandaloneHtml(session, {
  maskApiKeys: true,
  maskEnvVars: true,
  maskPaths: true,
  customRegex: '192\\.168\\.\\d+\\.\\d+'
})
```

---

## 🧪 测试与验证

项目包含全面的自动化测试套件：
```bash
npm test
```
- ✅ 多帧 Zstandard 解码与 JSONL 解析
- ✅ 会话/轮次/步骤重构及工具调用关联合并
- ✅ 隐私脱敏引擎与正则匹配
- ✅ 独立单文件 HTML 导出器
- ✅ Cordis 插件规范注册与 CLI 命令行为
