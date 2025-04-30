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
  // 对于GitHub Pages和静态部署，我们总是使用相对路径
  // 这样无论部署在哪里都能正确访问API
  CONFIG[currentEnv].API_BASE_URL = '.';
  
  console.log('使用相对路径访问API');
}

console.log('当前环境:', currentEnv);

// 导出当前环境的配置
const ENV_CONFIG = CONFIG[currentEnv]; 