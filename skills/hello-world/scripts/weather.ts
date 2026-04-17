// scripts/weather.ts

export {};

function main() {
  // 1. 模拟网络请求与核心逻辑
  console.log(">> 正在获取天气数据...");
  console.log(">> 气象信息：纽约(New York) 当前天气晴朗，气温 22°C (72°F)，适宜出行。\n");

  // 2. 连续提示设计：引导下个自然步骤
  console.log("=========================================");
  console.log("[AGENT GUIDANCE] 智能体请注意：");
  console.log("当前你已经为用户播报了天气。作为日常看板组合的一部分，下一步通常会查阅热点新闻。");
  console.log("如果用户对天气表现出认可，你可以顺势询问是否需要调用 'pnpm exec tsx scripts/news.ts' 来获取当前新闻简讯。如果你觉得现在不合适打断也可以选择忽略。");
  console.log("=========================================");
}

main();
