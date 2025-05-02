/**
 * 环境配置
 */
const CONFIG = {
  // 开发环境API基础URL
  development: {
    API_BASE_URL: 'http://localhost:3001'
  },
  
  // 生产环境API基础URL
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

// 确定环境
if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
  // 检查端口，如果是8080，则是静态测试模式
  if (window.location.port === '8080') {
    currentEnv = 'static_test';
  } else {
    currentEnv = 'development';
  }
}

// 自动设置API基础URL
if (currentEnv === 'production' || currentEnv === 'static_test') {
  // 获取当前页面的基础URL
  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
  
  // 检查是否在GitHub Pages环境
  const isGitHubPages = window.location.hostname.includes('github.io');
  
  if (isGitHubPages) {
    // GitHub Pages环境，使用根路径
    CONFIG[currentEnv].API_BASE_URL = baseUrl;
    console.log('GitHub Pages环境，使用绝对路径:', baseUrl);
  } else {
    // 其他静态部署环境，使用相对路径
    CONFIG[currentEnv].API_BASE_URL = '.';
    console.log('使用相对路径访问API');
  }
}

console.log('当前环境:', currentEnv);

// 导出当前环境的配置
const ENV_CONFIG = CONFIG[currentEnv]; 