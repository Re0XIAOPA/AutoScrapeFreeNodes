// 全局变量
let allSubscriptions = {};
let detailedData = {};
let configData = {};
let currentView = 'normal'; // 'normal' or 'detailed'

// API基础URL - 从环境配置中获取
const API_BASE_URL = ENV_CONFIG.API_BASE_URL;
const IS_STATIC_MODE = ENV_CONFIG.isStaticMode || false;

// 获取基础URL路径（适用于GitHub Pages）
function getBasePath() {
  if (!IS_STATIC_MODE) return '';
  
  // 获取当前页面的路径
  const fullPath = window.location.pathname;
  // 去除文件名，只保留目录
  const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/') + 1);
  return dirPath;
}

// 构建完整的资源URL
function buildResourceUrl(path) {
  if (IS_STATIC_MODE) {
    const basePath = getBasePath();
    // 如果path已经以/开头，则删除开头的/
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${basePath}${cleanPath}`;
  }
  return `${API_BASE_URL}/${path}`;
}

// 计算下次自动更新时间（北京时间00:30）
function getNextUpdateTime() {
  const now = new Date();
  const nextUpdate = new Date();
  
  // 设置为明天的00:30（北京时间）
  nextUpdate.setDate(now.getDate() + 1);
  nextUpdate.setHours(0);
  nextUpdate.setMinutes(30);
  nextUpdate.setSeconds(0);
  
  // 如果当前时间已经超过了今天的更新时间，那么下次更新时间是明天
  // 如果当前时间还没到今天的更新时间，那么下次更新时间是今天
  if (now.getHours() < 0 || (now.getHours() === 0 && now.getMinutes() < 30)) {
    nextUpdate.setDate(now.getDate()); // 设置为今天
  }
  
  // 计算时间差（分钟）
  const diffMs = nextUpdate - now;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  // 转换为更人性化的描述
  let timeDesc = '';
  if (diffMinutes < 60) {
    timeDesc = `${diffMinutes}分钟后`;
  } else if (diffMinutes < 24 * 60) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    timeDesc = `${hours}小时${mins > 0 ? mins + '分钟' : ''}后`;
  } else {
    const days = Math.floor(diffMinutes / (24 * 60));
    const hours = Math.floor((diffMinutes % (24 * 60)) / 60);
    timeDesc = `${days}天${hours > 0 ? hours + '小时' : ''}后`;
  }
  
  return {
    time: nextUpdate,
    formattedTime: nextUpdate.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
    description: timeDesc
  };
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
  
  // 如果是静态模式，禁用刷新按钮
  if (IS_STATIC_MODE) {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="bi bi-info-circle me-1"></i> 静态模式';
    refreshBtn.title = '静态部署模式下不支持实时刷新';
    
    // 更新下次刷新时间显示
    const buildTime = ENV_CONFIG.buildTime ? new Date(ENV_CONFIG.buildTime) : new Date();
    const nextUpdate = getNextUpdateTime();
    
    nextRefreshTime.innerHTML = `
      <i class="bi bi-info-circle"></i> 静态构建于: <strong>${buildTime.toLocaleString()}</strong>
      <span class="ms-2 badge bg-info">下次更新: ${nextUpdate.formattedTime} (${nextUpdate.description})</span>
    `;
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
  
  // 手动刷新按钮事件
  refreshBtn.addEventListener('click', function() {
    // 静态模式下不执行刷新操作
    if (IS_STATIC_MODE) return;
    
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 刷新中...`;
    
    fetch(`${API_BASE_URL}/api/refresh`, {
      method: 'POST'
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          loadSubscriptions();
          loadConfig(); // 同时刷新配置信息
        } else {
          alert('刷新失败: ' + (data.error || '未知错误'));
        }
      })
      .catch(error => {
        console.error('刷新请求失败:', error);
        alert('刷新请求失败，请检查控制台');
      })
      .finally(() => {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i> 刷新数据';
      });
  });
  
  // 更新下一次刷新时间的显示 - 精确计算15分钟间隔的更新时间
  function updateNextRefreshTime() {
    // 静态模式下不更新刷新时间
    if (IS_STATIC_MODE) return;
    
    const nextRefreshTimeEl = document.getElementById('next-refresh-time');
    
    if (!configData.settings || !configData.settings.updateInterval) {
      nextRefreshTimeEl.innerHTML = '<i class="bi bi-clock"></i> 下次更新: 计算中...';
      return;
    }
    
    const interval = parseInt(configData.settings.updateInterval) || 15;
    const lastUpdated = new Date(configData.settings.lastUpdated);
    const now = new Date();
    
    // 计算上次更新后的完整周期数
    const minutesSinceUpdate = Math.floor((now - lastUpdated) / (1000 * 60));
    const cycles = Math.floor(minutesSinceUpdate / interval);
    
    // 下一个更新时间 = 上次更新时间 + (周期数+1) * 更新间隔
    const nextRefresh = new Date(lastUpdated);
    nextRefresh.setMinutes(lastUpdated.getMinutes() + ((cycles + 1) * interval));
    
    // 计算剩余分钟
    const timeLeft = Math.max(1, Math.ceil((nextRefresh - now) / (1000 * 60)));
    
    // 更新显示
    const formattedTime = nextRefresh.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    nextRefreshTimeEl.innerHTML = `<i class="bi bi-clock"></i> 下次更新: <strong>${formattedTime}</strong> (约${timeLeft}分钟后)`;
  }
  
  // 开启定时更新时间显示
  updateNextRefreshTime();
  if (!IS_STATIC_MODE) {
    setInterval(updateNextRefreshTime, 30000); // 每30秒更新一次显示
  }
});

