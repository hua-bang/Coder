## 核心设计

**静态扫描 + Prompt 注入**，不增加 HTTP API 层，直接让 AI 在 system prompt 中获知可用技能。

```
┌─────────────────────────────────────────┐
│ 技能发现（启动时扫描）                  │
│                                         │
│ 扫描路径：                              │
│  ├─ .coder/skills/**/SKILL.md          │
│  ├─ .claude/skills/**/SKILL.md         │
│  └─ ~/.coder/skills/**                 │
│                                         │
│ 格式同 Opencode：YAML frontmatter + MD  │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ SkillRegistry（内存缓存）              │
│                                         │
│ 数据结构：                              │
│ Map<name, {description, location, md}> │
│                                         │
│ 生命周期：app 启动时加载一次            │
└─────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ System Prompt 注入                      │
│                                         │
│ 在 generateSystemPrompt() 中追加：     │
│ "Available Skills:\n"                   │
│ - skill-name: description\n             │
│                                         │
│ AI 可基于技能描述自主判断何时需注意     │
└─────────────────────────────────────────┘
```

## 实现步骤

1. **新增 `src/skill/` 模块**
   - `scanner.ts`：扫描本地 skill 文件
   - `registry.ts`：内存缓存与查询
   - `types.ts`：类型定义

2. **修改 `src/prompt/system.ts`**
   - 在 system prompt 底部追加技能列表
   - 格式：`"可用技能:\n- name: description"`

3. **可选：添加 `skill_search` tool**
   - 当技能数量 >20 时，让 AI 能主动查询完整技能内容
   - 避免 prompt 过长

## 最小实现代码

```typescript
// src/skill/scanner.ts
import { glob } from 'glob';

export async function scanSkills(cwd: string) {
  const patterns = [
    '.coder/skills/**/SKILL.md',
    '.claude/skills/**/SKILL.md',
  ];
  
  const files = await glob(patterns, { cwd });
  // 解析 YAML frontmatter，返回 SkillInfo[]
}
```

```typescript
// src/prompt/index.ts
import { SkillRegistry } from '../skill/registry';

export function generateSystemPrompt() {
  const basePrompt = `...`;
  const skills = SkillRegistry.getAll();
  
  if (skills.length === 0) return basePrompt;
  
  const skillsSection = `\n\n可用技能:\n${skills.map(s => `- ${s.name}: ${s.description}`).join('\n')}`;
  
  return basePrompt + skillsSection;
}
```

## 优势

- 零运行时开销：扫描仅在启动时执行一次
- 无 API 层：直接复用现有 AI SDK 的 prompt 机制
- 兼容 Opencode：skill 文件格式完全一致
- 简洁：约 50 行代码即可实现

## 后续扩展

技能数量增多后，可添加：
- `skill_search` tool：支持模糊查询
- `skill_get` tool：读取单个 skill 的完整内容
- Watch mode：开发时热重载 skill 文件