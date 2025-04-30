const fs = require('fs-extra');
const path = require('path');

// 配置
const BUILD_DIR = path.join(__dirname, '../dist');

async function verifyBuild() {
  console.log('验证构建结果...');

  // 检查必需文件
  const requiredFiles = [
    'index.html',
    'js/app.js',
    'js/config.js',
    'css/base.css',
    'css/components.css',
    'css/subscription.css',
    'data/config.json',
    'json/subscriptions.json',
    'json/sites.json'
  ];

  let allFilesExist = true;

  for (const file of requiredFiles) {
    const filePath = path.join(BUILD_DIR, file);
    const exists = await fs.pathExists(filePath);
    
    if (exists) {
      console.log(`✅ 文件存在: ${file}`);
    } else {
      console.error(`❌ 文件不存在: ${file}`);
      allFilesExist = false;
    }
  }

  // 检查数据文件
  console.log('\n检查数据文件:');
  const dataDir = path.join(BUILD_DIR, 'data');
  if (await fs.pathExists(dataDir)) {
    const dataFiles = await fs.readdir(dataDir);
    const jsonFiles = dataFiles.filter(file => file.endsWith('.json'));
    console.log(`找到 ${jsonFiles.length} 个数据文件在 data/ 目录`);
    
    if (jsonFiles.length === 0) {
      console.warn('⚠️ 警告: data/ 目录中未找到数据文件!');
    }
  } else {
    console.error('❌ data/ 目录不存在!');
    allFilesExist = false;
  }

  // 检查合并数据文件
  console.log('\n检查合并数据文件:');
  const jsonDir = path.join(BUILD_DIR, 'json');
  if (await fs.pathExists(jsonDir)) {
    const jsonFiles = await fs.readdir(jsonDir);
    console.log(`找到 ${jsonFiles.length} 个文件在 json/ 目录:`);
    jsonFiles.forEach(file => console.log(`  - ${file}`));
  } else {
    console.error('❌ json/ 目录不存在!');
    allFilesExist = false;
  }

  if (allFilesExist) {
    console.log('\n✅ 验证成功: 所有必需文件都存在');
    return true;
  } else {
    console.error('\n❌ 验证失败: 有文件缺失，构建可能不完整');
    process.exit(1);
  }
}

verifyBuild().catch(err => {
  console.error('验证过程中出错:', err);
  process.exit(1);
}); 