# AutoScrapeFreeNodes

自动抓取免费节点并展示，前端界面美观现代，支持多种筛选和视图模式。

## 功能特点

- 自动抓取免费节点订阅链接
- 支持多种节点类型（Clash、V2ray、Sing-Box等）
- 现代化界面设计，支持暗色模式
- 丰富的筛选和搜索功能
- 简洁视图和详细视图两种展示模式
- 支持本地服务器和GitHub Pages静态部署

## 本地运行

```bash
# 安装依赖
npm install

# 启动服务器
npm start
```

## GitHub Pages部署

您可以轻松将项目部署到GitHub Pages上，方便分享和访问。

### 部署步骤

1. 确保你的项目已经推送到GitHub仓库

2. 首次部署前，请先运行后端服务，以生成数据：
   ```bash
   npm start
   ```

3. 等待数据抓取完成后，执行以下命令部署到GitHub Pages：
   ```bash
   npm run deploy
   ```

4. 部署成功后，访问 `https://你的用户名.github.io/AutoScrapeFreeNodes` 即可

### 自动化部署

如果您需要定期更新GitHub Pages上的数据，可以设置GitHub Actions自动部署：

1. 在您的GitHub仓库中创建 `.github/workflows/deploy.yml` 文件
2. 添加以下内容：

```yaml
name: Deploy to GitHub Pages

on:
  schedule:
    - cron: '0 */6 * * *'  # 每6小时执行一次
  workflow_dispatch:  # 允许手动触发

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'

      - name: Install dependencies
        run: npm ci

      - name: Run scraper
        run: node index.js --scrape-only

      - name: Deploy to GitHub Pages
        run: |
          git config --global user.name "GitHub Actions"
          git config --global user.email "actions@github.com"
          npm run deploy
```

## 自定义配置

编辑 `config.json` 文件可以自定义抓取设置：

```json
{
  "sites": [
    {
      "url": "https://example.com",
      "description": "示例站点",
      "enabled": true,
      "selectors": {
        "articles": ".article-list .article",
        "title": ".article-title",
        "link": ".article-link",
        "content": ".article-content"
      }
    }
  ],
  "settings": {
    "port": 3000,
    "updateInterval": 15,
    "maxArticlesPerSite": 5,
    "dataDir": "data"
  }
}
```

## 贡献

欢迎提交Pull Request或创建Issue贡献代码和提出建议。