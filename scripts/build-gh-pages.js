#!/usr/bin/env node

/**
 * 构建GitHub Pages静态数据脚本
 * 用于生成静态JSON数据并复制到dist目录
 */

const fs = require('fs-extra');
const path = require('path');

// 配置
const config = require('../config.json');
const dataDir = path.join(__dirname, '..', config.settings.dataDir || 'data');
const distDir = path.join(__dirname, '..', 'dist');
const distDataDir = path.join(distDir, 'data');

// 确保目录存在
fs.ensureDirSync(distDir);
fs.ensureDirSync(distDataDir);

console.log('清理dist目录...');
// 不清理整个dist目录，以免删除gh-pages分支的.git文件夹
// 只清理data目录
fs.emptyDirSync(distDataDir);

// 读取所有站点数据
console.log('读取站点数据...');
const sitesData = {};
const subscriptionsData = {};

// 尝试读取所有JSON文件
try {
  const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
  
  if (files.length === 0) {
    console.warn('警告：数据目录中没有找到JSON文件！');
    
    // 创建一个空的示例数据
    subscriptionsData['example'] = {
      url: "https://example.com",
      siteName: "示例站点",
      scrapedAt: new Date().toISOString(),
      subscriptionCount: 0,
      subscriptions: []
    };
    
    sitesData['example'] = {
      url: "https://example.com",
      siteName: "示例站点",
      scrapedAt: new Date().toISOString(),
      articles: []
    };
  } else {
    files.forEach(file => {
      try {
        const siteData = fs.readJsonSync(path.join(dataDir, file));
        const siteName = file.replace('.json', '');
        
        // 保存完整站点数据
        sitesData[siteName] = siteData;
        
        // 创建精简版订阅数据
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
        console.error(`处理站点 ${file} 数据失败:`, err);
      }
    });
  }
} catch (err) {
  console.error('读取站点数据失败:', err);
  // 不退出，继续创建空数据
  subscriptionsData['example'] = {
    url: "https://example.com",
    siteName: "示例站点",
    scrapedAt: new Date().toISOString(),
    subscriptionCount: 0,
    subscriptions: []
  };
  
  sitesData['example'] = {
    url: "https://example.com",
    siteName: "示例站点",
    scrapedAt: new Date().toISOString(),
    articles: []
  };
}

// 创建配置JSON
const publicConfig = {
  sites: config.sites.map(site => ({
    url: site.url,
    description: site.description,
    enabled: site.enabled
  })),
  settings: {
    updateInterval: config.settings.updateInterval,
    maxArticlesPerSite: config.settings.maxArticlesPerSite,
    lastUpdated: new Date().toISOString()
  }
};

// 写入JSON文件
try {
  console.log('写入静态数据文件...');
  fs.writeJsonSync(path.join(distDataDir, 'sites.json'), sitesData, { spaces: 2 });
  fs.writeJsonSync(path.join(distDataDir, 'subscriptions.json'), subscriptionsData, { spaces: 2 });
  fs.writeJsonSync(path.join(distDataDir, 'config.json'), publicConfig, { spaces: 2 });
  console.log('静态数据文件生成完成！');
} catch (err) {
  console.error('写入静态数据文件失败:', err);
  process.exit(1);
}

// 复制index.html并修改为静态版本
try {
  const indexHtmlPath = path.join(__dirname, '..', 'public', 'index.html');
  const destIndexHtml = path.join(distDir, 'index.html');
  
  console.log('处理index.html...');
  fs.copySync(indexHtmlPath, destIndexHtml);
  console.log('复制完成！');
} catch (err) {
  console.error('处理index.html失败:', err);
}

// 复制必要的脚本文件
try {
  console.log('复制静态资源...');
  fs.copySync(path.join(__dirname, '..', 'public'), distDir, {
    filter: (src, dest) => {
      // 跳过可能已经存在的文件
      if (src.includes('index.html') && fs.existsSync(dest)) {
        return false;
      }
      return true;
    }
  });
  console.log('静态资源复制完成！');
} catch (err) {
  console.error('复制静态资源失败:', err);
}

console.log('GitHub Pages静态数据构建完成！');
console.log(`生成的文件位于: ${distDir}`); 