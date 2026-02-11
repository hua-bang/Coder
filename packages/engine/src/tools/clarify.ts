import z from "zod";
import type { Tool, ToolExecutionContext } from "../shared/types";
import { CLARIFICATION_TIMEOUT } from "../config/index.js";
import { randomUUID } from "crypto";

export interface ClarifyInput {
  question: string;
  context?: string;
  defaultAnswer?: string;
  timeout?: number;
}

export interface ClarifyOutput {
  answer: string;
  timedOut: boolean;
}

export const ClarifyTool: Tool<ClarifyInput, ClarifyOutput> = {
  name: 'clarify',
  description: 'Ask the user a clarifying question and wait for their response. Use this when you need information from the user to proceed with the task.',
  inputSchema: z.object({
    question: z.string().describe('The question to ask the user'),
    context: z.string().optional().describe('Additional context to help the user answer'),
    defaultAnswer: z.string().optional().describe('Default answer if user does not respond within timeout'),
    timeout: z.number().optional().describe('Timeout in milliseconds (default: 5 minutes)')
  }),
  execute: async (input, toolContext) => {
    if (!toolContext?.onClarificationRequest) {
      throw new Error('Clarification is not supported in this context. The clarify tool requires a CLI interface with user interaction.');
    }

    const timeout = input.timeout ?? CLARIFICATION_TIMEOUT;
    const requestId = randomUUID();

    try {
      // Create a promise that rejects on timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Clarification request timed out after ${timeout}ms`));
        }, timeout);
      });

      // Race between user response and timeout
      const answer = await Promise.race([
        toolContext.onClarificationRequest({
          id: requestId,
          question: input.question,
          context: input.context,
          defaultAnswer: input.defaultAnswer,
          timeout
        }),
        timeoutPromise
      ]);

      return {
        answer,
        timedOut: false
      };
    } catch (error: any) {
      // If timeout occurred and we have a default answer, use it
      if (error?.message?.includes('timed out') && input.defaultAnswer) {
        return {
          answer: input.defaultAnswer,
          timedOut: true
        };
      }

      // Otherwise, re-throw the error
      throw error;
    }
  },
};

export default ClarifyTool;
