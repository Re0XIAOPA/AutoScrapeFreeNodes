const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// 导入构建和验证脚本
const buildDir = path.join(__dirname, '../dist');

async function localBuildTest() {
  console.log('======== 开始本地构建测试 ========');
  
  // 步骤1: 清理dist目录
  console.log('\n1. 清理构建目录...');
  await fs.emptyDir(buildDir);
  console.log('✅ 构建目录已清理');
  
  // 步骤2: 执行构建
  console.log('\n2. 执行构建脚本...');
  try {
    const buildScript = path.join(__dirname, 'build-gh-pages.js');
    console.log(`运行构建脚本: ${buildScript}`);
    
    const { stdout, stderr } = await execAsync(`node "${buildScript}"`);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('✅ 构建脚本执行完成');
  } catch (err) {
    console.error('❌ 构建脚本执行失败:', err);
    process.exit(1);
  }
  
  // 步骤3: 验证构建结果
  console.log('\n3. 验证构建结果...');
  try {
    const verifyScript = path.join(__dirname, 'verify-build.js');
    console.log(`运行验证脚本: ${verifyScript}`);
    
    const { stdout, stderr } = await execAsync(`node "${verifyScript}"`);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('✅ 验证脚本执行完成');
  } catch (err) {
    console.error('❌ 验证脚本执行失败:', err);
    process.exit(1);
  }
  
  // 步骤4: 手动检查关键文件
  console.log('\n4. 手动检查关键文件...');
  
  const criticalFiles = [
    'index.html',
    'js/config.js',
    'js/app.js',
    'data/config.json',
    'json/subscriptions.json',
    'json/sites.json'
  ];
  
  let allCriticalFilesExist = true;
  
  for (const file of criticalFiles) {
    const filePath = path.join(buildDir, file);
    if (await fs.pathExists(filePath)) {
      const stats = await fs.stat(filePath);
      console.log(`✅ ${file} (${stats.size} 字节)`);
      
      // 对于JSON文件，尝试解析
      if (file.endsWith('.json')) {
        try {
          const content = await fs.readJson(filePath);
          const isEmpty = Object.keys(content).length === 0;
          if (isEmpty) {
            console.warn(`⚠️ 警告: ${file} 是空对象!`);
          } else {
            console.log(`   内容有效: ${Object.keys(content).length} 个键`);
          }
        } catch (err) {
          console.error(`❌ ${file} 内容无效: ${err.message}`);
          allCriticalFilesExist = false;
        }
      }
    } else {
      console.error(`❌ 缺少关键文件: ${file}`);
      allCriticalFilesExist = false;
    }
  }
  
  if (!allCriticalFilesExist) {
    console.error('\n❌ 有关键文件缺失，构建可能不完整!');
    process.exit(1);
  }
  
  // 步骤5: 提供部署建议
  console.log('\n5. 本地测试完成');
  console.log('\n======== 构建和验证完成 ========');
  console.log('\n您可以通过以下方式测试静态站点:');
  console.log('1. 使用 Live Server VS Code 扩展打开 dist 目录');
  console.log('2. 或运行 npx serve dist');
  console.log('\n要部署到GitHub Pages:');
  console.log('1. 确认.github/workflows/deploy.yml已正确配置');
  console.log('2. 推送代码到GitHub，触发自动部署');
  console.log('3. 或手动触发GitHub Actions工作流程');
}

localBuildTest().catch(err => {
  console.error('本地构建测试失败:', err);
  process.exit(1);
}); 