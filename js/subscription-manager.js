/**
 * subscription-manager.js - 订阅管理器
 * 用于管理订阅链接，包括去重、添加本地链接等功能
 */

// 订阅管理器
const SubscriptionManager = {
  // 存储所有订阅
  allSubscriptions: {},
  
  // 存储本地添加的订阅 (localStorage)
  localSubscriptions: [],
  
  // 本地存储键名
  LOCAL_STORAGE_KEY: 'local_subscriptions',
  
  /**
   * 初始化订阅管理器
   */
  init: function() {
    this.loadLocalSubscriptions();
    
    // 为添加本地订阅按钮绑定事件
    const addLocalBtn = document.getElementById('add-local-btn');
    if (addLocalBtn) {
      addLocalBtn.addEventListener('click', () => {
        this.showAddLocalDialog();
      });
    }
    
    // 为管理本地订阅按钮绑定事件
    const manageLocalBtn = document.getElementById('manage-local-btn');
    if (manageLocalBtn) {
      manageLocalBtn.addEventListener('click', () => {
        this.showManageLocalSubscriptions();
      });
    }
  },
  
  /**
   * 加载本地订阅
   */
  loadLocalSubscriptions: function() {
    try {
      const storedData = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      if (storedData) {
        this.localSubscriptions = JSON.parse(storedData);
        console.log(`已加载 ${this.localSubscriptions.length} 个本地订阅`);
      } else {
        this.localSubscriptions = [];
      }
    } catch (error) {
      console.error('加载本地订阅失败:', error);
      this.localSubscriptions = [];
    }
  },
  
  /**
   * 保存本地订阅
   */
  saveLocalSubscriptions: function() {
    try {
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(this.localSubscriptions));
      console.log(`已保存 ${this.localSubscriptions.length} 个本地订阅`);
    } catch (error) {
      console.error('保存本地订阅失败:', error);
      showErrorModal('保存本地订阅失败: ' + error.message);
    }
  },
  
  /**
   * 合并远程和本地订阅
   * @param {Object} remoteSubscriptions 远程订阅数据
   * @returns {Object} 合并后的订阅数据
   */
  mergeSubscriptions: function(remoteSubscriptions) {
    const result = JSON.parse(JSON.stringify(remoteSubscriptions)); // 深拷贝
    
    // 如果有本地订阅，添加到结果中
    if (this.localSubscriptions.length > 0) {
      // 创建本地订阅站点
      const localSite = {
        url: "localhost",
        siteName: "本地订阅",
        scrapedAt: new Date().toISOString(),
        subscriptionCount: this.localSubscriptions.length,
        subscriptions: this.localSubscriptions
      };
      
      // 添加到结果
      result.localhost = localSite;
    }
    
    return result;
  },
  
  /**
   * 获取所有订阅（去重后）
   * @param {Object} allSubscriptions 所有订阅数据
   * @returns {Array} 去重后的订阅数组
   */
  getUniqueSubscriptions: function(allSubscriptions) {
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
  },
  
  /**
   * 显示添加本地订阅对话框
   */
  showAddLocalDialog: function() {
    // 使用Bootstrap模态框，不需要创建DOM元素
    const modal = new bootstrap.Modal(document.getElementById('addLocalModal'));
    modal.show();
  },
  
  /**
   * 添加本地订阅
   */
  addLocalSubscription: function() {
    try {
      const nameInput = document.getElementById('local-name-input');
      const urlInput = document.getElementById('local-url-input');
      const typeSelect = document.getElementById('local-type-select');
      
      const name = nameInput.value.trim();
      const url = urlInput.value.trim();
      const type = typeSelect.value;
      
      // 校验输入
      if (!name || !url) {
        showErrorModal('名称和URL不能为空');
        return;
      }
      
      // 检查URL是否已存在
      const exists = this.localSubscriptions.some(sub => sub.url === url);
      if (exists) {
        showErrorModal('此订阅链接已存在');
        return;
      }
      
      // 创建新的本地订阅
      const newSubscription = {
        type: type,
        name: name,
        url: url,
        description: `本地添加的${type}订阅: ${name}`,
        isLocal: true, // 标记为本地添加
        addedAt: new Date().toISOString()
      };
      
      // 添加到本地订阅列表
      this.localSubscriptions.push(newSubscription);
      
      // 保存到localStorage
      this.saveLocalSubscriptions();
      
      // 清空输入框
      nameInput.value = '';
      urlInput.value = '';
      
      // 关闭模态框
      const modal = bootstrap.Modal.getInstance(document.getElementById('addLocalModal'));
      if (modal) modal.hide();
      
      // 重新渲染订阅列表
      showInfoModal('本地订阅添加成功！');
      
      // 如果存在渲染函数，调用它
      if (typeof renderSubscriptions === 'function') {
        renderSubscriptions();
      }
    } catch (error) {
      console.error('添加本地订阅失败:', error);
      showErrorModal('添加本地订阅失败: ' + error.message);
    }
  },
  
  /**
   * 删除本地订阅
   * @param {string} url 要删除的订阅URL
   */
  deleteLocalSubscription: function(url) {
    try {
      // 查找订阅索引
      const index = this.localSubscriptions.findIndex(sub => sub.url === url);
      if (index === -1) {
        showErrorModal('未找到此本地订阅');
        return;
      }
      
      // 从数组中删除
      this.localSubscriptions.splice(index, 1);
      
      // 保存到localStorage
      this.saveLocalSubscriptions();
      
      // 重新渲染订阅列表
      showInfoModal('本地订阅已删除');
      
      // 如果存在渲染函数，调用它
      if (typeof renderSubscriptions === 'function') {
        renderSubscriptions();
      }
    } catch (error) {
      console.error('删除本地订阅失败:', error);
      showErrorModal('删除本地订阅失败: ' + error.message);
    }
  },
  
  /**
   * 显示管理本地订阅对话框
   */
  showManageLocalSubscriptions: function() {
    const modal = new bootstrap.Modal(document.getElementById('manageLocalModal'));
    const listContainer = document.getElementById('local-subscriptions-list');
    
    if (!listContainer) return;
    
    // 创建本地订阅列表HTML
    let html = '';
    
    if (this.localSubscriptions.length === 0) {
      html = `<div class="alert alert-info">您还没有添加任何本地订阅。点击"添加本地订阅"按钮开始添加。</div>`;
    } else {
      html = `
        <div class="table-responsive">
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                <th width="15%">类型</th>
                <th width="20%">名称</th>
                <th width="35%">URL</th>
                <th width="15%">添加时间</th>
                <th width="15%">操作</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      this.localSubscriptions.forEach((sub, index) => {
        const typeColor = getTypeColor(sub.type);
        const typeIcon = getTypeIcon(sub.type);
        const addedDate = formatDate(sub.addedAt);
        
        html += `
          <tr>
            <td>
              <span class="badge bg-${typeColor}">
                <i class="${typeIcon} me-1"></i>${sub.type}
              </span>
            </td>
            <td>${sub.name}</td>
            <td class="text-truncate" style="max-width: 200px;" title="${sub.url}">
              ${sub.url}
            </td>
            <td>${addedDate}</td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" onclick="SubscriptionManager.editLocalSubscription('${sub.url}')">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-outline-danger" onclick="SubscriptionManager.deleteLocalSubscription('${sub.url}')">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
        </div>
      `;
    }
    
    listContainer.innerHTML = html;
    modal.show();
  },
  
  /**
   * 编辑本地订阅
   * @param {string} url 要编辑的订阅URL
   */
  editLocalSubscription: function(url) {
    try {
      // 查找订阅索引
      const index = this.localSubscriptions.findIndex(sub => sub.url === url);
      if (index === -1) {
        showErrorModal('未找到此本地订阅');
        return;
      }
      
      const subscription = this.localSubscriptions[index];
      
      // 打开编辑模态框
      const editModal = new bootstrap.Modal(document.getElementById('editLocalModal'));
      
      // 填充表单
      document.getElementById('edit-local-name-input').value = subscription.name;
      document.getElementById('edit-local-url-input').value = subscription.url;
      document.getElementById('edit-local-type-select').value = subscription.type;
      document.getElementById('old-local-url').value = subscription.url; // 用于标识要编辑的订阅
      
      // 显示模态框
      editModal.show();
    } catch (error) {
      console.error('编辑本地订阅失败:', error);
      showErrorModal('编辑本地订阅失败: ' + error.message);
    }
  },
  
  /**
   * 保存编辑后的本地订阅
   */
  saveEditedLocalSubscription: function() {
    try {
      const nameInput = document.getElementById('edit-local-name-input');
      const urlInput = document.getElementById('edit-local-url-input');
      const typeSelect = document.getElementById('edit-local-type-select');
      const oldUrlInput = document.getElementById('old-local-url');
      
      const name = nameInput.value.trim();
      const url = urlInput.value.trim();
      const type = typeSelect.value;
      const oldUrl = oldUrlInput.value.trim();
      
      // 校验输入
      if (!name || !url) {
        showErrorModal('名称和URL不能为空');
        return;
      }
      
      // 查找要编辑的订阅索引
      const index = this.localSubscriptions.findIndex(sub => sub.url === oldUrl);
      if (index === -1) {
        showErrorModal('未找到此本地订阅');
        return;
      }
      
      // 如果URL改变了，检查是否与其他订阅重复
      if (url !== oldUrl && this.localSubscriptions.some(sub => sub.url === url)) {
        showErrorModal('此订阅链接已存在');
        return;
      }
      
      // 更新订阅信息
      this.localSubscriptions[index] = {
        ...this.localSubscriptions[index],
        type: type,
        name: name,
        url: url,
        description: `本地添加的${type}订阅: ${name}`,
        updatedAt: new Date().toISOString()
      };
      
      // 保存到localStorage
      this.saveLocalSubscriptions();
      
      // 关闭模态框
      const modal = bootstrap.Modal.getInstance(document.getElementById('editLocalModal'));
      if (modal) modal.hide();
      
      // 更新本地订阅管理界面
      this.showManageLocalSubscriptions();
      
      // 重新渲染订阅列表
      showInfoModal('本地订阅已更新');
      
      // 如果存在渲染函数，调用它
      if (typeof renderSubscriptions === 'function') {
        renderSubscriptions();
      }
    } catch (error) {
      console.error('保存编辑的本地订阅失败:', error);
      showErrorModal('保存编辑的本地订阅失败: ' + error.message);
    }
  }
};

/**
 * 根据类型获取颜色
 * @param {string} type 订阅类型
 * @returns {string} 颜色名称
 */
function getTypeColor(type) {
  switch (type) {
    case 'Clash':
      return 'primary';
    case 'V2ray':
      return 'success';
    case 'Sing-Box':
      return 'dark';
    case 'Shadowrocket':
      return 'secondary';
    case 'Quantumult':
      return 'light text-dark';
    case '本地':
      return 'info';
    default:
      return 'secondary';
  }
}

/**
 * 根据类型获取图标
 * @param {string} type 订阅类型
 * @returns {string} 图标类名
 */
function getTypeIcon(type) {
  switch (type) {
    case 'Clash':
      return 'bi bi-shield';
    case 'V2ray':
      return 'bi bi-hdd-network';
    case 'Sing-Box':
      return 'bi bi-box';
    case 'Shadowrocket':
      return 'bi bi-rocket';
    case 'Quantumult':
      return 'bi bi-graph-up';
    case '本地':
      return 'bi bi-bookmark';
    default:
      return 'bi bi-link-45deg';
  }
}

/**
 * 格式化日期
 * @param {string} dateString 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateString) {
  if (!dateString) return '未知';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('日期格式化失败:', error);
    return dateString;
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  SubscriptionManager.init();
}); 