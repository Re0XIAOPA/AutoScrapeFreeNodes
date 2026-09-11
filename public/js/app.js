// 全局变量
let allSubscriptions = {};
let detailedData = {};
let configData = {};
let currentView = 'normal'; // 'normal' or 'detailed'

// API基础URL - 从环境配置中获取
const API_BASE_URL = ENV_CONFIG.API_BASE_URL;

// 是否由 Node 服务托管（可访问实时接口）
const IS_SERVER_MODE = ENV_CONFIG.IS_SERVER_MODE === true;

/**
 * 拼接接口地址
 * 服务器模式：访问实时接口，如 /api/subscriptions（数据来自本次抓取）
 * 静态模式：访问构建时预生成的快照，如 /api/subscriptions.json
 * @param {string} path 接口路径，如 '/api/subscriptions'
 * @returns {string} 完整请求地址
 */
function apiUrl(path) {
  if (IS_SERVER_MODE) return `${API_BASE_URL}${path}`;
  return `${API_BASE_URL}${path}.json`;
}

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
  console.log('信息:', message); // 仅在控制台显示信息
  return;
  
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

// 源站的连通性统一由抓取/构建期校验产出（见 /api/status），前端不再各自发起探测。
// 旧的 checkSiteStatus / checkWithHeadRequest / checkWithGetRequest / checkWithImage
// 依赖 no-cors 的模糊响应，判定不可靠，已随 API Status 改造一并移除。

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
      return refreshAllData(refreshBtn);
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
    
    // GitHub Actions的cron设置为'30 16 * * *'，对应北京时间00:30
    // 因为GitHub Actions使用UTC时间，所以需要转换为北京时间
    const todayBuildTimeUTC = new Date(now);
    todayBuildTimeUTC.setUTCHours(16);
    todayBuildTimeUTC.setUTCMinutes(30);
    todayBuildTimeUTC.setUTCSeconds(0);
    todayBuildTimeUTC.setUTCMilliseconds(0);
    
    // 转换为北京时间
    const todayBuildTime = new Date(todayBuildTimeUTC);
    todayBuildTime.setHours(todayBuildTime.getHours() + 8); // UTC+8
    
    // 如果当前时间已经过了今天的构建时间，则下次构建时间为明天同一时间
    const nextBuildTime = new Date(todayBuildTime);
    if (now > todayBuildTime) {
      nextBuildTime.setDate(nextBuildTime.getDate() + 1);
    }
    
    // 计算距离下次更新的时间（以小时、分钟、秒表示）
    const diffMs = nextBuildTime - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    // 格式化时间显示
    const formattedTime = nextBuildTime.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    let timeDisplay;
    if (diffHours > 0) {
      timeDisplay = `${diffHours}小时${diffMinutes}分钟${diffSeconds}秒后`;
    } else if (diffMinutes > 0) {
      timeDisplay = `${diffMinutes}分钟${diffSeconds}秒后`;
    } else {
      timeDisplay = `${diffSeconds}秒后`;
    }
    
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
    setInterval(updateNextRefreshTime, 1000); // 每秒更新一次显示，实现实时倒计时
  }
});

// 加载配置信息
/**
 * 刷新全部数据
 * 服务器模式：调用后端抓取接口，真正重新抓取「站点订阅」与「markdown 节点」
 * 静态模式：静态托管无法实时抓取，仅重新读取已有数据并给出提示
 * @param {HTMLElement} buttonEl 触发刷新的按钮，用于展示加载状态
 * @param {{scope?: 'all'|'subscriptions'|'nodes'}} [options] 骨架屏展示范围
 */
