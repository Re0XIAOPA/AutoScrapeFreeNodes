/**
 * node-probe.js
 * 节点连通性探测（纯 Node.js，不依赖任何代理内核）
 *
 * 能测什么：
 *   - TCP 类节点：对 server:port 发起 TCP 连接（TLS 类节点再补一次 TLS 握手），
 *     判断「服务器是否在线、端口是否开放」。
 *   - UDP(QUIC) 类节点（hysteria / hysteria2 / tuic）：发一个版本号无效的 QUIC
 *     Initial 报文（1200 字节），按 RFC 9000 服务器必须回 Version Negotiation，
 *     收到任何 UDP 回包即视为端口在线。
 *
 * 测不了什么（务必清楚，避免误判）：
 *   1. 只能证明端口通，不能证明账号密码有效；
 *   2. 套了 CDN（Cloudflare 等）的节点恒通，端口通不代表节点可用；
 *   3. UDP 探测依赖本机出站 UDP 未被封禁；无回包按「不可用」计，
 *      但个别服务器不回 Version Negotiation 时存在误判可能（备注里会写明探测方式）。
 *
 * 如需验证「通过该节点能否真正翻出去」，需要引入 sing-box / Xray 内核起进程实测，
 * 成本高（每节点一个连接 + 内核二进制），当前不做。
 */

const net = require('net');
const tls = require('tls');
const dgram = require('dgram');
const crypto = require('crypto');
const { mapLimit, loadConfigSafe } = require('./http-client');

// 走 UDP(QUIC) 的协议，用 QUIC 版本协商探测而不是 TCP
const UDP_PROTOCOLS = new Set(['hysteria', 'hysteria2', 'tuic']);

const isUdpProtocol = (type) => UDP_PROTOCOLS.has(String(type || '').toLowerCase());

// trojan 必走 TLS；其余看 security/tls 字段
const isTlsNode = (node) => {
  if (!node) return false;
  if (node.type === 'trojan') return true;
  if (String(node.security || '').toLowerCase() === 'tls') return true;
  const t = String(node.tls || '').toLowerCase();
  return t === 'tls' || t === 'true';
};

/** 纯 TCP 连接探测 */
const tcpProbe = (host, port, timeout) => new Promise((resolve) => {
  const started = Date.now();
  let settled = false;
  const finish = (result) => {
    if (settled) return;
    settled = true;
    resolve(result);
  };
  const timer = setTimeout(() => finish({ alive: false, latencyMs: null, note: '连接超时' }), timeout);

  const socket = net.connect({ host, port });
  socket.on('connect', () => {
    clearTimeout(timer);
    const latencyMs = Date.now() - started;
    socket.destroy();
    finish({ alive: true, latencyMs, note: 'TCP 连接成功' });
  });
  socket.setTimeout(timeout, () => {
    clearTimeout(timer);
    socket.destroy();
    finish({ alive: false, latencyMs: null, note: '连接超时' });
  });
  socket.on('error', (err) => {
    clearTimeout(timer);
    socket.destroy();
    finish({ alive: false, latencyMs: null, note: err.code || '连接失败' });
  });
});

/** TLS 握手探测（rejectUnauthorized=false，只关心能否握手，不校验证书链） */
const tlsProbe = (host, port, sni, timeout) => new Promise((resolve) => {
  const started = Date.now();
  let settled = false;
  const finish = (result) => {
    if (settled) return;
    settled = true;
    resolve(result);
  };
  const timer = setTimeout(() => finish({ alive: false, latencyMs: null, note: '连接超时' }), timeout);

  const socket = tls.connect({ host, port, servername: sni || host, rejectUnauthorized: false }, () => {
    clearTimeout(timer);
    const latencyMs = Date.now() - started;
    socket.destroy();
    finish({ alive: true, latencyMs, note: 'TLS 握手成功' });
  });
  socket.setTimeout(timeout, () => {
    clearTimeout(timer);
    socket.destroy();
    finish({ alive: false, latencyMs: null, note: 'TLS 握手超时' });
  });
  socket.on('error', (err) => {
    clearTimeout(timer);
    socket.destroy();
    finish({ alive: false, latencyMs: null, note: err.code || 'TLS 握手失败' });
  });
});

/**
 * 构造 QUIC Initial 探测报文（1200 字节）。
 * 版本号用保留值 0x1a2a3a4a：任何支持 QUIC 的服务器都必须回 Version Negotiation，
 * 因此「收到回包」即可证明 UDP 端口在线，无需实现完整 QUIC 栈。
 */
const buildQuicInitial = () => {
  const dcid = crypto.randomBytes(8);
  // 头部：固定位长头部 + 版本 + DCID(带1B长度前缀) + SCID长度0 + Token长度0(varint)
  const head = Buffer.alloc(1 + 4 + 1 + dcid.length + 1 + 1);
  let off = 0;
  head[off++] = 0xc0;                   // 长头部 + 固定位
  head.writeUInt32BE(0x1a2a3a4a, off); off += 4; // 保留版本号 → 触发版本协商
  head[off++] = dcid.length;            // DCID 长度
  dcid.copy(head, off); off += dcid.length;
  head[off++] = 0;                      // SCID 长度 = 0
  head[off++] = 0;                      // Token 长度 = 0（varint）
  // Length 字段：2 字节 varint（前两位置 01），值 = 包号(1B) + 载荷
  const payloadLen = 1200 - head.length - 2 - 1;
  const buf = Buffer.alloc(1200);
  head.copy(buf, 0);
  buf.writeUInt16BE(0x4000 | payloadLen, off);
  // 其余字节保持 0：当作包号 + 冗余填充，服务器只用于触发版本协商
  return buf;
};

