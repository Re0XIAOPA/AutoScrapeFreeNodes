# 免费节点订阅抓取工具

自动抓取多个网站的免费节点订阅链接并展示的工具，支持GitHub Pages静态部署。

## 抓取的网站

本工具会自动抓取以下网站的免费节点：

https://clashnode.github.io/free-nodes/

https://clash-meta.github.io/free-nodes/

https://www.airportnode.com/category-1.html

## 部署方式

### GitHub Pages 部署

本项目已配置自动化工作流，可直接部署到GitHub Pages：

1. Fork本仓库到你的GitHub账号
2. 在仓库设置中启用GitHub Pages，选择`gh-pages`分支作为源
3. GitHub Actions会自动构建并部署静态网站
4. 访问`https://你的用户名.github.io/仓库名`查看网站

工作流会：
- 每4小时自动抓取一次最新节点
- 生成静态网站并部署到GitHub Pages
- 将最新数据提交回主分支

### 本地开发

```bash
# 安装依赖
npm install

# 启动服务
npm start

# 生成静态网站
node generate-static.js
```

访问 http://localhost:3001 查看效果。

## 自定义设置

如需修改抓取频率或添加新的节点源，可编辑以下文件：

- `config.json`: 修改抓取站点和基本设置
- `.github/workflows/deploy.yml`: 修改自动构建频率

详细说明请参考 [使用说明.md](使用说明.md)