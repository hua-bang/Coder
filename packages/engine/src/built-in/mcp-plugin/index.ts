/**
 * Built-in MCP Plugin for Coder Engine
 * 将 MCP 功能作为引擎内置插件
 * 支持 HTTP transport 和 Stdio transport
 */

import { EnginePlugin, EnginePluginContext } from '../../plugin/EnginePlugin';
import { createMCPClient } from '@ai-sdk/mcp';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

export interface HTTPServerConfig {
  transport?: 'http';
  url: string;
}

export interface StdioServerConfig {
  transport: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export type MCPServerConfig = HTTPServerConfig | StdioServerConfig;

export interface MCPPluginConfig {
  servers: Record<string, MCPServerConfig>;
}

export async function loadMCPConfig(cwd: string): Promise<MCPPluginConfig> {
  const configPath = path.join(cwd, '.coder', 'mcp.json');

  if (!existsSync(configPath)) {
    return { servers: {} };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);

    if (!parsed.servers || typeof parsed.servers !== 'object') {
      console.warn('[MCP] Invalid config: missing "servers" object');
      return { servers: {} };
    }

    return { servers: parsed.servers };
  } catch (error) {
    console.warn(`[MCP] Failed to load config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { servers: {} };
  }
}

function isStdioConfig(config: MCPServerConfig): config is StdioServerConfig {
  return config.transport === 'stdio';
}

function createHTTPTransport(config: HTTPServerConfig) {
  return {
    type: 'http' as const,
    url: config.url,
  };
}

function createStdioTransport(config: StdioServerConfig): StdioClientTransport {
  return new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: config.env ? { ...process.env, ...config.env } as Record<string, string> : undefined,
  });
}

export const builtInMCPPlugin: EnginePlugin = {
  name: '@coder/engine/built-in-mcp',
  version: '1.0.0',

  async initialize(context: EnginePluginContext) {
    const config = await loadMCPConfig(process.cwd());

    const serverCount = Object.keys(config.servers).length;
    if (serverCount === 0) {
      console.log('[MCP] No MCP servers configured');
      return;
    }

    let loadedCount = 0;

    for (const [serverName, serverConfig] of Object.entries(config.servers)) {
      try {
        let transport: ReturnType<typeof createHTTPTransport> | StdioClientTransport;

        if (isStdioConfig(serverConfig)) {
          if (!serverConfig.command) {
            console.warn(`[MCP] Server "${serverName}" missing command, skipping`);
            continue;
          }
          transport = createStdioTransport(serverConfig);
          console.log(`[MCP] Connecting to "${serverName}" via stdio (${serverConfig.command})`);
        } else {
          if (!serverConfig.url) {
            console.warn(`[MCP] Server "${serverName}" missing URL, skipping`);
            continue;
          }
          transport = createHTTPTransport(serverConfig);
          console.log(`[MCP] Connecting to "${serverName}" via HTTP (${serverConfig.url})`);
        }

        const client = await createMCPClient({ transport: transport as any });

        const tools = await client.tools();

        // 注册工具到引擎，使用命名空间前缀
        const namespacedTools = Object.fromEntries(
          Object.entries(tools).map(([toolName, tool]) => [
            `mcp_${serverName}_${toolName}`,
            tool as any,
          ])
        );

        context.registerTools(namespacedTools);

        loadedCount++;
        console.log(`[MCP] Server "${serverName}" loaded (${Object.keys(tools).length} tools)`);

        // 注册服务供其他插件使用
        context.registerService(`mcp:${serverName}`, client);
      } catch (error) {
        console.warn(`[MCP] Failed to load server "${serverName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (loadedCount > 0) {
      console.log(`[MCP] Successfully loaded ${loadedCount}/${serverCount} MCP servers`);
    } else {
      console.warn('[MCP] No MCP servers were loaded successfully');
    }
  },
};

export default builtInMCPPlugin;