/** UDP(QUIC) 端口探测：发出 Initial 后收到任何回包（含版本协商）即算在线 */
const udpProbe = (host, port, timeout) => new Promise((resolve) => {
  const started = Date.now();
  let settled = false;
  const sock = dgram.createSocket('udp4');
  const finish = (result) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    try { sock.close(); } catch (_) { /* 已关闭 */ }
    resolve(result);
  };
  const timer = setTimeout(() => finish({ alive: false, latencyMs: null, note: 'UDP 无响应（QUIC 探测超时）' }), timeout);

  sock.on('message', () => {
    finish({ alive: true, latencyMs: Date.now() - started, note: 'QUIC 端口在线' });
  });
  sock.on('error', (err) => {
    finish({ alive: false, latencyMs: null, note: err.code || 'UDP 探测失败' });
  });

  sock.send(buildQuicInitial(), port, host, (err) => {
    if (err) finish({ alive: false, latencyMs: null, note: err.code || 'UDP 发送失败' });
  });
});

/**
 * 探测单个地址。TLS 节点先试 TLS 握手；握手失败再退回纯 TCP 判断服务器是否在线，
 * 避免「服务器在线但要求特定 ALPN/SNI」的节点被误判为不可用。
 */
const probeEndpoint = async (host, port, useTls, sni, timeout) => {
  if (!useTls) return tcpProbe(host, port, timeout);

  const t = await tlsProbe(host, port, sni, timeout);
  if (t.alive) return t;

  const f = await tcpProbe(host, port, timeout);
  if (f.alive) {
    return { alive: true, latencyMs: f.latencyMs, note: 'TCP 可通 · TLS 握手失败' };
  }
  return { alive: false, latencyMs: null, note: f.note };
};

/**
 * 批量探测节点并就地写入 alive / latencyMs / probe / probeNote 字段。
 * 多个节点常共用同一 server:port，这里先按地址去重，只探测唯一地址。
 * 所有点位都会得出 可用/不可用 结论，不再有「未探测」。
 * @param {Array} nodes 节点数组（会被修改）
 * @param {Object} options { enabled, timeout, concurrency } 覆盖 config.json 的 settings.nodeCheck
 * @returns {Object} 统计 { total, probed, alive, dead, endpoints, at, method }
 */
const probeNodes = async (nodes, options = {}) => {
  const config = loadConfigSafe();
  const checkCfg = Object.assign(
    { enabled: true, timeout: 4000, concurrency: 32 },
    (config.settings && config.settings.nodeCheck) || {},
    options
  );

  const stats = {
    total: nodes.length,
    probed: 0,
    alive: 0,
    dead: 0,
    endpoints: 0,
    at: new Date().toISOString(),
    method: 'tcp/tls/udp-quic'
  };

  if (checkCfg.enabled === false || !nodes.length) {
    nodes.forEach((node) => {
      node.alive = null;
      node.probe = 'skipped';
      node.probeNote = '未启用探测';
    });
    return stats;
  }

  // 端点去重：key = host|port|协议族|是否TLS|SNI
  const endpoints = new Map();
  nodes.forEach((node, idx) => {
    const isUdp = isUdpProtocol(node.type);
    const useTls = !isUdp && isTlsNode(node);
    const sni = node.sni || node.host || '';
    const host = String(node.server || '').toLowerCase();
    const port = node.port || 0;
    const key = `${host}|${port}|${isUdp ? 'udp' : 'tcp'}|${useTls ? 1 : 0}|${sni}`;
    let ep = endpoints.get(key);
    if (!ep) {
      ep = { host: node.server, port, isUdp, useTls, sni, idxs: [] };
      endpoints.set(key, ep);
    }
    ep.idxs.push(idx);
  });

  const list = Array.from(endpoints.values());
  stats.endpoints = list.length;
  const udpCount = list.filter((ep) => ep.isUdp).length;
  console.log(`[probe] 探测 ${list.length} 个唯一地址（TCP/TLS ${list.length - udpCount} + UDP/QUIC ${udpCount}，` +
    `覆盖 ${nodes.length} 个节点，并发 ${checkCfg.concurrency}，超时 ${checkCfg.timeout}ms）`);

  await mapLimit(list, checkCfg.concurrency, async (ep) => {
    let result;
    if (!ep.host || !ep.port) {
      result = { alive: false, latencyMs: null, note: '节点缺少地址，无法探测' };
    } else if (ep.isUdp) {
      result = await udpProbe(ep.host, ep.port, checkCfg.timeout);
    } else {
      result = await probeEndpoint(ep.host, ep.port, ep.useTls, ep.sni, checkCfg.timeout);
    }
    ep.idxs.forEach((i) => {
      const node = nodes[i];
      node.alive = result.alive;
      node.latencyMs = result.latencyMs;
      node.probe = ep.isUdp ? 'udp-quic' : (ep.useTls ? 'tcp+tls' : 'tcp');
      node.probeNote = result.note;
    });
    stats.probed += 1;
    if (result.alive) stats.alive += ep.idxs.length;
    else stats.dead += ep.idxs.length;
  });

  console.log(`[probe] 完成：可用 ${stats.alive} / 不可用 ${stats.dead}（共 ${stats.total}）`);
  return stats;
};

module.exports = {
  probeNodes,
  probeEndpoint,
  isUdpProtocol,
  isTlsNode
};
