// 全局变量
let allSubscriptions = {};
let detailedData = {};
let configData = {};
let currentView = 'normal'; // 'normal' or 'detailed'

// API基础URL - 从环境配置中获取
const API_BASE_URL = ENV_CONFIG.API_BASE_URL;

// 自定义模态框显示函数
function showInfoModal(message) {
  const infoModalText = document.getElementById('infoModalText');
  infoModalText.textContent = message;
  const infoModal = new bootstrap.Modal(document.getElementById('infoModal'));
  infoModal.show();
}

function showErrorModal(message) {
  const errorModalText = document.getElementById('errorModalText');
  errorModalText.textContent = message;
  const errorModal = new bootstrap.Modal(document.getElementById('errorModal'));
  errorModal.show();
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
  
  // 手动刷新按钮事件
  refreshBtn.addEventListener('click', function() {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 刷新中...`;
    
    try {
      // 首先尝试通过fetch获取数据（适用于服务器环境）
      if (window.location.protocol.includes('http')) {
        fetch(`${API_BASE_URL}/api/refresh/index.json`, {
          method: 'GET'
        })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              loadSubscriptions();
              loadConfig(); // 同时刷新配置信息
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
          }, 500);
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
    // 首先尝试通过fetch获取数据（适用于服务器环境）
    if (window.location.protocol.includes('http')) {
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
            handleConfigError(error);
          }
        });
    } else {
      // 本地文件系统环境，直接使用内联数据
      console.log('检测到本地文件系统环境，使用内联数据');
      if (typeof INLINE_CONFIG !== 'undefined') {
        processConfigData(INLINE_CONFIG);
      } else {
        throw new Error('内联数据不可用，请使用HTTP服务器或重新生成静态文件');
      }
    }
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
    // 首先尝试通过fetch获取数据（适用于服务器环境）
    if (window.location.protocol.includes('http')) {
      // 获取简洁视图数据
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
            handleSubscriptionsError(error);
          }
        });
    } else {
      // 本地文件系统环境，直接使用内联数据
      console.log('检测到本地文件系统环境，使用内联数据');
      if (typeof INLINE_SUBSCRIPTIONS !== 'undefined' && typeof INLINE_SITES !== 'undefined') {
        allSubscriptions = INLINE_SUBSCRIPTIONS;
        updateStats(INLINE_SUBSCRIPTIONS);
        detailedData = INLINE_SITES;
        renderSubscriptions();
      } else {
        throw new Error('内联数据不可用，请使用HTTP服务器或重新生成静态文件');
      }
    }
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