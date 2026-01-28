import { generateText, tool } from "ai";
import { CoderAI, DEFAULT_MODEL } from "./config/index";
import { z } from "zod";
import generateTextAI from "./ai";

export const run = async () => {
  console.log('Coder Demo Core is running...');

  const prompt = 'What is the weather in San Francisco and what attractions should I visit?'

  const result = await generateTextAI([
    { role: 'user', content: prompt }
  ]);

  console.log(result);
}