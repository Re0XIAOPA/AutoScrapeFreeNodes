/**
 * md-nodes.js
 * 从 GitHub 仓库的 Markdown(.md) 文件中提取"可直接导入客户端"的节点分享链接。
 *
 * 支持协议：ss / ssr / vmess / vless / trojan / hysteria / hysteria2(hy2) / tuic / snell / socks
 * 明确排除：http(s) 订阅链接、clash:// 等配置导入链接（这些属于订阅而非节点）
 *
 * 输出：结构化节点列表，写入 data/nodes/nodes.json，供后续导入使用。
 */

const fs = require('fs-extra');
const path = require('path');
const { httpGet, decodeHtmlEntities } = require('./http-client');

// 默认数据源（可在 config.json 的 mdSources 中覆盖）
const DEFAULT_SOURCES = [
  { name: 'v2rayfree', repo: 'free-nodes/v2rayfree', branch: 'main', enabled: true },
  { name: 'Free-servers', repo: 'Pawdroid/Free-servers', branch: 'main', enabled: true }
];

// 节点分享链接的协议前缀。故意不包含 http/https，避免把订阅链接当作节点抓进来。
// 使用非捕获组，避免与后续 :// 拼接时产生分支优先级问题。
const NODE_SCHEME = '(?:ssr?|vmess|vless|trojan|hysteria2?|hy2|tuic|snell|socks5?)';
// 整行就是一条链接（容忍 markdown 列表符号、加粗/代码标记、引用符号等前缀）
const LINE_LINK_RE = new RegExp('^[\\s>*_`+\\-|\\]]*(' + NODE_SCHEME + ':\\/\\/.+)$', 'i');
// 行内链接（用于链接前后还有其他文字的情况）
const INLINE_LINK_RE = new RegExp('(?:^|[\\s`"\'(\\[<>|])(' + NODE_SCHEME + ':\\/\\/[^\\s`"\'<>)\\]]+)', 'gi');

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------

const loadConfigSafe = () => {
  try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) return fs.readJsonSync(configPath);
  } catch (error) {
    console.error('读取配置文件失败:', error.message);
  }
  return {};
};

const getSources = () => {
  const config = loadConfigSafe();
  const sources = Array.isArray(config.mdSources) && config.mdSources.length
    ? config.mdSources
    : DEFAULT_SOURCES;
  return sources.filter(s => s && s.enabled !== false && s.repo);
};

/**
 * 网页型节点源（config.json 的 nodeSources）：直接抓取页面并从正文里提取分享链接。
 * 例如 v2cross 的 live-nodes 快照会把节点贴在 <pre> 里。
 */
const getNodeSources = () => {
  const config = loadConfigSafe();
  const sources = Array.isArray(config.nodeSources) ? config.nodeSources : [];
  return sources.filter(s => s && s.enabled !== false && s.url);
};

const getNodesFilePath = () => {
  const config = loadConfigSafe();
  const nodesDir = path.join(__dirname, (config.settings && config.settings.nodesDataDir) || 'data/nodes');
  return path.join(nodesDir, 'nodes.json');
};

const getNodesDataDir = () => path.dirname(getNodesFilePath());

// ---------------------------------------------------------------------------
// 编码 / 解析小工具
// ---------------------------------------------------------------------------

// 同时兼容标准 base64 与 URL-safe base64
const b64decode = (str) => {
  if (!str) return '';
  let s = String(str).replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
  while (s.length % 4) s += '=';
  try {
    return Buffer.from(s, 'base64').toString('utf8');
  } catch (error) {
    return '';
  }
};

const safeDecode = (str) => {
  if (str === undefined || str === null) return '';
  try {
    return decodeURIComponent(String(str));
  } catch (error) {
    return String(str);
  }
};

