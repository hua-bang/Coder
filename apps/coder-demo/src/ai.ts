import { generateText, tool, type ModelMessage } from 'ai';
import { CoderAI, DEFAULT_MODEL } from './config';
import z from 'zod';

export const generateTextAI = (messages: ModelMessage[]): ReturnType<typeof generateText> => {
  return generateText({
    model: CoderAI.chat(DEFAULT_MODEL),
    messages,
    tools: {
      weather: tool({
        description: 'Get the weather in a location',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        }),
      }),
      cityAttractions: tool({
        inputSchema: z.object({ city: z.string() }),
      }),
    },
  }) as unknown as ReturnType<typeof generateText>;
}

export default generateTextAI;