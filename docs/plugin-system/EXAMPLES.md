# 插件系统示例集合

## 引擎开发插件示例

### 1. MCP 客户端插件

#### 完整实现
```typescript
// mcp-client.plugin.ts
import type { EnginePlugin, EngineContext } from 'pulse-coder-engine/engine-plugin';
import { MCPClient } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface McpPluginConfig {
  servers: Array<{
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
}

const mcpClientPlugin: EnginePlugin = {
  name: 'pulse-coder-engine-mcp-client',
  version: '1.0.0',
  dependencies: ['pulse-coder-engine-core'],
  
  async initialize(context) {
    const config = context.getConfig<McpPluginConfig>('mcp') || { servers: [] };
    const clients = new Map<string, MCPClient>();
    
    // 初始化所有 MCP 服务器
    for (const server of config.servers) {
      const transport = new StdioClientTransport({
        command: server.command,
        args: server.args,
        env: server.env
      });
      
      const client = new MCPClient({ transport });
      await client.connect();
      
      clients.set(server.name, client);
      
      // 注册为服务
      context.registerService(`mcp:${server.name}`, client);
    }
    
    // 注册 MCP 工具
    const mcpTool = {
      name: 'mcp',
      description: 'Execute MCP operations',
      inputSchema: z.object({
        server: z.string().describe('MCP server name'),
        operation: z.string().describe('Operation to perform'),
        parameters: z.record(z.any()).optional()
      }),
      execute: async ({ server, operation, parameters }) => {
        const client = clients.get(server);
        if (!client) {
          throw new Error(`MCP server ${server} not found`);
        }
        
        return client.callTool(operation, parameters);
      }
    };
    
    context.registerTool(mcpTool);
    
    // 注册清理钩子
    context.events.on('engine:shutdown', async () => {
      for (const client of clients.values()) {
        await client.close();
      }
    });
  }
};

export default mcpClientPlugin;
```

#### 使用配置
```json
{
  "mcp": {
    "servers": [
      {
        "name": "filesystem",
        "command": "npx",
        "args": ["@modelcontextprotocol/server-filesystem", "."]
      },
      {
        "name": "postgres",
        "command": "npx",
        "args": ["@modelcontextprotocol/server-postgresql"],
        "env": {
          "DATABASE_URL": "postgresql://localhost:5432/mydb"
        }
      }
    ]
  }
}
```

### 2. SubAgent 管理插件

#### 完整实现
```typescript
// sub-agent.plugin.ts
import type { EnginePlugin, EngineContext } from 'pulse-coder-engine/engine-plugin';
import { SubAgentManager } from './sub-agent-manager.js';

interface SubAgentConfig {
  name: string;
  model: string;
  temperature?: number;
  systemPrompt?: string;
  tools?: string[];
}

const subAgentPlugin: EnginePlugin = {
  name: 'pulse-coder-engine-sub-agent',
  version: '2.0.0',
  
  async initialize(context) {
    const manager = new SubAgentManager(context);
    
    // 注册子代理管理工具
    const subAgentTool = {
      name: 'subAgent',
      description: 'Execute tasks with specialized sub-agents',
      inputSchema: z.object({
        agentName: z.string().describe('Name of the sub-agent'),
        task: z.string().describe('Task to execute'),
        context: z.string().optional(),
        maxIterations: z.number().optional().default(5)
      }),
      execute: async ({ agentName, task, context, maxIterations }) => {
        return manager.execute(agentName, task, context, maxIterations);
      }
    };
    
    // 动态创建子代理工具
    const createAgentTool = {
      name: 'createSubAgent',
      description: 'Create a new sub-agent',
      inputSchema: z.object({
        name: z.string().describe('Agent name'),
        config: z.object({
          model: z.string(),
          temperature: z.number().optional(),
          systemPrompt: z.string().optional(),
          tools: z.array(z.string()).optional()
        })
      }),
      execute: async ({ name, config }) => {
        await manager.createAgent(name, config);
        return { success: true, name };
      }
    };
    
    context.registerTool(subAgentTool);
    context.registerTool(createAgentTool);
  }
};

export default subAgentPlugin;
```

### 3. 自定义工具类型插件

#### HTTP 工具类型
```typescript
// http-tool.plugin.ts
import type { EnginePlugin, EngineContext } from 'pulse-coder-engine/engine-plugin';

const httpToolPlugin: EnginePlugin = {
  name: 'pulse-coder-engine-http-tool',
  version: '1.0.0',
  
  async initialize(context) {
    context.registerToolType('http', (config) => ({
      name: config.name,
      description: config.description,
      inputSchema: z.object({
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional().default('GET'),
        path: z.string().optional(),
        data: z.any().optional(),
        headers: z.record(z.string()).optional()
      }),
      execute: async ({ method, path, data, headers }) => {
        const url = `${config.baseUrl}${path || ''}`;
        const response = await fetch(url, {
          method,
          headers: { ...config.headers, ...headers },
          body: data ? JSON.stringify(data) : undefined
        });
        
        return response.json();
      }
    }));
  }
};
```

