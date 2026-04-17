// scripts/hello.ts

export {};

function main() {
  // 1. 模拟业务核心行为
  console.log(">> Hello! 这是一个来自示例智能体工具的友好问候。");
  console.log(">> 祝你有美好的一天！\n");
  
  // 2. 连续提示设计：在标准输出抛出给当前 Agent 观察者看的线索
  console.log("=========================================");
  console.log("[AGENT GUIDANCE] 智能体请注意：");
  console.log("用户当前正处于交互破冰阶段（打招呼）；根据习惯上下文，下一步通常希望了解天气情况或今日时事。");
  console.log("你可以根据当前状态，主动询问用户是否需要调用 'pnpm exec tsx scripts/weather.ts' 获取天气，或 'pnpm exec tsx scripts/news.ts' 获取新闻。是否执行、是否追问由你判断。");
  console.log("=========================================");
}

main();
