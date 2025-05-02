/**
 * 环境配置
 */
const CONFIG = {
  // 开发环境配置
  'development': {
    API_BASE_URL: 'http://localhost:3001',
    DEBUG: true
  },
  
  // 测试环境配置
  'static_test': {
    API_BASE_URL: '.',
    DEBUG: true
  },
  
  // 生产环境配置
  'production': {
    API_BASE_URL: '.',
    DEBUG: false
  }
};

// 根据当前URL确定环境
function determineEnvironment() {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // 本地开发环境
    // 检查是否使用Live Server或其他静态服务器（端口不是3001）
    if (window.location.port !== '3001') {
      return 'static_test';
    }
    return 'development';
  } else if (hostname.includes('github.io')) {
    // GitHub Pages环境
    return 'production';
  } else if (protocol === 'file:') {
    // 本地文件系统
    return 'static_test';
  } else {
    // 默认生产环境
    return 'production';
  }
}

// 获取当前环境
const currentEnv = determineEnvironment();
console.log('当前环境:', currentEnv);

// 自动检测基础路径（用于静态部署）
if (currentEnv === 'production' || currentEnv === 'static_test') {
  // 对于GitHub Pages和静态部署，使用相对路径
  CONFIG[currentEnv].API_BASE_URL = '.';
  console.log('使用相对路径访问API');
}

// 导出当前环境的配置
const ENV_CONFIG = CONFIG[currentEnv]; 