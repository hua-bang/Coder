import z from "zod";
import type { Tool } from "../typings";
import { skillRegistry } from "../skill";

const SkillSearchTool: Tool<
  { keyword: string },
  { skills: Array<{ name: string; description: string; location: string }> }
> = {
  name: 'skill_search',
  description: 'Search for available skills by keyword (searches in name and description)',
  inputSchema: z.object({
    keyword: z.string().describe('The keyword to search for in skill names and descriptions'),
  }),
  execute: async ({ keyword }) => {
    const results = skillRegistry.search(keyword);

    return {
      skills: results.map(skill => ({
        name: skill.name,
        description: skill.description,
        location: skill.location,
      })),
    };
  },
};

export default SkillSearchTool;