## 用户配置插件示例

### 1. 基础项目配置

#### config.json
```json
{
  "version": "1.0",
  "name": "react-app-config",
  "description": "Configuration for React TypeScript project",
  
  "prompts": {
    "system": "You are an expert React and TypeScript developer. Always provide type-safe solutions and follow React best practices.",
    "user": "Please help me with {task}. Consider performance and accessibility."
  },
  
  "tools": {
    "eslint": {
      "type": "bash",
      "command": "npx",
      "args": ["eslint", "--fix", "{file}"],
      "description": "Run ESLint with auto-fix"
    },
    "test": {
      "type": "bash",
      "command": "npm",
      "args": ["test", "--", "--watchAll=false", "--coverage"],
      "description": "Run tests with coverage"
    }
  },
  
  "skills": {
    "directories": ["./.coder/skills", "./team-skills"],
    "autoScan": true
  }
}
```

### 2. MCP 服务器配置

#### mcp-config.yaml
```yaml
version: "1.0"
name: full-stack-config

tools:
  nodeVersion:
    type: bash
    command: node
    args: ["--version"]
    description: Check Node.js version
    
  dockerStatus:
    type: bash
    command: docker
    args: ["ps", "-a"]
    description: Check Docker containers

mcp:
  servers:
    - name: filesystem
      command: npx
      args: ["@modelcontextprotocol/server-filesystem", "."]
      timeout: 10000
      
    - name: postgres
      command: npx
      args: ["@modelcontextprotocol/server-postgresql"]
      env:
        DATABASE_URL: "postgresql://localhost:5432/devdb"
        
    - name: redis
      command: npx
      args: ["@modelcontextprotocol/server-redis"]
      env:
        REDIS_URL: "redis://localhost:6379"
        
    - name: github
      command: npx
      args: ["@modelcontextprotocol/server-github"]
      env:
        GITHUB_TOKEN: ${GITHUB_TOKEN}
        GITHUB_API_URL: ${GITHUB_API_URL:-https://api.github.com}

subAgents:
  - name: frontendDev
    trigger: ["react", "frontend", "ui"]
    prompt: |
      You are a frontend development expert specializing in React, TypeScript, and modern web technologies.
      Focus on:
      1. Component architecture and reusability
      2. Performance optimization
      3. Accessibility best practices
      4. Testing strategies
    model: "gpt-4"
    temperature: 0.7
    
  - name: backendDev
    trigger: ["api", "database", "server"]
    prompt: |
      You are a backend development expert with deep knowledge of Node.js, databases, and API design.
      Focus on:
      1. RESTful API design
      2. Database optimization
      3. Security best practices
      4. Scalability considerations
    model: "claude-3-sonnet"
    temperature: 0.5
    
  - name: devops
    trigger: ["docker", "deploy", "ci/cd"]
    prompt: |
      You are a DevOps expert specializing in modern deployment practices.
      Focus on:
      1. Container orchestration
      2. CI/CD pipeline optimization
      3. Infrastructure as code
      4. Monitoring and logging
    model: "gpt-4"
    temperature: 0.3
```

### 3. 团队协作配置

