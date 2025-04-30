/**
 * 环境配置
 */
const CONFIG = {
  // 开发环境API基础URL
  development: {
    API_BASE_URL: 'http://localhost:3001'
  },
  
  // 生产环境API基础URL（使用相对路径）
  production: {
    API_BASE_URL: ''  // 会自动检测并填充
  },
  
  // 静态文件测试环境
  static_test: {
    API_BASE_URL: ''  // 会自动检测并填充
  }
};

// 根据当前环境选择配置
let currentEnv = 'production';

// 如果是在本地开发服务器
if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
  // 检查端口，如果是8080，则是静态测试模式
  if (window.location.port === '8080') {
    currentEnv = 'static_test';
  } else {
    currentEnv = 'development';
  }
}

// 自动检测基础路径（用于GitHub Pages或其他静态托管）
if (currentEnv === 'production' || currentEnv === 'static_test') {
  // 从当前URL路径提取基础路径
  const pathSegments = window.location.pathname.split('/');
  // 移除最后一个元素（如果是文件名或空）
  if (pathSegments[pathSegments.length - 1].includes('.html') || pathSegments[pathSegments.length - 1] === '') {
    pathSegments.pop();
  }
  // 创建基础路径（例如 /AutoScrapeFreeNodes 或 空字符串）
  let basePath = pathSegments.join('/');
  
  // 如果在根目录，basePath将为空
  CONFIG[currentEnv].API_BASE_URL = basePath;
  
  console.log('自动检测到基础路径:', basePath);
}

console.log('当前环境:', currentEnv);

// 导出当前环境的配置
const ENV_CONFIG = CONFIG[currentEnv]; 