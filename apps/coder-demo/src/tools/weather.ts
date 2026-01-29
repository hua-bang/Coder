
import z from "zod";
import type { Tool } from "../typings";

const WeatherTool: Tool<{ location: string }, { location: string; temperature: number }> = {
  name: 'weather',
  description: 'Get the weather in a location',
  inputSchema: z.object({
    location: z.string().describe('The location to get the weather for'),
  }),
  execute: async ({ location }) => ({
    location,
    temperature: 72 + Math.floor(Math.random() * 21) - 10,
  }),
}

export default WeatherTool;