async function refreshAllData(buttonEl, options) {
  const btn = buttonEl || document.getElementById('refresh-btn');
  const originalHtml = btn ? (btn.dataset.originalHtml || btn.innerHTML) : '';
  if (btn && !btn.dataset.originalHtml) btn.dataset.originalHtml = originalHtml;

  // 哪些区块需要先铺骨架屏：两处刷新都会重新拉取全部数据，
  // 但只给「用户点的那一块」铺骨架，另一块保持现有内容不动，减少不必要的重绘。
  const scope = (options && options.scope) || 'all';
  const skeletonSubscriptions = scope !== 'nodes';
  const skeletonNodes = scope !== 'subscriptions';

  const setBusy = (busy) => {
    if (!btn) return;
    btn.disabled = busy;
    // 不再使用 Bootstrap 的 spinner-border（基座的 border-radius:0 会把它压成方块），
    // 改用站点自有的旋转图标 + 文案；真正的加载反馈由区块骨架屏承担。
    btn.innerHTML = busy
      ? '<i class="bi bi-arrow-repeat me-1 icon-spin"></i> 刷新中...'
      : (btn.dataset.originalHtml || '<i class="bi bi-arrow-repeat me-1"></i> 刷新数据');
  };

  // 骨架屏已经让区块高度基本不变，正常情况下不会再有滚动跳变；
  // 这里再兜一层保险：检测到滚动位置被布局变化带走时立刻写回（用即时滚动，避免与平滑滚动打架）。
  const beginScrollLock = () => {
    const x = window.scrollX;
    const y = window.scrollY;
    let locked = true;

    const unlock = () => { locked = false; };
    window.addEventListener('wheel', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { once: true });

    const restore = () => {
      if (!locked) return;
      if (window.scrollX !== x || window.scrollY !== y) {
        // 直接赋值 = 即时滚动，不受任何 scroll-behavior 影响
        document.documentElement.scrollTop = y;
        document.body.scrollTop = y;
        window.scrollTo(x, y);
      }
      requestAnimationFrame(restore);
    };
    requestAnimationFrame(restore);

    window.setTimeout(() => {
      unlock();
      window.removeEventListener('wheel', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    }, 2500);
  };

  const reloadAll = async () => {
    beginScrollLock();
    await Promise.all([
      Promise.resolve(loadConfig()),
      Promise.resolve(loadSubscriptions(skeletonSubscriptions)),
      typeof window.reloadNodes === 'function'
        ? window.reloadNodes(skeletonNodes)
        : Promise.resolve()
    ]);
  };

  setBusy(true);

  try {
    if (IS_SERVER_MODE && window.location.protocol.includes('http')) {
      // 1) 获取 CSRF 令牌（后端要求 POST 请求携带）
      const tokenResponse = await fetch(`${API_BASE_URL}/api/csrf-token`);
      if (!tokenResponse.ok) throw new Error(`获取 CSRF 令牌失败: ${tokenResponse.status}`);
      const tokenData = await tokenResponse.json();

      // 2) 触发后端抓取：站点订阅 + markdown 节点
      const refreshResponse = await fetch(`${API_BASE_URL}/api/refresh`, {
        method: 'POST',
        headers: { 'x-csrf-token': tokenData.csrfToken || '' }
      });
      const result = await refreshResponse.json();
      if (!refreshResponse.ok || !result.success) {
        throw new Error(result.error || result.message || `抓取失败: ${refreshResponse.status}`);
      }

      // 3) 重新加载页面数据
      await reloadAll();
      showInfoModal('抓取完成，数据已更新。');
    } else {
      // 静态托管环境：数据在定时构建时更新
      await reloadAll();
      showInfoModal(
        typeof REFRESH_RESPONSE !== 'undefined'
          ? REFRESH_RESPONSE.message
          : '当前为静态部署环境，无法实时抓取。数据会在定时构建时自动更新。'
      );
    }
  } catch (error) {
    console.error('刷新失败:', error);
    showErrorModal('刷新失败: ' + (error.message || '未知错误'));
  } finally {
    setBusy(false);
  }
}
window.refreshAllData = refreshAllData;

function loadConfig() {
  try {
    // 检查是否在GitHub Pages环境
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    // 优先使用内联数据
    if (typeof INLINE_CONFIG !== 'undefined') {
      configData = INLINE_CONFIG;
      console.log('使用内联配置数据');
      
      // 处理配置数据
      processConfigData(INLINE_CONFIG);
      
      // 更新统计数据
      if (typeof allSubscriptions !== 'undefined' && allSubscriptions) {
        updateStats(allSubscriptions);
      }
      return;
    }
    
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
    return fetch(apiUrl('/api/config'))
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
  const lastUpdatedEl = document.getElementById('last-updated-time');
  const nextUpdateEl = document.getElementById('next-update-time');
  const modalLastUpdatedEl = document.getElementById('modal-last-updated');
  
  if (nextUpdateEl) {
    // 基于GitHub Actions的cron时间计算下次更新时间
    // GitHub Actions的cron设置为'30 16 * * *'，对应北京时间00:30
    const now = new Date();
    
    // 创建今天的构建时间（UTC时间16:30，对应北京时间00:30）
    const todayBuildTimeUTC = new Date(now);
    todayBuildTimeUTC.setUTCHours(16);
    todayBuildTimeUTC.setUTCMinutes(30);
    todayBuildTimeUTC.setUTCMilliseconds(0);
    
    // 转换为北京时间
    const todayBuildTime = new Date(todayBuildTimeUTC);
    todayBuildTime.setHours(todayBuildTime.getHours() + 8); // UTC+8
    
    // 确定下次更新时间
    let nextUpdateTime;
    if (now > todayBuildTime) {
      // 如果当前时间已经过了今天的构建时间，则下次构建时间为明天同一时间
      nextUpdateTime = new Date(todayBuildTime);
      nextUpdateTime.setDate(nextUpdateTime.getDate() + 1);
    } else {
      // 否则，下次构建时间为今天的构建时间
      nextUpdateTime = todayBuildTime;
    }
    
    // 实时更新倒计时
    function updateCountdown() {
      const now = new Date();
      const timeUntilNextUpdate = nextUpdateTime - now;
      
      // 格式化倒计时为时分秒格式
      const hours = Math.floor(timeUntilNextUpdate / (1000 * 60 * 60));
      const minutes = Math.floor((timeUntilNextUpdate % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeUntilNextUpdate % (1000 * 60)) / 1000);
      
      // 设置时间文本
      if (timeUntilNextUpdate > 0) {
        // 格式化两位数字显示
        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');
        nextUpdateEl.innerHTML = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
      } else {
        nextUpdateEl.innerHTML = `00:00:00`;
      }
      // 设置下次更新字样为绿色
      nextUpdateEl.style.color = 'var(--trae-green)';
    }
    
    // 如果定时器不存在，创建新的；如果存在，只更新倒计时逻辑
    if (!window.countdownInterval) {
      // 初始化倒计时
      updateCountdown();
      
      // 每秒更新一次倒计时
      window.countdownInterval = setInterval(updateCountdown, 1000);
    } else {
      // 只更新倒计时显示，不重置定时器
      updateCountdown();
    }
  }
  
  if (modalLastUpdatedEl && data.settings && data.settings.lastUpdated) {
    const lastUpdated = new Date(data.settings.lastUpdated);
    modalLastUpdatedEl.textContent = lastUpdated.toLocaleString();
  }
  
  // 更新站点列表
  const siteListEl = document.getElementById('site-list');
  const modalSiteListEl = document.getElementById('modal-site-list');
  
  // 按站点URL字母顺序排序
  const sortedSites = [...data.sites].sort((a, b) => a.url.localeCompare(b.url))
  let siteListHTML = '';
  let modalSiteListHTML = '';
  
  if (data.sites && data.sites.length > 0) {
    // 按站点URL字母顺序排序
    const sortedSites = [...data.sites].sort((a, b) => a.url.localeCompare(b.url));
    sortedSites.forEach(site => {
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
  
  // 检查元素是否存在
  const updateIntervalEl = document.getElementById('update-interval');
  if (updateIntervalEl) updateIntervalEl.textContent = '加载失败';
  
  const maxArticlesEl = document.getElementById('max-articles');
  if (maxArticlesEl) maxArticlesEl.textContent = '加载失败';
  
  const lastUpdatedEl = document.getElementById('last-updated');
  if (lastUpdatedEl) lastUpdatedEl.textContent = '加载失败';
  
  const siteListEl = document.getElementById('site-list');
  if (siteListEl) siteListEl.innerHTML = '<div class="text-center text-danger">加载站点列表失败</div>';
}

/**
 * 订阅卡片骨架屏。
 * 复用真实卡片外壳 .subscription-card，使加载期与加载后的高度基本一致，
 * 避免占位内容过矮导致页面高度塌陷、浏览器钳制 scrollTop 引发的滚动跳变。
 * 卡片数量需与当前已渲染的卡片数量对齐，否则页面上方的高度仍会塌陷。
 * 打光只加在前 SHIMMER_LIMIT 张卡片上：屏幕外的卡片看不见打光，
 * 却要额外参与合成，限制数量可以显著降低刷新时的合成开销。
 * @param {number} count 占位卡片数量
 * @returns {string} HTML 片段
 */
function subscriptionSkeletonHtml(count = 6) {
  const SHIMMER_LIMIT = 12;
  let html = '';
  for (let i = 0; i < count; i++) {
    const flat = i >= SHIMMER_LIMIT ? ' skeleton-flat' : '';
    html += `
      <div class="col-lg-6 mb-3">
        <div class="subscription-card skeleton-card${flat}">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <span class="skeleton-line" style="width:72px; height:24px; margin-bottom:0;"></span>
            <span class="skeleton-line" style="width:132px; height:34px; margin-bottom:0;"></span>
          </div>
          <div class="skeleton-line skeleton-line-block"></div>
          <div class="skeleton-line skeleton-line-md"></div>
          <div class="skeleton-line skeleton-line-sm" style="margin-top:10px;"></div>
        </div>
      </div>
    `;
  }
  return html;
}

// 加载订阅数据
/**
 * @param {boolean} showSkeleton 是否先渲染骨架屏占位（刷新另外区块时可传 false，保持现有内容不动）
 */
function loadSubscriptions(showSkeleton = true) {
  const subscriptionsContainer = document.getElementById('subscriptions-container');
  if (!subscriptionsContainer) return;
  
  if (showSkeleton !== false) {
    // 骨架卡数量对齐当前已渲染的卡片数量：数量不一致时页面高度仍会塌陷，
    // 浏览器会把 scrollTop 钳制到新的最大滚动位置，表现为「点刷新页面自己滚走」。
    const prevCards = subscriptionsContainer.querySelectorAll('.subscription-card:not(.skeleton-card)').length;
    const prevHeight = subscriptionsContainer.offsetHeight;
    subscriptionsContainer.innerHTML = subscriptionSkeletonHtml(prevCards > 0 ? prevCards : 6);
    // 高度兜底：骨架卡与真实卡存在几像素误差，按原高度兜底可确保页面高度不缩水
    subscriptionsContainer.style.minHeight = prevHeight > 0 ? prevHeight + 'px' : '';
  }
  
  try {
    // 检查是否在GitHub Pages环境
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    // 本地文件系统环境或GitHub Pages，直接使用内联数据
    if (!window.location.protocol.includes('http') || isGitHubPages) {
      console.log('使用内联订阅数据');
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
          siteName: "示例站点",
          scrapedAt: new Date().toISOString(),
          subscriptionCount: 2,
          subscriptions: [
            {
              type: "Clash",
              name: "示例订阅13",
              url: "https://example.com/sub1"
            },
            {
              type: "Clash",
              name: "示例订阅111",
              url: "https://example.com/sub1"
            },
            {
              type: "Clash",
              name: "示例订阅122",
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
        
        const exampleSubscriptions = { "example": exampleSite };
        // 合并配置文件中的自定义订阅
        allSubscriptions = mergeConfigSubscriptions(exampleSubscriptions);
        updateStats(allSubscriptions);
        detailedData = { "example": exampleSiteDetailed };
        renderSubscriptions();
      }
      return;
    }
    
    // 正常HTTP服务器环境，使用fetch
    return fetch(apiUrl('/api/subscriptions'))
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
        return fetch(apiUrl('/api/sites'));
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
             
            ]
          };
          
          const exampleSiteDetailed = {
            url: "https://example.com",
            siteName: "示例站点 (无法连接到服务器)",
            scrapedAt: new Date().toISOString(),
            totalSubscriptions: 2,
            articles: [
              
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
  subscriptionsContainer.style.minHeight = '';
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
  // 检查数据是否有效
  if (!data || typeof data !== 'object') {
    console.error('无效的数据:', data);
    return;
  }
  
  // 统计总站点数和总订阅数
  let totalSubscriptions = 0;
  let totalSites = Object.keys(data).length;

  // 节点源（GitHub 仓库 + 网页源）同样计入活跃源站
  if (configData && Array.isArray(configData.mdSources)) {
    totalSites += configData.mdSources.length;
  }
  if (configData && Array.isArray(configData.nodeSources)) {
    totalSites += configData.nodeSources.length;
  }

  // 统计订阅总数
  Object.values(data).forEach(site => {
    totalSubscriptions += site.subscriptionCount || 0;
  });
  
  // 更新总节点数显示（去重后）
  const totalNodesEl = document.getElementById('total-nodes');
  if (totalNodesEl) {
    // 获取去重后的订阅数
    const uniqueSubs = getUniqueSubscriptions(data);
    totalNodesEl.textContent = uniqueSubs.length;
  }
  
  // 更新总站点数显示
  const totalSitesEl = document.getElementById('total-sources');
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
    'Shadowrocket': 'primary',
    'Quantumult': 'light',
    'SS/SSR': 'warning',
    'Trojan': 'danger',
    'Hysteria': 'info',
    'WireGuard': 'primary',
    'Tuic': 'success',
    'NaiveProxy': 'secondary',
    'GoFlyway': 'warning',
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
    'Shadowrocket': 'bi bi-rocket',
    'Quantumult': 'bi bi-diagram-3',
    'SS/SSR': 'bi bi-key',
    'Trojan': 'bi bi-shield-lock',
    'Hysteria': 'bi bi-lightning',
    'WireGuard': 'bi bi-shield-exclamation',
    'Tuic': 'bi bi-cpu',
    'NaiveProxy': 'bi bi-browser-chrome',
    'GoFlyway': 'bi bi-airplane',
    '通用': 'bi bi-globe2'
  };
  return iconMap[type] || 'bi bi-link-45deg';
}

// 渲染订阅链接 - 根据当前视图选择渲染函数
function renderSubscriptions() {
  // 刷新协议筛选：选项与数量都取自真实数据
  updateSubscriptionTypeFilter(getUniqueSubscriptions(allSubscriptions));

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

/**
 * 订阅可用性徽章。数据来自抓取期的连通性校验（HTTP 状态 + 内容格式 + 延迟）。
 * @param {Object} subscription 订阅对象
 * @returns {string} HTML 片段
 */
function renderSubscriptionStatus(subscription) {
  if (subscription.online === undefined || subscription.online === null) {
    return '<div class="text-muted smaller mt-2"><i class="bi bi-question-circle me-1"></i>可用性未检测</div>';
  }

  const online = subscription.online === true;
  const details = [];
  if (subscription.httpStatus) details.push(`HTTP ${subscription.httpStatus}`);
  if (online && typeof subscription.latencyMs === 'number') details.push(`${subscription.latencyMs}ms`);
  if (subscription.note) details.push(subscription.note);

  return `
    <div class="mt-2 small">
      <span class="badge bg-${online ? 'success' : 'danger'}">${online ? '可用' : '不可用'}</span>
      <span class="text-muted smaller ms-2">${details.join(' · ')}</span>
    </div>
  `;
}

// 渲染订阅链接 - 简洁视图
function renderNormalView() {
  const subscriptionsContainer = document.getElementById('subscriptions-container');
  const statsContainer = document.getElementById('stats-container');
  if (!subscriptionsContainer) return;
  
  subscriptionsContainer.style.minHeight = ''; // 真实数据就位，移除骨架屏的高度兜底
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
            <span class="type-badge border border-${typeColor} text-${typeColor}">
              <i class="${typeIcon}"></i> ${subscription.type}
              ${isCustom ? '<span class="ms-1 badge px-2 py-1" style="background: rgba(0,0,0,0.8);"><span class="text-gradient">自定义</span></span>' : ''}
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
          ${renderSubscriptionStatus(subscription)}
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
  
  subscriptionsContainer.style.minHeight = ''; // 真实数据就位，移除骨架屏的高度兜底
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
          <span class="badge border border-${typeColor} text-${typeColor} me-2">
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
    'Quantumult': 0,
    'SS/SSR': 0,
    'Trojan': 0,
    'Hysteria': 0,
    'WireGuard': 0,
    'Tuic': 0,
    'NaiveProxy': 0,
    'GoFlyway': 0,
    '通用': 0,
    '自定义': 0
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

/**
 * 依据实际数据动态生成订阅协议筛选选项。
 * 数据里出现哪些协议就列哪些，并带上该协议的数量（与「可导入节点」的做法一致）。
 * @param {Array} subscriptions 去重后的订阅列表
 */
function updateSubscriptionTypeFilter(subscriptions) {
  const select = document.getElementById('type-filter');
  if (!select) return;

  const counts = {};
  subscriptions.forEach(subscription => {
    const type = subscription.type || '未知';
    counts[type] = (counts[type] || 0) + 1;
  });

  // 选项签名不变时不重建 DOM，避免在 change 事件中重建下拉造成闪烁
  const signature = subscriptions.length + '#' + Object.keys(counts).sort()
    .map(type => `${type}:${counts[type]}`).join('|');
  if (select.dataset.optionSignature === signature) return;
  select.dataset.optionSignature = signature;

  const previous = select.value || 'all';

  let html = `<option value="all">所有协议 (${subscriptions.length})</option>`;
  Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
    .forEach(type => {
      html += `<option value="${type}">${type} (${counts[type]})</option>`;
    });
  select.innerHTML = html;

  // 保留此前的选择；若该协议已不存在则回落到「所有协议」
  select.value = (previous === 'all' || counts[previous]) ? previous : 'all';
}

// 获取经过过滤和去重的订阅列表
function getFilteredSubscriptions() {
  // 获取所有订阅并去重
  const uniqueSubscriptions = getUniqueSubscriptions(allSubscriptions);

  const typeFilter = document.getElementById('type-filter');
  if (!typeFilter) return uniqueSubscriptions;

  const selectedType = typeFilter.value;
  if (!selectedType || selectedType === 'all') return uniqueSubscriptions;

  // 协议选项由数据动态生成，这里只做精确匹配
  return uniqueSubscriptions.filter(subscription => (subscription.type || '未知') === selectedType);
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

// 初始化API状态检测
async function initApiStatus() {
  const statusOverlay = document.getElementById('overlay-status');
  if (!statusOverlay) return;

  const siteList = statusOverlay.querySelector('.site-status-list');
  if (!siteList) return;

  const healthStatusEl = statusOverlay.querySelector('.site-status');
  const setSummary = (text, badgeClass) => {
    if (!healthStatusEl) return;
    healthStatusEl.textContent = text;
    healthStatusEl.className = `site-status badge ${badgeClass}`;
    healthStatusEl.style.minWidth = '60px';
    healthStatusEl.style.textAlign = 'center';
  };

  siteList.innerHTML = '<div class="text-secondary small">正在读取健康度数据...</div>';
  setSummary('读取中...', 'bg-secondary');

  // 读取后端实时接口 / 构建期快照产出的统一健康度数据
  let status = null;
  try {
    const response = await fetch(apiUrl('/api/status'));
    if (response.ok) status = await response.json();
  } catch (error) {
    console.error('获取健康度数据失败:', error);
  }
  if (!status && typeof INLINE_STATUS !== 'undefined') status = INLINE_STATUS;

  siteList.innerHTML = '';

  if (!status) {
    siteList.innerHTML = '<div class="text-secondary small">暂无健康度数据</div>';
    setSummary('无数据', 'bg-secondary');
    return;
  }

  const strategyLabels = { article: '文章页', static: '静态订阅', repoDaily: '仓库每日' };
  const stateClass = { ok: 'online', bad: 'offline', unknown: '' };
  const stateText = { ok: '正常', bad: '异常', unknown: '未知' };

  const appendGroupTitle = (text, hint) => {
    const title = document.createElement('div');
    title.className = 'site-group-title';
    title.innerHTML = `${text}${hint ? `<span class="text-secondary smaller ms-2">${hint}</span>` : ''}`;
    siteList.appendChild(title);
  };

  const appendItem = (label, subLabel, state) => {
    const item = document.createElement('div');
    item.className = 'site-status-item';
    item.innerHTML = `
      <div>
        <div class="site-url">${label}</div>
        ${subLabel ? `<div class="text-secondary smaller">${subLabel}</div>` : ''}
      </div>
      <div class="site-status ${stateClass[state] || ''}">${stateText[state] || '未知'}</div>
    `;
    siteList.appendChild(item);
  };

  let healthySources = 0;
  let totalSources = 0;

  // 1) 订阅源：展示每条订阅的可用性（在线/总数）与平均延迟
  const sites = Array.isArray(status.sites) ? status.sites : [];
  if (sites.length) {
    appendGroupTitle('订阅源', `${sites.length} 个`);
    sites.forEach(site => {
      const health = site.health || {};
      const parts = [];
      if (health.total) {
        parts.push(`${health.online || 0}/${health.total} 条可用`);
        if (health.avgLatencyMs) parts.push(`平均 ${health.avgLatencyMs}ms`);
      } else {
        parts.push('未采集到订阅');
      }
      if (site.strategy) parts.push(strategyLabels[site.strategy] || site.strategy);
      if (site.error) parts.push('抓取异常');

      const state = (site.error || !health.total || !health.online) ? 'bad' : 'ok';
      totalSources += 1;
      if (state === 'ok') healthySources += 1;
      appendItem(site.url || site.name, parts.join(' · '), state);
    });
  }

  // 2) 节点源：GitHub 仓库 + 网页源
  const nodeGroups = []
    .concat(Array.isArray(status.mdSources) ? status.mdSources : [])
    .concat(Array.isArray(status.nodeSources) ? status.nodeSources : []);

  if (nodeGroups.length) {
    appendGroupTitle('节点源', `${nodeGroups.length} 个`);
    nodeGroups.forEach(source => {
      const parts = [`${source.nodeCount || 0} 个节点`];
      if (source.kind === 'web') parts.push('网页源');
      else if (source.fileCount) parts.push(`${source.fileCount} 个 md 文件`);
      if (source.error) parts.push('抓取异常');

      const state = (source.error || !source.nodeCount) ? 'bad' : 'ok';
      totalSources += 1;
      if (state === 'ok') healthySources += 1;
      appendItem(source.url || source.name, parts.join(' · '), state);
    });
  }

  // 「爬取源站健康度」这一行的语义是【源站】健康比：订阅源 + 节点源（4 + 2 + 1 = 7）。
  // 之前错误地把「订阅条数」（34/45）填进来，导致 7 个源站显示成 45。
  const nodeTotal = status.nodes ? status.nodes.total : 0;
  const summaryText = totalSources
    ? `${healthySources}/${totalSources} 源站正常`
    : (nodeTotal ? `${nodeTotal} 节点` : '无数据');
  const badge = totalSources === 0 ? 'bg-secondary'
    : healthySources === totalSources ? 'bg-success'
      : healthySources > 0 ? 'bg-warning text-dark' : 'bg-danger';
  setSummary(summaryText, badge);
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