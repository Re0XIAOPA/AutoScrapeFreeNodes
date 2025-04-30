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
      
      // 检查文件大小，确保不是空文件
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        console.error(`❌ 文件存在但为空: ${file}`);
        allFilesExist = false;
      } else if (stats.size < 10 && file.endsWith('.json')) {
        console.warn(`⚠️ 警告: JSON文件可能无效 (${stats.size} 字节): ${file}`);
      } else {
        console.log(`   文件大小: ${formatFileSize(stats.size)}`);
      }
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
    
    if (jsonFiles.length <= 1) {  // 只有config.json是不够的
      console.warn('⚠️ 警告: data/ 目录中可能缺少站点数据文件!');
    }
    
    // 列出所有数据文件及其大小
    console.log('站点数据文件列表:');
    for (const file of jsonFiles) {
      const filePath = path.join(dataDir, file);
      const stats = await fs.stat(filePath);
      console.log(`   ${file} (${formatFileSize(stats.size)})`);
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
    
    if (jsonFiles.length < 2) {
      console.error('❌ json/ 目录中缺少必要的合并数据文件!');
      allFilesExist = false;
    }
    
    // 检查合并文件的内容
    for (const file of jsonFiles) {
      const filePath = path.join(jsonDir, file);
      const stats = await fs.stat(filePath);
      console.log(`   ${file} (${formatFileSize(stats.size)})`);
      
      // 对于关键文件，检查其内容是否有效
      if (file === 'subscriptions.json' || file === 'sites.json') {
        try {
          const content = await fs.readJson(filePath);
          const keys = Object.keys(content);
          if (keys.length === 0) {
            console.warn(`⚠️ 警告: ${file} 是空对象!`);
          } else {
            console.log(`   包含 ${keys.length} 个站点的数据`);
          }
        } catch (err) {
          console.error(`❌ 无法解析 ${file}: ${err.message}`);
          allFilesExist = false;
        }
      }
    }
  } else {
    console.error('❌ json/ 目录不存在!');
    allFilesExist = false;
  }

  if (allFilesExist) {
    console.log('\n✅ 验证成功: 所有必需文件都存在并有效');
    return true;
  } else {
    console.error('\n❌ 验证失败: 有文件缺失或无效，构建可能不完整');
    process.exit(1);
  }
}

// 格式化文件大小显示
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  else return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

verifyBuild().catch(err => {
  console.error('验证过程中出错:', err);
  process.exit(1);
}); 