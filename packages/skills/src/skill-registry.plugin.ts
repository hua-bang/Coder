// 使用正确的导入路径
import type { EnginePlugin, EnginePluginContext } from '@coder/engine';
import { SkillRegistry } from './registry/skill-registry.js';
import generateSkillTool from './tool.js';

/**
 * 技能注册表插件 - 适配新引擎架构
 */
export const skillRegistryPlugin: EnginePlugin = {
  name: '@coder/skills/skill-registry',
  version: '1.0.0',

  async initialize(context: EnginePluginContext) {
    const registry = new SkillRegistry();
    await registry.initialize(process.cwd());

    const skills = registry.getAll();
    const skillTool = generateSkillTool(skills);

    context.registerTool('skill', skillTool);
    context.registerService('skillRegistry', registry);

    context.logger?.info?.(`Loaded ${skills.length} skill(s)`);
  }
};

export default skillRegistryPlugin;