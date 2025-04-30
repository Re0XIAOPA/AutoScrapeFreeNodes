/**
 * 环境配置
 */
(function() {
  try {
    // 默认配置
    const DEFAULT_CONFIG = {
      API_BASE_URL: '',
      jsonBaseUrl: 'json',
      isStaticMode: true
    };
    
    // 环境配置
    const CONFIG = {
      // 开发环境API基础URL
      development: {
        API_BASE_URL: 'http://localhost:3001',
        jsonBaseUrl: 'json',
        isStaticMode: false
      },
      
      // 生产环境API基础URL（使用相对路径）
      production: {
        API_BASE_URL: '',
        jsonBaseUrl: 'json',
        isStaticMode: true
      }
    };

    // 定义全局ENV_CONFIG变量
    window.ENV_CONFIG = DEFAULT_CONFIG;

    // 检查是否有全局静态模式配置（通过build-gh-pages.js设置）
    if (window.APP_CONFIG && window.APP_CONFIG.isStaticMode) {
      // 如果是静态模式，使用静态配置
      window.ENV_CONFIG = {
        API_BASE_URL: window.APP_CONFIG.apiBaseUrl || './data',
        jsonBaseUrl: window.APP_CONFIG.jsonBaseUrl || './json',
        isStaticMode: true,
        buildTime: window.APP_CONFIG.buildTime
      };
      console.log('使用静态部署配置:', window.ENV_CONFIG);
    } else {
      // 否则根据当前环境选择配置
      // 如果是在本地开发服务器（如 127.0.0.1:5500），则使用开发环境配置
      // 否则使用生产环境配置
      const hostname = window.location.hostname;
      const isLocalhost = hostname === '127.0.0.1' || 
                          hostname === 'localhost' ||
                          hostname.startsWith('192.168.') ||
                          hostname.startsWith('10.');
                          
      const currentEnv = isLocalhost ? 'development' : 'production';
      
      // 导出当前环境的配置
      window.ENV_CONFIG = CONFIG[currentEnv];
      console.log('使用环境配置:', currentEnv, window.ENV_CONFIG);
    }
  } catch (error) {
    console.error('配置初始化失败:', error);
    // 确保ENV_CONFIG总是被定义，即使发生错误
    window.ENV_CONFIG = {
      API_BASE_URL: './data',
      jsonBaseUrl: './json',
      isStaticMode: true,
      error: error.message
    };
  }
})(); 