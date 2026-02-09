// 保持向后兼容的旧导出
export { skillPlugin } from './skill-plugin.js';
export { SkillRegistry } from './registry/skill-registry.js';

// 新导出 - 适配新引擎架构
export { skillRegistryPlugin } from './skill-registry.plugin.js';