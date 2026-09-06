# Architecture Docs

本目录采用双语结构：

- 中文版：`./zh`
- English: `./en`

## 快速入口

### 项目总览

[Pulse Canvas × Engine 模块与基础能力图](./zh/pulse-canvas-engine.excalidraw)（Excalidraw，可编辑）。保留产品模块、Canvas 原子能力和独立 Engine 三种视角；主要模块的 `customData.sourcePaths` 指向核对过的公共入口、状态机或适配实现。原子能力按现有职责归纳，跨目录组合保留各自来源。

README 预览：[中文 SVG](./zh/pulse-canvas-engine.svg) · [English SVG](./en/pulse-canvas-engine.svg)。布局源文件为上述 Excalidraw 文件；修改后同步导出两种语言的预览。

分层依据：产品模块保留 Renderer 中各自拥有入口的编辑器、Chat、Coding Agent、Dock、Artifacts、MCP Apps、调度与配置能力；[节点提及](../apps/canvas-workspace/src/renderer/src/modules/node-mentions/index.ts)归入上下文与引用机制。[Chat 会话运行时](../apps/canvas-workspace/src/main/agent/conversation-runtime/conversation-runtime.ts)和 [Teams 服务](../apps/canvas-workspace/src/main/agent-teams/service.ts)各自拥有状态，Teams 的标注遵循[功能配置](../apps/canvas-workspace/src/shared/experimental-features.ts)。[Engine](../packages/engine/src/Engine.ts)按模型适配、循环、上下文、工具扩展展开；[对话后端选择](../apps/canvas-workspace/src/main/agent/backends/index.ts)与外部接入单独保留。

详细职责与约束以 [Canvas 架构边界](../apps/canvas-workspace/harness/knowledge/conventions/architecture-boundaries.md)、[Canvas 会话运行时](../apps/canvas-workspace/harness/knowledge/chat-sessions.md)及 [Engine 契约](../packages/engine/harness/knowledge/contracts.md)为准。

### 中文（Chinese）
- 索引：[`./zh/README.md`](./zh/README.md)
- 章节：
  - [`01-engine-overview-and-goals.md`](./zh/01-engine-overview-and-goals.md)
  - [`02-runtime-lifecycle-and-engine-run.md`](./zh/02-runtime-lifecycle-and-engine-run.md)
  - [`03-agent-loop-core.md`](./zh/03-agent-loop-core.md)
  - [`04-llm-adapter-and-prompt.md`](./zh/04-llm-adapter-and-prompt.md)
  - [`05-context-compaction-strategy.md`](./zh/05-context-compaction-strategy.md)
  - [`06-tool-system.md`](./zh/06-tool-system.md)
  - [`07-plugin-system.md`](./zh/07-plugin-system.md)
  - [`08-built-in-plugins.md`](./zh/08-built-in-plugins.md)
  - [`09-config-and-operations.md`](./zh/09-config-and-operations.md)

### English
- Index: [`./en/README.md`](./en/README.md)
- Chapters:
  - [`01-engine-overview-and-goals.md`](./en/01-engine-overview-and-goals.md)
  - [`02-runtime-lifecycle-and-engine-run.md`](./en/02-runtime-lifecycle-and-engine-run.md)
  - [`03-agent-loop-core.md`](./en/03-agent-loop-core.md)
  - [`04-llm-adapter-and-prompt.md`](./en/04-llm-adapter-and-prompt.md)
  - [`05-context-compaction-strategy.md`](./en/05-context-compaction-strategy.md)
  - [`06-tool-system.md`](./en/06-tool-system.md)
  - [`07-plugin-system.md`](./en/07-plugin-system.md)
  - [`08-built-in-plugins.md`](./en/08-built-in-plugins.md)
  - [`09-config-and-operations.md`](./en/09-config-and-operations.md)

---

维护建议：
- 中文可继续作为主版本。
- 英文版按章节同步（建议在英文文档头部标注 `Last synced from zh`）。
