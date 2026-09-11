/**
 * nodes.js
 * 展示从 GitHub 仓库 markdown 中提取的「可导入节点」（ss / vmess / vless / trojan / hysteria2 等分享链接）。
 * 数据来源优先顺序：
 *   1. 服务器模式（Express 托管）           -> GET /api/nodes（本次抓取的实时数据）
 *   2. GitHub Pages / 本地文件系统          -> INLINE_NODES（构建时内联的数据）
 *   3. 其他静态托管                          -> ./api/nodes.json，失败再回退 INLINE_NODES
 */

let allNodes = [];
let nodesMeta = { generatedAt: null, total: 0, duplicatesMerged: 0, summary: {}, sources: [], check: null };
let nodeTypeFilter = 'all';
let nodeSourceFilter = 'all';
let nodeAliveFilter = 'all';
let nodesHasLoaded = false;

// 协议展示元信息
const NODE_TYPE_META = {
  ss:        { label: 'SS',        color: 'warning',   icon: 'bi bi-key' },
  ssr:       { label: 'SSR',       color: 'warning',   icon: 'bi bi-key-fill' },
  vmess:     { label: 'VMess',     color: 'success',   icon: 'bi bi-hdd-network' },
  vless:     { label: 'VLESS',     color: 'info',      icon: 'bi bi-hdd-stack' },
  trojan:    { label: 'Trojan',    color: 'danger',    icon: 'bi bi-shield-lock' },
  hysteria:  { label: 'Hysteria',  color: 'primary',   icon: 'bi bi-lightning' },
  hysteria2: { label: 'Hysteria2', color: 'primary',   icon: 'bi bi-lightning-charge' },
  tuic:      { label: 'TUIC',      color: 'secondary', icon: 'bi bi-cpu' },
  snell:     { label: 'Snell',     color: 'secondary', icon: 'bi bi-diagram-3' },
  socks5:    { label: 'SOCKS5',    color: 'secondary', icon: 'bi bi-globe2' }
};

function getNodeTypeMeta(type) {
  return NODE_TYPE_META[type] || { label: String(type || '未知').toUpperCase(), color: 'secondary', icon: 'bi bi-link-45deg' };
}

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

function nodeApiBase() {
  return (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '.';
}

function isServerMode() {
  return (typeof IS_SERVER_MODE !== 'undefined') && IS_SERVER_MODE === true;
}

function isInlinePreferred() {
  // GitHub Pages 与本地文件系统无法可靠 fetch 相对路径，优先使用内联数据
  return window.location.hostname.includes('github.io') || !window.location.protocol.includes('http');
}

function escapeHtml(text) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function shortenLink(link, max = 68) {
  const text = String(link || '');
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

// ---------------------------------------------------------------------------
// 数据加载
// ---------------------------------------------------------------------------

async function fetchNodesSnapshot() {
  const base = nodeApiBase();
  const candidates = isServerMode()
    ? [`${base}/api/nodes`]
    : [`${base}/api/nodes.json`, `${base}/api/nodes`];

  for (const url of candidates) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) continue;
      const data = await response.json();
      if (data && Array.isArray(data.nodes)) return data;
    } catch (error) {
      // 换下一个地址继续尝试
    }
  }
  return null;
}

function applyNodesData(data) {
  const safe = data && typeof data === 'object' ? data : {};

  nodesMeta = {
    generatedAt: safe.generatedAt || null,
    duplicatesMerged: safe.duplicatesMerged || 0,
    summary: safe.summary && typeof safe.summary === 'object' ? safe.summary : {},
    sources: Array.isArray(safe.sources) ? safe.sources : [],
    check: safe.check && typeof safe.check === 'object' ? safe.check : null,
    total: Array.isArray(safe.nodes) ? safe.nodes.length : 0
  };

  allNodes = Array.isArray(safe.nodes) ? safe.nodes : [];
  nodesHasLoaded = true;

  buildNodeTypeOptions();
  buildNodeSourceOptions();
  buildNodeAliveOptions();
  updateNodeStats();
  renderNodes();
}

/**
 * 节点卡片骨架屏。
 * 复用真实卡片外壳 .node-card，保持加载期与加载后的高度一致，
 * 避免占位内容过矮导致页面高度塌陷、进而引发滚动跳变。
 * 卡片数量需与当前已渲染的卡片数量对齐，否则页面上方的高度仍会塌陷。
 * 打光只加在前 SHIMMER_LIMIT 张卡片上：屏幕外的卡片看不见打光，
 * 却要额外参与合成，限制数量可以显著降低刷新时的合成开销。
 * @param {number} count 占位卡片数量
 * @returns {string} HTML 片段
 */
