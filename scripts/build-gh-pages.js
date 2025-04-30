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
  
  // 5. 检查数据目录中是否有文件，如果没有则报错
  console.log('检查数据文件是否存在...');
  if (!fs.existsSync(DATA_DIR)) {
    throw new Error(`数据目录 ${DATA_DIR} 不存在`);
  }
  
  let dataFiles = [];
  try {
    dataFiles = await fs.readdir(DATA_DIR);
    console.log(`找到 ${dataFiles.length} 个文件在数据目录中`);
  } catch (err) {
    console.error(`读取数据目录失败: ${err.message}`);
    throw err;
  }

  if (dataFiles.length === 0) {
    throw new Error('数据目录为空，没有找到任何JSON文件');
  }
  
  // 复制所有数据文件到dist/data目录
  console.log('复制数据文件...');
  
  // 收集所有站点数据，准备创建合并文件
  const allSiteData = {};
  const subscriptionsData = {};
  
  let processedFiles = 0;
  
  for (const file of dataFiles) {
    if (file.endsWith('.json')) {
      const filePath = path.join(DATA_DIR, file);
      const destPath = path.join(distDataDir, file);
      
      try {
        // 确保源文件存在且可读
        await fs.access(filePath, fs.constants.R_OK);
        
        // 复制文件
        await fs.copy(filePath, destPath);
        console.log(`已复制: ${file} -> dist/data/${file}`);
        
        // 读取文件内容准备合并
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
        processedFiles++;
      } catch (err) {
        console.error(`处理文件 ${file} 时出错:`, err);
      }
    }
  }
  
  console.log(`成功处理了 ${processedFiles} 个数据文件`);
  
  if (processedFiles === 0) {
    throw new Error('没有成功处理任何数据文件，构建失败');
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
  console.log('已创建配置文件: dist/data/config.json');
  
  // 7. 创建合并的数据文件，放在json目录中
  console.log('创建合并数据文件...');
  await fs.writeJson(path.join(distJsonDir, 'subscriptions.json'), subscriptionsData, { spaces: 2 });
  await fs.writeJson(path.join(distJsonDir, 'sites.json'), allSiteData, { spaces: 2 });
  console.log('已创建合并数据文件: dist/json/subscriptions.json 和 dist/json/sites.json');
  
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
  console.log('已创建静态环境配置: dist/js/config.js');
  
  // 9. 列出所有创建的文件
  console.log('\n构建完成！以下是创建的文件列表:');
  try {
    const allFiles = [];
    const walkDir = async (dir, baseDir = '') => {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        const relativePath = path.join(baseDir, file);
        if (stat.isDirectory()) {
          await walkDir(filePath, relativePath);
        } else {
          allFiles.push(relativePath);
        }
      }
    };
    
    await walkDir(BUILD_DIR);
    console.log(`总共创建了 ${allFiles.length} 个文件`);
    
    // 只打印关键文件
    const keyFiles = allFiles.filter(file => 
      file.endsWith('.json') || 
      file.endsWith('index.html') || 
      file.endsWith('config.js') || 
      file.endsWith('app.js')
    );
    
    console.log('关键文件:');
    keyFiles.forEach(file => console.log(`- ${file}`));
  } catch (err) {
    console.error('列出文件时出错:', err);
  }
}

build().catch(err => {
  console.error('构建过程中出错:', err);
  process.exit(1);
}); 