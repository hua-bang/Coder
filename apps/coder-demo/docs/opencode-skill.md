## OpenCode Skill 系统架构

### 核心设计：静态扫描 + API 服务

```
┌─────────────────────────────────────────────────────┐
│ 文件系统扫描层（技能发现）                          │
│                                                     │
│ - 路径扫描：                                        │
│   ├─ .opencode/{skill,skills}/**/SKILL.md        │
│   ├─ .claude/skills/**/SKILL.md（兼容模式）      │
│   └─ ~/.claude/skills/**（全局技能）              │
│                                                     │
│ - 优先级：                                          │
│   项目级（.opencode） > 项目级（.claude） > 用户级│
│                                                     │
│ - 扫描时机：                                        │
│   └─ Instance.state() 初始化时（服务启动/目录切换）│
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│ 技能注册表（SkillRegistry - 内存层）                │
│                                                     │
│ 数据结构：                                          │
│ Map<skillName, SkillInfo>                          │
│ ├─ name: string                                    │
│ ├─ description: string                             │
│ └─ location: string（文件绝对路径）                │
│                                                     │
│ 特性：                                              │
│ • 基于 Instance.state() 缓存（按工作目录隔离）      │
│ • 重复名称警告（warn on duplicate）                │
│ • 解析失败静默忽略（不阻塞启动）                    │
│ • 无热重载（需重启或切换目录刷新）                  │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│ API 服务层（HTTP Interface）                        │
│                                                     │
│ GET /skill                                          │
│ └─ 返回：SkillInfo[]（全部技能列表）               │
│                                                     │
│ 内部 API：                                          │
│ ├─ Skill.all(): Promise<SkillInfo[]>               │
│ └─ Skill.get(name): Promise<SkillInfo | undefined> │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│ 消费方（Consumers）                                 │
│                                                     │
│ • Server: /skill HTTP 端点                          │
│ • Agent: 潜在的技能注入点（设计预留）              │
│ • CLI: opencode skill list 等命令（未来）          │
└─────────────────────────────────────────────────────┘
```

### 关键实现细节

#### 1. 技能文件格式

```yaml
---
name: Bun 文件 IO
description: 使用 Bun 运行时进行高性能文件读写操作
---

# Bun 文件 IO 最佳实践

## 适用场景
- 需要超高性能的批处理任务
- 文件大小超过 100MB
- 兼容 Bun 运行时的项目

## 不推荐场景
- 需要跨平台 Node.js 兼容
- 团队对 Bun 不熟悉

## 代码示例

```typescript
const data = await Bun.file("input.json").json()
await Bun.write("output.json", JSON.stringify(data, null, 2))
```

## 性能对比
| 方法 | 1GB 文件读取耗时 | 内存占用 |
|------|------------------|----------|
| Bun.file | 0.3s | 50MB |
| fs.readFile | 1.2s | 1GB |
```

**解析规则**：
- 使用 `gray-matter` 解析 YAML frontmatter
- frontmatter 必须包含 `name` 和 `description`
- 主体内容为 Markdown，供消费方按需渲染或注入

#### 2. State 缓存机制

```typescript
export const state = Instance.state(async () => {
  const skills: Record<string, Info> = {}
  // 扫描逻辑...
  return skills
})
```

- **作用域隔离**：每个工作目录（Instance）拥有独立的技能表
- **惰性初始化**：首次调用 `Skill.all()` 或 `Skill.get()` 时触发扫描
- **生命周期**：随 Instance.dispose() 自动清理，避免内存泄漏

### 设计决策

| 维度 | 当前方案 | 替代方案 | 权衡分析 |
|------|----------|----------|----------|
| **加载策略** | 静态扫描（启动时） | 动态加载（按需） | ✅ 简单可靠，启动后无需IO<br>❌ 新增/修改技能需刷新 |
| **作用域模型** | 目录树驱动（Instance-based） | 全局注册表 | ✅ 天然隔离多项目场景<br>❌ 技能无法在项目间共享 |
| **错误处理** | 静默忽略（log only） | 严格校验（启动失败） | ✅ 不影响主功能可用性<br>❌ 错误可能未及时发现 |
| **序列化格式** | Markdown + YAML frontmatter | JSON / TOML | ✅ 人类可读，易编写<br>✅ 兼容现有工具链（Claude Code） |
| **抽象层级** | 直接 API 调用 | Tool 接口层（LLM 可调） | ✅ 性能高，无序列化开销<br>❌ 模型无法自主发现技能 |

### 与 MCP (Model Context Protocol) 的架构差异

```
MCP 架构：
模型 ←→ MCP 协议层 ←→ 技能服务器 ←→ 技能注册表
            ↑ 标准化但增加中间层

OpenCode 当前架构：
模型 ←→ Server API ←→ SkillRegistry
            ↑ 直接但依赖消费方实现调用
```

**核心差异点**：
1. **调用方式**：MCP 使用 LLM 可触发的 Tool 接口；OpenCode 使用 HTTP/TS API
2. **状态管理**：MCP 由协议层管理上下文；OpenCode 由消费方（如 Agent）管理
3. **扩展性**：MCP 天然跨工具；OpenCode 需在各工具中集成 SDK

### 使用场景

✅ **适合**：
- 团队/项目级技能沉淀（随代码仓库版本管理）
- 编辑器插件快速查询（HTTP API）
- 兼容 Claude Code 生态（.claude/skills 兼容模式）

❌ **不适合**：
- 需要模型自主选择技能的场景（需 Tool 层）
- 运行时动态加载/卸载技能（需热重载）
- 海量技能（>1000）高性能模糊搜索（需专用索引）

### 扩展方向

#### 短期（兼容现有架构）
1. **CLI 命令**
   ```bash
   opencode skill list        # 列出所有技能
   opencode skill show <name> # 查看技能详情
   ```

2. **模糊搜索 API**
   ```typescript
   GET /skill/search?q=react&limit=10
   ```

3. **热重载（开发模式）**
   ```typescript
   --watch .opencode/skill/**/*
   ```

#### 长期（架构演进）
1. **Tool 层抽象**
   ```typescript
   // 新增 tools/skill.ts
   export const skillSearchTool = {
     name: "skill_search",
     description: "搜索相关技能",
     parameters: z.object({ query: z.string() }),
   }
   ```

2. **向量索引**
   - 构建技能 description + 内容的嵌入向量
   - 支持语义化搜索

3. **权限模型**
   - 技能级别的访问控制
   - 敏感技能（如部署、密钥管理）需显式授权

### 当前限制

1. **无内容缓存**：仅缓存 `name`/`description`/`location`，完整内容需 `Bun.file(location).text()`
2. **名称唯一性**：重复名称会产生警告，但后加载的会覆盖先加载的
3. **无依赖管理**：技能间无法声明依赖或组合
4. **无版本语义**：`version` 字段未解析，仅保留在 frontmatter 中
