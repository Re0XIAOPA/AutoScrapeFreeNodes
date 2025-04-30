// 全局变量
let subscriptionData = {};
let currentView = 'normal'; // 'normal' 或 'detailed'
let loadRetryCount = 0;
const MAX_RETRIES = 3;

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  
  // 设置事件监听器
  setupEventListeners();
});

// 初始化应用
function initApp() {
  // 加载订阅数据
  loadData();
  
  // 初始化UI元素
  setupUI();
  
  // 定时自动刷新页面（每30分钟）
  setInterval(() => {
    window.location.reload();
  }, 30 * 60 * 1000);
  
  // 更新下次刷新时间提示
  updateNextRefreshTime();
}

// 设置UI初始状态
function setupUI() {
  // 配置区域折叠/展开
  const configToggle = document.querySelector('.config-toggle');
  const configCollapse = document.getElementById('configCollapse');
  const toggleIcon = document.querySelector('.toggle-icon');
  
  configToggle.addEventListener('click', () => {
    if (configCollapse.style.display === 'none') {
      configCollapse.style.display = 'block';
      toggleIcon.textContent = '▼';
    } else {
      configCollapse.style.display = 'none';
      toggleIcon.textContent = '▶';
    }
  });
  
  // 初始状态为折叠
  configCollapse.style.display = 'none';
  toggleIcon.textContent = '▶';
}

// 设置事件监听
function setupEventListeners() {
  // 搜索过滤
  document.getElementById('search-input').addEventListener('input', filterSubscriptions);
  
  // 类型过滤
  document.getElementById('type-filter').addEventListener('change', filterSubscriptions);
  
  // 刷新按钮
  document.getElementById('refresh-btn').addEventListener('click', () => {
    loadData(true);
  });
  
  // 视图切换
  document.getElementById('normal-view').addEventListener('click', () => setView('normal'));
  document.getElementById('detailed-view').addEventListener('click', () => setView('detailed'));
}

