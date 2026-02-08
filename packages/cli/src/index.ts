import { Engine } from '@coder/engine';
import { skillPlugin } from '@coder/skills';
import * as readline from 'readline';
import type { Context } from '@coder/engine';

class CoderCLI {
  private engine: Engine;
  private context: Context;

  constructor() {
    this.engine = new Engine({ plugins: [skillPlugin] });
    this.context = { messages: [] };
  }

  // Command callback - handles /xxx commands
  private async handleCommand(command: string, args: string[]): Promise<void> {
    console.log(`\n🎯 Command executed: ${command}`);
    console.log(`Arguments: ${args.join(', ')}`);
    
    // Example command handling - you can customize these
    switch (command.toLowerCase()) {
      case 'help':
        console.log('\n📋 Available commands:');
        console.log('/help - Show this help message');
        console.log('/clear - Clear conversation history');
        console.log('/status - Show current status');
        console.log('/exit - Exit the application');
        break;
      case 'clear':
        this.context.messages = [];
        console.log('\n🧹 Conversation history cleared!');
        break;
      case 'status':
        console.log(`\n📊 Status: ${this.context.messages.length} messages in context`);
        break;
      case 'exit':
        console.log('Goodbye!');
        process.exit(0);
        break;
      default:
        console.log(`\n⚠️ Unknown command: ${command}`);
        console.log('Type /help to see available commands');
    }
  }

  async start() {
    console.log('🚀 Coder CLI is running...');
    console.log('Type your messages and press Enter. Type "exit" to quit.');
    console.log('Commands starting with "/" will trigger command mode.\n');

    await this.engine.loadPlugin(skillPlugin);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '> '
    });

    let currentAbortController: AbortController | null = null;
    let isProcessing = false;

    process.on('SIGINT', () => {
      if (isProcessing && currentAbortController && !currentAbortController.signal.aborted) {
        currentAbortController.abort();
        process.stdout.write('\n[Abort] Request cancelled.\n');
        return;
      }
      rl.close();
    });

    const processInput = async (input: string) => {
      const trimmedInput = input.trim();
      
      if (trimmedInput.toLowerCase() === 'exit') {
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
      }

      if (!trimmedInput) {
        rl.prompt();
        return;
      }

      // Check if input starts with / (command mode)
      if (trimmedInput.startsWith('/')) {
        const commandLine = trimmedInput.substring(1); // Remove the /
        const parts = commandLine.split(/\s+/).filter(part => part.length > 0);
        
        if (parts.length === 0) {
          console.log('\n⚠️ Please provide a command after "/"');
          rl.prompt();
          return;
        }

        const command = parts[0];
        const args = parts.slice(1);

        try {
          await this.handleCommand(command, args);
        } catch (error) {
          console.error('\n❌ Error executing command:', error);
        }
        
        rl.prompt();
        return;
      }

      // Regular message processing
      this.context.messages.push({
        role: 'user',
        content: trimmedInput,
      });

      console.log('\n🔄 Processing...\n');

      const ac = new AbortController();
      currentAbortController = ac;
      isProcessing = true;

      let sawText = false;

      try {
        const result = await this.engine.run(this.context, {
          abortSignal: ac.signal,
          onText: (delta) => {
            sawText = true;
            process.stdout.write(delta);
          },
          onToolCall: (toolCall) => {
            const input = 'input' in toolCall ? toolCall.input : undefined;
            const inputText = input === undefined ? '' : `(${JSON.stringify(input)})`;
            process.stdout.write(`\n🔧 ${toolCall.toolName}${inputText}\n`);
          },
          onToolResult: (toolResult) => {
            process.stdout.write(`\n✅ ${toolResult.toolName}\n`);
          },
          onStepFinish: (step) => {
            process.stdout.write(`\n📋 Step finished: ${step.finishReason}\n`);
          },
        });

        if (!sawText && result) {
          console.log(result);
        } else {
          process.stdout.write('\n');
        }
      } finally {
        isProcessing = false;
        currentAbortController = null;
        rl.prompt();
      }
    };

    rl.prompt();
    rl.on('line', processInput);
    rl.on('close', () => {
      console.log('\n👋 Goodbye!');
      process.exit(0);
    });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new CoderCLI();
  cli.start().catch(console.error);
}
