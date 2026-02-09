import { Engine } from '../src/Engine.js';
import { skillRegistryPlugin } from '../src/plugins/skill-registry.plugin.js';

// 示例1：基础使用
async function basicUsage() {
  const engine = new Engine();
  
  // 加载引擎插件（包括技能系统）
  await engine.initialize();
  
  console.log('✅ Engine initialized with plugin system');
  console.log('📊 Plugin status:', engine.getPluginStatus());
}

// 示例2：自定义配置
async function customConfigUsage() {
  const engine = new Engine({
    enginePlugins: {
      plugins: [skillRegistryPlugin],
      dirs: ['./custom-engine-plugins']
    },
    userConfigPlugins: {
      dirs: ['./config', '~/.coder/config'],
      scan: true
    }
  });
  
  await engine.initialize();
  
  const context = { messages: [] };
  const result = await engine.run(context);
  console.log('🎯 Execution result:', result);
}

// 示例3：动态添加用户配置
async function dynamicConfigUsage() {
  const engine = new Engine();
  await engine.initialize();
  
  // 运行时添加用户配置
  // 这将在第二阶段实现
  console.log('🔄 Dynamic config will be available in phase 2');
}

// 运行示例
async function main() {
  await basicUsage();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}