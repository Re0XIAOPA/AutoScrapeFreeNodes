const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

// 配置
const config = require('./config.json');
const OUTPUT_DIR = 'dist';
const DATA_DIR = path.join(__dirname, config.settings.dataDir || 'data');

async function generateStaticSite() {
  try {
    console.log('开始生成静态网站...');
    
    // 确保输出目录存在并清空
    console.log(`清空输出目录: ${OUTPUT_DIR}`);
    fs.ensureDirSync(OUTPUT_DIR);
    fs.emptyDirSync(OUTPUT_DIR);
    
    // 复制所有静态资源
    console.log('复制静态资源...');
    fs.copySync('public', OUTPUT_DIR);
    
    // 创建API数据目录
    const apiDir = path.join(OUTPUT_DIR, 'api');
    fs.ensureDirSync(apiDir);
    
    // 生成配置数据
    console.log('生成配置数据...');
    const configData = {
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
    
    fs.writeJsonSync(path.join(apiDir, 'config.json'), configData);
    
    // 确保数据目录存在
    fs.ensureDirSync(DATA_DIR);
    
    // 执行一次抓取更新数据
    console.log('执行数据抓取...');
    const scraper = require('./scraper');
    await scraper.scrapeAllSites();
    
    // 复制数据文件
    console.log('复制数据文件...');
    
    // 获取所有站点数据并合并为一个文件
    const sitesData = {};
    const subscriptionsData = {};
    
    const siteFiles = fs.readdirSync(DATA_DIR).filter(file => file.endsWith('.json'));
    
    if (siteFiles.length === 0) {
      console.log('警告: 没有找到任何数据文件。创建示例数据...');
      // 创建示例数据以便于测试
      const exampleData = {
        url: "https://example.com",
        siteName: "示例站点",
        scrapedAt: new Date().toISOString(),
        totalSubscriptions: 2,
        articles: [
          {
            title: "示例文章",
            url: "https://example.com/article1",
            publishedAt: new Date().toISOString(),
            subscriptions: [
              {
                type: "Clash",
                name: "示例订阅1",
                url: "https://example.com/sub1"
              },
              {
                type: "V2ray",
                name: "示例订阅2",
                url: "https://example.com/sub2"
              }
            ]
          }
        ]
      };
      fs.writeJsonSync(path.join(DATA_DIR, 'example.json'), exampleData);
      siteFiles.push('example.json');
    }
    
    siteFiles.forEach(file => {
      const siteData = fs.readJsonSync(path.join(DATA_DIR, file));
      const siteName = file.replace('.json', '');
      
      // 详细数据
      sitesData[siteName] = siteData;
      
      // 简化的订阅数据
      const processedData = {
        url: siteData.url,
        siteName: siteData.siteName,
        scrapedAt: siteData.scrapedAt,
        subscriptionCount: siteData.totalSubscriptions || 0,
        subscriptions: []
      };
      
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
    });
    
    // 写入站点详细数据
    fs.writeJsonSync(path.join(apiDir, 'sites.json'), sitesData);
    
    // 写入简化的订阅数据
    fs.writeJsonSync(path.join(apiDir, 'subscriptions.json'), subscriptionsData);
    
    // 修改API地址，使其适应GitHub Pages
    console.log('修改前端配置...');
    const configJsPath = path.join(OUTPUT_DIR, 'js', 'config.js');
    let configJsContent = fs.readFileSync(configJsPath, 'utf8');
    
    // 更新生产环境配置，使用相对路径访问API
    configJsContent = configJsContent.replace(
      /production: \{\s*API_BASE_URL: ['"].*['"]\s*\}/,
      `production: {\n    API_BASE_URL: ''\n  }`
    );
    
    fs.writeFileSync(configJsPath, configJsContent);
    
    console.log('创建mock的refresh API...');
    // 创建mock的refresh API，返回成功但不执行任何操作
    fs.ensureDirSync(path.join(apiDir, 'refresh'));
    fs.writeJsonSync(path.join(apiDir, 'refresh', 'index.json'), { 
      success: true, 
      message: '静态站点不支持实时刷新，请查看GitHub Actions执行时间了解最后更新时间' 
    });
    
    // 复制.nojekyll文件到输出目录，确保GitHub Pages不会使用Jekyll处理
    fs.copySync('.nojekyll', path.join(OUTPUT_DIR, '.nojekyll'));
    
    // 如果有自定义域名，复制CNAME文件
    if (fs.existsSync('CNAME') && fs.readFileSync('CNAME', 'utf8').trim() !== '') {
      fs.copySync('CNAME', path.join(OUTPUT_DIR, 'CNAME'));
    }
    
    console.log('静态网站生成完成！');
    return true;
  } catch (error) {
    console.error('生成静态网站时出错:', error);
    return false;
  }
}

// 执行生成
generateStaticSite().then(success => {
  if (success) {
    console.log(`静态网站文件已生成在 ${OUTPUT_DIR} 目录中`);
    console.log(`可以运行 npm run test-static 来测试静态网站`);
    process.exit(0);
  } else {
    console.error('静态网站生成失败');
    process.exit(1);
  }
}); 