function nodeSkeletonHtml(count = 6) {
  const SHIMMER_LIMIT = 12;
  let html = '';
  for (let i = 0; i < count; i++) {
    const flat = i >= SHIMMER_LIMIT ? ' skeleton-flat' : '';
    html += `
      <div class="col-lg-6 col-xl-4 mb-3">
        <div class="node-card skeleton-card${flat}">
          <div class="d-flex justify-content-between align-items-center mb-2 gap-2">
            <span class="skeleton-line" style="width:76px; height:24px; margin-bottom:0;"></span>
            <span class="skeleton-line" style="width:150px; height:32px; margin-bottom:0;"></span>
          </div>
          <div class="skeleton-line skeleton-line-lg"></div>
          <div class="skeleton-line skeleton-line-sm"></div>
          <div class="skeleton-line skeleton-line-block"></div>
          <div class="skeleton-line skeleton-line-sm" style="margin-top:auto;"></div>
        </div>
      </div>
    `;
  }
  return html;
}

/**
 * @param {boolean} showSkeleton 是否先渲染骨架屏占位（刷新另外区块时可传 false，保持现有内容不动）
 */
async function loadNodes(showSkeleton = true) {
  const container = document.getElementById('nodes-container');
  if (container && showSkeleton !== false) {
    // 骨架卡数量对齐当前已渲染的卡片数量：数量不一致时页面高度仍会塌陷，
    // 浏览器会把 scrollTop 钳制到新的最大滚动位置，表现为「点刷新页面自己滚走」。
    const prevCards = container.querySelectorAll('.node-card:not(.skeleton-card)').length;
    const prevHeight = container.offsetHeight;
    container.innerHTML = nodeSkeletonHtml(prevCards > 0 ? prevCards : 6);
    // 高度兜底：骨架卡与真实卡存在几像素误差，按原高度兜底可确保页面高度不缩水
    container.style.minHeight = prevHeight > 0 ? prevHeight + 'px' : '';
  }

  try {
    const inline = (typeof INLINE_NODES !== 'undefined' && INLINE_NODES && Array.isArray(INLINE_NODES.nodes))
      ? INLINE_NODES
      : null;

    // 服务器模式必须拿实时数据，不能被内联快照覆盖
    if (isServerMode()) {
      const live = await fetchNodesSnapshot();
      applyNodesData(live || inline || { nodes: [] });
      return;
    }

    if (isInlinePreferred() && inline) {
      applyNodesData(inline);
      return;
    }

    const snapshot = await fetchNodesSnapshot();
    applyNodesData(snapshot || inline || { nodes: [] });
  } catch (error) {
    console.error('加载节点数据失败:', error);
    applyNodesData({ nodes: [] });
  }
}

// ---------------------------------------------------------------------------
// 筛选控件
// ---------------------------------------------------------------------------

function buildNodeTypeOptions() {
  const select = document.getElementById('node-type-filter');
  if (!select) return;

  const counts = {};
  allNodes.forEach(node => {
    const type = node.type || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  });

  const order = Object.keys(NODE_TYPE_META).filter(type => counts[type]);
  Object.keys(counts).forEach(type => {
    if (!order.includes(type)) order.push(type);
  });

  let html = `<option value="all">所有协议 (${allNodes.length})</option>`;
  order.forEach(type => {
    const meta = getNodeTypeMeta(type);
    html += `<option value="${escapeAttr(type)}">${escapeHtml(meta.label)} (${counts[type]})</option>`;
  });
  select.innerHTML = html;

  if (nodeTypeFilter !== 'all' && !counts[nodeTypeFilter]) nodeTypeFilter = 'all';
  select.value = nodeTypeFilter;
}

function buildNodeSourceOptions() {
  const select = document.getElementById('node-source-filter');
  if (!select) return;

  const sources = {};
  allNodes.forEach(node => {
    const name = node.source || node.sourceRepo || '未知来源';
    sources[name] = (sources[name] || 0) + 1;
  });

  let html = `<option value="all">所有来源 (${allNodes.length})</option>`;
  Object.keys(sources).forEach(name => {
    html += `<option value="${escapeAttr(name)}">${escapeHtml(name)} (${sources[name]})</option>`;
  });
  select.innerHTML = html;

  if (nodeSourceFilter !== 'all' && !sources[nodeSourceFilter]) nodeSourceFilter = 'all';
  select.value = nodeSourceFilter;
}

