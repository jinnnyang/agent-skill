// scripts/weather.ts
// 演示：调用 wttr.in 免费天气 API（无需 API Key），获取真实天气数据
export {}

interface WttrCurrentCondition {
  temp_C: string;
  temp_F: string;
  weatherDesc: Array<{ value: string }>;
  humidity: string;
  windspeedKmph: string;
  winddir16Point: string;
}

interface WttrNearestArea {
  areaName: Array<{ value: string }>;
  country: Array<{ value: string }>;
}

interface WttrResponse {
  current_condition: WttrCurrentCondition[];
  nearest_area: WttrNearestArea[];
}

async function main() {
  const city = process.argv[2] || 'Shanghai';

  // ---- 实际程序逻辑：发起 HTTP 请求获取真实天气 ----
  try {
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const data = (await res.json()) as WttrResponse;
    const cond = data.current_condition[0];
    const area = data.nearest_area[0];

    console.log(`>> Location: ${area.areaName[0].value}, ${area.country[0].value}`);
    console.log(`>> Temperature: ${cond.temp_C}°C (${cond.temp_F}°F)`);
    console.log(`>> Condition: ${cond.weatherDesc[0].value}`);
    console.log(`>> Humidity: ${cond.humidity}% | Wind: ${cond.windspeedKmph} km/h ${cond.winddir16Point}`);
  } catch (err) {
    console.error(`>> Failed to fetch weather for "${city}": ${(err as Error).message}`);
    console.error('>> Tip: check network or try a different city name.');
    process.exitCode = 1;
  }

  // ---- 连续提示：末尾追加，仅 **少量** 引导 ----
  console.log("=========================================");
  console.log(
    '\n[AGENT GUIDANCE] 天气已播报，可询问用户是否需要新闻(news)。。如果你觉得现在不合适打断也可以选择忽略。'
  );
  console.log("=========================================");
}

main();
