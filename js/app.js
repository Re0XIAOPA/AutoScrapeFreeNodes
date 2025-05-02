// 全局变量
let allSubscriptions = {};
let detailedData = {};
let configData = {};
let currentView = 'normal'; // 'normal' or 'detailed'

// API基础URL - 从环境配置中获取
const API_BASE_URL = ENV_CONFIG.API_BASE_URL;

// 自定义模态框显示函数
function showInfoModal(message) {
  console.log('尝试显示信息模态框:', message); // 调试日志
  
  // 检查DOM是否已加载
  if (!document.getElementById('infoModalText')) {
    console.warn('模态框元素不存在，使用alert代替');
    alert(message);
    return;
  }
  
  // 设置模态框内容
  const infoModalText = document.getElementById('infoModalText');
  infoModalText.textContent = message;
  
  try {
    // 尝试使用Bootstrap的模态框
    if (typeof bootstrap === 'undefined') {
      throw new Error('Bootstrap未加载');
    }
    
    const modalElement = document.getElementById('infoModal');
    
    // 确保移除模态框上的aria-hidden属性
    modalElement.removeAttribute('aria-hidden');
    
    // 创建新的模态框实例
    const infoModal = new bootstrap.Modal(modalElement, {
      backdrop: true,
      keyboard: true,
      focus: true
    });
    
    // 监听模态框隐藏事件，以确保aria-hidden属性被正确处理
    modalElement.addEventListener('hidden.bs.modal', function() {
      // 在模态框隐藏后移除aria-hidden属性
      setTimeout(() => {
        modalElement.removeAttribute('aria-hidden');
      }, 50);
    }, { once: false });
    
    infoModal.show();
  } catch (error) {
    console.error('Bootstrap模态框显示失败，使用备用方法:', error);
    
    // 尝试直接操作DOM显示模态框
    try {
      const modalElement = document.getElementById('infoModal');
      
      // 清除可能存在的模态框背景
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      
      // 确保移除aria-hidden属性
      modalElement.removeAttribute('aria-hidden');
      
      // 设置模态框为显示状态
      modalElement.style.display = 'block';
      modalElement.classList.add('show');
      modalElement.setAttribute('aria-modal', 'true');
      
      // 添加背景遮罩
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade show';
      document.body.appendChild(backdrop);
      
      // 设置body样式
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '15px';
      
      // 添加关闭事件
      const closeButtons = modalElement.querySelectorAll('[data-bs-dismiss="modal"]');
      closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
          modalElement.style.display = 'none';
          modalElement.classList.remove('show');
          modalElement.removeAttribute('aria-modal');
          modalElement.removeAttribute('aria-hidden');
          
          // 移除背景
          document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        });
      });
    } catch (innerError) {
      console.error('直接操作DOM显示模态框失败:', innerError);
      // 最后的备选方案，使用alert
      alert(message);
    }
  }
}

