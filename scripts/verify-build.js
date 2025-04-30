#!/usr/bin/env node

/**
 * 验证构建脚本
 * 用于检查构建后的文件结构是否正确
 */

const fs = require('fs-extra');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const distDataDir = path.join(distDir, 'data');

console.log('验证构建目录结构...');

// 检查dist目录是否存在
if (!fs.existsSync(distDir)) {
  console.error('错误: dist目录不存在');
  process.exit(1);
}

// 检查dist/data目录是否存在
if (!fs.existsSync(distDataDir)) {
  console.error('错误: dist/data目录不存在');
  process.exit(1);
} else {
  console.log('✓ dist/data目录正常');
}

// 检查必要的数据文件
const requiredFiles = [
  path.join(distDataDir, 'config.json'),
  path.join(distDataDir, 'subscriptions.json'),
  path.join(distDataDir, 'sites.json'),
  path.join(distDir, 'index.html'),
  path.join(distDir, 'js', 'app.js'),
  path.join(distDir, 'js', 'config.js'),
  path.join(distDir, 'css', 'style.css')
];

let allFilesExist = true;

// 检查每个必要文件是否存在
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`错误: 找不到文件 ${file}`);
    allFilesExist = false;
  } else {
    console.log(`✓ 文件正常: ${path.relative(distDir, file)}`);
  }
}

// 验证JSON文件是否有效
try {
  const configJSON = fs.readJSONSync(path.join(distDataDir, 'config.json'));
  console.log('✓ config.json 是有效的JSON');
  
  const subscriptionsJSON = fs.readJSONSync(path.join(distDataDir, 'subscriptions.json'));
  console.log('✓ subscriptions.json 是有效的JSON');
  
  const sitesJSON = fs.readJSONSync(path.join(distDataDir, 'sites.json'));
  console.log('✓ sites.json 是有效的JSON');
} catch (error) {
  console.error('错误: JSON文件无效:', error.message);
  allFilesExist = false;
}

if (allFilesExist) {
  console.log('\n✅ 构建验证通过！所有必要文件都存在且有效');
} else {
  console.error('\n❌ 构建验证失败！某些必要文件缺失或无效');
  process.exit(1);
} 