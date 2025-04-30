const fs = require('fs-extra');
const path = require('path');
const scraper = require('../scraper');

// 配置
const BUILD_DIR = path.join(__dirname, '../dist');
const DATA_DIR = path.join(__dirname, '../data');
const PUBLIC_DIR = path.join(__dirname, '../public');

async function build() {
  console.log('开始构建GitHub Pages静态站点...');
  
  // 1. 确保构建目录存在并清空
  console.log('准备构建目录...');
  await fs.emptyDir(BUILD_DIR);
  
  // 2. 复制所有静态资源
  console.log('复制静态资源...');
  await fs.copy(PUBLIC_DIR, BUILD_DIR);
  
  // 3. 确保数据目录存在
  console.log('确保数据目录存在...');
  const distDataDir = path.join(BUILD_DIR, 'data');
  await fs.ensureDir(distDataDir);
  
  // 创建json目录用于存放合并的数据文件
  const distJsonDir = path.join(BUILD_DIR, 'json');
  await fs.ensureDir(distJsonDir);
  
  // 4. 抓取最新数据或使用现有数据
  console.log('准备数据...');
  try {
    console.log('尝试运行抓取脚本获取最新数据...');
    await scraper.scrapeAllSites();
    console.log('抓取完成');
  } catch (error) {
    console.error('抓取失败，将使用现有数据:', error);
  }
  
  // 5. 复制所有数据文件到dist/data目录
  console.log('复制数据文件...');
  const dataFiles = await fs.readdir(DATA_DIR);
  
  // 收集所有站点数据，准备创建合并文件
  const allSiteData = {};
  const subscriptionsData = {};
  
  for (const file of dataFiles) {
    if (file.endsWith('.json')) {
      const filePath = path.join(DATA_DIR, file);
      await fs.copy(filePath, path.join(distDataDir, file));
      
      // 读取文件内容准备合并
      try {
        const siteData = await fs.readJson(filePath);
        const siteId = file.replace('.json', '');
        
        // 保存原始站点数据
        allSiteData[siteId] = siteData;
        
        // 处理成subscription格式的数据
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
        
        subscriptionsData[siteId] = processedData;
      } catch (err) {
        console.error(`处理文件 ${file} 时出错:`, err);
      }
    }
  }
  
  // 6. 创建一个可以在GitHub Pages使用的配置文件
  console.log('创建静态配置文件...');
  const config = scraper.getConfig();
  // 移除敏感信息
  const safeConfig = {
    sites: config.sites.map(site => ({
      url: site.url,
      description: site.description,
      enabled: site.enabled
    })),
    settings: {
      updateInterval: config.settings.updateInterval,
      maxArticlesPerSite: config.settings.maxArticlesPerSite,
      lastUpdated: new Date().toISOString(),
    }
  };
  
  // 配置文件放在data目录下
  await fs.writeJson(path.join(distDataDir, 'config.json'), safeConfig, { spaces: 2 });
  
  // 7. 创建合并的数据文件，放在json目录中
  console.log('创建合并数据文件...');
  await fs.writeJson(path.join(distJsonDir, 'subscriptions.json'), subscriptionsData, { spaces: 2 });
  await fs.writeJson(path.join(distJsonDir, 'sites.json'), allSiteData, { spaces: 2 });
  
  // 8. 创建Github Pages专用的config.js
  console.log('创建静态环境配置...');
  const configJsContent = `
// 静态部署配置
window.APP_CONFIG = {
  isStaticMode: true,
  apiBaseUrl: 'data', // 数据文件的目录
  jsonBaseUrl: 'json', // 合并数据文件的目录
  buildTime: "${new Date().toISOString()}"
};
`;
  
  await fs.writeFile(path.join(BUILD_DIR, 'js', 'config.js'), configJsContent);
  
  console.log('构建完成！');
}

build().catch(err => {
  console.error('构建过程中出错:', err);
  process.exit(1);
}); 