#### team-config.json
```json
{
  "version": "1.0",
  "name": "team-standards",
  "description": "Shared configuration for development team",
  
  "prompts": {
    "system": "You are part of a development team. Always consider code reviews, testing, and documentation. Follow the team's coding standards and best practices.",
    "codeReview": "Review this code according to our team standards:\n1. Follow SOLID principles\n2. Include comprehensive tests\n3. Add JSDoc comments\n4. Check for security issues\n5. Ensure performance considerations"
  },
  
  "tools": {
    "lint": {
      "type": "bash",
      "command": "npm",
      "args": ["run", "lint"],
      "description": "Run team linting rules"
    },
    "format": {
      "type": "bash",
      "command": "npm",
      "args": ["run", "format"],
      "description": "Format code with team standards"
    },
    "test": {
      "type": "bash",
      "command": "npm",
      "args": ["run", "test:ci"],
      "description": "Run full test suite"
    },
    "typeCheck": {
      "type": "bash",
      "command": "npx",
      "args": ["tsc", "--noEmit"],
      "description": "TypeScript type checking"
    }
  },
  
  "subAgents": [
    {
      "name": "codeReviewer",
      "trigger": ["review", "pr"],
      "prompt": "Act as a senior code reviewer. Focus on:\n1. Code quality and maintainability\n2. Test coverage\n3. Documentation completeness\n4. Security best practices\n5. Performance implications",
      "model": "gpt-4",
      "temperature": 0.3
    },
    {
      "name": "architect",
      "trigger": ["design", "architecture"],
      "prompt": "Review the architecture and design decisions. Ensure:\n1. Scalability considerations\n2. Maintainability\n3. Team standards compliance\n4. Future extensibility",
      "model": "claude-3-sonnet",
      "temperature": 0.4
    }
  ],
  
  "mcp": {
    "servers": [
      {
        "name": "team-filesystem",
        "command": "npx",
        "args": ["@modelcontextprotocol/server-filesystem", "."],
        "env": {
          "ALLOWED_PATHS": "/workspace"
        }
      },
      {
        "name": "team-github",
        "command": "npx",
        "args": ["@modelcontextprotocol/server-github"],
        "env": {
          "GITHUB_TOKEN": "${TEAM_GITHUB_TOKEN}",
          "GITHUB_OWNER": "mycompany",
          "GITHUB_REPO": "main-project"
        }
      }
    ]
  }
}
```

### 4. 环境特定配置

#### development.json
```json
{
  "version": "1.0",
  "name": "development-config",
  "description": "Development environment configuration",
  
  "tools": {
    "devServer": {
      "type": "bash",
      "command": "npm",
      "args": ["run", "dev"],
      "description": "Start development server"
    },
    "hotReload": {
      "type": "bash",
      "command": "npm",
      "args": ["run", "dev:watch"],
      "description": "Start with hot reload"
    }
  },
  
  "prompts": {
    "system": "You are in development mode. Focus on rapid prototyping and debugging. Provide practical solutions and debugging tips.",
    "debug": "Help debug this issue. Consider:\n1. Console logs and debugging tools\n2. Development server issues\n3. Hot reload problems\n4. Environment setup"
  },
  
  "mcp": {
    "servers": [
      {
        "name": "local-dev",
        "command": "npx",
        "args": ["@modelcontextprotocol/server-filesystem", "./src"],
        "env": {
          "DEBUG": "true"
        }
      }
    ]
  }
}
```

## 动态配置示例

### 1. 运行时配置更新

```typescript
// 添加新的工具
await engine.addUserConfig({
  tools: {
    customDeploy: {
      type: "bash",
      command: "./scripts/deploy.sh",
      args: ["--env", "production"],
      description: "Deploy to production"
    }
  }
});

// 更新 MCP 配置
await engine.updateUserConfig('main', {
  mcp: {
    servers: [
      ...existingServers,
      {
        name: "new-service",
        command: "npx",
        args: ["@modelcontextprotocol/server-new"]
      }
    ]
  }
});
```

### 2. 环境变量模板

#### .env.template
```bash
# MCP 配置
GITHUB_TOKEN=your_github_token_here
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
REDIS_URL=redis://localhost:6379

# API 密钥
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# 项目配置
PROJECT_NAME=my-awesome-project
NODE_ENV=development
```

#### 配置中的引用
```yaml
mcp:
  servers:
    - name: github
      command: npx
      args: ["@modelcontextprotocol/server-github"]
      env:
        GITHUB_TOKEN: ${GITHUB_TOKEN}
        GITHUB_API_URL: ${GITHUB_API_URL:-https://api.github.com}
    
    - name: postgres
      command: npx
      args: ["@modelcontextprotocol/server-postgresql"]
      env:
        DATABASE_URL: ${DATABASE_URL}
```

## 高级用法

### 1. 条件配置

```json
{
  "version": "1.0",
  "name": "conditional-config",
  "conditions": {
    "environment": "${NODE_ENV}",
    "features": ["mcp", "sub-agents"]
  },
  "tools": {
    "debug": {
      "type": "bash",
      "command": "node",
      "args": ["--inspect", "server.js"],
      "enabled": "${NODE_ENV} === 'development'"
    }
  }
}
```

### 2. 继承配置

```yaml
version: "1.0"
name: production-config
extends: "./base-config.yaml"

overrides:
  prompts:
    system: "Production mode - focus on stability and performance"
  
  tools:
    debug: null  # 禁用调试工具
    
  mcp:
    servers:
      - name: production-db
        command: npx
        args: ["@modelcontextprotocol/server-postgresql"]
        env:
          DATABASE_URL: ${PROD_DATABASE_URL}
```