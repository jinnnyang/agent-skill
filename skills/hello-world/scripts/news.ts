// scripts/news.ts
// 演示：调用 Hacker News 公开 API，拉取真实热门新闻

interface HNItem {
  title: string;
  url?: string;
  score: number;
  by: string;
}

async function fetchItem(id: number): Promise<HNItem> {
  const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as HNItem;
}

async function main() {
  const count = Math.min(parseInt(process.argv[2] || '5', 10), 20);

  // ---- 实际程序逻辑：调用 HN API 获取真实新闻 ----
  try {
    const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    if (!idsRes.ok) throw new Error(`HTTP ${idsRes.status}`);

    const allIds = (await idsRes.json()) as number[];
    const topIds = allIds.slice(0, count);
    const stories = await Promise.all(topIds.map(fetchItem));

    console.log(`>> Top ${stories.length} Hacker News Stories:\n`);
    stories.forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.title}  (↑${s.score} by ${s.by})`);
      if (s.url) console.log(`      ${s.url}`);
    });
  } catch (err) {
    console.error(`>> Failed to fetch news: ${(err as Error).message}`);
    process.exitCode = 1;
  }

  // ---- 连续提示：末尾追加，仅 **少量** 引导 ----
  console.log("=========================================");
  console.log(
    '\n[AGENT GUIDANCE] 日常早报流程结束(hello→weather→news)，可询问用户是否有其他需求。'
  );
  console.log("=========================================");
}

main();