function showErrorModal(message) {
  console.log('尝试显示错误模态框:', message); // 调试日志
  
  // 检查DOM是否已加载
  if (!document.getElementById('errorModalText')) {
    console.warn('模态框元素不存在，使用alert代替');
    alert('错误: ' + message);
    return;
  }
  
  // 设置模态框内容
  const errorModalText = document.getElementById('errorModalText');
  errorModalText.textContent = message;
  
  try {
    // 尝试使用Bootstrap的模态框
    if (typeof bootstrap === 'undefined') {
      throw new Error('Bootstrap未加载');
    }
    
    const modalElement = document.getElementById('errorModal');
    
    // 确保移除模态框上的aria-hidden属性
    modalElement.removeAttribute('aria-hidden');
    
    // 创建新的模态框实例
    const errorModal = new bootstrap.Modal(modalElement, {
      backdrop: true,
      keyboard: true,
      focus: true
    });
    
    // 监听模态框隐藏事件，以确保aria-hidden属性被正确处理
    modalElement.addEventListener('hidden.bs.modal', function() {
      // 在模态框隐藏后移除aria-hidden属性
      setTimeout(() => {
        modalElement.removeAttribute('aria-hidden');
      }, 50);
    }, { once: false });
    
    errorModal.show();
  } catch (error) {
    console.error('Bootstrap模态框显示失败，使用备用方法:', error);
    
    // 尝试直接操作DOM显示模态框
    try {
      const modalElement = document.getElementById('errorModal');
      
      // 清除可能存在的模态框背景
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.body.classList.remove('modal-open');
      
      // 确保移除aria-hidden属性
      modalElement.removeAttribute('aria-hidden');
      
      // 设置模态框为显示状态
      modalElement.style.display = 'block';
      modalElement.classList.add('show');
      modalElement.setAttribute('aria-modal', 'true');
      
      // 添加背景遮罩
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade show';
      document.body.appendChild(backdrop);
      
      // 设置body样式
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '15px';
      
      // 添加关闭事件
      const closeButtons = modalElement.querySelectorAll('[data-bs-dismiss="modal"]');
      closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
          modalElement.style.display = 'none';
          modalElement.classList.remove('show');
          modalElement.removeAttribute('aria-modal');
          modalElement.removeAttribute('aria-hidden');
          
          // 移除背景
          document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
          document.body.classList.remove('modal-open');
          document.body.style.overflow = '';
          document.body.style.paddingRight = '';
        });
      });
    } catch (innerError) {
      console.error('直接操作DOM显示模态框失败:', innerError);
      // 最后的备选方案，使用alert
      alert('错误: ' + message);
    }
  }
}

