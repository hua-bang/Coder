import { Engine } from '@coder/engine';
import { skillRegistryPlugin } from '@coder/engine/plugins/skill-registry.plugin.js';
import * as readline from 'readline';
import type { Context } from '@coder/engine';
import { SessionCommands } from './session-commands.js';

class CoderCLI {
  private engine: Engine;
  private context: Context;
  private sessionCommands: SessionCommands;

  constructor() {
    this.engine = new Engine({
      enginePlugins: {
        plugins: [skillRegistryPlugin],
        dirs: ['./engine-plugins', '~/.coder/engine-plugins']
      },
      userConfigPlugins: {
        dirs: ['./config', '~/.coder/config'],
        scan: true
      }
    });
    this.context = { messages: [] };
    this.sessionCommands = new SessionCommands();
  }

  async initialize() {
    await this.sessionCommands.initialize();
    await this.engine.initialize();
    
    console.log('🚀 Coder CLI with new plugin system');
    console.log('📊 Plugin status:', this.engine.getPluginStatus());
  }

  private async handleCommand(command: string, args: string[]): Promise<void> {
    // ... (保持原有命令处理逻辑)
    try {
      switch (command.toLowerCase()) {
        case 'help':
          console.log('\n📋 Available commands:');
          console.log('/help - Show this help message');
          console.log('/new [title] - Create a new session');
          console.log('/resume <id> - Resume a saved session');
          console.log('/sessions - List all saved sessions');
          console.log('/search <query> - Search in saved sessions');
          console.log('/rename <id> <new-title> - Rename a session');
          console.log('/delete <id> - Delete a session');
          console.log('/clear - Clear current conversation');
          console.log('/status - Show current session status');
          console.log('/save - Save current session explicitly');
          console.log('/exit - Exit the application');
          console.log('/plugins - Show loaded plugins');
          break;

        case 'plugins':
          console.log('\n🔌 Plugin Status:');
          console.log(this.engine.getPluginStatus());
          break;

        case 'new':
          const newTitle = args.join(' ') || undefined;
          await this.sessionCommands.createSession(newTitle);
          this.context.messages = [];
          break;

        // ... 其他命令保持不变

        default:
          console.log(`\n⚠️ Unknown command: ${command}`);
          console.log('Type /help to see available commands');
      }
    } catch (error) {
      console.error('\n❌ Error executing command:', error);
    }
  }

  async start() {
    await this.initialize();
    
    console.log('Type your messages and press Enter. Type "exit" to quit.');
    console.log('Commands starting with "/" will trigger command mode.\n');

    // Auto-create a new session
    await this.sessionCommands.createSession();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });

    // ... (保持原有的交互逻辑)
  }
}

// 向后兼容的入口
export { CoderCLI as NewCoderCLI };

// 主入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new CoderCLI();
  cli.start().catch(console.error);
}