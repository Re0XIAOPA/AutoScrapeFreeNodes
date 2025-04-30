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
  
  // 3. 确保data目录存在
  console.log('确保数据目录存在...');
  const distDataDir = path.join(BUILD_DIR, 'data');
  await fs.ensureDir(distDataDir);
  
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
  
  for (const file of dataFiles) {
    if (file.endsWith('.json')) {
      await fs.copy(
        path.join(DATA_DIR, file),
        path.join(distDataDir, file)
      );
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
  
  await fs.writeJson(path.join(distDataDir, 'config.json'), safeConfig, { spaces: 2 });
  
  // 7. 创建Github Pages专用的config.js
  console.log('创建静态环境配置...');
  const configJsContent = `
// 静态部署配置
window.APP_CONFIG = {
  isStaticMode: true,
  apiBaseUrl: 'data', // 使用相对路径，不使用./data，因为在GitHub Pages中可能会有问题
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