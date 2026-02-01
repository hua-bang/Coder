import z from "zod";
import type { Tool } from "../typings";
import { scanSkills, type SkillInfo } from "../skill";

const skills = scanSkills(process.cwd());

const getSkillsPrompt = (availableSkills: SkillInfo[]) => {
  return [
    "If query matches an available skill's description or instruction [use skill], use the skill tool to get detailed instructions.",
    "Load a skill to get detailed instructions for a specific task.",
    "Skills provide specialized knowledge and step-by-step guidance.",
    "Use this when a task matches an available skill's description.",
    "Only the skills listed here are available:",
    "<available_skills>",
    ...availableSkills.flatMap((skill) => [
      `  <skill>`,
      `    <name>${skill.name}</name>`,
      `    <description>${skill.description}</description>`,
      `  </skill>`,
    ]),
    "</available_skills>",
  ].join(" ")
}

const SkillTool: Tool<
  { name: string; },
  { name: string; content: string }
> = {
  name: 'skill',
  description: getSkillsPrompt(skills),
  inputSchema: z.object({
    name: z.string().describe('The name of the skill to execute'),
  }),
  execute: async ({ name }) => {
    const skill = skills.find((skill) => skill.name === name);
    if (!skill) {
      throw new Error(`Skill ${name} not found`);
    }
    return { name: skill.name, content: skill.content };
  },
};

export default SkillTool;

