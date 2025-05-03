// 全局变量
let allSubscriptions = {};
let detailedData = {};
let configData = {};
let currentView = 'normal'; // 'normal' or 'detailed'

// API基础URL - 从环境配置中获取
const API_BASE_URL = ENV_CONFIG.API_BASE_URL;

// Monkey patch Bootstrap模态框方法，阻止aria-hidden属性设置
document.addEventListener('DOMContentLoaded', function() {
  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    const originalShow = bootstrap.Modal.prototype.show;
    const originalHide = bootstrap.Modal.prototype.hide;
    
    // 重写show方法
    bootstrap.Modal.prototype.show = function() {
      if (this._element) {
        // 确保在显示前移除aria-hidden
        this._element.removeAttribute('aria-hidden');
      }
      // 调用原始方法
      const result = originalShow.apply(this, arguments);
      
      // 显示后也确保移除
      if (this._element) {
        setTimeout(() => {
          this._element.removeAttribute('aria-hidden');
        }, 10);
      }
      
      return result;
    };
    
    // 重写hide方法
    bootstrap.Modal.prototype.hide = function() {
      if (this._element) {
        // 在隐藏前确保移除aria-hidden
        this._element.removeAttribute('aria-hidden');
      }
      
      // 调用原始方法
      return originalHide.apply(this, arguments);
    };
    
    console.log('Bootstrap Modal方法已增强，以改进可访问性');
  }
});

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
    
    // 使用MutationObserver监控模态框属性变化，防止Bootstrap添加aria-hidden
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          if (modalElement.getAttribute('aria-hidden') === 'true') {
            modalElement.removeAttribute('aria-hidden');
          }
        }
      });
    });
    
    // 开始观察模态框的属性变化
    observer.observe(modalElement, { attributes: true });
    
    // 创建新的模态框实例
    const infoModal = new bootstrap.Modal(modalElement, {
      backdrop: true,
      keyboard: true,
      focus: true
    });
    
    // 显示模态框前，先确保没有aria-hidden属性
    modalElement.removeAttribute('aria-hidden');
    
    // 监听模态框隐藏事件，停止观察并清理
    modalElement.addEventListener('hidden.bs.modal', function() {
      observer.disconnect(); // 停止观察
      modalElement.removeAttribute('aria-hidden'); // 再次确保移除
    }, { once: true });
    
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
    
    // 使用MutationObserver监控模态框属性变化，防止Bootstrap添加aria-hidden
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          if (modalElement.getAttribute('aria-hidden') === 'true') {
            modalElement.removeAttribute('aria-hidden');
          }
        }
      });
    });
    
    // 开始观察模态框的属性变化
    observer.observe(modalElement, { attributes: true });
    
    // 创建新的模态框实例
    const errorModal = new bootstrap.Modal(modalElement, {
      backdrop: true,
      keyboard: true,
      focus: true
    });
    
    // 显示模态框前，先确保没有aria-hidden属性
    modalElement.removeAttribute('aria-hidden');
    
    // 监听模态框隐藏事件，停止观察并清理
    modalElement.addEventListener('hidden.bs.modal', function() {
      observer.disconnect(); // 停止观察
      modalElement.removeAttribute('aria-hidden'); // 再次确保移除
    }, { once: true });
    
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
  const backToTopBtn = document.getElementById('back-to-top');
  
  // 返回顶部按钮逻辑
  if (backToTopBtn) {
    // 监听滚动事件
    window.addEventListener('scroll', function() {
      if (window.pageYOffset > 300) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });
    
    // 点击返回顶部
    backToTopBtn.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
  
  // 检查是否在GitHub Pages环境
  const isGitHubPages = window.location.hostname.includes('github.io');
  if (isGitHubPages && refreshBtn) {
    console.log('检测到GitHub Pages环境');
    // 修改刷新按钮的点击行为，在GitHub Pages环境中显示静态提示
    refreshBtn.addEventListener('click', function(e) {
      e.preventDefault(); // 防止默认行为
      e.stopPropagation(); // 防止事件冒泡
      
      console.log('GitHub Pages环境，显示静态提示');
      showInfoModal('GitHub Pages是静态部署环境，无法实时刷新数据。数据会在每天的定时构建中自动更新。');
      return false;
    });
  } else if (refreshBtn) {
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
  const configCollapse = document.getElementById('configCollapse');
  if (configCollapse) {
    configCollapse.style.display = 'none';
  }
  
  // 配置区域折叠/展开 - 修复Bootstrap的collapse功能
  if (configToggle) {
    configToggle.addEventListener('click', function() {
      const configCollapse = document.getElementById('configCollapse');
      const icon = this.querySelector('.toggle-icon');
      
      if (configCollapse) {
        // 使用原生方法代替Bootstrap的collapse
        if (configCollapse.style.display === 'block') {
          configCollapse.style.display = 'none';
          if (icon) icon.textContent = '▼';
        } else {
          configCollapse.style.display = 'block';
          if (icon) icon.textContent = '▲';
        }
      }
    });
  }
  
  // 切换视图
  if (normalViewBtn) {
    normalViewBtn.addEventListener('click', function() {
      currentView = 'normal';
      normalViewBtn.classList.add('active');
      if (detailedViewBtn) detailedViewBtn.classList.remove('active');
      renderSubscriptions();
    });
  }
  
  if (detailedViewBtn) {
    detailedViewBtn.addEventListener('click', function() {
      currentView = 'detailed';
      detailedViewBtn.classList.add('active');
      if (normalViewBtn) normalViewBtn.classList.remove('active');
      renderSubscriptions();
    });
  }
  
  // 添加事件监听器
  if (searchInput) searchInput.addEventListener('input', renderSubscriptions);
  if (typeFilter) typeFilter.addEventListener('change', renderSubscriptions);
  
  // 更新下一次刷新时间的显示 - 基于GitHub Actions固定调度时间
  function updateNextRefreshTime() {
    const nextRefreshTimeEl = document.getElementById('next-refresh-time');
    if (!nextRefreshTimeEl) return;
    
    // 获取当前时间（客户端时间）
    const now = new Date();
    
    // 固定为每天凌晨00:30更新（GitHub Actions构建时间）
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
    
    // 更新显示内容
    nextRefreshTimeEl.innerHTML = `<i class="bi bi-clock"></i> 下次更新: <strong>${formattedTime}</strong> (约${timeDisplay})`;
    
    // 获取上次更新时间，添加提示
    if (configData && configData.settings && configData.settings.lastUpdated) {
      const lastUpdated = new Date(configData.settings.lastUpdated);
      const hoursSinceUpdate = Math.floor((now - lastUpdated) / (1000 * 60 * 60));
      
      if (hoursSinceUpdate >= 24) {
        nextRefreshTimeEl.title = `上次更新已超过${hoursSinceUpdate}小时，可能存在同步问题`;
        nextRefreshTimeEl.classList.add('outdated');
      } else {
        nextRefreshTimeEl.title = `上次更新在${hoursSinceUpdate}小时前，每24小时更新一次`;
        nextRefreshTimeEl.classList.remove('outdated');
      }
    }
  }
  
  // 开启定时更新时间显示
  updateNextRefreshTime();
  const nextRefreshTimeEl = document.getElementById('next-refresh-time');
  if (nextRefreshTimeEl) {
    setInterval(updateNextRefreshTime, 30000); // 每30秒更新一次显示
  }
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
  // 固定显示为24小时
  const updateIntervalHours = 24;
  
  // 更新所有显示更新频率的元素
  const updateIntervalEl = document.getElementById('update-interval');
  const modalUpdateIntervalEl = document.getElementById('modal-update-interval');
  const footerUpdateIntervalEl = document.getElementById('footer-update-interval');
  
  if (updateIntervalEl) updateIntervalEl.textContent = `${updateIntervalHours}h`;
  if (modalUpdateIntervalEl) modalUpdateIntervalEl.textContent = `${updateIntervalHours} 小时`;
  if (footerUpdateIntervalEl) footerUpdateIntervalEl.textContent = `${updateIntervalHours}小时`;
  
  // 显示站点数量
  const totalSitesEl = document.getElementById('total-sites');
  const modalMaxArticlesEl = document.getElementById('modal-max-articles');
  const footerSiteCountEl = document.getElementById('footer-site-count');
  
  if (totalSitesEl) totalSitesEl.textContent = data.sites.length;
  if (modalMaxArticlesEl) modalMaxArticlesEl.textContent = `${data.sites.length} 站点`;
  if (footerSiteCountEl) footerSiteCountEl.textContent = `${data.sites.length}个站点`;
  
  // 显示本地免费节点数量
  const localFreeNodesEl = document.getElementById('local-free-nodes');
  if (localFreeNodesEl) {
    let freeNodesCount = 0;
    
    // 优先使用settings中的localFreeNodesCount设置
    if (data.settings && data.settings.localFreeNodesCount !== undefined) {
      freeNodesCount = data.settings.localFreeNodesCount;
    } 
    // 如果没有设置或为0，则从subscriptions中统计
    else if (data.subscriptions && Array.isArray(data.subscriptions)) {
      // 计算订阅中包含"免费"的数量
      freeNodesCount = data.subscriptions.filter(sub => 
        (sub.description && sub.description.includes('免费')) || 
        (sub.name && sub.name.includes('免费'))
      ).length;
    }
    
    localFreeNodesEl.textContent = freeNodesCount;
  }
  
  // 处理最后更新时间
  const lastUpdatedEl = document.getElementById('last-updated');
  const modalLastUpdatedEl = document.getElementById('modal-last-updated');
  
  if (lastUpdatedEl && data.settings && data.settings.lastUpdated) {
    const lastUpdated = new Date(data.settings.lastUpdated);
    const now = new Date();
    const hoursSinceUpdate = Math.floor((now - lastUpdated) / (1000 * 60 * 60));
    
    // 设置时间文本
    lastUpdatedEl.innerHTML = `<i class="bi bi-clock"></i> ${lastUpdated.toLocaleString()}`;
    
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
  }
  
  if (modalLastUpdatedEl && data.settings && data.settings.lastUpdated) {
    const lastUpdated = new Date(data.settings.lastUpdated);
    modalLastUpdatedEl.textContent = lastUpdated.toLocaleString();
  }
  
  // 更新站点列表
  const siteListEl = document.getElementById('site-list');
  const modalSiteListEl = document.getElementById('modal-site-list');
  let siteListHTML = '';
  let modalSiteListHTML = '';
  
  if (data.sites && data.sites.length > 0) {
    data.sites.forEach(site => {
      // 主页面简洁站点列表
      siteListHTML += `
        <div class="site-item">
          <div class="site-url" title="${site.description || site.url}">${site.url}</div>
          <div class="site-status ${site.enabled ? 'site-enabled' : 'site-disabled'}">
            <i class="bi ${site.enabled ? 'bi-check-circle' : 'bi-x-circle'}"></i> ${site.enabled ? '已启用' : '已禁用'}
          </div>
        </div>
      `;
      
      // 模态框中的详细站点列表
      modalSiteListHTML += `
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <span title="${site.description || site.url}" class="text-truncate" style="max-width: 70%">${site.url}</span>
          <span class="badge ${site.enabled ? 'bg-success' : 'bg-danger'} rounded-pill">
            ${site.enabled ? '已启用' : '已禁用'}
          </span>
        </div>
      `;
    });
  } else {
    siteListHTML = '<div class="text-center">没有配置站点</div>';
    modalSiteListHTML = '<div class="text-center">没有配置站点</div>';
  }
  
  if (siteListEl) siteListEl.innerHTML = siteListHTML;
  if (modalSiteListEl) modalSiteListEl.innerHTML = modalSiteListHTML;
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
  if (!subscriptionsContainer) return;
  
  subscriptionsContainer.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status"></div>
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
          // 合并配置文件中的自定义订阅
          allSubscriptions = mergeConfigSubscriptions(INLINE_SUBSCRIPTIONS);
          updateStats(allSubscriptions);
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
          const exampleSubscriptions = { "example": exampleSite };
          // 合并配置文件中的自定义订阅
          allSubscriptions = mergeConfigSubscriptions(exampleSubscriptions);
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
        // 合并配置文件中的自定义订阅
        allSubscriptions = mergeConfigSubscriptions(data);
        updateStats(allSubscriptions);
        
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
          // 合并配置文件中的自定义订阅
          allSubscriptions = mergeConfigSubscriptions(INLINE_SUBSCRIPTIONS);
          updateStats(allSubscriptions);
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
          
          const exampleSubscriptions = { "example": exampleSite };
          // 合并配置文件中的自定义订阅
          allSubscriptions = mergeConfigSubscriptions(exampleSubscriptions);
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

/**
 * 合并配置文件中的自定义订阅
 * @param {Object} remoteSubscriptions 远程订阅数据
 * @returns {Object} 合并后的订阅数据
 */
function mergeConfigSubscriptions(remoteSubscriptions) {
  const result = JSON.parse(JSON.stringify(remoteSubscriptions)); // 深拷贝
  
  // 如果配置中有自定义订阅，添加到结果中
  if (configData.subscriptions && configData.subscriptions.length > 0) {
    // 创建自定义订阅站点
    const customSite = {
      url: "custom",
      siteName: "自定义订阅",
      scrapedAt: new Date().toISOString(),
      subscriptionCount: configData.subscriptions.length,
      subscriptions: configData.subscriptions.map(sub => ({
        ...sub,
        isCustom: true // 标记为自定义
      }))
    };
    
    // 添加到结果
    result.custom = customSite;
  }
  
  return result;
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
  // 统计总站点数和总订阅数
  let totalSubscriptions = 0;
  let totalSites = Object.keys(data).length;
  
  // 统计各类型订阅数量
  let typeCounts = {
    'Clash': 0,
    'V2ray': 0,
    'Sing-Box': 0,
    'Shadowrocket': 0,
    'Quantumult': 0,
    '通用': 0,
  };
  
  // 遍历所有站点，统计数量
  Object.values(data).forEach(site => {
    totalSubscriptions += site.subscriptionCount || 0;
    
    // 统计各类型数量
    if (site.subscriptions && Array.isArray(site.subscriptions)) {
      site.subscriptions.forEach(sub => {
        // 只统计显示在筛选下拉菜单中的类型
        if (typeCounts[sub.type] !== undefined) {
          typeCounts[sub.type]++;
        }
      });
    }
  });
  
  // 更新总节点数显示
  const totalNodesEl = document.getElementById('total-nodes');
  if (totalNodesEl) {
    totalNodesEl.textContent = totalSubscriptions;
  }
  
  // 更新总站点数显示
  const totalSitesEl = document.getElementById('total-sites');
  if (totalSitesEl) {
    totalSitesEl.textContent = totalSites;
  }
  
  // 构建统计区域
  const statsContainer = document.getElementById('stats-container');
  if (statsContainer) {
    // 构建统计HTML
    let statsHtml = `
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
        <div>
          <span>找到 <strong>${getFilteredSubscriptions().length}</strong> 个匹配的订阅链接</span>
        </div>
      </div>
    `;
    
    statsContainer.innerHTML = statsHtml;
  }
}

// 获取订阅类型的颜色
function getTypeColor(type) {
  const colorMap = {
    'Clash': 'primary',
    'V2ray': 'success',
    'Sing-Box': 'secondary',
    'Shadowrocket': 'dark',
    'Quantumult': 'light',
    '通用': 'info'
  };
  return colorMap[type] || 'secondary';
}

// 获取订阅类型的图标
function getTypeIcon(type) {
  const iconMap = {
    'Clash': 'bi bi-shield-check',
    'V2ray': 'bi bi-hdd-network',
    'Sing-Box': 'bi bi-link-45deg',
    'Shadowrocket': 'bi bi-hdd-network',
    'Quantumult': 'bi bi-diagram-3',
    '通用': 'bi bi-globe2'
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
  const statsContainer = document.getElementById('stats-container');
  if (!subscriptionsContainer) return;
  
  const filteredSubscriptions = getFilteredSubscriptions();
  
  // 更新统计
  updateFilterStats(filteredSubscriptions);
  
  let html = '';
  
  if (filteredSubscriptions.length === 0) {
    html = `
      <div class="col-12">
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>没有符合条件的订阅链接
        </div>
      </div>
    `;
    subscriptionsContainer.innerHTML = html;
    return;
  }
  
  // 渲染订阅链接
  filteredSubscriptions.forEach(subscription => {
    const typeColor = getTypeColor(subscription.type);
    const typeIcon = getTypeIcon(subscription.type);
    const isCustom = subscription.isCustom === true;
    
    html += `
      <div class="col-lg-6 mb-3">
        <div class="subscription-card ${isCustom ? 'local-subscription' : ''}">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="type-badge bg-${typeColor} text-white">
              <i class="${typeIcon}"></i> ${subscription.type}
              ${isCustom ? '<span class="ms-1 badge bg-warning text-dark">自定义</span>' : ''}
            </span>
            <div class="btn-group">
              <button class="btn btn-action btn-copy me-2" data-url="${subscription.url}">
                <i class="bi bi-clipboard"></i> 复制
              </button>
              <a href="${subscription.url}" target="_blank" class="btn btn-action btn-open">
                <i class="bi bi-box-arrow-up-right"></i> 打开
              </a>
            </div>
          </div>
          <div class="subscription-url">${subscription.url}</div>
          <div class="text-muted small">
            <i class="bi bi-info-circle me-1"></i> 
            ${subscription.description || `来自 ${subscription.siteName} 的${subscription.type}订阅`}
          </div>
          ${subscription.siteName ? `<div class="text-muted smaller mt-2"><i class="bi bi-globe2 me-1"></i> ${subscription.siteName}</div>` : ''}
        </div>
      </div>
    `;
  });
  
  subscriptionsContainer.innerHTML = html;
  
  // 添加复制按钮事件监听器
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', function() {
      const url = this.dataset.url;
      copyToClipboard(url);
      showCopySuccess(this);
    });
  });
}