// 加载数据
function loadData(isRefresh = false) {
  // 显示加载状态
  document.getElementById('subscriptions-container').innerHTML = `
    <div class="loading">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">加载中...</span>
      </div>
      <div class="mt-3">加载订阅数据中...</div>
    </div>
  `;
  
  // 本地开发环境使用后端API
  // GitHub Pages环境使用预先生成的静态JSON文件
  const dataUrl = APP_CONFIG.apiBaseUrl + '/data/subscriptions.json';
  const configUrl = APP_CONFIG.apiBaseUrl + '/data/config.json';
  
  // 随机参数防止缓存
  const cacheBuster = isRefresh ? `?t=${new Date().getTime()}` : '';
  
  // 加载配置
  fetch(configUrl + cacheBuster)
    .then(response => {
      if (!response.ok) {
        throw new Error(`配置加载失败，服务器返回: ${response.status}`);
      }
      return response.json();
    })
    .then(config => {
      updateConfigDisplay(config);
    })
    .catch(error => {
      console.error('加载配置失败:', error);
      
      // 尝试使用备用路径
      if (loadRetryCount < MAX_RETRIES) {
        loadRetryCount++;
        console.log(`尝试备用路径 (${loadRetryCount}/${MAX_RETRIES})...`);
        
        // 尝试其他可能的路径
        APP_CONFIG.apiBaseUrl = loadRetryCount === 1 ? '..' : 
                               loadRetryCount === 2 ? '' : '/';
        
        // 重试加载
        setTimeout(() => loadData(isRefresh), 1000);
        return;
      }
      
      document.getElementById('update-interval').textContent = `加载失败`;
      document.getElementById('max-articles').textContent = `加载失败`;
      document.getElementById('last-updated').textContent = `加载失败`;
      
      // 显示默认配置
      updateConfigDisplay({
        sites: [],
        settings: {
          updateInterval: 15,
          maxArticlesPerSite: 5,
          lastUpdated: new Date().toISOString()
        }
      });
    });
  
  // 加载订阅数据
  fetch(dataUrl + cacheBuster)
    .then(response => {
      if (!response.ok) {
        throw new Error(`数据加载失败，服务器返回: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      subscriptionData = data;
      renderSubscriptions();
      updateStats();
      
      // 成功加载后重置重试计数
      loadRetryCount = 0;
    })
    .catch(error => {
      console.error('加载数据失败:', error);
      
      // 不在这里重试，因为配置加载失败时已经会重试了
      // 如果配置加载成功但数据加载失败，显示错误信息
      if (loadRetryCount === 0 || loadRetryCount >= MAX_RETRIES) {
        document.getElementById('subscriptions-container').innerHTML = `
          <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle-fill me-2"></i>
            <h5>加载数据失败</h5>
            <p>请确保以下几点：</p>
            <ol>
              <li>如果您正在本地运行，确保已启动后端服务</li>
              <li>如果是在GitHub Pages上，确保已生成数据文件</li>
              <li>尝试清除浏览器缓存并刷新页面</li>
            </ol>
            <div>错误信息: ${error.message}</div>
            <button class="btn btn-primary mt-3" onclick="loadData(true)">
              <i class="bi bi-arrow-clockwise me-1"></i> 重试
            </button>
          </div>
        `;
      }
    });
}

// 更新配置显示
function updateConfigDisplay(config) {
  document.getElementById('update-interval').textContent = `${config.settings.updateInterval}分钟`;
  document.getElementById('max-articles').textContent = config.settings.maxArticlesPerSite;
  document.getElementById('last-updated').textContent = new Date(config.settings.lastUpdated).toLocaleString();
  
  // 更新站点列表
  const siteListElem = document.getElementById('site-list');
  siteListElem.innerHTML = '';
  
  if (!config.sites || config.sites.length === 0) {
    siteListElem.innerHTML = '<div class="text-center p-3">没有配置站点</div>';
    return;
  }
  
  config.sites.forEach(site => {
    const siteItem = document.createElement('div');
    siteItem.className = 'site-item';
    siteItem.innerHTML = `
      <div class="site-url">${site.description || site.url}</div>
      <div class="site-status ${site.enabled ? 'site-enabled' : 'site-disabled'}">
        ${site.enabled ? '<i class="bi bi-check-circle-fill"></i> 已启用' : '<i class="bi bi-x-circle-fill"></i> 已禁用'}
      </div>
    `;
    siteListElem.appendChild(siteItem);
  });
}

// 更新统计
function updateStats() {
  const statsContainer = document.getElementById('stats-container');
  
  // 计算总订阅数量
  let totalSubscriptions = 0;
  let siteCount = 0;
  
  for (const siteName in subscriptionData) {
    siteCount++;
    const site = subscriptionData[siteName];
    if (site.subscriptions && Array.isArray(site.subscriptions)) {
      totalSubscriptions += site.subscriptions.length;
    }
  }
  
  // 更新统计展示
  statsContainer.innerHTML = `
    <i class="bi bi-info-circle-fill me-2"></i>
    <strong>统计信息:</strong> 共收集了 <strong>${totalSubscriptions}</strong> 个订阅链接，来自 <strong>${siteCount}</strong> 个站点，
    最后更新时间: <strong>${new Date().toLocaleString()}</strong>
  `;
  
  statsContainer.className = 'alert alert-info mb-4';
}

// 渲染订阅内容
function renderSubscriptions() {
  const container = document.getElementById('subscriptions-container');
  container.innerHTML = '';
  
  if (Object.keys(subscriptionData).length === 0) {
    container.innerHTML = `
      <div class="alert alert-warning w-100">
        <i class="bi bi-exclamation-triangle-fill me-2"></i>
        暂无订阅数据，请等待后台抓取完成。
      </div>
    `;
    return;
  }
  
  // 根据当前视图模式渲染
  if (currentView === 'normal') {
    renderNormalView(container);
  } else {
    renderDetailedView(container);
  }
}

// 渲染简洁视图
function renderNormalView(container) {
  // 创建一个统一的列表
  const allSubscriptions = [];
  
  // 从所有站点收集订阅
  for (const siteName in subscriptionData) {
    const site = subscriptionData[siteName];
    if (site.subscriptions && Array.isArray(site.subscriptions)) {
      site.subscriptions.forEach(sub => {
        allSubscriptions.push({
          ...sub,
          siteName: site.siteName || siteName
        });
      });
    }
  }
  
  // 排序 - 按类型和更新时间
  allSubscriptions.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type.localeCompare(b.type);
    }
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });
  
  // 渲染订阅项
  allSubscriptions.forEach(sub => {
    const item = document.createElement('div');
    item.className = 'col-md-6 subscription-col';
    item.setAttribute('data-type', sub.type || '通用');
    
    const typeColor = APP_CONFIG.typeColors[sub.type] || APP_CONFIG.typeColors['通用'];
    
    item.innerHTML = `
      <div class="subscription-item-simple" style="border-left-color: ${typeColor};">
        <div class="sub-type badge" style="background-color: ${typeColor};">
          ${sub.type || '通用'}
        </div>
        <div class="sub-url">${sub.url}</div>
        <div class="sub-actions">
          <button class="btn btn-sm btn-outline-primary copy-btn" data-url="${sub.url}">
            <i class="bi bi-clipboard"></i> 复制
          </button>
        </div>
        <div class="subscription-meta">
          <small class="text-muted">
            来源: ${sub.siteName} | 
            ${sub.updatedAt ? '更新: ' + new Date(sub.updatedAt).toLocaleString() : ''}
          </small>
        </div>
      </div>
    `;
    
    container.appendChild(item);
  });
  
  // 添加复制按钮事件
  setupCopyButtons();
}

// 渲染详细视图
function renderDetailedView(container) {
  // 按站点分组显示
  for (const siteName in subscriptionData) {
    const site = subscriptionData[siteName];
    
    // 创建站点卡片
    const siteCard = document.createElement('div');
    siteCard.className = 'col-12 mb-4';
    
    // 检查是否有订阅
    const hasSubscriptions = site.subscriptions && Array.isArray(site.subscriptions) && site.subscriptions.length > 0;
    
    siteCard.innerHTML = `
      <div class="card site-card">
        <div class="card-header">
          <h5 class="mb-0">${site.siteName || siteName}</h5>
          <div class="site-meta">
            <small class="text-light">
              ${hasSubscriptions ? `共 ${site.subscriptions.length} 个订阅` : '暂无订阅'}
              ${site.scrapedAt ? ' | 更新于: ' + new Date(site.scrapedAt).toLocaleString() : ''}
            </small>
          </div>
        </div>
        <div class="card-body detailed-list">
          ${hasSubscriptions ? '' : '<div class="alert alert-light">该站点暂无可用订阅链接。</div>'}
        </div>
      </div>
    `;
    
    container.appendChild(siteCard);
    
    // 如果有订阅，添加详细订阅项
    if (hasSubscriptions) {
      const listContainer = siteCard.querySelector('.detailed-list');
      
      // 排序 - 按类型和更新时间
      site.subscriptions.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type.localeCompare(b.type);
        }
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      });
      
      // 添加每个订阅项
      site.subscriptions.forEach(sub => {
        const detailedItem = document.createElement('div');
        detailedItem.className = 'detailed-item';
        detailedItem.setAttribute('data-type', sub.type || '通用');
        
        const typeColor = APP_CONFIG.typeColors[sub.type] || APP_CONFIG.typeColors['通用'];
        
        detailedItem.innerHTML = `
          <div class="detailed-item-header" style="border-left-color: ${typeColor};">
            <span class="badge" style="background-color: ${typeColor};">${sub.type || '通用'}</span>
            ${sub.name ? `<span class="sub-name">${sub.name}</span>` : ''}
            <span class="timestamp">
              ${sub.updatedAt ? new Date(sub.updatedAt).toLocaleString() : ''}
            </span>
          </div>
          <div class="detailed-item-body">
            <div class="detailed-item-url">${sub.url}</div>
            <div class="detailed-item-actions">
              <button class="btn btn-sm btn-outline-primary copy-btn" data-url="${sub.url}">
                <i class="bi bi-clipboard"></i> 复制
              </button>
              ${sub.articleTitle ? `
                <a href="${sub.articleUrl}" target="_blank" class="btn btn-sm btn-outline-secondary ms-2">
                  <i class="bi bi-link-45deg"></i> 来源
                </a>
              ` : ''}
            </div>
          </div>
        `;
        
        listContainer.appendChild(detailedItem);
      });
    }
  }
  
  // 添加复制按钮事件
  setupCopyButtons();
}

// 设置视图
function setView(viewType) {
  currentView = viewType;
  
  // 更新按钮状态
  document.getElementById('normal-view').classList.toggle('active', viewType === 'normal');
  document.getElementById('detailed-view').classList.toggle('active', viewType === 'detailed');
  
  // 重新渲染
  renderSubscriptions();
  
  // 应用过滤
  filterSubscriptions();
}

// 过滤订阅
function filterSubscriptions() {
  const searchText = document.getElementById('search-input').value.toLowerCase();
  const typeFilter = document.getElementById('type-filter').value;
  
  // 选择所有订阅项
  let items;
  if (currentView === 'normal') {
    items = document.querySelectorAll('.subscription-col');
  } else {
    items = document.querySelectorAll('.detailed-item');
  }
  
  // 应用过滤
  items.forEach(item => {
    const itemContent = item.textContent.toLowerCase();
    const itemType = item.getAttribute('data-type');
    
    const matchesSearch = searchText === '' || itemContent.includes(searchText);
    const matchesType = typeFilter === 'all' || itemType === typeFilter;
    
    if (matchesSearch && matchesType) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

// 设置复制按钮功能
function setupCopyButtons() {
  const copyButtons = document.querySelectorAll('.copy-btn');
  
  copyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const url = this.getAttribute('data-url');
      
      // 复制到剪贴板
      navigator.clipboard.writeText(url)
        .then(() => {
          // 临时改变按钮样式表示成功
          const originalHtml = this.innerHTML;
          this.innerHTML = '<i class="bi bi-check-lg"></i> 已复制';
          this.classList.remove('btn-outline-primary');
          this.classList.add('btn-success');
          
          // 2秒后恢复
          setTimeout(() => {
            this.innerHTML = originalHtml;
            this.classList.remove('btn-success');
            this.classList.add('btn-outline-primary');
          }, 2000);
        })
        .catch(err => {
          console.error('复制失败:', err);
          alert('复制失败，请手动复制');
        });
    });
  });
}

// 更新下次刷新提示
function updateNextRefreshTime() {
  const nextRefreshElem = document.getElementById('next-refresh-time');
  
  // 计算下次刷新时间（30分钟后）
  const nextRefresh = new Date();
  nextRefresh.setMinutes(nextRefresh.getMinutes() + 30);
  
  nextRefreshElem.innerHTML = `<i class="bi bi-clock"></i> 下次刷新: ${nextRefresh.toLocaleTimeString()}`;
  
  // 每分钟更新一次
  setTimeout(updateNextRefreshTime, 60000);
} 