// 加载配置信息
function loadConfig() {
  let url;
  
  // 如果是静态模式，直接从数据目录读取配置文件
  if (IS_STATIC_MODE) {
    url = buildResourceUrl(`${API_BASE_URL}/config.json`);
  } else {
    url = `${API_BASE_URL}/api/config`;
  }
  
  console.log('加载配置文件:', url);
  
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`数据加载失败，服务器返回: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      configData = data;
      
      // 更新配置显示
      document.getElementById('update-interval').textContent = `${data.settings.updateInterval} 分钟`;
      document.getElementById('max-articles').textContent = `${data.settings.maxArticlesPerSite} 篇`;
      document.getElementById('last-updated').textContent = new Date(data.settings.lastUpdated).toLocaleString();
      
      // 更新站点列表
      let siteListHTML = '';
      if (data.sites && data.sites.length > 0) {
        data.sites.forEach(site => {
          siteListHTML += `
            <div class="site-item">
              <div class="site-url" title="${site.description || site.url}">${site.url}</div>
              <div class="site-status ${site.enabled ? 'site-enabled' : 'site-disabled'}">
                ${site.enabled ? '已启用' : '已禁用'}
              </div>
            </div>
          `;
        });
      } else {
        siteListHTML = '<div class="text-center">没有配置站点</div>';
      }
      document.getElementById('site-list').innerHTML = siteListHTML;
    })
    .catch(error => {
      console.error('加载配置失败:', error);
      document.getElementById('update-interval').textContent = '加载失败';
      document.getElementById('max-articles').textContent = '加载失败';
      document.getElementById('last-updated').textContent = '加载失败';
      document.getElementById('site-list').innerHTML = `<div class="text-center text-danger">加载站点列表失败: ${error.message}</div>`;
    });
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
  
  // 获取简洁视图数据
  let subscriptionsUrl = `${API_BASE_URL}/api/subscriptions`;
  let sitesUrl = `${API_BASE_URL}/api/sites`;
  
  // 如果是静态模式，从JSON文件中读取数据
  if (IS_STATIC_MODE) {
    // 列出所有站点文件
    
    // 首先获取目录列表（在静态模式下，无法获取目录列表，需要通过config获取站点列表）
    const configUrl = buildResourceUrl(`${API_BASE_URL}/config.json`);
    console.log('加载配置文件(订阅):', configUrl);
    
    fetch(configUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`数据加载失败，服务器返回: ${response.status}`);
        }
        return response.json();
      })
      .then(config => {
        if (!config.sites || config.sites.length === 0) {
          throw new Error('找不到站点配置');
        }
        
        // 模拟subscriptions API返回的数据结构
        const subscriptionsData = {};
        const detailedSitesData = {};
        
        // 为每个站点创建一个Promise
        const promises = config.sites
          .filter(site => site.enabled)
          .map(site => {
            // 从URL中提取站点标识符
            const siteId = site.url.replace(/^https?:\/\//, '').replace(/[^\w]/g, '_');
            const siteDataUrl = buildResourceUrl(`${API_BASE_URL}/${siteId}.json`);
            
            console.log('加载站点数据:', siteDataUrl);
            
            return fetch(siteDataUrl)
              .then(response => {
                if (!response.ok) {
                  console.warn(`无法加载站点数据: ${siteId}, 状态码: ${response.status}`);
                  return null;
                }
                return response.json();
              })
              .then(siteData => {
                if (!siteData) return;
                
                detailedSitesData[siteId] = siteData;
                
                // 处理新的数据结构，与api/subscriptions返回的格式一致
                const processedData = {
                  url: siteData.url,
                  siteName: siteData.siteName,
                  scrapedAt: siteData.scrapedAt,
                  subscriptionCount: siteData.totalSubscriptions || 0,
                  subscriptions: []
                };
                
                // 从所有文章中收集订阅链接
                if (siteData.articles && Array.isArray(siteData.articles)) {
                  siteData.articles.forEach(article => {
                    if (article.subscriptions && Array.isArray(article.subscriptions)) {
                      processedData.subscriptions = processedData.subscriptions.concat(
                        article.subscriptions.map(sub => ({
                          ...sub,
                          articleTitle: article.title,
                          articleUrl: article.url
                        }))
                      );
                    }
                  });
                }
                
                subscriptionsData[siteId] = processedData;
              })
              .catch(error => {
                console.error(`处理站点 ${siteId} 时出错:`, error);
                return null;
              });
          });
        
        Promise.all(promises)
          .then(() => {
            // 处理订阅数据
            allSubscriptions = subscriptionsData;
            updateStats(subscriptionsData);
            
            // 处理详细数据
            detailedData = detailedSitesData;
            
            // 渲染数据
            renderSubscriptions();
          })
          .catch(error => {
            console.error('加载站点数据失败:', error);
            subscriptionsContainer.innerHTML = `
              <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> 加载数据失败: ${error.message}
              </div>
            `;
          });
      })
      .catch(error => {
        console.error('加载配置失败:', error);
        subscriptionsContainer.innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle"></i> 加载配置失败: ${error.message}
          </div>
        `;
      });
  } else {
    // 非静态模式，使用API
    fetch(subscriptionsUrl)
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
        return fetch(sitesUrl);
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
        console.error('加载数据失败:', error);
        subscriptionsContainer.innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle"></i> 加载数据失败: ${error.message}
          </div>
        `;
      });
  }
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
          alert('复制失败，请手动复制');
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