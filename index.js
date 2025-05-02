const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { CronJob } = require('cron');
const scraper = require('./scraper');
const cors = require('cors');

// 获取配置
const config = scraper.getConfig();
const settings = config.settings;

const app = express();
const PORT = process.env.PORT || settings.port || 3000;

// 确保数据目录存在
const dataDir = path.join(__dirname, settings.dataDir || 'data');
fs.ensureDirSync(dataDir);

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 允许跨域请求
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// 添加API端点返回配置信息（隐藏敏感数据）
app.get('/api/config', (req, res) => {
  try {
    const publicConfig = {
      sites: config.sites.map(site => ({
        url: site.url,
        description: site.description,
        enabled: site.enabled
      })),
      settings: {
        updateInterval: settings.updateInterval,
        maxArticlesPerSite: settings.maxArticlesPerSite,
        lastUpdated: new Date().toISOString(),
        localFreeNodesCount: settings.localFreeNodesCount || 0
      }
    };
    res.json(publicConfig);
  } catch (error) {
    console.error('获取配置数据失败:', error);
    res.status(500).json({ error: '获取配置数据失败' });
  }
});

// API端点返回所有订阅链接数据
app.get('/api/subscriptions', (req, res) => {
  try {
    const subscriptionsData = {};
    
    // 读取每个网站的节点数据
    const sites = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
    
    if (sites.length === 0) {
      return res.json({}); // 返回空对象，而不是错误
    }
    
    sites.forEach(site => {
      try {
        const siteData = fs.readJsonSync(path.join(dataDir, site));
        const siteName = site.replace('.json', '');
        
        // 处理新的数据结构
        const processedData = {
          url: siteData.url,
          siteName: siteData.siteName,
          scrapedAt: siteData.scrapedAt,
          subscriptionCount: siteData.totalSubscriptions || 0,
          subscriptions: []
        };
        
        // 从所有文章中收集订阅链接
        if (siteData.articles && Array.isArray(siteData.articles)) {
          siteData.articles.forEach(article => {
            if (article.subscriptions && Array.isArray(article.subscriptions)) {
              processedData.subscriptions = processedData.subscriptions.concat(
                article.subscriptions.map(sub => ({
                  ...sub,
                  articleTitle: article.title,
                  articleUrl: article.url
                }))
              );
            }
          });
        }
        
        subscriptionsData[siteName] = processedData;
      } catch (err) {
        console.error(`处理站点 ${site} 数据失败:`, err);
        // 继续处理其他站点
      }
    });
    
    // 添加config.json中的自定义订阅
    if (config.subscriptions && Array.isArray(config.subscriptions) && config.subscriptions.length > 0) {
      const customSite = {
        url: "custom",
        siteName: "自定义订阅",
        scrapedAt: new Date().toISOString(),
        subscriptionCount: config.subscriptions.length,
        subscriptions: config.subscriptions.map(sub => ({
          ...sub,
          isCustom: true // 标记为自定义
        }))
      };
      
      subscriptionsData.custom = customSite;
    }
    
    res.json(subscriptionsData);
  } catch (error) {
    console.error('获取订阅数据失败:', error);
    res.status(500).json({ error: '获取订阅数据失败' });
  }
});

// 添加API端点返回详细数据（包括文章信息）
app.get('/api/sites', (req, res) => {
  try {
    const sitesData = {};
    
    // 读取每个网站的详细数据
    const sites = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
    
    if (sites.length === 0) {
      return res.json({}); // 返回空对象，而不是错误
    }
    
    sites.forEach(site => {
      try {
        const siteData = fs.readJsonSync(path.join(dataDir, site));
        const siteName = site.replace('.json', '');
        sitesData[siteName] = siteData;
      } catch (err) {
        console.error(`读取站点 ${site} 数据失败:`, err);
        // 继续处理其他站点
      }
    });
    
    res.json(sitesData);
  } catch (error) {
    console.error('获取站点数据失败:', error);
    res.status(500).json({ error: '获取站点数据失败' });
  }
});

// 手动触发抓取的API
app.post('/api/refresh', async (req, res) => {
  try {
    console.log('手动触发抓取...');
    await scraper.scrapeAllSites();
    res.json({ success: true, message: '抓取完成' });
  } catch (error) {
    console.error('手动抓取失败:', error);
    res.status(500).json({ error: '抓取失败' });
  }
});

// 提供对根目录的访问
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

// 处理404
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: '找不到请求的API端点' });
  } else {
    res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 初始化抓取一次
console.log('开始初始抓取...');
scraper.scrapeAllSites();

// 设置定时任务，根据配置的updateInterval决定频率
const cronExpression = `*/${settings.updateInterval || 15} * * * *`;
console.log(`定时任务设置为每${settings.updateInterval || 15}分钟执行一次`);

const job = new CronJob(cronExpression, function() {
  console.log('执行定时抓取任务...');
  scraper.scrapeAllSites();
}, null, true);

job.start();