// 拆分 host:port，兼容 IPv6 的 [::1]:443 写法
const splitHostPort = (input) => {
  const s = String(input || '').trim().replace(/\/+$/, '');
  if (!s) return { host: '', port: 0 };
  if (s.startsWith('[')) {
    const end = s.indexOf(']');
    const host = s.slice(1, end);
    const port = parseInt(s.slice(end + 1).replace(/^:/, ''), 10);
    return { host, port: Number.isFinite(port) ? port : 0 };
  }
  const idx = s.lastIndexOf(':');
  if (idx < 0) return { host: s, port: 0 };
  const port = parseInt(s.slice(idx + 1), 10);
  return { host: s.slice(0, idx), port: Number.isFinite(port) ? port : 0 };
};

// 解析 query string，值里允许再出现 '='
const parseQuery = (query) => {
  const out = {};
  if (!query) return out;
  query.split('&').forEach(pair => {
    if (!pair) return;
    const i = pair.indexOf('=');
    const key = i >= 0 ? pair.slice(0, i) : pair;
    const value = i >= 0 ? pair.slice(i + 1) : '';
    if (!key) return;
    out[key] = safeDecode(value);
  });
  return out;
};

// 协议别名归一化
const normalizeType = (scheme) => {
  const s = String(scheme).toLowerCase();
  if (s === 'hy2') return 'hysteria2';
  if (s === 'socks') return 'socks5';
  return s;
};

// ---------------------------------------------------------------------------
// 抓取
// ---------------------------------------------------------------------------

// 多通道回退抓取统一由 http-client.js 提供（HTTP 工具与订阅校验复用同一套回退策略）

