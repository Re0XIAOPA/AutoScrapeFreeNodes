<div align="center">
  <br />
  <h1 align="center">AutoScrapeFreeNodes</h1>
  <p align="center">
    <strong>高效 · 自动化 · 跨协议的免费节点聚合方案</strong>
  </p>

  <p align="center">
    <a href="https://github.com/Re0XIAOPA/AutoScrapeFreeNodes">
      <img src="https://img.shields.io/github/stars/Re0XIAOPA/AutoScrapeFreeNodes?style=flat-square" alt="GitHub stars">
    </a>
    <a href="https://github.com/Re0XIAOPA/AutoScrapeFreeNodes/network">
      <img src="https://img.shields.io/github/forks/Re0XIAOPA/AutoScrapeFreeNodes?style=flat-square" alt="GitHub forks">
    </a>
    <a href="https://github.com/Re0XIAOPA/AutoScrapeFreeNodes/issues">
      <img src="https://img.shields.io/github/issues/Re0XIAOPA/AutoScrapeFreeNodes?style=flat-square" alt="GitHub issues">
    </a>
    <a href="https://github.com/Re0XIAOPA/AutoScrapeFreeNodes/blob/master/LICENSE">
      <img src="https://img.shields.io/github/license/Re0XIAOPA/AutoScrapeFreeNodes?style=flat-square" alt="GitHub license">
    </a>
  </p>

  <p align="center">
    <a href="https://asfn.awafuns.cn/">在线预览</a> 
    <span> · </span>
    <a href="#快速开始">部署指南</a> 
    <span> · </span>
    <a href="#配置指南">配置文档</a>
  </p>
  <br />
</div>

---

## 核心特性

<table width="100%">
  <tr>
    <td width="50%">
      <strong>多源聚合抓取</strong><br />
      从多个高质量公共渠道自动提取免费订阅信息。
    </td>
    <td width="50%">
      <strong>自动化运维</strong><br />
      支持定时更新机制，确保持续维护节点数据的时效性。
    </td>
  </tr>
  <tr>
    <td width="50%">
      <strong>智能去重过滤</strong><br />
      内置指纹识别逻辑，自动剔除重复的链接，保持订阅纯净。
    </td>
    <td width="50%">
      <strong>全协议兼容</strong><br />
      全面支持 Clash, V2ray, SS, SSR, Trojan, Sing-Box 等。
    </td>
  </tr>
</table>

---

## 要求

- **Node.js**: 18.0.0 或更高版本


## 快速开始

### 本地部署

**静态模式 (无依赖)**
直接通过浏览器打开 `public/index.html` 即可查看静态快照数据。

**2完整模式 (支持实时抓取)**
```bash
# 克隆仓库
git clone [https://github.com/Re0XIAOPA/AutoScrapeFreeNodes.git](https://github.com/Re0XIAOPA/AutoScrapeFreeNodes.git)

# 安装必要依赖
npm install

# 启动服务端应用
npm start
```

## 配置指南

项目核心配置文件位于根目录 `config.json`。

### 抓取站点 (sites)

| 字段 | 类型 | 说明 |
|------|------|------|
| `url` | String | 需要爬取的网页 URL |
| `enabled` | Boolean | 是否启用该抓取任务 |
| `description` | String | 站点用途备注 |

## 添加自定义订阅

通过修改根目录的 `config.json` 文件，可以轻松添加需要抓取的网站和您自己的自定义订阅：

抓取的配置格式：
```json
"sites": [
    {
      "url": "https://example.com/clash",
      "enabled": true,
      "description": "免费节点订阅站点1"
    },
    {
      "url": "https://example.com/v2ray",
      "enabled": true,
      "description": "免费节点订阅站点2"
    }
]
```

自定义配置文件格式：
```json
"subscriptions": [
  {
    "type": "Clash",
    "name": "我的Clash订阅",
    "url": "https://example.com/clash",
    "description": "自定义Clash订阅"
  },
  {
    "type": "V2ray",
    "name": "我的V2ray订阅",
    "url": "https://example.com/v2ray",
    "description": "自定义V2ray订阅"
  }
]
```

每个订阅项需要包含以下字段：
- `type`: 订阅类型，可以是以下值之一: `Clash`, `V2ray`, `SS`, `SSR`, `Trojan`, `Sing-Box`, `Shadowrocket`, `Quantumult` 或 `通用`
- `name`: 订阅名称
- `url`: 订阅链接
- `description`: 订阅描述（可选）

## 抓取的网站

本工具会自动抓取以下网站的免费节点：

https://clashnode.github.io/free-nodes/  
https://clash-meta.github.io/free-nodes/  
https://www.airportnode.com/category-1.html  

## Docker 部署

### 使用 Docker Compose (推荐)

1. 确保已安装 Docker 和 Docker Compose
2. 在项目根目录下运行：
```bash
docker compose up -d
```
3. 访问 `http://localhost:3000`

### 使用 Docker 构建

1. 构建镜像：
```bash
docker build -t autoscrape-free-nodes .
```
2. 运行容器：
```bash
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name autoscrape autoscrape-free-nodes
```


<div style="padding: 16px; border: 1px solid #1dff91; margin: 24px 0;">
  <strong style="display: block; margin-bottom: 10px; color: #1dff91;">## 免责声明</strong>
  <ul style="margin-bottom: 0; padding-left: 20px; line-height: 1.6;">
    <li>本项目仅作为技术交流与学术研究使用。</li>
    <li>所有节点数据均来源于第三方互联网公开页面，工具本身不存储、不分发任何服务器资源。</li>
    <li>使用者应自行判断节点安全性，并严格遵守当地相关法律法规。</li>
    <li>作者不对因使用本工具导致的任何形式的损失或法律纠纷负责。</li>
  </ul>
</div>

## Star History

<a href="https://www.star-history.com/?repos=Re0XIAOPA%2FAutoScrapeFreeNodes&type=date&logscale=&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=Re0XIAOPA/AutoScrapeFreeNodes&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=Re0XIAOPA/AutoScrapeFreeNodes&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=Re0XIAOPA/AutoScrapeFreeNodes&type=date&legend=top-left" />
 </picture>
</a>