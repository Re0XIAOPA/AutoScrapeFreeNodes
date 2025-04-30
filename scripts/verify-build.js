const fs = require('fs-extra');
const path = require('path');

// 配置
const BUILD_DIR = path.join(__dirname, '../dist');

async function verifyBuild() {
  console.log('开始验证GitHub Pages构建...');
  
  // 1. 检查构建目录是否存在
  console.log('检查构建目录...');
  if (!await fs.pathExists(BUILD_DIR)) {
    throw new Error('构建目录不存在，请先运行 build-gh-pages.js 脚本');
  }
  
  // 2. 检查必要的文件
  console.log('检查必要文件...');
  const requiredFiles = [
    'index.html',
    'js/config.js',
    'js/app.js',
    'data/config.json'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(BUILD_DIR, file);
    if (!await fs.pathExists(filePath)) {
      throw new Error(`缺少必要文件: ${file}`);
    }
  }
  
  // 3. 检查数据文件夹中是否有JSON文件
  console.log('检查数据文件...');
  const dataDir = path.join(BUILD_DIR, 'data');
  const dataFiles = await fs.readdir(dataDir);
  const jsonFiles = dataFiles.filter(f => f.endsWith('.json'));
  
  if (jsonFiles.length <= 1) { // 至少应该有config.json和一个站点数据文件
    console.warn('警告: 数据目录中只找到了 ' + jsonFiles.length + ' 个JSON文件');
  }
  
  // 4. 检查config.js是否包含静态模式标记
  console.log('检查配置文件...');
  const configJsPath = path.join(BUILD_DIR, 'js', 'config.js');
  const configContent = await fs.readFile(configJsPath, 'utf8');
  
  if (!configContent.includes('isStaticMode: true')) {
    throw new Error('配置文件未设置为静态模式，这可能会导致部署后无法正常工作');
  }
  
  console.log('验证成功！构建结果符合GitHub Pages部署要求。');
}

verifyBuild().catch(err => {
  console.error('验证失败:', err);
  process.exit(1);
}); 