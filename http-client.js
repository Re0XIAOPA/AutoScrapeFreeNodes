/**
 * http-client.js
 * 共享的 HTTP 工具：多通道回退抓取 + 订阅链接连通性校验 + URL 去重归一化。
 *
 * 本机/CI 环境常出现代理与 TLS 拦截，因此 httpGet / httpProbe 都按
 * 「默认请求 -> 直连 -> 直连+放宽证书 -> 代理+放宽证书」依次回退。
 */

const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const https = require('https');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const loadConfigSafe = () => {
  try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) return fs.readJsonSync(configPath);
  } catch (error) {
    console.error('读取配置文件失败:', error.message);
  }
  return {};
};

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

// 单次响应体的宽松上限（仅作兜底，避免异常大文件拖垮构建）
const MAX_BODY_BYTES = 16 * 1024 * 1024;

// 依据配置构造「通道回退」列表
const buildAttempts = (allowInsecureTls, useProxy) => {
  const attempts = [
    { label: '默认', extra: {} },
    { label: '直连', extra: { proxy: false } }
  ];
  if (allowInsecureTls) {
    attempts.push({ label: '直连+放宽证书', extra: { proxy: false, httpsAgent: insecureAgent } });
    if (useProxy) attempts.push({ label: '代理+放宽证书', extra: { httpsAgent: insecureAgent } });
  }
  if (!useProxy) {
    return attempts.filter(a => a.extra.proxy === false);
  }
  return attempts;
};

// 记录最近一次成功的通道，后续请求优先复用。
// 本机代理会把正常请求改写成 400、直连又缺证书，每次都从「默认」撞一遍会非常慢。
let preferredChannel = null;

const orderAttempts = (attempts) => {
  if (!preferredChannel) return attempts;
  const idx = attempts.findIndex(a => a.label === preferredChannel);
  if (idx <= 0) return attempts;
  return [attempts[idx], ...attempts.filter((_, i) => i !== idx)];
};

const getFetchSettings = () => {
  const config = loadConfigSafe();
  const mdFetch = (config.settings && config.settings.mdFetch) || {};
  return {
    timeout: mdFetch.timeout || 20000,
    allowInsecureTls: mdFetch.allowInsecureTls !== false,
    useProxy: mdFetch.useProxy !== false
  };
};

// 明确不需要换通道重试的状态码（鉴权/资源类）
const FATAL_STATUS = [401, 403, 404, 410, 422];

/**
 * 多通道回退 GET，返回文本内容
 */
const httpGet = async (url, options = {}) => {
  const s = getFetchSettings();
  const timeout = options.timeout || s.timeout;
  const attempts = buildAttempts(
    options.allowInsecureTls !== undefined ? options.allowInsecureTls : s.allowInsecureTls,
    options.useProxy !== undefined ? options.useProxy : s.useProxy
  );

  let lastError = null;
  for (const attempt of orderAttempts(attempts)) {
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': UA, Accept: '*/*', ...(options.headers || {}) },
        timeout,
        responseType: 'text',
        transformResponse: [data => data],
        maxRedirects: options.maxRedirects !== undefined ? options.maxRedirects : 5,
        validateStatus: status => status >= 200 && status < 300,
        ...attempt.extra
      });
      preferredChannel = attempt.label;
      return response.data;
    } catch (error) {
      lastError = error;
      const status = error.response && error.response.status;
      if (FATAL_STATUS.includes(status)) break;
    }
  }
  throw lastError || new Error('请求失败');
};

// ---------------------------------------------------------------------------
// HTML 文本工具
// ---------------------------------------------------------------------------

const HTML_ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&apos;': "'", '&nbsp;': ' ', '&#x2F;': '/', '&#x27;': "'"
};

/**
 * 解码 HTML 实体。网页里内嵌的节点链接常写成 &amp; 形式，
 * 不解码会把参数拼错，导致导入客户端后无法使用。
 */
const decodeHtmlEntities = (text) =>
  String(text || '').replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp|#x2F|#x27);/g, m => HTML_ENTITIES[m] || m);

// ---------------------------------------------------------------------------
// 订阅链接连通性校验
// ---------------------------------------------------------------------------

const base64Decode = (str) => {
  if (!str) return '';
  let s = String(str).replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  while (s.length % 4) s += '=';
  try {
    return Buffer.from(s, 'base64').toString('utf8');
  } catch (error) {
    return '';
  }
};

const looksLikeBase64Subscription = (body) => {
  const compact = String(body).replace(/\s+/g, '');
  if (compact.length < 16) return false;
  if (!/^[A-Za-z0-9+/=_-]+$/.test(compact)) return false;
  const decoded = base64Decode(compact);
  return NODE_SCHEME_RE.test(decoded);
};

const NODE_SCHEME_RE = /(?:ssr?|vmess|vless|trojan|hysteria2?|hy2|tuic|snell|socks5?):\/\//i;

/**
 * 判断响应体是否像一份可用的订阅内容
 * @returns {{valid: boolean, note: string}}
 */
const validateSubscriptionBody = (url, body) => {
  const text = String(body || '');
  const trimmed = text.trim();
  if (!trimmed) return { valid: false, note: '内容为空（0 字节）' };

  // 源站错误页被当成正常响应返回（云盾/CF 常见：HTTP 200 但正文是 error code: 520）
  const errCode = trimmed.match(/^error code:\s*(\d+)/i);
  if (errCode) return { valid: false, note: `源站错误页（error code: ${errCode[1]}）` };
  if (trimmed.length < 32) return { valid: false, note: '内容过短，疑似无效' };

  const pathname = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch (error) {
      return '';
    }
  })();

  // 明显是 HTML 错误页 / 拦截页
  if (/^\s*<(!doctype|html)/i.test(text) && !/proxies/i.test(text)) {
    return { valid: false, note: '返回的是网页而非订阅内容' };
  }

  if (/\.ya?ml$/.test(pathname)) {
    if (/proxies\s*:|proxy-providers\s*:|^port\s*:/m.test(text)) {
      return { valid: true, note: 'Clash 配置可用' };
    }
    return { valid: false, note: '缺少 proxies 段' };
  }

  if (/\.json$/.test(pathname)) {
    try {
      const json = JSON.parse(text);
      if (json && (json.outbounds || json.proxies || json.endpoints)) {
        return { valid: true, note: 'sing-box/JSON 配置可用' };
      }
      return { valid: false, note: 'JSON 结构不含 outbounds/proxies' };
    } catch (error) {
      return { valid: false, note: 'JSON 解析失败' };
    }
  }

  // txt / 无扩展名：base64 编码列表或明文链接列表
  if (NODE_SCHEME_RE.test(text)) return { valid: true, note: '明文节点列表' };
  if (looksLikeBase64Subscription(text)) return { valid: true, note: 'base64 节点列表' };

  return { valid: false, note: '内容格式无法识别' };
};

