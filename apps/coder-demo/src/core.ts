import loop from "./loop";

export const run = async () => {
  console.log('Coder Demo Core is running...');

  const prompt = `帮我在当前目录新建一个文件夹，并写一个贪吃蛇的小游戏，用 HTML 实现就是，`;

  const result = await loop(prompt);

  console.log(`Coder Demo Core is running with result: ${result}`);

}