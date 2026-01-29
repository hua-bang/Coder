import type { FlexibleSchema } from "ai";
import type z from "zod";

export interface Tool<Input, Output> {
  name: string;
  description: string;
  inputSchema: FlexibleSchema<Input>;
  execute: (input: Input) => Promise<Output>;
}