/**
 * scraper.js
 * 站点订阅抓取：按站点声明的 strategy 真实抓取「订阅链接」，并做去重与连通性校验。
 *
 * 支持三种站点策略：
 *  - article : 先取索引页拿到文章列表，再逐篇抓取文章里的订阅文件链接（clashnode / clash-meta）
 *  - static  : 站点固定暴露若干订阅文件（airportnode 的 sub.txt / clash.yaml）
 *  - repoDaily: GitHub 仓库每日产出一份订阅文件（free-nodes/clashfree 的 clashYYYYMMDD.yml）
 *
 * 输出：data/<hostname>.json，每条订阅带 online / httpStatus / latencyMs / bytes / note，
 *       站点级 health 汇总在线率，供前端 API Status 与订阅列表展示。
 */

const fs = require('fs-extra');
const path = require('path');
const {
  httpGet,
  probeSubscription,
  normalizeUrl,
  mapLimit,
  loadConfigSafe,
  decodeHtmlEntities
} = require('./http-client');

const DEFAULT_SETTINGS = {
  updateInterval: 15,
  maxArticlesPerSite: 10,
  cleanOldDataOnUpdate: true,
  port: 3000,
  dataDir: 'data',
  localFreeNodesCount: 0
};

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------

const loadConfig = () => {
  const config = loadConfigSafe();
  if (!config || !Object.keys(config).length) {
    return { sites: [], settings: { ...DEFAULT_SETTINGS }, subscriptions: [] };
  }
  config.settings = { ...DEFAULT_SETTINGS, ...(config.settings || {}) };
  if (!Array.isArray(config.subscriptions)) config.subscriptions = [];
  if (!Array.isArray(config.sites)) config.sites = [];
  return config;
};

const getConfig = () => loadConfig();

const readTargetSites = () => {
  const config = loadConfig();
  const enabled = config.sites.filter(site => site && site.enabled !== false && site.url).map(site => site.url);
  console.log(`从配置文件读取到 ${enabled.length} 个网站`);
  return enabled;
};

// ---------------------------------------------------------------------------
// 解析小工具
// ---------------------------------------------------------------------------

const absolutize = (href, baseUrl) => {
  try {
    return new URL(decodeHtmlEntities(href).trim(), baseUrl).href;
  } catch (error) {
    return '';
  }
};

// 由扩展名推断订阅类型
const detectTypeFromUrl = (url) => {
  const pathname = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch (error) {
      return String(url).toLowerCase();
    }
  })();
  if (/\.ya?ml$/.test(pathname)) return 'Clash';
  if (/\.json$/.test(pathname)) return 'Sing-Box';
  if (/\.txt$/.test(pathname)) return 'V2ray';
  return '通用';
};

// 需要排除的噪音域名（分享按钮、统计、推广等）
const NOISE_HOSTS = [
  'weibo.com', 'connect.qq.com', 'sns.qzone.qq.com', 'googletagmanager.com',
  'google-analytics.com', 't.me', 'twitter.com', 'facebook.com', 't.cn',
  'dginv.click', 'service.weibo.com', 'stats.starcore.one', 'clashbk'
];

const isSubscriptionUrl = (url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (error) {
    return false;
  }
  if (!/^https?:$/.test(parsed.protocol)) return false;
  const host = parsed.hostname.toLowerCase();
  if (NOISE_HOSTS.some(n => host === n || host.endsWith(`.${n}`))) return false;

  const pathname = parsed.pathname.toLowerCase();
  if (/\.(htm|html|css|js|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|mp4|webm)$/.test(pathname)) return false;
  if (!/\.(ya?ml|txt|json)$/.test(pathname)) return false;
  // 订阅通常位于 uploads / stair / sub 等目录，或本身就是 sub.* 文件
  return true;
};

/**
 * 从 HTML 中提取订阅链接（同时覆盖 href 属性与正文里直接张贴的裸链接）
 */
