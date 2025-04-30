/**
 * 环境配置
 */
const CONFIG = {
  // 开发环境API基础URL
  development: {
    API_BASE_URL: 'http://localhost:3001',
    isStaticMode: false
  },
  
  // 生产环境API基础URL（使用相对路径）
  production: {
    API_BASE_URL: '',
    isStaticMode: false
  }
};

// 检查是否有全局静态模式配置（通过build-gh-pages.js设置）
if (window.APP_CONFIG && window.APP_CONFIG.isStaticMode) {
  // 如果是静态模式，使用静态配置
  var ENV_CONFIG = {
    API_BASE_URL: window.APP_CONFIG.apiBaseUrl || './data',
    isStaticMode: true,
    buildTime: window.APP_CONFIG.buildTime
  };
} else {
  // 否则根据当前环境选择配置
  // 如果是在本地开发服务器（如 127.0.0.1:5500），则使用开发环境配置
  // 否则使用生产环境配置
  const currentEnv = window.location.hostname === '127.0.0.1' || 
                    window.location.hostname === 'localhost' ? 
                    'development' : 'production';
  
  // 导出当前环境的配置
  var ENV_CONFIG = CONFIG[currentEnv];
} 