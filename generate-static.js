const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const { execSync } = require('child_process');

// 检查 Node.js 版本
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0], 10);
if (majorVersion < 18) {
  console.error(`错误: Node.js 版本过低 (${nodeVersion})，需要 Node.js 18 或更高版本`);
  console.error('请升级 Node.js 后再运行此脚本: https://nodejs.org/');
  process.exit(1);
}

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
    
    try {
      // 执行一次抓取更新数据
      console.log('执行数据抓取...');
      const scraper = require('./scraper');
      await scraper.scrapeAllSites();
    } catch (scraperError) {
      console.error('数据抓取过程中发生错误:', scraperError);
      console.log('继续生成静态站点，将使用现有数据...');
    }
    
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
      try {
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
      } catch (fileError) {
        console.error(`处理文件 ${file} 时出错:`, fileError);
        console.log(`跳过此文件，继续处理其他文件...`);
      }
    });
    
    // 写入站点详细数据
    fs.writeJsonSync(path.join(apiDir, 'sites.json'), sitesData);
    
    // 写入简化的订阅数据
    fs.writeJsonSync(path.join(apiDir, 'subscriptions.json'), subscriptionsData);
    
    // 创建内联数据文件，避免使用fetch
    console.log('创建内联数据文件...');
    const inlineDataJs = `
// 内联数据 - 自动生成，请勿手动修改
const INLINE_CONFIG = ${JSON.stringify(configData, null, 2)};
const INLINE_SUBSCRIPTIONS = ${JSON.stringify(subscriptionsData, null, 2)};
const INLINE_SITES = ${JSON.stringify(sitesData, null, 2)};
const REFRESH_RESPONSE = ${JSON.stringify({ 
  success: true, 
  message: '静态站点不支持实时刷新功能。GitHub Pages站点数据会在每天北京时间00:30通过GitHub Actions自动更新，请查看页面上的"最后更新时间"了解数据状态。' 
}, null, 2)};
`;
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'js', 'inline-data.js'), inlineDataJs);
    
    // 修改API地址，使其适应GitHub Pages
    console.log('修改前端配置...');
    const configJsPath = path.join(OUTPUT_DIR, 'js', 'config.js');
    let configJsContent = fs.readFileSync(configJsPath, 'utf8');
    
    // 检查是否已包含自动检测逻辑
    if (!configJsContent.includes('使用相对路径访问API')) {
      // 如果没有自动检测逻辑，则添加
      const autoDetectCode = `
// 自动检测基础路径（用于GitHub Pages或其他静态托管）
if (currentEnv === 'production' || currentEnv === 'static_test') {
  // 对于GitHub Pages和静态部署，我们总是使用相对路径
  // 这样无论部署在哪里都能正确访问API
  CONFIG[currentEnv].API_BASE_URL = '.';
  
  console.log('使用相对路径访问API');
}
`;
      
      // 在"导出当前环境的配置"前插入自动检测代码
      configJsContent = configJsContent.replace(
        /console\.log\('当前环境:',\s*currentEnv\);/,
        `console.log('当前环境:', currentEnv);\n${autoDetectCode}`
      );
    }
    
    fs.writeFileSync(configJsPath, configJsContent);
    
    console.log('创建mock的refresh API...');
    // 创建mock的refresh API，返回成功但不执行任何操作
    fs.ensureDirSync(path.join(apiDir, 'refresh'));
    fs.writeJsonSync(path.join(apiDir, 'refresh', 'index.json'), { 
      success: true, 
      message: '静态站点不支持实时刷新功能。GitHub Pages站点数据会在每天北京时间00:30通过GitHub Actions自动更新，请查看页面上的"最后更新时间"了解数据状态。'
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
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('找不到所需模块，请确保已运行 npm install 安装所有依赖');
    } else if (error.message && error.message.includes('ReadableStream')) {
      console.error('当前Node.js版本不支持ReadableStream API，请升级到Node.js 18或更高版本');
    }
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