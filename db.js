// ==========================================
// db.js - 产品数据管理中心 (多表合并版)
// ==========================================

// 1. 原本的香水表链接 (gid=0)
const URL_PERFUME = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwZ_BgnXtX_ZdO87jkvLU_IMUByJwFKZoyzVVI0Sghwe-2_Qq676JsqsrO0AnGubJGuCxonKizijyj/pub?gid=0&single=true&output=csv";

// 2. 新的电子烟表链接 (gid=1996660828)
const URL_VAPE = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTwZ_BgnXtX_ZdO87jkvLU_IMUByJwFKZoyzVVI0Sghwe-2_Qq676JsqsrO0AnGubJGuCxonKizijyj/pub?gid=1996660828&single=true&output=csv";

// 缓存时间 (1分钟)
const CACHE_DURATION = 1 * 60 * 1000;

window.perfumeDB = [];

document.addEventListener("DOMContentLoaded", () => {
  initProductData();
});

async function initProductData() {
  // ⚡️ [重要] 更新版本号至 V6，强制刷新旧缓存以合并新表数据
  const cacheKey = "perfumeDB_Data_V6";
  const timeKey = "perfumeDB_Time_V6";

  const now = new Date().getTime();
  const cachedTime = localStorage.getItem(timeKey);
  const cachedData = localStorage.getItem(cacheKey);

  // 1. 尝试加载缓存
  if (cachedData && cachedTime && now - cachedTime < CACHE_DURATION) {
    console.log("🚀 加载合并后的缓存数据");
    try {
      window.perfumeDB = JSON.parse(cachedData);
      runPageLogic();
      return;
    } catch (e) {
      console.warn("缓存损坏，准备重新下载");
    }
  }

  // 2. 同时下载两个表格的数据
  console.log("🌐 正在同步多个表格数据...");
  try {
    const [resPerfume, resVape] = await Promise.all([
      fetch(URL_PERFUME),
      fetch(URL_VAPE)
    ]);

    if (!resPerfume.ok || !resVape.ok) throw new Error("部分表格获取失败");

    const csvPerfume = await resPerfume.text();
    const csvVape = await resVape.text();

    // 解析并合并数据
    const dataPerfume = parseCSV(csvPerfume);
    const dataVape = parseCSV(csvVape);
    
    // 将电子烟数据合并到总数据库中
    window.perfumeDB = [...dataPerfume, ...dataVape];

    // 存入缓存
    localStorage.setItem(cacheKey, JSON.stringify(window.perfumeDB));
    localStorage.setItem(timeKey, now);

    console.log(`✅ 数据同步完成！总计: ${window.perfumeDB.length} 个产品`);
    runPageLogic();
  } catch (error) {
    console.error("数据下载失败:", error);
    if (cachedData) {
      window.perfumeDB = JSON.parse(cachedData);
      runPageLogic();
    }
  }
}

function runPageLogic() {
  if (typeof renderHome === "function") renderHome();
  if (typeof renderCart === "function") renderCart();
}

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0]
    .trim()
    .split(",")
    .map((h) => h.trim().toLowerCase());

  return lines
    .slice(1)
    .map((line) => {
      const values = [];
      let current = "";
      let inQuote = false;
      for (let char of line) {
        if (char === '"') {
          inQuote = !inQuote;
        } else if (char === "," && !inQuote) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const obj = {};
      if (values.length < headers.length) return null;

      headers.forEach((header, index) => {
        let val = values[index] ? values[index].replace(/^"|"$/g, "") : "";

        // 强制转为数字的字段
        if (
          header === "price" ||
          header === "stock" ||
          header === "inventory" ||
          header === "top" ||
          header === "new" ||
          header === "sale"
        ) {
          val = isNaN(Number(val)) ? 0 : Number(val);
        }

        obj[header] = val;
      });
      return obj;
    })
    .filter((item) => item !== null);
}