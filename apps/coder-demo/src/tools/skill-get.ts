import z from "zod";
import type { Tool } from "../typings";
import { skillRegistry } from "../skill";

const SkillGetTool: Tool<
  { name: string },
  { skill: { name: string; description: string; location: string; content: string } | null }
> = {
  name: 'skill_get',
  description: 'Get the full content of a specific skill by name',
  inputSchema: z.object({
    name: z.string().describe('The exact name of the skill to retrieve'),
  }),
  execute: async ({ name }) => {
    const skill = skillRegistry.get(name);

    if (!skill) {
      return {
        skill: null,
      };
    }

    return {
      skill: {
        name: skill.name,
        description: skill.description,
        location: skill.location,
        content: skill.content,
      },
    };
  },
};

export default SkillGetTool;
