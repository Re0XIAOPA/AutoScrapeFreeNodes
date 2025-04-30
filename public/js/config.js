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
    API_BASE_URL: ''
  }
};

// 根据当前环境选择配置
// 如果是在本地开发服务器（如 127.0.0.1:5500），则使用开发环境配置
// 否则使用生产环境配置
const currentEnv = window.location.hostname === '127.0.0.1' || 
                   window.location.hostname === 'localhost' ? 
                   'development' : 'production';

// 导出当前环境的配置
const ENV_CONFIG = CONFIG[currentEnv]; 