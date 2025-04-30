# 免费节点订阅集合

这是一个自动抓取和展示免费节点订阅链接的项目。该项目使用Node.js构建，可以定期从多个来源获取最新的免费节点订阅链接，并提供美观的用户界面进行展示。

## 来源网站

- https://clashnode.github.io/free-nodes/
- https://clash-meta.github.io/free-nodes/
- https://www.airportnode.com/category-1.html

## 功能特点

- 自动抓取多个来源的免费节点订阅链接
- 定时更新，保持数据新鲜
- 支持按类型过滤订阅链接（Clash、V2ray、Sing-Box等）
- 支持搜索功能
- 支持简洁视图和详细视图切换
- 响应式设计，适配各种设备
- 可部署为静态网站（GitHub Pages）或动态应用

## 部署指南

### 方法一：在GitHub Pages上部署（推荐）

这个项目已经配置了GitHub Actions，可以自动构建并部署到GitHub Pages。**系统会每天北京时间凌晨00:30自动重新构建并更新数据。**

1. Fork这个仓库到你的GitHub账号
2. 在仓库设置中启用GitHub Pages：
   - 进入你fork的仓库
   - 点击"Settings" -> "Pages"
   - Source选择"GitHub Actions"
3. 触发部署：
   - 修改任意文件并提交到main分支，或者
   - 在Actions标签页手动触发workflow

部署完成后，你可以通过`https://<你的GitHub用户名>.github.io/AutoScrapeFreeNodes`访问你的网站。

### 方法二：本地或服务器部署

#### 前提条件
- Node.js 16+ 和npm

#### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/你的用户名/AutoScrapeFreeNodes.git
cd AutoScrapeFreeNodes
```

2. 安装依赖
```bash
npm install
```

3. 启动应用
```bash
npm start
```

应用将在`http://localhost:3000`（或配置的端口）上运行。

#### 使用PM2进行生产环境部署

```bash
npm install -g pm2
pm2 start index.js --name "free-nodes"
```

## 开发指南

### 构建静态站点

如果你想手动构建静态站点版本（不使用GitHub Actions）：

```bash
npm run build
```

静态站点文件将生成在`dist`目录中。

### 验证构建

```bash
npm run verify
```

### 修改抓取配置

编辑`config.json`文件以添加或修改抓取源、更新频率等设置。

### 修改自动更新时间

如果你想修改自动更新的时间，可以编辑`.github/workflows/deploy.yml`文件中的`cron`表达式：

```yaml
schedule:
  # 格式: '分钟 小时 日 月 星期'
  - cron: '30 16 * * *'  # UTC时间16:30，对应北京时间00:30
```

## 许可证

[项目许可证信息]