// 列出仓库中所有 .md 文件（优先 GitHub API，失败则用 jsDelivr 文件清单，再失败回退 README.md）
const listMarkdownFiles = async (repo, branch) => {
  try {
    const data = await httpGet(`https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`, {
      headers: { Accept: 'application/vnd.github+json' },
      timeout: 15000
    });
    const tree = JSON.parse(data).tree || [];
    const files = tree
      .filter(item => item.type === 'blob' && /\.md$/i.test(item.path))
      .map(item => item.path);
    if (files.length) return files;
  } catch (error) {
    console.warn(`  GitHub API 列目录失败(${repo}): ${error.message}`);
  }

  try {
    const data = await httpGet(`https://data.jsdelivr.com/v1/packages/gh/${repo}@${branch}?structure=flat`, { timeout: 15000 });
    const files = (JSON.parse(data).files || [])
      .map(item => item.name)
      .filter(name => /\.md$/i.test(name))
      .map(name => name.replace(/^\//, ''));
    if (files.length) return files;
  } catch (error) {
    console.warn(`  jsDelivr 列目录失败(${repo}): ${error.message}`);
  }

  return ['README.md'];
};

// 依次尝试多个 CDN 源读取原始文件内容
const fetchRawFile = async (repo, branch, file) => {
  const encodedPath = file.split('/').map(encodeURIComponent).join('/');
  const candidates = [
    `https://raw.githubusercontent.com/${repo}/${branch}/${encodedPath}`,
    `https://cdn.jsdelivr.net/gh/${repo}@${branch}/${encodedPath}`,
    `https://gh-proxy.com/https://raw.githubusercontent.com/${repo}/${branch}/${encodedPath}`,
    `https://raw.gitmirror.com/${repo}/${branch}/${encodedPath}`
  ];

  let lastError = null;
  for (const url of candidates) {
    try {
      const text = await httpGet(url);
      if (text && String(text).length) return String(text);
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) console.warn(`  读取 ${file} 失败: ${lastError.message}`);
  return '';
};

// ---------------------------------------------------------------------------
// 提取分享链接
// ---------------------------------------------------------------------------

const cleanupLink = (link) => String(link || '').replace(/[\s`"')\]]+$/, '').trim();

/**
 * 从 Markdown 文本中提取所有节点分享链接
 * @returns {string[]} 去重后的原始分享链接
 */
const extractShareLinks = (text) => {
  const found = [];
  const lines = String(text || '').split(/\r?\n/);

  for (const line of lines) {
    // 1) 整行是一条链接（markdown 代码块中最常见的形式）
    const whole = line.match(LINE_LINK_RE);
    if (whole) {
      const link = cleanupLink(whole[1]);
      if (link) found.push(link);
      continue;
    }
    // 2) 行内出现链接
    INLINE_LINK_RE.lastIndex = 0;
    let inline = null;
    while ((inline = INLINE_LINK_RE.exec(line)) !== null) {
      const link = cleanupLink(inline[1]);
      if (link && link.includes('://')) found.push(link);
      if (inline.index === INLINE_LINK_RE.lastIndex) INLINE_LINK_RE.lastIndex += 1;
    }
  }

  // 按链接原文去重（同一份节点列表会出现在多语言 README 中）
  const seen = new Set();
  const unique = [];
  for (const link of found) {
    if (!seen.has(link)) {
      seen.add(link);
      unique.push(link);
    }
  }
  return unique;
};

// ---------------------------------------------------------------------------
// 解析各协议分享链接 -> 结构化节点
// ---------------------------------------------------------------------------

// 通用解析：scheme://userinfo@host:port?query#fragment
const parseGeneric = (link) => {
  const schemeEnd = link.indexOf('://');
  const scheme = link.slice(0, schemeEnd);
  let rest = link.slice(schemeEnd + 3);

  const hashIdx = rest.indexOf('#');
  const fragment = hashIdx >= 0 ? rest.slice(hashIdx + 1) : '';
  rest = hashIdx >= 0 ? rest.slice(0, hashIdx) : rest;

  let query = '';
  const qIdx = rest.indexOf('?');
  if (qIdx >= 0) {
    query = rest.slice(qIdx + 1);
    rest = rest.slice(0, qIdx);
  }

  let userinfo = '';
  let hostport = rest;
  const at = rest.lastIndexOf('@');
  if (at >= 0) {
    userinfo = rest.slice(0, at);
    hostport = rest.slice(at + 1);
  }

  const { host, port } = splitHostPort(hostport);
  return {
    scheme,
    name: safeDecode(fragment),
    userinfo: safeDecode(userinfo),
    host,
    port,
    params: parseQuery(query)
  };
};

// ss:// 支持 SIP002 与旧版 base64 两种格式
const parseSS = (link) => {
  const body = link.slice(5);
  const hashIdx = body.indexOf('#');
  const fragment = hashIdx >= 0 ? body.slice(hashIdx + 1) : '';
  let main = hashIdx >= 0 ? body.slice(0, hashIdx) : body;

  let plugin = '';
  const qIdx = main.indexOf('?');
  if (qIdx >= 0) {
    plugin = main.slice(qIdx + 1);
    main = main.slice(0, qIdx);
  }

  let method = '';
  let password = '';
  let host = '';
  let port = 0;

  const at = main.lastIndexOf('@');
  if (at >= 0) {
    // SIP002: ss://base64(method:password)@host:port
    const userinfo = main.slice(0, at);
    let cred = userinfo.includes(':') ? safeDecode(userinfo) : b64decode(userinfo);
    if (!cred || !cred.includes(':')) cred = safeDecode(userinfo);
    const ci = cred.indexOf(':');
    method = ci >= 0 ? cred.slice(0, ci) : cred;
    password = ci >= 0 ? cred.slice(ci + 1) : '';
    ({ host, port } = splitHostPort(main.slice(at + 1)));
  } else {
    // 旧版: ss://base64(method:password@host:port)
    const decoded = b64decode(main);
    const at2 = decoded.lastIndexOf('@');
    if (at2 >= 0) {
      const cred = decoded.slice(0, at2);
      const ci = cred.indexOf(':');
      method = ci >= 0 ? cred.slice(0, ci) : cred;
      password = ci >= 0 ? cred.slice(ci + 1) : '';
      ({ host, port } = splitHostPort(decoded.slice(at2 + 1)));
    }
  }

  return { method, password, host, port, plugin, name: safeDecode(fragment) };
};

// vmess:// 为 base64 编码的 JSON
const parseVMess = (link) => {
  const body = link.slice(8);
  const hashIdx = body.indexOf('#');
  const fragment = hashIdx >= 0 ? body.slice(hashIdx + 1) : '';
  const main = hashIdx >= 0 ? body.slice(0, hashIdx) : body;

  let json = null;
  try {
    json = JSON.parse(b64decode(main));
  } catch (error) {
    json = null;
  }
  if (!json) {
    // 少数情况下 vmess 使用明文 query 形式
    return parseGeneric(link);
  }

  const port = parseInt(json.port, 10);
  return {
    name: json.ps || safeDecode(fragment),
    host: json.add || '',
    port: Number.isFinite(port) ? port : 0,
    uuid: json.id || '',
    alterId: parseInt(json.aid, 10) || 0,
    cipher: json.scy || 'auto',
    network: json.net || 'tcp',
    headerType: json.type || 'none',
    tls: json.tls || '',
    sni: json.sni || '',
    alpn: json.alpn || '',
    host_header: json.host || '',
    path: json.path || '',
    fp: json.fp || ''
  };
};

// 组装最终的结构化节点对象
const buildNode = (link, source) => {
  const schemeEnd = link.indexOf('://');
  if (schemeEnd < 0) return null;
  const rawScheme = link.slice(0, schemeEnd).toLowerCase();
  const type = normalizeType(rawScheme);

  const node = {
    type,
    link,
    source: source ? source.name : undefined,
    sourceRepo: source ? source.repo : undefined
  };

  if (type === 'ss') {
    const d = parseSS(link);
    if (!d.host || !d.port) return null;
    Object.assign(node, {
      name: d.name || `${d.host}:${d.port}`,
      server: d.host,
      port: d.port,
      method: d.method,
      password: d.password,
      plugin: d.plugin || undefined
    });
    return node;
  }

  if (type === 'vmess') {
    const d = parseVMess(link);
    if (!d.host || !d.port) return null;
    Object.assign(node, {
      name: d.name || `${d.host}:${d.port}`,
      server: d.host,
      port: d.port,
      uuid: d.uuid,
      alterId: d.alterId,
      cipher: d.cipher,
      network: d.network,
      headerType: d.headerType,
      tls: d.tls,
      sni: d.sni,
      alpn: d.alpn,
      host: d.host_header,
      path: d.path
    });
    return node;
  }

  // 其余协议使用通用 userinfo@host:port?query#name 结构
  const d = parseGeneric(link);
  if (!d.host || !d.port) return null;
  const params = d.params || {};
  node.name = d.name || `${d.host}:${d.port}`;
  node.server = d.host;
  node.port = d.port;

  if (type === 'ssr') {
    // ssr://base64(host:port:protocol:method:obfs:base64pass/?params)
    const decoded = b64decode(link.slice(6));
    const slashIdx = decoded.indexOf('/?');
    const head = slashIdx >= 0 ? decoded.slice(0, slashIdx) : decoded;
    const tail = slashIdx >= 0 ? decoded.slice(slashIdx + 2) : '';
    const parts = head.split(':');
    if (parts.length >= 6) {
      node.server = parts[0];
      node.port = parseInt(parts[1], 10) || 0;
      node.protocol = parts[2];
      node.method = parts[3];
      node.obfs = parts[4];
      node.password = b64decode(parts[5]);
      const q = parseQuery(tail);
      if (q.remarks) node.name = b64decode(q.remarks) || node.name;
      node.params = q;
    }
    if (!node.server || !node.port) return null;
    return node;
  }

  if (type === 'vless') {
    node.uuid = d.userinfo;
    node.flow = params.flow || '';
  } else if (type === 'trojan') {
    node.password = d.userinfo;
  } else if (type === 'hysteria2' || type === 'hysteria') {
    node.password = d.userinfo;
  } else if (type === 'tuic') {
    const ci = d.userinfo.indexOf(':');
    node.uuid = ci >= 0 ? d.userinfo.slice(0, ci) : d.userinfo;
    node.password = ci >= 0 ? d.userinfo.slice(ci + 1) : '';
  } else if (type === 'socks5') {
    const base64Body = link.slice(link.indexOf('://') + 3);
    const decoded = base64Body.includes('@') ? base64Body : b64decode(base64Body);
    const at = decoded.lastIndexOf('@');
    const cred = at >= 0 ? decoded.slice(0, at) : '';
    const ci = cred.indexOf(':');
    node.username = ci >= 0 ? cred.slice(0, ci) : cred;
    node.password = ci >= 0 ? cred.slice(ci + 1) : '';
    if (at >= 0) ({ host: node.server, port: node.port } = splitHostPort(decoded.slice(at + 1)));
  }

  node.network = params.type || params.net || '';
  node.security = params.security || '';
  node.sni = params.sni || '';
  node.host = params.host || '';
  node.path = params.path || '';
  node.alpn = params.alpn || '';
  node.fp = params.fp || '';
  node.obfs = params.obfs || '';
  node.params = params;

  if (!node.server || !node.port) return null;
  return node;
};

// 节点身份指纹：用于合并同源/跨源中仅名称不同的重复节点
const buildFingerprint = (node) => [
  node.type,
  node.server,
  node.port,
  node.uuid || node.password || node.username || '',
  node.method || '',
  node.network || '',
  node.path || '',
  node.security || '',
  node.sni || '',
  node.host || ''
].join('|');

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

const scrapeSource = async (source) => {
  const branch = source.branch || 'main';
  console.log(`[md] 处理仓库 ${source.repo} (${branch})`);

  const files = await listMarkdownFiles(source.repo, branch);
  console.log(`[md] 发现 ${files.length} 个 markdown 文件`);

  const nodes = [];
  const fileStats = [];
  const seenLinks = new Set();

  for (const file of files) {
    const text = await fetchRawFile(source.repo, branch, file);
    if (!text) {
      fileStats.push({ file, linkCount: 0, note: '读取失败' });
      continue;
    }

    const links = extractShareLinks(text);
    let added = 0;
    for (const link of links) {
      if (seenLinks.has(link)) continue;
      const node = buildNode(link, source);
      if (!node) continue;
      seenLinks.add(link);
      node.sourceFile = file;
      nodes.push(node);
      added += 1;
    }

    fileStats.push({ file, linkCount: added });
    console.log(`[md]   ${file}: 提取 ${added} 个节点`);
  }

  return {
    repo: source.repo,
    branch,
    url: `https://github.com/${source.repo}`,
    name: source.name || source.repo,
    fileCount: files.length,
    files: fileStats,
    nodeCount: nodes.length,
    nodes
  };
};

const stripTags = (html) => String(html || '').replace(/<[^>]*>/g, ' ');

const getHostnameFromUrl = (url) => {
  try {
    return new URL(url).hostname;
  } catch (error) {
    return url;
  }
};

/**
 * 抓取网页型节点源：抓页面 -> 解码 HTML 实体 -> 从 <pre> 代码块与整页中提取分享链接。
 * 网页里的节点链接常被写成 &amp; 转义形式，必须先解码，否则导入客户端后参数是错的。
 */
const scrapeWebNodeSource = async (source) => {
  console.log(`[web] 处理网页节点源 ${source.url}`);

  const html = await httpGet(source.url);

  // 优先从 <pre> 代码块取（节点列表通常放在其中），再补一次整页扫描
  const blocks = [];
  const preRe = /<pre[^>]*>([\s\S]*?)<\/pre>/gi;
  let m;
  while ((m = preRe.exec(html)) !== null) {
    blocks.push(stripTags(decodeHtmlEntities(m[1])));
  }
  blocks.push(stripTags(decodeHtmlEntities(html)));

  const seen = new Set();
  const links = [];
  for (const block of blocks) {
    for (const link of extractShareLinks(block)) {
      if (seen.has(link)) continue;
      seen.add(link);
      links.push(link);
    }
  }

  const sourceMeta = { name: source.name || getHostnameFromUrl(source.url), repo: source.url };
  const nodes = [];
  for (const link of links) {
    const node = buildNode(link, sourceMeta);
    if (!node) continue;
    node.sourceUrl = source.url;
    nodes.push(node);
  }

  console.log(`[web]   ${source.url}: 提取 ${nodes.length} 个节点`);

  return {
    url: source.url,
    name: source.name || getHostnameFromUrl(source.url),
    kind: 'web',
    fileCount: 1,
    files: [{ file: source.url, linkCount: nodes.length }],
    nodeCount: nodes.length,
    nodes
  };
};

/**
 * 抓取所有配置的 markdown 数据源，输出结构化节点列表
 * @param {Object} options { write: boolean } 是否写入文件，默认 true
 */
const scrapeMdNodes = async (options = {}) => {
  const write = options.write !== false;
  const sources = getSources();
  const webSources = getNodeSources();

  console.log(`开始从 ${sources.length} 个 markdown 仓库 + ${webSources.length} 个网页源抓取节点`);
  const results = [];
  const allNodes = [];
  const seenLinks = new Set();
  const seenFingerprints = new Set();
  let duplicates = 0;

  // 统一的入库逻辑：先按链接原文去重，再按节点指纹合并
  const absorb = (result) => {
    for (const node of result.nodes) {
      if (seenLinks.has(node.link)) {
        duplicates += 1;
        continue;
      }
      const fingerprint = buildFingerprint(node);
      if (seenFingerprints.has(fingerprint)) {
        duplicates += 1;
        continue;
      }
      seenLinks.add(node.link);
      seenFingerprints.add(fingerprint);
      allNodes.push(node);
    }
  };

  for (const source of sources) {
    try {
      const result = await scrapeSource(source);
      results.push(result);
      absorb(result);
    } catch (error) {
      console.error(`[md] 处理仓库 ${source.repo} 失败:`, error.message);
      results.push({
        repo: source.repo,
        name: source.name || source.repo,
        url: `https://github.com/${source.repo}`,
        kind: 'repo',
        error: error.message,
        fileCount: 0,
        files: [],
        nodeCount: 0,
        nodes: []
      });
    }
  }

  for (const source of webSources) {
    try {
      const result = await scrapeWebNodeSource(source);
      results.push(result);
      absorb(result);
    } catch (error) {
      console.error(`[web] 处理网页源 ${source.url} 失败:`, error.message);
      results.push({
        url: source.url,
        name: source.name || source.url,
        kind: 'web',
        error: error.message,
        fileCount: 0,
        files: [],
        nodeCount: 0,
        nodes: []
      });
    }
  }

  // 按协议统计
  const summary = {};
  for (const node of allNodes) {
    summary[node.type] = (summary[node.type] || 0) + 1;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    total: allNodes.length,
    duplicatesMerged: duplicates,
    summary,
    sources: results.map(r => ({
      kind: r.kind || 'repo',
      repo: r.repo,
      name: r.name,
      url: r.url,
      branch: r.branch,
      fileCount: r.fileCount,
      nodeCount: r.nodeCount,
      error: r.error,
      files: r.files
    })),
    nodes: allNodes
  };

  if (write) {
    const nodesDir = getNodesDataDir();
    fs.ensureDirSync(nodesDir);
    fs.writeJsonSync(getNodesFilePath(), output, { spaces: 2 });
    console.log(`已写入 ${getNodesFilePath()}（共 ${allNodes.length} 个节点）`);
  }

  console.log(`markdown 节点抓取完成：共 ${allNodes.length} 个节点（合并重复 ${duplicates} 个），协议分布 ${JSON.stringify(summary)}`);
  return output;
};

/**
 * 读取已抓取的节点数据
 */
const readNodes = () => {
  const filePath = getNodesFilePath();
  if (!fs.existsSync(filePath)) return null;
  try {
    return fs.readJsonSync(filePath);
  } catch (error) {
    console.error('读取节点数据失败:', error.message);
    return null;
  }
};

module.exports = {
  scrapeMdNodes,
  readNodes,
  extractShareLinks,
  buildNode,
  getSources,
  getNodeSources,
  getNodesFilePath,
  DEFAULT_SOURCES
};

// 支持通过 `node md-nodes.js` 直接运行
if (require.main === module) {
  scrapeMdNodes().then(result => {
    console.log(JSON.stringify({ total: result.total, summary: result.summary }, null, 2));
  }).catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}