// 可用性筛选选项：只列出数据里真实存在的状态，并附带数量（与协议/来源筛选同一套约定）
function buildNodeAliveOptions() {
  const select = document.getElementById('node-alive-filter');
  if (!select) return;

  const counts = { alive: 0, dead: 0 };
  allNodes.forEach(node => {
    if (node.alive === true) counts.alive += 1;
    else counts.dead += 1;
  });

  const options = [
    { value: 'all', label: `全部 (${allNodes.length})` },
    { value: 'alive', label: `可用 (${counts.alive})` },
    { value: 'dead', label: `不可用 (${counts.dead})` }
  ];

  // 先校正失效的当前选项，再做签名比对，避免无谓重建导致下拉闪烁
  const validValues = options.map(o => o.value);
  if (!validValues.includes(nodeAliveFilter)) nodeAliveFilter = 'all';
  if (nodeAliveFilter === 'dead' && !counts.dead) nodeAliveFilter = 'all';

  const signature = options.map(o => `${o.value}:${o.label}`).join('|');
  if (select.dataset.signature === signature) {
    select.value = nodeAliveFilter;
    return;
  }
  select.dataset.signature = signature;

  select.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join('');
  select.value = nodeAliveFilter;
}

// ---------------------------------------------------------------------------
// 渲染
// ---------------------------------------------------------------------------

function getFilteredNodes() {
  return allNodes.filter(node => {
    if (nodeTypeFilter !== 'all' && (node.type || '') !== nodeTypeFilter) return false;

    if (nodeSourceFilter !== 'all') {
      const name = node.source || node.sourceRepo || '未知来源';
      if (name !== nodeSourceFilter) return false;
    }

    // 可用性筛选：探测层保证每个节点都有 true/false 结论
    if (nodeAliveFilter === 'alive' && node.alive !== true) return false;
    if (nodeAliveFilter === 'dead' && node.alive === true) return false;

    return true;
  });
}

/**
 * 节点可用性徽章。数据来自抓取期的连通性探测（TCP/TLS/UDP-QUIC）：
 * alive=true 端口可通；false 不可达；null 仅在未启用探测时出现（按不可用兜底显示）。
 * 延迟数值只放进悬浮提示，不再占用卡片空间。
 * 注意端口可通不等于节点一定能用（无法校验账号密码，CDN 节点恒通）。
 */
function renderNodeAliveBadge(node) {
  if (node.alive === true) {
    const latency = typeof node.latencyMs === 'number' ? ` · ${node.latencyMs}ms` : '';
    return `<span class="node-alive-badge alive" title="${escapeAttr((node.probeNote || '连接成功') + latency)}"><i class="bi bi-broadcast"></i> 可用</span>`;
  }
  return `<span class="node-alive-badge dead" title="${escapeAttr(node.probeNote || '连接失败')}"><i class="bi bi-broadcast"></i> 不可用</span>`;
}

