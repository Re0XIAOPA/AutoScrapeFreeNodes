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

// 应用配置
const APP_CONFIG = {
  // API基础URL - 自动检测环境
  apiBaseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? '' // 本地开发环境
    : '.', // GitHub Pages环境 - 使用相对路径，从当前目录开始
  
  // 更新频率（分钟）
  refreshInterval: 15,
  
  // 是否启用调试模式
  debug: false,
  
  // 订阅类型颜色映射
  typeColors: {
    'Clash': '#3861FB',
    'V2ray': '#F95F62',
    'Shadowrocket': '#FF9500',
    'Sing-Box': '#6236FF',
    'Quantumult': '#34C759',
    '通用': '#8E8E93'
  }
}; 