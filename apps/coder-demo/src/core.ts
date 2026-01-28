import generateTextAI from "./ai";

const cwd = process.cwd();

export const run = async () => {
  console.log('Coder Demo Core is running...');

  const prompt = `阅读当前目录 README.md 并总结其内容`;

  const result = await generateTextAI([
    { role: 'user', content: prompt }
  ]);

  console.log(result);
}