function renderNodes() {
  const container = document.getElementById('nodes-container');
  if (!container) return;

  container.style.minHeight = ''; // 真实数据就位，移除骨架屏的高度兜底
  const filtered = getFilteredNodes();
  updateNodeStats(filtered.length);

  if (allNodes.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>暂无节点数据。可在服务器模式下点击「刷新节点」触发抓取，或运行 <code>npm run nodes</code> 生成。
        </div>
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>没有符合条件的节点
        </div>
      </div>
    `;
    return;
  }

  const parts = [];
  filtered.forEach(node => {
    const meta = getNodeTypeMeta(node.type);
    const name = node.name || `${node.server}:${node.port}`;
    const endpoint = `${node.server || '未知'}:${node.port || '-'}`;
    const repo = node.sourceRepo || node.source || '';

    // 完整分享链接只写进 data-link 一处。原来同一条 link 会被写 3 遍
    // （按钮的 data-link、.node-link 的 title、可见文本），330 张卡片白占约 1/3 的 HTML 体积。
    parts.push(`
      <div class="col-lg-6 col-xl-4 mb-3">
        <div class="node-card" data-link="${escapeAttr(node.link)}">
          <div class="d-flex justify-content-between align-items-center mb-2 gap-2">
            <span class="type-badge border border-${meta.color} text-${meta.color}">
              <i class="${meta.icon}"></i> ${escapeHtml(meta.label)}
            </span>
            <div class="d-flex align-items-center gap-2">
              ${renderNodeAliveBadge(node)}
              <button class="btn-action node-copy-btn">
                <i class="bi bi-clipboard"></i> 复制
              </button>
            </div>
          </div>
          <div class="node-name" title="${escapeAttr(name)}">${escapeHtml(name)}</div>
          <div class="node-endpoint"><i class="bi bi-hdd-network me-1"></i>${escapeHtml(endpoint)}</div>
          <div class="node-link">${escapeHtml(shortenLink(node.link))}</div>
          <div class="node-source">
            <i class="bi bi-github me-1"></i>${escapeHtml(repo)}
            ${node.sourceFile ? `<span class="text-secondary ms-2">${escapeHtml(node.sourceFile)}</span>` : ''}
          </div>
        </div>
      </div>
    `);
  });

  container.innerHTML = parts.join('');

  // 复制按钮统一用事件委托：330+ 张卡片不再各自挂一个监听器，
  // 每次全量重绘也只需要这一个常驻监听器（挂在不会被替换的容器上）。
  if (!container.__copyDelegated) {
    container.__copyDelegated = true;
    container.addEventListener('click', function (event) {
      const btn = event.target.closest('.node-copy-btn');
      if (!btn || !this.contains(btn)) return;
      const card = btn.closest('.node-card');
      const link = card ? (card.getAttribute('data-link') || '') : '';
      if (typeof copyToClipboard === 'function') {
        copyToClipboard(link);
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(link);
      }
      showCopySuccess(btn);
    });
  }
}

function updateNodeStats(filteredCount) {
  const totalEl = document.getElementById('total-importable-nodes');
  if (totalEl) totalEl.textContent = allNodes.length;

  const metaEl = document.getElementById('nodes-meta');
  if (metaEl) {
    const parts = [];
    if (nodesMeta.generatedAt) parts.push(`更新于 ${formatNodeTime(nodesMeta.generatedAt)}`);
    if (nodesMeta.duplicatesMerged) parts.push(`已合并重复 ${nodesMeta.duplicatesMerged} 个`);
    if (nodesMeta.sources.length) parts.push(`${nodesMeta.sources.length} 个来源仓库`);

    // 可用性汇总（TCP/TLS/UDP-QUIC 探测结果，探测层保证全覆盖）
    let aliveCount = 0;
    allNodes.forEach(node => {
      if (node.alive === true) aliveCount += 1;
    });
    parts.push(`可用 ${aliveCount}/${allNodes.length}`);

    if (typeof filteredCount === 'number' && filteredCount !== allNodes.length) {
      parts.push(`当前筛选 ${filteredCount} 个`);
    }
    metaEl.innerHTML = parts.length
      ? `<i class="bi bi-info-circle me-1"></i>${escapeHtml(parts.join(' · '))}`
      : '';
  }
}

function formatNodeTime(value) {
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return String(value);
  }
}

// ---------------------------------------------------------------------------
// 复制全部
// ---------------------------------------------------------------------------

function copyAllVisibleNodes(buttonEl) {
  const links = getFilteredNodes().map(node => node.link).filter(Boolean);
  if (links.length === 0) {
    if (typeof showInfoModal === 'function') showInfoModal('当前筛选结果为空，没有可复制的节点。');
    return;
  }

  const text = links.join('\n');
  if (typeof copyToClipboard === 'function') {
    copyToClipboard(text);
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  }

  if (buttonEl) {
    const original = buttonEl.innerHTML;
    buttonEl.innerHTML = `<i class="bi bi-check2"></i> 已复制 ${links.length} 个`;
    setTimeout(() => { buttonEl.innerHTML = original; }, 1500);
  }
}

// ---------------------------------------------------------------------------
// 初始化
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function () {
  const typeSelect = document.getElementById('node-type-filter');
  const sourceSelect = document.getElementById('node-source-filter');
  const aliveSelect = document.getElementById('node-alive-filter');
  const copyAllBtn = document.getElementById('node-copy-all-btn');
  const nodesRefreshBtn = document.getElementById('node-refresh-btn');

  if (typeSelect) {
    typeSelect.addEventListener('change', function () {
      nodeTypeFilter = this.value;
      renderNodes();
    });
  }

  if (sourceSelect) {
    sourceSelect.addEventListener('change', function () {
      nodeSourceFilter = this.value;
      renderNodes();
    });
  }

  if (aliveSelect) {
    aliveSelect.addEventListener('change', function () {
      nodeAliveFilter = this.value;
      renderNodes();
    });
  }

  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', function () {
      copyAllVisibleNodes(this);
    });
  }

  if (nodesRefreshBtn) {
    nodesRefreshBtn.addEventListener('click', function () {
      if (typeof window.refreshAllData === 'function') {
        // 只给节点区块铺骨架屏，订阅区块保持现有内容不动
        window.refreshAllData(this, { scope: 'nodes' });
      } else {
        loadNodes();
      }
    });
  }

  loadNodes();
});

// 供其他模块调用
window.reloadNodes = (showSkeleton) => loadNodes(showSkeleton);
window.getNodesMeta = () => nodesMeta;
window.getAllNodes = () => allNodes;
