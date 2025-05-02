# 自动抓取免费订阅节点

这是一个自动从互联网上抓取免费订阅节点的工具，它会定期更新数据，确保您获取的是最新的可用节点。支持去重功能，避免显示重复的订阅链接。

## 特性

- 🚀 自动抓取多个来源的免费节点订阅
- 🔄 支持定时更新数据
- 🔍 提供简洁视图和详细视图两种展示方式
- 🧰 支持多种订阅类型（Clash、V2ray、SS、SSR、Trojan等）
- 🔄 支持订阅去重功能，不再显示重复链接
- ⚙️ 通过配置文件添加自定义订阅
- 📱 响应式设计，支持移动端和桌面端

## 使用方法

### 直接访问

可以直接访问我们的在线版本：[节点库 - 免费订阅节点](https://your-website-url.com)

### 本地部署

1. 克隆代码库
```bash
git clone https://github.com/yourusername/AutoScrapeFreeNodes.git
cd AutoScrapeFreeNodes
```

2. 安装依赖
```bash
npm install
```

3. 启动服务器
```bash
node index.js
```

4. 浏览器中访问 `http://localhost:3001`

### 添加自定义订阅

通过修改 `config.json` 文件，可以轻松添加您自己的自定义订阅。找到或创建 `subscriptions` 数组，按以下格式添加您的订阅：

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

修改配置文件后，重新启动服务或刷新页面以查看您的自定义订阅。

## 生成静态页面

如果您想生成一个静态网站（可部署在GitHub Pages等静态托管服务上），可以使用以下命令：

```bash
node generate-static.js
```

这将在项目根目录生成所有必要的静态文件。

## 声明

- 所有节点均来自互联网收集，不对节点质量和稳定性做任何保证
- 仅供学习研究使用，请遵守当地法律法规
- 请勿用于非法用途，否则后果自负

## 许可证

MIT

## 系统要求

- **Node.js**: 18.0.0 或更高版本
- 支持的操作系统: Windows, macOS, Linux

## 抓取的网站

本工具会自动抓取以下网站的免费节点：

https://clashnode.github.io/free-nodes/

https://clash-meta.github.io/free-nodes/

https://www.airportnode.com/category-1.html

## 部署方式

### GitHub Pages 部署

本项目已配置自动化工作流，可直接部署到GitHub Pages：

1. Fork本仓库到你的GitHub账号
2. **设置仓库权限**：进入仓库设置 → Actions → General → Workflow permissions，选择"Read and write permissions"并保存
3. 在仓库设置中启用GitHub Pages，选择`gh-pages`分支作为源
4. 手动触发一次工作流：Actions → "部署免费节点抓取工具到GitHub Pages" → Run workflow
5. 访问`https://你的用户名.github.io/仓库名`查看网站

工作流会：
- 每天北京时间00:30自动抓取节点并部署网站
- 每天北京时间00:30和12:30更新数据
- 将最新数据提交回主分支

### 本地开发

```bash
# 首先确保安装Node.js 18+版本
node -v  # 应显示 v18.x.x 或更高

# 安装依赖
npm install

# 启动服务
npm start

# 生成静态网站
npm run generate

# 测试静态网站
npm run test-static
```

访问 http://localhost:3001 查看效果。

## 自定义设置

如需修改抓取频率或添加新的节点源，可编辑以下文件：

- `config.json`: 修改抓取站点和基本设置
- `.github/workflows/deploy.yml`: 修改自动构建频率

### 使用自定义域名

如果你使用自定义域名部署GitHub Pages，且发现域名在每次自动构建后失效，请参考[部署说明.md](部署说明.md#解决自定义域名被覆盖问题)中的解决方案。

## 贡献
