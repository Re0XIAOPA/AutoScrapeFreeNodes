const fs = require('fs-extra');
const path = require('path');
const http = require('http');
const express = require('express');

const DIST_DIR = path.join(__dirname, 'dist');
const API_DIR = path.join(DIST_DIR, 'api');
const BASE_PATH = '/AutoScrapeFreeNodes'; // 模拟GitHub Pages部署路径

// 请求路径只作为标识符查表，绝不参与文件路径拼接（防止路径穿越）
const API_FILES = new Map([
  ['config', path.join(API_DIR, 'config.json')],
  ['csrf-token', path.join(API_DIR, 'csrf-token.json')],
  ['nodes', path.join(API_DIR, 'nodes.json')],
  ['sites', path.join(API_DIR, 'sites.json')],
  ['subscriptions', path.join(API_DIR, 'subscriptions.json')],
  ['status', path.join(API_DIR, 'status.json')],
  ['refresh', path.join(API_DIR, 'refresh', 'index.json')]
]);

// 纵深防御：确认目标文件确实位于 api 目录内
function isInsideApiDir(filePath) {
  const resolved = path.resolve(filePath);
  const root = path.resolve(API_DIR) + path.sep;
  return resolved.startsWith(root);
}

// 测试静态网站生成和服务
async function testStaticSite() {
  try {
    // 检查dist目录是否存在
    if (!fs.existsSync(DIST_DIR)) {
      console.error('错误: dist目录不存在，请先运行 node generate-static.js');
      process.exit(1);
    }
    
    console.log('开始测试静态网站...');
    
    // 创建Express应用
    const app = express();
    
    // 添加API请求日志中间件
    app.use((req, res, next) => {
      console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
      next();
    });
    
    // 将根路径重定向到BASE_PATH
    app.get('/', (req, res) => {
      res.redirect(BASE_PATH);
    });
    
    // 设置静态文件服务，使用BASE_PATH
    app.use(BASE_PATH, express.static(DIST_DIR));
    
    // 确保API请求被正确路由到对应的JSON文件
    app.get(`${BASE_PATH}/api/*`, (req, res, next) => {
      // 从请求路径中提取API名称，仅用于白名单查表
      const prefix = `${BASE_PATH}/api/`;
      const apiPath = req.path.startsWith(prefix) ? req.path.slice(prefix.length) : '';
      const filePath = API_FILES.get(apiPath);

      if (!filePath || !isInsideApiDir(filePath)) {
        console.log(`拒绝访问未知 API 路径: ${req.path}`);
        return next();
      }

      console.log(`尝试访问API: ${req.path}`);
      console.log(`- 检查文件: ${filePath}`);

      if (fs.existsSync(filePath)) {
        console.log(`- 找到API文件: ${filePath}`);
        return res.sendFile(filePath, { dotfiles: 'deny' });
      }

      // 如果找不到文件，继续下一个处理器
      next();
    });
    
    // 处理刷新请求
    app.post(`${BASE_PATH}/api/refresh`, (req, res) => {
      console.log('收到刷新请求');
      res.json({ 
        success: true, 
        message: '静态测试环境不支持实时刷新，已生成的数据不会改变' 
      });
    });
    
    // 对于SPA应用，所有未匹配的BASE_PATH路由都返回index.html
    app.use(`${BASE_PATH}/*`, (req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
    
    // 处理404 - 当访问BASE_PATH下不存在的文件时返回404
    app.use((req, res) => {
      if (req.path.startsWith(BASE_PATH)) {
        res.status(404).send(`404 - 文件不存在: ${req.path}`);
      } else {
        res.status(404).send('404 - 页面不存在，请访问 ' + BASE_PATH);
      }
    });
    
    // 启动服务器
    const PORT = 8080;
    const server = http.createServer(app);
    
    server.listen(PORT, () => {
      console.log(`测试服务器运行在: http://localhost:${PORT}${BASE_PATH}`);
      console.log('提示: 这是一个模拟GitHub Pages的静态服务器环境');
      console.log('      如果需要实时更新数据功能，请使用 npm start 运行动态服务器');
    });
    
    // 捕获Ctrl+C信号
    process.on('SIGINT', () => {
      console.log('停止测试服务器');
      server.close(() => {
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('测试静态网站时出错:', error);
    process.exit(1);
  }
}

// 执行测试
testStaticSite(); 