// 文档加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // DOM元素
  const subscriptionsContainer = document.getElementById('subscriptions-container');
  const statsContainer = document.getElementById('stats-container');
  const searchInput = document.getElementById('search-input');
  const typeFilter = document.getElementById('type-filter');
  const refreshBtn = document.getElementById('refresh-btn');
  const nextRefreshTime = document.getElementById('next-refresh-time');
  const normalViewBtn = document.getElementById('normal-view');
  const detailedViewBtn = document.getElementById('detailed-view');
  const configToggle = document.querySelector('.config-toggle');
  const updateIntervalEl = document.getElementById('update-interval');
  const maxArticlesEl = document.getElementById('max-articles');
  const lastUpdatedEl = document.getElementById('last-updated');
  const siteListEl = document.getElementById('site-list');
  
  // 检查是否在GitHub Pages环境
  const isGitHubPages = window.location.hostname.includes('github.io');
  if (isGitHubPages) {
    console.log('检测到GitHub Pages环境');
    // 修改刷新按钮的点击行为，在GitHub Pages环境中显示静态提示
    refreshBtn.addEventListener('click', function(e) {
      e.preventDefault(); // 防止默认行为
      e.stopPropagation(); // 防止事件冒泡
      
      console.log('GitHub Pages环境，显示静态提示');
      showInfoModal('GitHub Pages是静态部署环境，无法实时刷新数据。数据会在每天的定时构建中自动更新。');
      return false;
    });
  } else {
    // 非GitHub Pages环境的刷新按钮事件
    refreshBtn.addEventListener('click', function() {
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 刷新中...`;
      
      try {
        // 首先尝试通过fetch获取数据（适用于服务器环境）
        if (window.location.protocol.includes('http')) {
          // 正常服务器环境
          fetch(`${API_BASE_URL}/api/refresh/index.json`, {
            method: 'GET'
          })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                loadSubscriptions();
                loadConfig(); // 同时刷新配置信息
                showInfoModal('数据刷新成功！'); // 添加成功提示
              } else {
                showErrorModal('刷新失败: ' + (data.error || data.message || '未知错误'));
              }
            })
            .catch(error => {
              console.warn('通过fetch请求刷新失败，尝试使用内联数据:', error);
              // 如果fetch失败，使用内联响应
              if (typeof REFRESH_RESPONSE !== 'undefined') {
                showInfoModal(REFRESH_RESPONSE.message);
              } else {
                showErrorModal('刷新请求失败: ' + (error.message || '未知错误'));
              }
            })
            .finally(() => {
              refreshBtn.disabled = false;
              refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> 刷新数据';
            });
        } else {
          // 本地文件系统环境，使用内联响应
          console.log('检测到本地文件系统环境，使用内联刷新响应');
          if (typeof REFRESH_RESPONSE !== 'undefined') {
            setTimeout(() => {
              showInfoModal(REFRESH_RESPONSE.message);
              refreshBtn.disabled = false;
              refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> 刷新数据';
              
              // 如果REFRESH_RESPONSE表示成功，刷新数据显示
              if (REFRESH_RESPONSE.success) {
                loadSubscriptions();
                loadConfig();
              }
            }, 1000);
          } else {
            showErrorModal('内联数据不可用，请使用HTTP服务器或重新生成静态文件');
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> 刷新数据';
          }
        }
      } catch (error) {
        console.error('刷新请求失败:', error);
        showErrorModal('刷新请求失败: ' + (error.message || '未知错误'));
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> 刷新数据';
      }
    });
  }
  
  // 初始化页面
  loadConfig();
  loadSubscriptions();
  
  // 初始化配置区域的初始状态
  document.getElementById('configCollapse').style.display = 'none';
  
  // 配置区域折叠/展开 - 修复Bootstrap的collapse功能
  configToggle.addEventListener('click', function() {
    const configCollapse = document.getElementById('configCollapse');
    const icon = this.querySelector('.toggle-icon');
    
    // 使用原生方法代替Bootstrap的collapse
    if (configCollapse.style.display === 'block') {
      configCollapse.style.display = 'none';
      icon.textContent = '▼';
    } else {
      configCollapse.style.display = 'block';
      icon.textContent = '▲';
    }
  });
  
  // 切换视图
  normalViewBtn.addEventListener('click', function() {
    currentView = 'normal';
    normalViewBtn.classList.add('active');
    detailedViewBtn.classList.remove('active');
    renderSubscriptions();
  });
  
  detailedViewBtn.addEventListener('click', function() {
    currentView = 'detailed';
    detailedViewBtn.classList.add('active');
    normalViewBtn.classList.remove('active');
    renderSubscriptions();
  });
  
  // 添加事件监听器
  searchInput.addEventListener('input', renderSubscriptions);
  typeFilter.addEventListener('change', renderSubscriptions);
  
  // 更新下一次刷新时间的显示 - 基于GitHub Actions固定调度时间
  function updateNextRefreshTime() {
    const nextRefreshTimeEl = document.getElementById('next-refresh-time');
    
    // 获取当前时间（客户端时间）
    const now = new Date();
    
    // 计算今天的北京时间00:30（GitHub Actions构建时间）
    const todayBuildTime = new Date(now);
    todayBuildTime.setHours(0);
    todayBuildTime.setMinutes(30);
    todayBuildTime.setSeconds(0);
    todayBuildTime.setMilliseconds(0);
    
    // 如果当前时间已经过了今天的构建时间，则下次构建时间为明天同一时间
    const nextBuildTime = new Date(todayBuildTime);
    if (now > todayBuildTime) {
      nextBuildTime.setDate(nextBuildTime.getDate() + 1);
    }
    
    // 计算距离下次更新的时间（以小时和分钟表示）
    const diffMs = nextBuildTime - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // 格式化时间显示
    const formattedTime = nextBuildTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    const timeDisplay = diffHours > 0 
      ? `${diffHours}小时${diffMinutes}分钟后` 
      : `${diffMinutes}分钟后`;
    
    // 增加针对等待时间的视觉提示
    let timerClass = 'next-refresh-normal';
    let timerIcon = 'bi-clock';
    
    if (diffHours === 0) {
      if (diffMinutes <= 10) {
        timerClass = 'next-refresh-imminent';
        timerIcon = 'bi-clock-fill';
      } else if (diffMinutes <= 30) {
        timerClass = 'next-refresh-soon';
        timerIcon = 'bi-clock-history';
      }
    }
    
    // 重置元素类名，然后添加基础类和状态类
    nextRefreshTimeEl.className = 'next-refresh';
    nextRefreshTimeEl.classList.add(timerClass);
    nextRefreshTimeEl.innerHTML = `<i class="bi ${timerIcon}"></i> 下次更新: <strong>${formattedTime}</strong> (约${timeDisplay})`;
    
    // 重置延迟类，防止之前的状态残留
    nextRefreshTimeEl.classList.remove('next-refresh-delayed');
    
    // 获取上次更新时间，并添加警告
    if (configData && configData.settings && configData.settings.lastUpdated) {
      const lastUpdated = new Date(configData.settings.lastUpdated);
      const hoursSinceUpdate = Math.floor((now - lastUpdated) / (1000 * 60 * 60));
      
      if (hoursSinceUpdate >= 48) {
        nextRefreshTimeEl.classList.add('next-refresh-delayed');
        nextRefreshTimeEl.title = `上次更新已超过${hoursSinceUpdate}小时，可能存在同步问题`;
      } else if (hoursSinceUpdate >= 24) {
        nextRefreshTimeEl.title = `上次更新在${hoursSinceUpdate}小时前`;
      } else {
        nextRefreshTimeEl.title = '';
      }
    }
  }
  
  // 开启定时更新时间显示
  updateNextRefreshTime();
  setInterval(updateNextRefreshTime, 30000); // 每30秒更新一次显示
});

// 加载配置信息
function loadConfig() {
  try {
    // 检查是否在GitHub Pages环境
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    // 本地文件系统环境或GitHub Pages，直接使用内联数据
    if (!window.location.protocol.includes('http') || isGitHubPages) {
      console.log('使用内联配置数据');
      if (typeof INLINE_CONFIG !== 'undefined') {
        processConfigData(INLINE_CONFIG);
      } else {
        // 创建默认配置数据
        console.warn('内联配置数据不可用，创建默认配置数据');
        const defaultConfig = {
          sites: [],
          settings: {
            updateInterval: 720,
            maxArticlesPerSite: 10,
            lastUpdated: new Date().toISOString()
          }
        };
        processConfigData(defaultConfig);
        showInfoModal('内联数据文件缺失，已创建默认配置。请运行 node generate-static.js 生成完整静态数据。');
      }
      return;
    }
    
    // 正常HTTP服务器环境，使用fetch
    fetch(`${API_BASE_URL}/api/config.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`服务器响应错误: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        processConfigData(data);
      })
      .catch(error => {
        console.warn('通过fetch加载配置失败，尝试使用内联数据:', error);
        // 如果fetch失败，尝试使用内联数据
        if (typeof INLINE_CONFIG !== 'undefined') {
          processConfigData(INLINE_CONFIG);
        } else {
          // 创建默认配置数据
          console.warn('内联配置数据不可用，创建默认配置数据');
          const defaultConfig = {
            sites: [],
            settings: {
              updateInterval: 720,
              maxArticlesPerSite: 10,
              lastUpdated: new Date().toISOString()
            }
          };
          processConfigData(defaultConfig);
          showInfoModal('无法连接到服务器且内联数据不可用，已创建默认配置。请确保服务器正在运行或执行 node generate-static.js 生成静态数据。');
        }
      });
  } catch (error) {
    handleConfigError(error);
  }
}

// 处理配置数据
function processConfigData(data) {
  configData = data;
  
  // 更新配置显示
  // 将分钟转换为小时显示，并格式化为整数
  const updateIntervalHours = Math.floor(data.settings.updateInterval / 60);
  document.getElementById('update-interval').textContent = `${updateIntervalHours} 小时`;
  document.getElementById('max-articles').textContent = `${data.sites.length} 站点`;
  
  // 处理最后更新时间
  const lastUpdatedEl = document.getElementById('last-updated');
  const lastUpdated = new Date(data.settings.lastUpdated);
  const now = new Date();
  const hoursSinceUpdate = Math.floor((now - lastUpdated) / (1000 * 60 * 60));
  
  // 设置时间文本
  lastUpdatedEl.textContent = lastUpdated.toLocaleString();
  
  // 根据更新时间设置样式
  if (hoursSinceUpdate >= 24) {
    // 超过24小时显示为严重过期
    lastUpdatedEl.classList.add('outdated');
    lastUpdatedEl.title = `数据已过期 ${hoursSinceUpdate} 小时`;
  } else if (hoursSinceUpdate >= 12) {
    // 超过12小时仍使用警告色，但添加提示
    lastUpdatedEl.title = `上次更新在 ${hoursSinceUpdate} 小时前`;
  } else {
    // 12小时内，正常警告色
    lastUpdatedEl.title = `上次更新在 ${hoursSinceUpdate} 小时前`;
  }
  
  // 更新站点列表
  let siteListHTML = '';
  if (data.sites && data.sites.length > 0) {
    data.sites.forEach(site => {
      siteListHTML += `
        <div class="site-item">
          <div class="site-url" title="${site.description || site.url}">${site.url}</div>
          <div class="site-status ${site.enabled ? 'site-enabled' : 'site-disabled'}">
            <i class="bi ${site.enabled ? 'bi-check-circle' : 'bi-x-circle'}"></i> ${site.enabled ? '已启用' : '已禁用'}
          </div>
        </div>
      `;
    });
  } else {
    siteListHTML = '<div class="text-center">没有配置站点</div>';
  }
  document.getElementById('site-list').innerHTML = siteListHTML;
}

// 处理配置加载错误
function handleConfigError(error) {
  console.error('加载配置失败:', error);
  document.getElementById('update-interval').textContent = '加载失败';
  document.getElementById('max-articles').textContent = '加载失败';
  document.getElementById('last-updated').textContent = '加载失败';
  document.getElementById('site-list').innerHTML = '<div class="text-center text-danger">加载站点列表失败</div>';
}

// 加载订阅数据
function loadSubscriptions() {
  const subscriptionsContainer = document.getElementById('subscriptions-container');
  subscriptionsContainer.innerHTML = `
    <div class="loading">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">加载中...</span>
      </div>
      <div class="mt-3">加载订阅数据中...</div>
    </div>
  `;
  
  try {
    // 检查是否在GitHub Pages环境
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    // 本地文件系统环境或GitHub Pages，直接使用内联数据
    if (!window.location.protocol.includes('http') || isGitHubPages) {
      console.log('使用内联订阅数据');
      if (typeof INLINE_SUBSCRIPTIONS !== 'undefined' && typeof INLINE_SITES !== 'undefined') {
        setTimeout(() => {
          allSubscriptions = INLINE_SUBSCRIPTIONS;
          updateStats(INLINE_SUBSCRIPTIONS);
          detailedData = INLINE_SITES;
          renderSubscriptions();
        }, 500); // 延迟一下，让用户看到加载动画
      } else {
        // 创建默认示例数据
        console.warn('内联订阅数据不可用，创建默认示例数据');
        const exampleSite = {
          url: "https://example.com",
          siteName: "示例站点",
          scrapedAt: new Date().toISOString(),
          subscriptionCount: 2,
          subscriptions: [
            {
              type: "Clash",
              name: "示例订阅1",
              url: "https://example.com/sub1"
            },
            {
              type: "V2ray",
              name: "示例订阅2",
              url: "https://example.com/sub2"
            }
          ]
        };
        
        const exampleSiteDetailed = {
          url: "https://example.com",
          siteName: "示例站点",
          scrapedAt: new Date().toISOString(),
          totalSubscriptions: 2,
          articles: [
            {
              title: "示例文章",
              url: "https://example.com/article1",
              publishedAt: new Date().toISOString(),
              subscriptions: [
                {
                  type: "Clash",
                  name: "示例订阅1",
                  url: "https://example.com/sub1"
                },
                {
                  type: "V2ray",
                  name: "示例订阅2",
                  url: "https://example.com/sub2"
                }
              ]
            }
          ]
        };
        
        setTimeout(() => {
          allSubscriptions = { "example": exampleSite };
          updateStats(allSubscriptions);
          detailedData = { "example": exampleSiteDetailed };
          renderSubscriptions();
        }, 500);
      }
      return;
    }
    
    // 正常HTTP服务器环境，使用fetch
    fetch(`${API_BASE_URL}/api/subscriptions.json`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`服务器响应错误: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        allSubscriptions = data;
        updateStats(data);
        
        // 获取详细视图数据
        return fetch(`${API_BASE_URL}/api/sites.json`);
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`服务器响应错误: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        detailedData = data;
        renderSubscriptions();
      })
      .catch(error => {
        console.warn('通过fetch加载数据失败，尝试使用内联数据:', error);
        // 如果fetch失败，尝试使用内联数据
        if (typeof INLINE_SUBSCRIPTIONS !== 'undefined' && typeof INLINE_SITES !== 'undefined') {
          allSubscriptions = INLINE_SUBSCRIPTIONS;
          updateStats(INLINE_SUBSCRIPTIONS);
          detailedData = INLINE_SITES;
          renderSubscriptions();
        } else {
          // 创建默认示例数据
          console.warn('内联订阅数据不可用，创建默认示例数据');
          const exampleSite = {
            url: "https://example.com",
            siteName: "示例站点 (无法连接到服务器)",
            scrapedAt: new Date().toISOString(),
            subscriptionCount: 2,
            subscriptions: [
              {
                type: "Clash",
                name: "示例订阅1",
                url: "https://example.com/sub1"
              },
              {
                type: "V2ray",
                name: "示例订阅2",
                url: "https://example.com/sub2"
              }
            ]
          };
          
          const exampleSiteDetailed = {
            url: "https://example.com",
            siteName: "示例站点 (无法连接到服务器)",
            scrapedAt: new Date().toISOString(),
            totalSubscriptions: 2,
            articles: [
              {
                title: "示例文章",
                url: "https://example.com/article1",
                publishedAt: new Date().toISOString(),
                subscriptions: [
                  {
                    type: "Clash",
                    name: "示例订阅1",
                    url: "https://example.com/sub1"
                  },
                  {
                    type: "V2ray",
                    name: "示例订阅2",
                    url: "https://example.com/sub2"
                  }
                ]
              }
            ]
          };
          
          allSubscriptions = { "example": exampleSite };
          updateStats(allSubscriptions);
          detailedData = { "example": exampleSiteDetailed };
          renderSubscriptions();
          showInfoModal('无法连接到服务器且内联数据不可用，显示示例数据。请确保服务器正在运行或执行 node generate-static.js 生成静态数据。');
        }
      });
  } catch (error) {
    handleSubscriptionsError(error);
  }
}

// 处理订阅加载错误
function handleSubscriptionsError(error) {
  console.error('加载订阅数据失败:', error);
  const subscriptionsContainer = document.getElementById('subscriptions-container');
  subscriptionsContainer.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger">
        加载订阅数据失败: ${error.message || '未知错误'}
      </div>
    </div>
  `;
}

// 更新统计信息
function updateStats(data) {
  const statsContainer = document.getElementById('stats-container');
  let totalSubscriptions = 0;
  let totalSites = Object.keys(data).length;
  let typeCounts = {
    'Clash': 0,
    'V2ray': 0,
    'Sing-Box': 0,
    'Shadowrocket': 0,
    'Quantumult': 0,
    '通用': 0
  };
  
  Object.values(data).forEach(site => {
    totalSubscriptions += site.subscriptionCount;
    site.subscriptions.forEach(sub => {
      if (typeCounts[sub.type] !== undefined) {
        typeCounts[sub.type]++;
      } else {
        typeCounts['通用']++;
      }
    });
  });
  
  statsContainer.innerHTML = `
    <div>总共 <strong>${totalSites}</strong> 个站点，<strong>${totalSubscriptions}</strong> 个订阅链接</div>
    <div class="mt-1">
      ${Object.entries(typeCounts)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => 
          `<span class="badge bg-${getTypeColor(type)} me-2">${type}: ${count}</span>`
        ).join('')}
    </div>
  `;
}

// 获取订阅类型的颜色
function getTypeColor(type) {
  const colorMap = {
    'Clash': 'primary',
    'V2ray': 'success',
    'Sing-Box': 'info',
    'Shadowrocket': 'danger',
    'Quantumult': 'warning',
    '通用': 'secondary'
  };
  return colorMap[type] || 'secondary';
}

// 获取订阅类型的图标
function getTypeIcon(type) {
  const iconMap = {
    'Clash': 'bi bi-shield-check',
    'V2ray': 'bi bi-hdd-network',
    'Sing-Box': 'bi bi-box',
    'Shadowrocket': 'bi bi-rocket',
    'Quantumult': 'bi bi-diagram-3',
    '通用': 'bi bi-link-45deg'
  };
  return iconMap[type] || 'bi bi-link-45deg';
}

// 渲染订阅链接 - 根据当前视图选择渲染函数
function renderSubscriptions() {
  if (currentView === 'detailed') {
    renderDetailedView();
  } else {
    renderNormalView();
  }
  
  // 添加复制功能
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const url = this.getAttribute('data-url');
      navigator.clipboard.writeText(url)
        .then(() => {
          const originalText = this.textContent;
          this.textContent = '已复制';
          this.classList.add('btn-success');
          this.classList.remove('btn-outline-primary');
          
          setTimeout(() => {
            this.textContent = originalText;
            this.classList.remove('btn-success');
            this.classList.add('btn-outline-primary');
          }, 1500);
        })
        .catch(err => {
          console.error('复制失败:', err);
          showErrorModal('复制失败，请手动复制');
        });
    });
  });
}