/**
 * 探测单条订阅链接的连通性
 * @returns {Promise<{online:boolean,httpStatus:number|null,latencyMs:number|null,bytes:number,note:string,checkedAt:string}>}
 */
const probeSubscription = async (url, options = {}) => {
  const config = loadConfigSafe();
  const check = (config.settings && config.settings.subscriptionCheck) || {};
  const timeout = options.timeout || check.timeout || 12000;
  const maxBytes = check.maxBytes || 65536;
  const checkedAt = new Date().toISOString();

  const s = getFetchSettings();
  const attempts = buildAttempts(s.allowInsecureTls, s.useProxy);

  let lastError = null;
  let lastStatus = null;

  for (const attempt of orderAttempts(attempts)) {
    const startedAt = Date.now();
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': UA, Accept: '*/*' },
        timeout,
        responseType: 'text',
        transformResponse: [data => data],
        maxRedirects: 5,
        // 订阅文件可能上百 KB 甚至 MB 级（例如 clashfree 的每日 clash yml 约 1.2MB），
        // 这里只做一个宽松的上限兜底，绝不能按 maxBytes 截断，否则大文件会被判为失败。
        maxContentLength: MAX_BODY_BYTES,
        maxBodyLength: MAX_BODY_BYTES,
        validateStatus: status => status >= 200 && status < 400,
        ...attempt.extra
      });
      preferredChannel = attempt.label;
      const latencyMs = Date.now() - startedAt;
      const body = typeof response.data === 'string' ? response.data : '';
      const verdict = validateSubscriptionBody(url, body);
      return {
        online: verdict.valid,
        httpStatus: response.status,
        latencyMs,
        bytes: Buffer.byteLength(body, 'utf8'),
        note: verdict.note,
        checkedAt
      };
    } catch (error) {
      lastError = error;
      const status = error.response && error.response.status;
      if (status) lastStatus = status;
      // 只有明确的鉴权/资源类错误才终止换通道；400/5xx 等很可能是当前通道自身导致，
      // 必须继续用其它通道重试（本机代理曾把正常请求改写成 400）。
      if (status && FATAL_STATUS.includes(status)) break;
    }
  }

  if (lastStatus) {
    return {
      online: false,
      httpStatus: lastStatus,
      latencyMs: null,
      bytes: 0,
      note: `HTTP ${lastStatus}`,
      checkedAt
    };
  }

  return {
    online: false,
    httpStatus: null,
    latencyMs: null,
    bytes: 0,
    note: lastError ? `无法连接（${lastError.code || lastError.message}）` : '无法连接',
    checkedAt
  };
};

/**
 * 限制并发地处理数组
 */
const mapLimit = async (items, limit, worker) => {
  const results = new Array(items.length);
  let cursor = 0;
  const size = Math.max(1, Math.min(limit, items.length || 1));

  const runners = Array.from({ length: size }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
};

// ---------------------------------------------------------------------------
// URL 归一化（用于订阅链接去重）
// ---------------------------------------------------------------------------

/**
 * 归一化订阅 URL：统一小写 scheme/host、去默认端口、排序查询参数、去 fragment 与末尾斜杠。
 * 目的是让「同一份订阅的不同写法」归一到同一个 key。
 */
const normalizeUrl = (raw) => {
  const input = String(raw || '').trim();
  if (!input) return '';
  let parsed;
  try {
    parsed = new URL(input);
  } catch (error) {
    return input.replace(/\/+$/, '').toLowerCase();
  }

  const scheme = parsed.protocol.toLowerCase();
  const host = parsed.hostname.toLowerCase();
  const isDefaultPort =
    (scheme === 'https:' && parsed.port === '443') ||
    (scheme === 'http:' && parsed.port === '80');
  const port = parsed.port && !isDefaultPort ? `:${parsed.port}` : '';

  const params = [...parsed.searchParams.entries()]
    .filter(([key]) => !/^(utm_|from|ref|spm|_)/i.test(key))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const pathname = parsed.pathname.replace(/\/+$/, '');

  return `${scheme}//${host}${port}${pathname}${params ? `?${params}` : ''}`;
};

module.exports = {
  UA,
  httpGet,
  httpProbe: probeSubscription,
  probeSubscription,
  validateSubscriptionBody,
  normalizeUrl,
  mapLimit,
  base64Decode,
  decodeHtmlEntities,
  NODE_SCHEME_RE,
  loadConfigSafe
};