// 渲染订阅链接 - 详细视图（按类型分组）
function renderDetailedView() {
  const subscriptionsContainer = document.getElementById('subscriptions-container');
  const statsContainer = document.getElementById('stats-container');
  if (!subscriptionsContainer) return;
  
  const filteredSubscriptions = getFilteredSubscriptions();
  
  // 更新统计
  updateFilterStats(filteredSubscriptions);
  
  let html = '';
  
  if (filteredSubscriptions.length === 0) {
    html = `
      <div class="col-12">
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>没有符合条件的订阅链接
        </div>
      </div>
    `;
    subscriptionsContainer.innerHTML = html;
    return;
  }
  
  // 获取每种类型的订阅链接
  const subscriptionsByType = {};
  
  filteredSubscriptions.forEach(subscription => {
    if (!subscriptionsByType[subscription.type]) {
      subscriptionsByType[subscription.type] = [];
    }
    subscriptionsByType[subscription.type].push(subscription);
  });
  
  // 按类型分组渲染
  Object.keys(subscriptionsByType).forEach(type => {
    const typeColor = getTypeColor(type);
    const typeIcon = getTypeIcon(type);
    const subscriptions = subscriptionsByType[type];
    
    html += `
      <div class="col-12 mb-4">
        <h5 class="section-title">
          <span class="badge bg-${typeColor} text-white me-2">
            <i class="${typeIcon} me-1"></i> ${type}
          </span>
          订阅链接 (${subscriptions.length})
        </h5>
        <div class="row">
    `;
    
    subscriptions.forEach(subscription => {
      const isCustom = subscription.isCustom === true;
      const siteData = detailedData[subscription.url] || { total: '未知', valid: '未知', updated: '未知' };
      const updatedDate = siteData.updated ? new Date(siteData.updated) : null;
      const updatedText = updatedDate ? updatedDate.toLocaleString() : '未知';
      
      html += `
        <div class="col-lg-4 col-md-6 mb-3">
          <div class="detailed-card ${isCustom ? 'local-subscription' : ''}">
            <div class="detailed-card-header d-flex justify-content-between align-items-center">
              <span><i class="${typeIcon} me-1"></i> ${type} 订阅</span>
              ${isCustom ? '<span class="badge bg-warning text-dark">自定义</span>' : ''}
            </div>
            <div class="detailed-card-body">
              <div class="subscription-url">${subscription.url}</div>
              <div class="row mb-2">
                <div class="col-6">
                  <small class="text-muted">来源:</small>
                  <div><strong>${subscription.siteName || '未知'}</strong></div>
                </div>
                <div class="col-6">
                  <small class="text-muted">描述:</small>
                  <div><strong>${subscription.name || '无'}</strong></div>
                </div>
              </div>
              <div class="mb-2">
                <small class="text-muted">添加时间:</small>
                <div><strong>${updatedText}</strong></div>
              </div>
            </div>
            <div class="detailed-card-footer">
              <div class="d-flex justify-content-between">
                <button class="btn btn-sm btn-action btn-copy" data-url="${subscription.url}">
                  <i class="bi bi-clipboard"></i> 复制
                </button>
                <a href="${subscription.url}" target="_blank" class="btn btn-sm btn-action btn-open">
                  <i class="bi bi-box-arrow-up-right"></i> 打开
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  });
  
  subscriptionsContainer.innerHTML = html;
  
  // 添加复制按钮事件监听器
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', function() {
      const url = this.dataset.url;
      copyToClipboard(url);
      showCopySuccess(this);
    });
  });
}

/**
 * 更新过滤后的统计信息
 */
function updateFilterStats(filteredSubscriptions) {
  const statsContainer = document.getElementById('stats-container');
  if (!statsContainer) return;
  
  // 计算本地订阅数量
  const localSubscriptions = filteredSubscriptions.filter(sub => sub.isLocal === true);
  // 计算本地免费节点订阅数量
  const localFreeSubscriptions = filteredSubscriptions.filter(sub => 
    (sub.isLocal === true) && 
    (sub.description && (sub.description.includes('免费') || sub.name.includes('免费')))
  );
  
  // 统计各类型订阅数量
  let typeCounts = {
    'Clash': 0,
    'V2ray': 0,
    'Sing-Box': 0,
    'Shadowrocket': 0,
    'Quantumult': 0
  };
  
  // 统计各类型数量
  filteredSubscriptions.forEach(sub => {
    if (typeCounts[sub.type] !== undefined) {
      typeCounts[sub.type]++;
    }
  });
  
  // 构建统计HTML
  statsContainer.innerHTML = `
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center">
      <div>
        <span>去重后找到 <strong>${filteredSubscriptions.length}</strong> 个匹配的订阅链接</span>
      </div>
    </div>
  `;
}

// 显示复制成功提示
function showCopySuccess(button) {
  const originalHTML = button.innerHTML;
  button.innerHTML = '<i class="bi bi-check-lg"></i> 已复制';
  button.classList.add('btn-success');
  button.disabled = true;
  
  setTimeout(() => {
    button.innerHTML = originalHTML;
    button.classList.remove('btn-success');
    button.disabled = false;
  }, 2000);
}

// 获取经过过滤和去重的订阅列表
function getFilteredSubscriptions() {
  // 获取所有订阅并去重
  const uniqueSubscriptions = getUniqueSubscriptions(allSubscriptions);
  
  const typeFilter = document.getElementById('type-filter');
  
  if (!typeFilter) {
    return uniqueSubscriptions;
  }
  
  const selectedType = typeFilter.value;
  
  // 应用过滤条件
  return uniqueSubscriptions.filter(subscription => {
    // 检查类型筛选条件
    const typeMatch = selectedType === 'all' || subscription.type === selectedType;
    
    return typeMatch;
  });
}

/**
 * 获取所有订阅（去重后）
 * @param {Object} allSubscriptions 所有订阅数据
 * @returns {Array} 去重后的订阅数组
 */
function getUniqueSubscriptions(allSubscriptions) {
  const urlMap = new Map(); // 用于检查URL是否重复
  const uniqueSubscriptions = [];
  
  // 遍历所有站点的订阅
  Object.values(allSubscriptions).forEach(site => {
    if (!site.subscriptions) return;
    
    site.subscriptions.forEach(sub => {
      const url = sub.url.trim();
      // 如果URL不重复，添加到结果
      if (!urlMap.has(url)) {
        urlMap.set(url, true);
        // 添加站点信息到订阅
        uniqueSubscriptions.push({
          ...sub,
          siteName: site.siteName,
          siteUrl: site.url
        });
      }
    });
  });
  
  return uniqueSubscriptions;
}

// 复制文本到剪贴板
function copyToClipboard(text) {
  // 首先尝试使用navigator.clipboard API (现代浏览器)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text)
      .catch(err => {
        console.error('Clipboard API失败:', err);
        // 如果Clipboard API失败，回退到传统方法
        return fallbackCopyToClipboard(text);
      });
  } else {
    // 对于不支持Clipboard API的浏览器，使用传统方法
    return fallbackCopyToClipboard(text);
  }
}

// 传统的复制到剪贴板方法（创建临时文本区域）
function fallbackCopyToClipboard(text) {
  return new Promise((resolve, reject) => {
    try {
      // 创建临时文本区域
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';  // 避免滚动到底部
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      // 执行复制命令
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        resolve(text);
      } else {
        reject(new Error('复制失败'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 格式化日期为友好格式
 * @param {string} dateString 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateString) {
  if (!dateString) return '未知';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (error) {
    console.error('日期格式化失败:', error);
    return dateString;
  }
} 