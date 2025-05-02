/**
 * 环境配置
 */
const CONFIG = {
  // 开发环境配置
  'development': {
    API_BASE_URL: '',  // 会在下面自动设置
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
} else if (currentEnv === 'development') {
  // 开发环境，使用当前主机
  const port = '3001'; // 后端服务端口
  CONFIG[currentEnv].API_BASE_URL = window.location.protocol + '//' + window.location.hostname + ':' + port;
  console.log('使用开发服务器:', CONFIG[currentEnv].API_BASE_URL);
}

// 导出当前环境的配置
const ENV_CONFIG = CONFIG[currentEnv]; 