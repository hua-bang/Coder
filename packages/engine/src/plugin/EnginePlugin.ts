import type { Tool } from 'ai';
import type { EventEmitter } from 'events';

// 修复：确保类型正确导出
export interface EnginePlugin {
  name: string;
  version: string;
  dependencies?: string[];

  // 生命周期钩子 - 添加类型标注
  beforeInitialize?(context: EnginePluginContext): Promise<void>;
  initialize(context: EnginePluginContext): Promise<void>;
  afterInitialize?(context: EnginePluginContext): Promise<void>;

  // 清理钩子
  destroy?(context: EnginePluginContext): Promise<void>;
}

export interface EnginePluginContext {
  registerTool(name: string, tool: Tool): void;
  registerTools(tools: Record<string, Tool>): void;
  getTool(name: string): Tool | undefined;

  registerProtocol(name: string, handler: ProtocolHandler): void;
  getProtocol(name: string): ProtocolHandler | undefined;

  registerService<T>(name: string, service: T): void;
  getService<T>(name: string): T | undefined;

  getConfig<T>(key: string): T | undefined;
  setConfig<T>(key: string, value: T): void;

  events: EventEmitter;

  logger: {
    debug(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, error?: Error, meta?: any): void;
  };
}

export interface ProtocolHandler {
  name: string;
  handle(message: any): Promise<any>;
}

export interface EnginePluginLoadOptions {
  plugins?: EnginePlugin[];
  dirs?: string[];
  scan?: boolean;
}

export const DEFAULT_ENGINE_PLUGIN_DIRS = [
  '.pulse-coder/engine-plugins',
  '.coder/engine-plugins',
  '~/.pulse-coder/engine-plugins',
  '~/.coder/engine-plugins',
  './plugins/engine'
];