// 渲染订阅链接 - 简洁视图
function renderNormalView() {
  const subscriptionsContainer = document.getElementById('subscriptions-container');
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const selectedType = document.getElementById('type-filter').value;
  
  let html = '';
  let filteredSites = 0;
  
  for (const [siteName, siteData] of Object.entries(allSubscriptions)) {
    let filteredSubscriptions = siteData.subscriptions;
    
    // 根据类型过滤
    if (selectedType !== 'all') {
      filteredSubscriptions = siteData.subscriptions.filter(sub => sub.type === selectedType);
    }
    
    // 根据搜索词过滤
    if (searchTerm) {
      filteredSubscriptions = filteredSubscriptions.filter(sub => 
        sub.url.toLowerCase().includes(searchTerm) || 
        (sub.description && sub.description.toLowerCase().includes(searchTerm))
      );
    }
    
    if (filteredSubscriptions.length === 0) continue;
    
    filteredSites++;
    
    html += `
      <div class="col-12 mb-4">
        <div class="card site-card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0"><i class="bi bi-globe me-2"></i>${siteData.siteName}</h5>
            <span class="badge bg-light text-dark"><i class="bi bi-link-45deg me-1"></i>${filteredSubscriptions.length} 个订阅</span>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <small class="timestamp"><i class="bi bi-clock-history me-1"></i>抓取时间: ${new Date(siteData.scrapedAt).toLocaleString()}</small>
              <a href="${siteData.url}" target="_blank" class="ms-2 small"><i class="bi bi-box-arrow-up-right me-1"></i>访问来源</a>
            </div>
            <div class="subscription-list">
    `;
    
    filteredSubscriptions.forEach(subscription => {
      const typeColor = getTypeColor(subscription.type);
      const typeIcon = getTypeIcon(subscription.type);
      
      html += `
        <div class="subscription-item-simple">
          <span class="sub-type">
            <span class="badge bg-${typeColor}"><i class="${typeIcon} me-1"></i>${subscription.type}</span>
          </span>
          <span class="sub-url">${subscription.url}</span>
          <span class="sub-actions">
            <a href="${subscription.url}" target="_blank" class="btn btn-sm btn-outline-success me-1"><i class="bi bi-box-arrow-up-right"></i></a>
            <button class="btn btn-sm btn-outline-primary copy-btn" data-url="${subscription.url}"><i class="bi bi-clipboard"></i></button>
          </span>
        </div>
      `;
    });
    
    html += `
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  if (filteredSites === 0) {
    html = `
      <div class="col-12">
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>没有符合条件的订阅链接
        </div>
      </div>
    `;
  }
  
  subscriptionsContainer.innerHTML = html;
}

// 渲染订阅链接 - 详细视图（按文章分组）
function renderDetailedView() {
  const subscriptionsContainer = document.getElementById('subscriptions-container');
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const selectedType = document.getElementById('type-filter').value;
  
  let html = '';
  let filteredSites = 0;
  
  for (const [siteName, siteData] of Object.entries(detailedData)) {
    if (!siteData.articles || siteData.articles.length === 0) continue;
    
    // 过滤文章
    const filteredArticles = siteData.articles.filter(article => {
      if (!article.subscriptions || article.subscriptions.length === 0) return false;
      
      let matchingSubscriptions = article.subscriptions;
      
      // 根据类型过滤
      if (selectedType !== 'all') {
        matchingSubscriptions = article.subscriptions.filter(sub => sub.type === selectedType);
      }
      
      // 根据搜索词过滤
      if (searchTerm) {
        matchingSubscriptions = matchingSubscriptions.filter(sub => 
          sub.url.toLowerCase().includes(searchTerm) || 
          (sub.description && sub.description.toLowerCase().includes(searchTerm))
        );
      }
      
      // 保存过滤后的订阅到一个临时属性
      article.filteredSubscriptions = matchingSubscriptions;
      
      return matchingSubscriptions.length > 0;
    });
    
    if (filteredArticles.length === 0) continue;
    
    filteredSites++;
    
    html += `
      <div class="col-12 mb-4">
        <div class="card site-card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0"><i class="bi bi-globe me-2"></i>${siteData.siteName}</h5>
            <span class="badge bg-light text-dark"><i class="bi bi-link-45deg me-1"></i>${filteredArticles.reduce((sum, article) => sum + article.filteredSubscriptions.length, 0)} 个订阅</span>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <small class="timestamp"><i class="bi bi-clock-history me-1"></i>抓取时间: ${new Date(siteData.scrapedAt).toLocaleString()}</small>
              <a href="${siteData.url}" target="_blank" class="ms-2 small"><i class="bi bi-box-arrow-up-right me-1"></i>访问来源</a>
            </div>
    `;
    
    // 渲染每篇文章
    filteredArticles.forEach(article => {
      html += `
        <div class="article-card mb-3">
          <div class="article-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0"><i class="bi bi-file-text me-2"></i>${article.title}</h6>
            <span class="badge bg-secondary"><i class="bi bi-link-45deg me-1"></i>${article.filteredSubscriptions.length} 个订阅</span>
          </div>
          <div class="card-body">
            <div class="mb-2">
              <small class="timestamp"><i class="bi bi-link me-1"></i><a href="${article.url}" target="_blank">${article.url}</a></small>
            </div>
            <div class="detailed-list">
      `;
      
      article.filteredSubscriptions.forEach(subscription => {
        const typeColor = getTypeColor(subscription.type);
        const typeIcon = getTypeIcon(subscription.type);
        
        html += `
          <div class="detailed-item">
            <div class="detailed-item-header">
              <span class="badge bg-${typeColor}"><i class="${typeIcon} me-1"></i>${subscription.type}</span>
            </div>
            <div class="detailed-item-body">
              <div class="detailed-item-url"><i class="bi bi-link me-1"></i>${subscription.url}</div>
              <div class="detailed-item-actions">
                <a href="${subscription.url}" target="_blank" class="btn btn-sm btn-outline-success me-1"><i class="bi bi-box-arrow-up-right me-1"></i>访问</a>
                <button class="btn btn-sm btn-outline-primary copy-btn" data-url="${subscription.url}"><i class="bi bi-clipboard me-1"></i>复制</button>
              </div>
            </div>
          </div>
        `;
      });
      
      html += `
            </div>
          </div>
        </div>
      `;
    });
    
    html += `
          </div>
        </div>
      </div>
    `;
  }
  
  if (filteredSites === 0) {
    html = `
      <div class="col-12">
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>没有符合条件的订阅链接
        </div>
      </div>
    `;
  }
  
  subscriptionsContainer.innerHTML = html;
} 