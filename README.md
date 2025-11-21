# 自动抓取免费订阅节点

这是一个自动从互联网上抓取免费订阅节点的工具，它会定期更新数据，确保您获取的是最新的可用节点。支持去重功能，避免显示重复的订阅链接。

## 特性

- 🚀 自动抓取多个来源的免费节点订阅
- 🔄 支持定时更新数据
- 🔍 提供简洁视图和详细视图两种展示方式
- 🧰 支持多种订阅类型（Clash、V2ray、SS、SSR、Trojan等）
- 🔄 支持订阅去重功能，不再显示重复链接
- ⚙️ 可通过配置文件添加自定义订阅

## 快速开始

### 直接访问

可以直接访问我们的在线版本：[在线预览](https://asfn.awafuns.cn/)

### 本地运行

1. 克隆代码库
```bash
git clone https://github.com/Re0XIAOPA/AutoScrapeFreeNodes.git
```

2. 安装依赖
```bash
npm install
```

3. 启动服务器
```bash
npm start
```

4. 浏览器中访问 `http://localhost:3001`

## 添加自定义订阅

通过修改 `config.json` 文件，可以轻松添加您自己的自定义订阅：

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

## 要求

- **Node.js**: 18.0.0 或更高版本

## 声明

- 所有节点均来自互联网
- 节点质量不做任何保证
- 仅仅是个人学习和研究

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