const extractSubscriptionUrls = (html, baseUrl) => {
  const found = new Map();
  const push = (raw) => {
    if (!raw) return;
    const cleaned = decodeHtmlEntities(String(raw)).replace(/[.,;:'"<>)\]}]+$/, '').trim();
    if (!cleaned) return;
    const absolute = absolutize(cleaned, baseUrl);
    if (!absolute || !isSubscriptionUrl(absolute)) return;
    const key = normalizeUrl(absolute);
    if (!found.has(key)) {
      found.set(key, { url: absolute, type: detectTypeFromUrl(absolute) });
    }
  };

  const attrRe = /(?:href|src|data-url|data-href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = attrRe.exec(html)) !== null) push(m[1]);

  const bareRe = /https?:\/\/[^\s"'<>()\\]+/gi;
  while ((m = bareRe.exec(html)) !== null) push(m[0]);

  return [...found.values()];
};

// 从文章 URL 中解析日期（用于挑选最新文章）
const parseDateFromUrl = (url) => {
  const s = String(url);
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = s.match(/(\d{4})(\d{2})(\d{2})/);
  if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return 0;
};

const getHostname = (url) => {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return 'unknown';
  }
};

const safeFileName = (hostname) => hostname.replace(/[^a-zA-Z0-9]/g, '_');

// ---------------------------------------------------------------------------
// 各策略：收集订阅链接
// ---------------------------------------------------------------------------

/**
 * article 策略：索引页 -> 最新 N 篇文章 -> 文章中的订阅链接
 */
const collectByArticle = async (site) => {
  const indexUrl = site.indexUrl || site.url;
  console.log(`[site] 抓取索引页: ${indexUrl}`);
  const indexHtml = await httpGet(indexUrl);

  const pattern = new RegExp(site.articlePathPattern || '/free-nodes/[^"\'#?\\s]+\\.html?', 'gi');
  const links = new Set();
  let m;
  while ((m = pattern.exec(indexHtml)) !== null) {
    const abs = absolutize(m[0], indexUrl);
    if (abs) links.add(abs);
  }

  const articles = [...links]
    .map(url => ({ url, date: parseDateFromUrl(url) }))
    .sort((a, b) => b.date - a.date);

  const limit = site.maxArticles || loadConfig().settings.maxArticlesPerSite || 3;
  const picked = articles.slice(0, limit);
  console.log(`[site] 索引页找到 ${articles.length} 篇文章，取最新 ${picked.length} 篇`);

  const result = [];
  for (const article of picked) {
    try {
      const html = await httpGet(article.url);
      const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const title = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : article.url;
      const subs = extractSubscriptionUrls(html, article.url);
      console.log(`[site]   ${article.url} -> ${subs.length} 条订阅`);
      result.push({
        url: article.url,
        title,
        scrapedAt: new Date().toISOString(),
        subscriptionCount: subs.length,
        subscriptions: subs
      });
    } catch (error) {
      console.warn(`[site]   文章抓取失败 ${article.url}: ${error.message}`);
      result.push({
        url: article.url,
        title: article.url,
        scrapedAt: new Date().toISOString(),
        error: error.message,
        subscriptionCount: 0,
        subscriptions: []
      });
    }
  }
  return result;
};

/**
 * static 策略：站点固定暴露的订阅文件（相对路径按站点 URL 解析）
 */
const collectByStatic = async (site) => {
  const subs = (site.subscriptions || []).map(item => {
    const raw = typeof item === 'string' ? item : item.path || item.url;
    const absolute = absolutize(raw, site.url);
    if (!absolute) return null;
    return {
      url: absolute,
      type: (typeof item === 'object' && item.type) || detectTypeFromUrl(absolute),
      description: (typeof item === 'object' && item.description) || undefined
    };
  }).filter(Boolean);

  console.log(`[site] 静态订阅 ${subs.length} 条`);
  return [{
    url: site.url,
    title: site.description || getHostname(site.url),
    scrapedAt: new Date().toISOString(),
    subscriptionCount: subs.length,
    subscriptions: subs
  }];
};

/**
 * repoDaily 策略：仓库 README 指向的每日订阅文件；README 不可用时按日期回退
 */
const collectByRepoDaily = async (site) => {
  const repo = site.repo;
  const branch = site.branch || 'main';
  const filePattern = new RegExp(site.filePattern || 'clash(\\d{8})\\.ya?ml', 'gi');

  const candidates = [];
  try {
    const readme = await httpGet(`https://raw.githubusercontent.com/${repo}/${branch}/README.md`, { timeout: 30000 });
    let m;
    const seen = new Set();
    while ((m = filePattern.exec(readme)) !== null) {
      const file = m[0];
      if (seen.has(file)) continue;
      seen.add(file);
      candidates.push(file);
    }
  } catch (error) {
    console.warn(`[site]   README 读取失败: ${error.message}`);
  }

  // 按文件名里的日期倒序，取最新的
  candidates.sort((a, b) => parseDateFromUrl(b) - parseDateFromUrl(a));

  if (!candidates.length) {
    const now = new Date();
    candidates.push(`clash${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.yml`);
  }

  const file = candidates[0];
  const encodedPath = file.split('/').map(encodeURIComponent).join('/');
  const url = `https://raw.githubusercontent.com/${repo}/${branch}/${encodedPath}`;

  console.log(`[site] 仓库每日订阅: ${file}`);
  return [{
    url: `https://github.com/${repo}`,
    title: `${repo} ${file}`,
    scrapedAt: new Date().toISOString(),
    subscriptionCount: 1,
    subscriptions: [{ url, type: detectTypeFromUrl(url), description: `${file}（每日更新）` }]
  }];
};

const STRATEGIES = {
  article: collectByArticle,
  static: collectByStatic,
  repoDaily: collectByRepoDaily
};

// ---------------------------------------------------------------------------
// 抓取单个站点
// ---------------------------------------------------------------------------

/**
 * 抓取一个站点。此阶段只收集订阅链接，连通性在 scrapeAllSites 里统一批量校验。
 */
const scrapeSite = async (siteOrUrl) => {
  const config = loadConfig();
  const site = typeof siteOrUrl === 'string'
    ? config.sites.find(s => s.url === siteOrUrl) || { url: siteOrUrl }
    : siteOrUrl;

  const hostname = getHostname(site.url);
  const siteData = {
    url: site.url,
    siteName: site.name || hostname,
    description: site.description,
    strategy: site.strategy || 'article',
    scrapedAt: new Date().toISOString(),
    articles: []
  };

  const strategy = STRATEGIES[siteData.strategy] || collectByArticle;
  try {
    siteData.articles = await strategy(site);
  } catch (error) {
    console.error(`[site] ${site.url} 抓取失败: ${error.message}`);
    siteData.error = error.message;
  }

  siteData.totalSubscriptions = siteData.articles.reduce((sum, a) => sum + (a.subscriptions ? a.subscriptions.length : 0), 0);
  console.log(`[site] ${hostname} 收集到 ${siteData.totalSubscriptions} 条订阅链接`);
  return siteData;
};

// ---------------------------------------------------------------------------
// 抓取全部站点：收集 -> 全局去重 -> 连通性校验 -> 落盘
// ---------------------------------------------------------------------------

const scrapeAllSites = async () => {
  const config = loadConfig();
  const settings = config.settings;
  const dataDir = path.join(__dirname, settings.dataDir || 'data');
  const enabledSites = config.sites.filter(site => site && site.enabled !== false && site.url);

  if (settings.cleanOldDataOnUpdate) {
    // 只逐文件清理站点级 JSON（data/<site>.json）。
    // 不用 fs.removeSync(dataDir) 整目录删除：
    //  1) data/nodes 子目录存放可导入节点数据，整目录删除会把它一起清掉，使正确性依赖调用顺序，非常脆弱；
    //  2) 逐文件 unlink 也更温和，不依赖递归删除能力。
    fs.ensureDirSync(dataDir);
    fs.readdirSync(dataDir).forEach(file => {
      if (!file.endsWith('.json')) return;
      try {
        fs.unlinkSync(path.join(dataDir, file));
      } catch (error) {
        console.warn(`清理旧数据失败 ${file}: ${error.message}`);
      }
    });
  } else {
    // 确保数据目录存在
    fs.ensureDirSync(dataDir);
  }

  console.log(`开始抓取 ${enabledSites.length} 个网站`);

  const siteResults = [];
  for (const site of enabledSites) {
    try {
      siteResults.push(await scrapeSite(site));
    } catch (error) {
      console.error(`处理 ${site.url} 失败:`, error.message);
    }
  }

  // ---- 全局去重：同一个订阅链接只探测一次 ----
  const uniqueSubs = new Map();
  let duplicatesRemoved = 0;

  for (const siteData of siteResults) {
    for (const article of siteData.articles) {
      if (!Array.isArray(article.subscriptions)) continue;
      for (const sub of article.subscriptions) {
        const key = normalizeUrl(sub.url);
        if (!key) continue;
        if (uniqueSubs.has(key)) {
          duplicatesRemoved += 1;
          sub.duplicateOf = uniqueSubs.get(key).url;
          continue;
        }
        uniqueSubs.set(key, {
          url: sub.url,
          type: sub.type || detectTypeFromUrl(sub.url),
          description: sub.description,
          sources: [siteData.siteName]
        });
      }
    }
  }

  console.log(`去重后待校验订阅链接 ${uniqueSubs.size} 条（去除重复 ${duplicatesRemoved} 条）`);

  // ---- 连通性校验（限制并发）----
  const checkConfig = settings.subscriptionCheck || {};
  const checkEnabled = checkConfig.enabled !== false;
  const uniqueList = [...uniqueSubs.values()];

  if (checkEnabled && uniqueList.length) {
    const concurrency = checkConfig.concurrency || 6;
    console.log(`开始校验订阅连通性（并发 ${concurrency}）...`);
    await mapLimit(uniqueList, concurrency, async (entry) => {
      const probe = await probeSubscription(entry.url, { timeout: checkConfig.timeout });
      Object.assign(entry, probe);
      console.log(`[check] ${entry.online ? '在线' : '离线'} ${entry.httpStatus || '-'} ${entry.latencyMs !== null ? entry.latencyMs + 'ms' : ''} ${entry.url}`);
      return entry;
    });
  } else {
    uniqueList.forEach(entry => {
      Object.assign(entry, { online: null, httpStatus: null, latencyMs: null, bytes: 0, note: '未校验', checkedAt: null });
    });
  }

  // ---- 把校验结果分发给各站点，并统计站点健康度 ----
  const summary = { total: 0, online: 0, offline: 0, unknown: 0, duplicatesRemoved, checkedAt: new Date().toISOString() };

  for (const siteData of siteResults) {
    const seenInSite = new Set();
    let siteTotal = 0;
    let siteOnline = 0;
    let latencySum = 0;

    for (const article of siteData.articles) {
      if (!Array.isArray(article.subscriptions)) continue;
      for (const sub of article.subscriptions) {
        const key = normalizeUrl(sub.url);
        const probed = key ? uniqueSubs.get(key) : null;
        if (probed) {
          sub.online = probed.online;
          sub.httpStatus = probed.httpStatus;
          sub.latencyMs = probed.latencyMs;
          sub.bytes = probed.bytes;
          sub.note = probed.note;
          sub.checkedAt = probed.checkedAt;
        }
        if (!seenInSite.has(key)) {
          seenInSite.add(key);
          siteTotal += 1;
          if (sub.online === true) {
            siteOnline += 1;
            if (typeof sub.latencyMs === 'number') latencySum += sub.latencyMs;
          }
        }
      }
    }

    siteData.health = {
      total: siteTotal,
      online: siteOnline,
      offline: siteTotal - siteOnline,
      ratio: siteTotal ? Number((siteOnline / siteTotal).toFixed(3)) : 0,
      avgLatencyMs: siteOnline ? Math.round(latencySum / siteOnline) : null,
      checkedAt: summary.checkedAt
    };

    summary.total += siteTotal;
    summary.online += siteOnline;

    const fileName = `${safeFileName(siteData.siteName)}.json`;
    fs.writeJsonSync(path.join(dataDir, fileName), siteData, { spaces: 2 });
    console.log(`保存 ${fileName} 数据成功（订阅 ${siteData.totalSubscriptions} 条，在线 ${siteOnline}/${siteTotal}）`);
  }

  summary.offline = summary.total - summary.online;

  console.log(`所有网站抓取完成：订阅 ${summary.total} 条，在线 ${summary.online}，离线 ${summary.offline}`);
  return { sites: siteResults, summary };
};

module.exports = {
  scrapeAllSites,
  scrapeSite,
  readTargetSites,
  getConfig,
  extractSubscriptionUrls,
  detectTypeFromUrl,
  isSubscriptionUrl
};
