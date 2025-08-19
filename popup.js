// DashTab主要JavaScript逻辑文件 - 使用库版本

class DashTab {
    constructor() {
        this.data = {
            sites: [],
            groups: {},
            visitStats: {}
        };
        this.settings = {
            theme: 'auto',
            sitesPerRow: 5,
            searchEngines: {},
            defaultSearchEngine: 'google',
            searchOpenMode: 'current', // current 或 new
            siteOpenMode: 'current'    // current 或 new
        };
        // 恢复保存的标签状态，默认为frequent
        this.currentTag = localStorage.getItem('dashTabCurrentTag') || 'frequent';
        this.currentPage = 1;
        this.sitesPerPage = 30; // 每页显示的网站数量
        this.draggedSite = null;
        this.contextMenuSite = null;
        this.sortableInstance = null;
        this.searchInstance = null;
        
        // 确保库已加载
        this.waitForLibraries().then(() => {
            this.init();
        });
    }
    
    // 等待库加载完成
    async waitForLibraries() {
        return new Promise((resolve) => {
            const checkLibraries = () => {
                if (window.DashTabLibs && window.DashTabIcons) {
                    resolve();
                } else {
                    setTimeout(checkLibraries, 100);
                }
            };
            checkLibraries();
        });
    }
    
    // 初始化应用
    async init() {
        console.log('DashTab初始化开始');
        
        try {
            // 显示加载状态
            this.showLoading(true);
            
            // 加载数据和设置
            await this.loadData();
            
            // 初始化UI
            this.initializeUI();
            
            // 绑定事件
            this.bindEvents();
            
            // 应用主题
            this.applyTheme();
            
            // 渲染页面
            this.render();
            
            // 开始时间更新
            this.startTimeUpdate();
            
                    // 初始化拖拽排序
        this.initializeSortable();
        
        // 初始化标签拖拽排序
        this.initializeTagSortable();
            
            // 隐藏加载状态
            this.showLoading(false);
            
            console.log('DashTab初始化完成');
        } catch (error) {
            console.error('DashTab初始化失败:', error);
            this.showToast('初始化失败，请刷新页面重试', 'error');
            this.showLoading(false);
        }
    }
    
    // 加载数据
    async loadData() {
        return new Promise((resolve, reject) => {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                // Chrome扩展环境
                chrome.runtime.sendMessage({ action: 'getData' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('加载数据失败:', chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    
                    if (response && response.data) {
                        this.data = response.data;
                        this.settings = response.settings || this.settings;
                        console.log('数据加载成功:', this.data);
                        resolve();
                    } else {
                        reject(new Error('无法获取数据'));
                    }
                });
            } else {
                // 本地开发环境，使用localStorage
                const savedData = localStorage.getItem('dashTabData');
                const savedSettings = localStorage.getItem('dashTabSettings');
                
                if (savedData) {
                    this.data = JSON.parse(savedData);
                }
                if (savedSettings) {
                    this.settings = JSON.parse(savedSettings);
                }
                
                console.log('本地数据加载完成');
                resolve();
            }
        });
    }
    
    // 保存数据
    async saveData() {
        return new Promise((resolve, reject) => {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                // Chrome扩展环境
                chrome.runtime.sendMessage({ 
                    action: 'saveData', 
                    data: this.data 
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('保存数据失败:', chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    
                    if (response && response.success) {
                        console.log('数据保存成功');
                        resolve();
                    } else {
                        reject(new Error('保存数据失败'));
                    }
                });
            } else {
                // 本地开发环境
                try {
                    localStorage.setItem('dashTabData', JSON.stringify(this.data));
                    localStorage.setItem('dashTabSettings', JSON.stringify(this.settings));
                    console.log('本地数据保存完成');
                    resolve();
                } catch (error) {
                    console.error('本地数据保存失败:', error);
                    reject(error);
                }
            }
        });
    }
    
    // 保存设置
    async saveSettings() {
        return new Promise((resolve, reject) => {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({ 
                    action: 'saveSettings', 
                    settings: this.settings 
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    
                    if (response && response.success) {
                        resolve();
                    } else {
                        reject(new Error('保存设置失败'));
                    }
                });
            } else {
                try {
                    localStorage.setItem('dashTabSettings', JSON.stringify(this.settings));
                    resolve();
                } catch (error) {
                    reject(error);
                }
            }
        });
    }
    
    // 初始化UI
    initializeUI() {
        // 设置网站每行数量的CSS变量
        document.documentElement.style.setProperty('--sites-per-row', this.settings.sitesPerRow);
        
        // 初始化搜索引擎下拉框
        this.updateSearchEngineSelect();
        
        // 初始化标签筛选
        this.updateTagFilter();
        
        // 替换所有图标
        this.replaceAllIcons();
        
        // 检查URL参数
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('welcome') === 'true') {
            this.showToast('欢迎使用DashTab导航扩展！', 'success');
        }
    }
    
    // 替换所有图标
    replaceAllIcons() {
        // 使用库中的图标替换页面中的icon类
        document.querySelectorAll('.icon').forEach(element => {
            const classList = Array.from(element.classList);
            const iconClass = classList.find(cls => cls.startsWith('icon-'));
            
            if (iconClass) {
                const iconName = iconClass.replace('icon-', '');
                const size = element.style.fontSize || '24px';
                const iconHTML = window.DashTabIcons.getIcon(iconName, { 
                    size: parseInt(size),
                    className: element.className.replace(/icon-\w+/, '')
                });
                element.outerHTML = iconHTML;
            }
        });
    }
    
    // 初始化拖拽排序
    initializeSortable() {
        const allSitesContainer = document.getElementById('all-sites');
        if (allSitesContainer && window.DashTabLibs.Sortable) {
            this.sortableInstance = window.DashTabLibs.utils.createSortable(allSitesContainer, {
                animation: 200,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                onEnd: (evt) => this.handleSortEnd(evt)
            });
        }
    }
    
    // 初始化标签拖拽排序
    initializeTagSortable() {
        const tagFilter = document.getElementById('tag-filter');
        if (tagFilter && window.DashTabLibs.Sortable) {
            this.tagSortableInstance = window.DashTabLibs.utils.createSortable(tagFilter, {
                animation: 200,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
                filter: '.frequent-tab', // 最常访问标签不可拖拽
                onEnd: (evt) => this.handleTagSortEnd(evt)
            });
        }
    }
    
    // 处理排序结束
    async handleSortEnd(evt) {
        try {
            const { oldIndex, newIndex } = evt;
            if (oldIndex === newIndex) return;
            
            // 获取当前筛选的网站列表
            let sites = this.getFilteredSitesForSort();
            
            // 移动元素
            const [movedSite] = sites.splice(oldIndex, 1);
            sites.splice(newIndex, 0, movedSite);
            
            // 更新order属性
            sites.forEach((site, index) => {
                site.order = index;
            });
            
            // 保存数据
            await this.saveData();
            
            this.showToast('网站顺序已更新', 'success');
        } catch (error) {
            console.error('拖拽排序失败:', error);
            this.showToast('排序失败，请重试', 'error');
        }
    }
    
    // 处理标签排序结束
    async handleTagSortEnd(evt) {
        try {
            const { oldIndex, newIndex } = evt;
            if (oldIndex === newIndex) return;
            
            // 获取标签顺序
            const tagElements = document.querySelectorAll('.tag-tab');
            const tagOrder = Array.from(tagElements).map(tab => tab.dataset.group);
            
            // 保存标签顺序到设置中
            this.settings.tagOrder = tagOrder;
            
            // 保存设置
            await this.saveSettings();
            
            // 立即重新渲染标签筛选器以应用新顺序
            this.applyTagOrder();
            
            this.showToast('标签顺序已更新', 'success');
        } catch (error) {
            console.error('标签排序失败:', error);
            this.showToast('标签排序失败，请重试', 'error');
        }
    }
    
    // 应用标签排序
    applyTagOrder() {
        if (!this.settings.tagOrder) return;
        
        const container = document.getElementById('tag-filter');
        if (!container) return;
        
        const tagElements = Array.from(container.querySelectorAll('.tag-tab'));
        
        // 按照保存的顺序重新排列标签
        this.settings.tagOrder.forEach(tagKey => {
            const tagElement = tagElements.find(el => el.dataset.group === tagKey);
            if (tagElement) {
                container.appendChild(tagElement);
            }
        });
    }
    
    // 获取用于排序的网站列表
    getFilteredSitesForSort() {
        if (this.currentTag === 'all') {
            return this.data.sites;
        } else if (this.currentTag === 'frequent') {
            return this.getFrequentSites();
        } else {
            return this.data.sites.filter(site => (site.tag || site.group) === this.currentTag);
        }
    }
    
    // 绑定事件
    bindEvents() {
        // 添加网站按钮
        const addSiteBtn = document.getElementById('add-site-btn');
        const addSiteModal = document.getElementById('add-site-modal');
        const closeModalBtn = document.getElementById('close-modal-btn');
        
        addSiteBtn?.addEventListener('click', () => this.showAddSiteModal());
        closeModalBtn?.addEventListener('click', () => this.hideAddSiteModal());
        
        // 点击模态框背景关闭
        addSiteModal?.addEventListener('click', (e) => {
            if (e.target === addSiteModal) {
                this.hideAddSiteModal();
            }
        });
        
        // 添加网站表单
        const addSiteForm = document.getElementById('add-site-form');
        addSiteForm?.addEventListener('submit', (e) => this.handleAddSite(e));
        
        // 颜色选择器
        const colorSelect = document.getElementById('site-color');
        const colorPreview = document.getElementById('color-preview');
        colorSelect?.addEventListener('change', () => {
            colorPreview.style.backgroundColor = colorSelect.value;
        });
        
        // 搜索功能
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        
        searchInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
        searchBtn?.addEventListener('click', () => this.performSearch());
        
        // 标签筛选
        const tagTabs = document.querySelectorAll('.tag-tab');
        tagTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tag = tab.dataset.group; // 保持使用data-group属性以兼容现有代码
                this.filterByTag(tag);
            });
        });
        
        // 自定义标签输入
        const tagSelect = document.getElementById('site-tag');
        const customTagInput = document.getElementById('custom-tag-input');
        
        tagSelect?.addEventListener('change', () => {
            if (tagSelect.value === 'custom') {
                customTagInput.style.display = 'block';
                customTagInput.focus();
            } else {
                customTagInput.style.display = 'none';
                customTagInput.value = '';
            }
        });
        
        // 颜色选择器交互
        const colorOptions = document.querySelectorAll('.color-option');
        const colorInput = document.getElementById('site-color');
        
        colorOptions.forEach(option => {
            option.addEventListener('click', () => {
                // 移除其他选中状态
                colorOptions.forEach(opt => opt.classList.remove('active'));
                // 设置当前选中
                option.classList.add('active');
                // 更新隐藏输入值
                colorInput.value = option.dataset.color;
            });
        });
        
        // 取消按钮
        const cancelAddBtn = document.getElementById('cancel-add-btn');
        cancelAddBtn?.addEventListener('click', () => this.hideAddSiteModal());
        
        // 设置按钮
        const settingsBtn = document.getElementById('settings-btn');
        const settingsModal = document.getElementById('settings-modal');
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        
        settingsBtn?.addEventListener('click', () => this.showSettingsModal());
        closeSettingsBtn?.addEventListener('click', () => this.hideSettingsModal());
        
        // 设置模态框背景点击关闭
        settingsModal?.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                this.hideSettingsModal();
            }
        });
        
        // 主题切换
        const themeSelect = document.getElementById('theme-select');
        themeSelect?.addEventListener('change', () => {
            this.settings.theme = themeSelect.value;
            this.applyTheme();
            this.saveSettings();
        });
        
        // 每行网站数量设置
        const sitesPerRowSelect = document.getElementById('sites-per-row');
        sitesPerRowSelect?.addEventListener('change', () => {
            this.settings.sitesPerRow = parseInt(sitesPerRowSelect.value);
            document.documentElement.style.setProperty('--sites-per-row', this.settings.sitesPerRow);
            this.saveSettings();
            this.render();
        });
        
        // 搜索打开方式设置
        const searchOpenModeSelect = document.getElementById('search-open-mode');
        searchOpenModeSelect?.addEventListener('change', () => {
            this.settings.searchOpenMode = searchOpenModeSelect.value;
            this.saveSettings();
        });
        
        // 网站打开方式设置
        const siteOpenModeSelect = document.getElementById('site-open-mode');
        siteOpenModeSelect?.addEventListener('change', () => {
            this.settings.siteOpenMode = siteOpenModeSelect.value;
            this.saveSettings();
        });
        
        // 分页控制
        const prevPageBtn = document.getElementById('prev-page');
        const nextPageBtn = document.getElementById('next-page');
        
        prevPageBtn?.addEventListener('click', () => this.previousPage());
        nextPageBtn?.addEventListener('click', () => this.nextPage());
        
        // 右键菜单
        document.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
        document.addEventListener('click', () => this.hideContextMenu());
        
        // 数据管理按钮
        const exportBtn = document.getElementById('export-data');
        const importBtn = document.getElementById('import-data');
        const resetBtn = document.getElementById('reset-data');
        
        exportBtn?.addEventListener('click', () => this.exportData());
        importBtn?.addEventListener('click', () => this.importData());
        resetBtn?.addEventListener('click', () => this.resetData());
        
        // 搜索引擎管理
        const manageSearchEnginesBtn = document.getElementById('manage-search-engines');
        const searchEngineModal = document.getElementById('search-engine-modal');
        const closeSearchEngineBtn = document.getElementById('close-search-engine-btn');
        const addSearchEngineForm = document.getElementById('add-search-engine-form');
        
        manageSearchEnginesBtn?.addEventListener('click', () => this.showSearchEngineModal());
        closeSearchEngineBtn?.addEventListener('click', () => this.hideSearchEngineModal());
        addSearchEngineForm?.addEventListener('submit', (e) => this.handleAddSearchEngine(e));
        
        // 搜索引擎模态框背景点击关闭
        searchEngineModal?.addEventListener('click', (e) => {
            if (e.target === searchEngineModal) {
                this.hideSearchEngineModal();
            }
        });
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // 窗口大小变化
        window.addEventListener('resize', window.DashTabLibs.utils.throttle(() => this.handleResize(), 250));
        
        // 监听主题变化
        if (window.matchMedia) {
            const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
            darkModeQuery.addEventListener('change', () => {
                if (this.settings.theme === 'auto') {
                    this.applyTheme();
                }
            });
        }
    }
    
    // 显示/隐藏加载状态
    showLoading(show) {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) {
            loadingEl.style.display = show ? 'flex' : 'none';
        }
    }
    
    // 显示添加网站模态框
    showAddSiteModal() {
        const modal = document.getElementById('add-site-modal');
        if (modal) {
            modal.classList.add('show');
            modal.style.display = 'flex';
            
            // 使用库的动画效果
            window.DashTabLibs.utils.addAnimation(modal, 'fadeIn');
            
            // 聚焦到第一个输入框
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }
    
    // 隐藏添加网站模态框
    hideAddSiteModal() {
        const modal = document.getElementById('add-site-modal');
        const form = document.getElementById('add-site-form');
        
        if (modal) {
            modal.classList.remove('show');
            window.DashTabLibs.utils.addAnimation(modal, 'fadeOut', () => {
                modal.style.display = 'none';
            });
        }
        
        if (form) {
            form.reset();
            this.clearFormErrors();
            
            // 重置颜色选择器
            const colorOptions = document.querySelectorAll('.color-option');
            const colorInput = document.getElementById('site-color');
            colorOptions.forEach(opt => opt.classList.remove('active'));
            colorOptions[0]?.classList.add('active'); // 默认选中第一个
            if (colorInput) colorInput.value = '#007aff';
        }
    }
    
    // 显示设置模态框
    showSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.add('show');
            modal.style.display = 'flex';
            
            window.DashTabLibs.utils.addAnimation(modal, 'fadeIn');
            
            // 更新设置值
            const themeSelect = document.getElementById('theme-select');
            const sitesPerRowSelect = document.getElementById('sites-per-row');
            const searchOpenModeSelect = document.getElementById('search-open-mode');
            const siteOpenModeSelect = document.getElementById('site-open-mode');
            
            if (themeSelect) themeSelect.value = this.settings.theme;
            if (sitesPerRowSelect) sitesPerRowSelect.value = this.settings.sitesPerRow;
            if (searchOpenModeSelect) searchOpenModeSelect.value = this.settings.searchOpenMode || 'current';
            if (siteOpenModeSelect) siteOpenModeSelect.value = this.settings.siteOpenMode || 'current';
        }
    }
    
    // 隐藏设置模态框
    hideSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('show');
            window.DashTabLibs.utils.addAnimation(modal, 'fadeOut', () => {
                modal.style.display = 'none';
            });
        }
    }
    
    // 处理添加网站
    async handleAddSite(e) {
        e.preventDefault();
        
        const form = e.target;
        
        const tagSelect = form.querySelector('#site-tag');
        const customTagInput = form.querySelector('#custom-tag-input');
        
        let tag = tagSelect.value;
        if (tag === 'custom' && customTagInput.value.trim()) {
            tag = customTagInput.value.trim().toLowerCase();
        }
        
        const siteData = {
            name: form.querySelector('#site-name').value.trim(),
            url: form.querySelector('#site-url').value.trim(),
            color: form.querySelector('#site-color').value,
            tag: tag
        };
        
        // 验证表单
        if (!this.validateSiteForm(siteData)) {
            return;
        }
        
        try {
            // 生成唯一ID
            const id = 'site_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // 创建网站对象
            const site = {
                id,
                name: siteData.name,
                url: this.normalizeUrl(siteData.url),
                color: siteData.color,
                tag: siteData.tag,
                icon: this.generateSiteIcon(siteData.name),
                createdAt: Date.now(),
                order: this.data.sites.length
            };
            
            // 添加到数据
            this.data.sites.push(site);
            
            // 初始化访问统计
            this.data.visitStats[id] = {
                count: 0,
                lastVisit: null
            };
            
            // 保存数据
            await this.saveData();
            
            // 隐藏模态框
            this.hideAddSiteModal();
            
            // 重新渲染
            this.render();
            
            // 显示成功消息
            this.showToast(`网站"${site.name}"添加成功！`, 'success');
            
        } catch (error) {
            console.error('添加网站失败:', error);
            this.showToast('添加网站失败，请重试', 'error');
        }
    }
    
    // 验证网站表单
    validateSiteForm(data) {
        let isValid = true;
        
        // 清除之前的错误
        this.clearFormErrors();
        
        // 验证网站名称
        if (!data.name) {
            this.showFormError('name-error', '请输入网站名称');
            isValid = false;
        } else if (data.name.length > 16) {
            this.showFormError('name-error', '网站名称不能超过16个字符');
            isValid = false;
        }
        
        // 验证网址
        if (!data.url) {
            this.showFormError('url-error', '请输入网站地址');
            isValid = false;
        } else if (!window.DashTabLibs.utils.isValidUrl(data.url)) {
            this.showFormError('url-error', '请输入有效的网址');
            isValid = false;
        }
        
        // 验证标签
        if (!data.tag) {
            this.showFormError('tag-error', '请选择标签');
            isValid = false;
        } else if (data.tag.length > 10) {
            this.showFormError('tag-error', '标签名称不能超过10个字符');
            isValid = false;
        }
        
        return isValid;
    }
    
    // 显示表单错误
    showFormError(elementId, message) {
        const errorEl = document.getElementById(elementId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add('show');
        }
    }
    
    // 清除表单错误
    clearFormErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(el => {
            el.textContent = '';
            el.classList.remove('show');
        });
    }
    
    // 标准化URL
    normalizeUrl(url) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return 'https://' + url;
        }
        return url;
    }
    
    // 生成网站图标文本
    generateSiteIcon(name) {
        if (!name) return '';
        
        // 如果是中文，取前两个字符
        if (/[\u4e00-\u9fa5]/.test(name)) {
            return name.substring(0, 2);
        }
        
        // 如果是英文，取首字母
        const words = name.split(' ').filter(word => word.length > 0);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        } else if (words.length === 1) {
            return words[0].substring(0, 2).toUpperCase();
        }
        
        return name.substring(0, 2).toUpperCase();
    }
    
    // 执行搜索
    performSearch() {
        const searchInput = document.getElementById('search-input');
        const searchEngine = document.getElementById('search-engine');
        
        if (!searchInput || !searchEngine) return;
        
        const query = searchInput.value.trim();
        if (!query) return;
        
        const engineKey = searchEngine.value;
        const engine = this.settings.searchEngines[engineKey];
        
        if (engine) {
            const searchUrl = engine.url.replace('%s', encodeURIComponent(query));
            
            // 根据设置打开搜索结果
            if (typeof chrome !== 'undefined' && chrome.tabs) {
                if (this.settings.searchOpenMode === 'new') {
                    chrome.tabs.create({ url: searchUrl });
                } else {
                    chrome.tabs.update({ url: searchUrl });
                }
            } else {
                if (this.settings.searchOpenMode === 'new') {
                    window.open(searchUrl, '_blank');
                } else {
                    window.location.href = searchUrl;
                }
            }
            
            // 清空搜索框
            searchInput.value = '';
        }
    }
    
    // 按标签筛选
    filterByTag(tag) {
        this.currentTag = tag;
        this.currentPage = 1;
        
        // 保存当前标签状态到本地存储
        localStorage.setItem('dashTabCurrentTag', tag);
        
        // 更新标签状态
        const tagTabs = document.querySelectorAll('.tag-tab');
        tagTabs.forEach(tab => {
            if (tab.dataset.group === tag) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // 重新渲染
        this.render();
        
        // 重新初始化拖拽排序
        setTimeout(() => {
            this.initializeSortable();
            this.initializeTagSortable();
        }, 100);
    }
    
    // 渲染页面
    render() {
        this.renderSites();
        this.renderPagination();
        this.updateSitesCount();
    }
    
    // 渲染网站
    renderSites() {
        const sites = this.getFilteredSites();
        
        if (this.currentTag === 'frequent') {
            // 显示常用网站
            this.renderFrequentSites(sites);
            this.renderAllSites([]);
            this.renderEmptyState(sites.length === 0);
        } else {
            // 显示普通网站列表
            this.renderFrequentSites([]);
            this.renderAllSites(sites);
            this.renderEmptyState(sites.length === 0);
        }
    }
    
    // 获取常用网站
    getFrequentSites() {
        return this.data.sites
            .filter(site => {
                const stats = this.data.visitStats[site.id];
                return stats && stats.count > 0;
            })
            .sort((a, b) => {
                const statsA = this.data.visitStats[a.id];
                const statsB = this.data.visitStats[b.id];
                return (statsB?.count || 0) - (statsA?.count || 0);
            })
            .slice(0, 5); // 只显示前5个最常用的
    }
    
    // 获取筛选后的网站
    getFilteredSites() {
        let sites = this.data.sites;
        
        // 如果是常用标签，返回常用网站
        if (this.currentTag === 'frequent') {
            return this.getFrequentSites();
        }
        
        // 按标签筛选
        if (this.currentTag !== 'all') {
            sites = sites.filter(site => (site.tag || site.group) === this.currentTag);
        }
        
        // 按order排序
        sites.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // 分页
        const startIndex = (this.currentPage - 1) * this.sitesPerPage;
        const endIndex = startIndex + this.sitesPerPage;
        
        return sites.slice(startIndex, endIndex);
    }
    
    // 渲染常用网站
    renderFrequentSites(sites) {
        const container = document.getElementById('frequent-sites');
        const section = document.getElementById('frequent-section');
        
        if (!container || !section) return;
        
        if (sites.length === 0 || this.currentTag !== 'frequent') {
            section.style.display = 'none';
            return;
        }
        
        section.style.display = 'block';
        container.innerHTML = '';
        
        sites.forEach(site => {
            const siteEl = this.createFrequentSiteElement(site);
            container.appendChild(siteEl);
        });
    }
    
    // 创建常用网站元素（只显示名称）
    createFrequentSiteElement(site) {
        const div = document.createElement('div');
        div.className = 'frequent-site-item';
        div.dataset.siteId = site.id;
        div.textContent = site.name;
        
        // 绑定事件
        div.addEventListener('click', () => this.openSite(site));
        
        return div;
    }
    
    // 渲染所有网站
    renderAllSites(sites) {
        const container = document.getElementById('all-sites');
        if (!container) return;
        
        container.innerHTML = '';
        
        sites.forEach(site => {
            const siteEl = this.createSiteElement(site, false);
            container.appendChild(siteEl);
        });
    }
    
    // 创建网站元素
    createSiteElement(site, isFrequent = false) {
        const div = document.createElement('div');
        div.className = `site-item${isFrequent ? ' frequent' : ''}`;
        div.dataset.siteId = site.id;
        
        // 使用库的颜色工具
        const bgColor = window.DashTabLibs.tinycolor(site.color).setAlpha(0.2).toRgbString();
        div.style.background = bgColor;
        
        div.innerHTML = `
            <div class="site-icon" style="background-color: ${site.color};">
                ${site.icon}
            </div>
            <div class="site-name" title="${site.name}">
                ${site.name}
            </div>
        `;
        
        // 绑定事件
        div.addEventListener('click', () => this.openSite(site));
        
        return div;
    }
    
    // 打开网站
    openSite(site) {
        // 更新访问统计
        this.updateSiteVisitStats(site.id);
        
        // 根据设置打开网站
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            if (this.settings.siteOpenMode === 'new') {
                chrome.tabs.create({ url: site.url });
            } else {
                chrome.tabs.update({ url: site.url });
            }
        } else {
            if (this.settings.siteOpenMode === 'new') {
                window.open(site.url, '_blank');
            } else {
                window.location.href = site.url;
            }
        }
    }
    
    // 更新网站访问统计
    updateSiteVisitStats(siteId) {
        if (!this.data.visitStats[siteId]) {
            this.data.visitStats[siteId] = { count: 0, lastVisit: null };
        }
        
        this.data.visitStats[siteId].count++;
        this.data.visitStats[siteId].lastVisit = Date.now();
        
        // 保存数据
        this.saveData();
    }
    
    // 渲染空状态
    renderEmptyState(show) {
        const emptyState = document.getElementById('empty-state');
        const sitesContainer = document.querySelector('.all-sites-section');
        
        if (emptyState && sitesContainer) {
            if (show) {
                emptyState.style.display = 'block';
                sitesContainer.style.display = 'none';
            } else {
                emptyState.style.display = 'none';
                sitesContainer.style.display = 'block';
            }
        }
    }
    
    // 更新网站数量显示
    updateSitesCount() {
        const countEl = document.getElementById('sites-count');
        if (countEl) {
            let count = this.data.sites.length;
            if (this.currentTag === 'frequent') {
                count = this.getFrequentSites().length;
            } else if (this.currentTag !== 'all') {
                count = this.data.sites.filter(site => (site.tag || site.group) === this.currentTag).length;
            }
            countEl.textContent = count;
        }
    }
    
    // 渲染分页
    renderPagination() {
        const paginationEl = document.getElementById('pagination-controls');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const currentPageEl = document.getElementById('current-page');
        const totalPagesEl = document.getElementById('total-pages');
        
        if (!paginationEl) return;
        
        let sites = this.data.sites;
        if (this.currentTag === 'frequent') {
            sites = this.getFrequentSites();
        } else if (this.currentTag !== 'all') {
            sites = sites.filter(site => (site.tag || site.group) === this.currentTag);
        }
        
        const totalPages = Math.ceil(sites.length / this.sitesPerPage);
        
        if (totalPages <= 1) {
            paginationEl.style.display = 'none';
            return;
        }
        
        paginationEl.style.display = 'flex';
        
        if (currentPageEl) currentPageEl.textContent = this.currentPage;
        if (totalPagesEl) totalPagesEl.textContent = totalPages;
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
        }
    }
    
    // 上一页
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.render();
        }
    }
    
    // 下一页
    nextPage() {
        const sites = this.getFilteredSites();
        const totalPages = Math.ceil(sites.length / this.sitesPerPage);
        
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.render();
        }
    }
    
    // 应用主题
    applyTheme() {
        const body = document.body;
        
        if (this.settings.theme === 'auto') {
            // 自动模式，跟随系统
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                body.setAttribute('data-theme', 'dark');
            } else {
                body.setAttribute('data-theme', 'light');
            }
        } else {
            body.setAttribute('data-theme', this.settings.theme);
        }
    }
    
    // 开始时间更新
    startTimeUpdate() {
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    }
    
    // 更新时间显示
    updateTime() {
        const datetimeEl = document.getElementById('datetime');
        if (!datetimeEl) return;
        
        try {
            const now = new Date();
            
            // 使用库的时间格式化
            const timeString = window.DashTabLibs.utils.formatTime(now);
            
            // 获取农历信息
            const lunar = window.DashTabLibs.utils.getLunarInfo(now);
            
            const fullTimeString = `${timeString} | ${lunar.fullText}`;
            datetimeEl.textContent = fullTimeString;
            
        } catch (error) {
            console.error('更新时间失败:', error);
            datetimeEl.textContent = '时间显示异常';
        }
    }
    
    // 更新搜索引擎下拉框
    updateSearchEngineSelect() {
        const select = document.getElementById('search-engine');
        if (!select) return;
        
        select.innerHTML = '';
        
        Object.entries(this.settings.searchEngines).forEach(([key, engine]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = engine.name;
            if (key === this.settings.defaultSearchEngine) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }
    
    // 更新标签筛选
    updateTagFilter() {
        const container = document.getElementById('tag-filter');
        if (!container) return;
        
        // 获取已有的标签
        const existingTabs = container.querySelectorAll('.tag-tab');
        
        // 如果标签已存在，不需要重新创建
        if (existingTabs.length > 0) return;
        
        // 创建标签
        const tags = [
            { key: 'frequent', name: '最常访问', icon: 'fire', special: true },
            { key: 'all', name: '全部标签' },
            { key: 'work', name: '工作' },
            { key: 'study', name: '学习' },
            { key: 'dev', name: '开发' },
            { key: 'design', name: '设计' },
            { key: 'life', name: '生活' },
            { key: 'entertainment', name: '娱乐' }
        ];
        
        container.innerHTML = '';
        
        tags.forEach(tag => {
            const tabElement = document.createElement('div');
            tabElement.className = 'tag-tab';
            if (tag.special) {
                tabElement.classList.add('frequent-tab');
            }
            if (tag.key === this.currentTag) {
                tabElement.classList.add('active');
            }
            tabElement.dataset.group = tag.key;
            
            if (tag.icon) {
                tabElement.innerHTML = `<i class="icon icon-${tag.icon}"></i> ${tag.name}`;
            } else {
                tabElement.textContent = tag.name;
            }
            
            tabElement.addEventListener('click', () => this.filterByTag(tag.key));
            
            container.appendChild(tabElement);
        });
        
        // 应用保存的标签顺序
        this.applyTagOrder();
    }
    
    // 显示消息提示
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.querySelector('.toast-message');
        const toastIcon = document.querySelector('.toast-icon');
        
        if (!toast || !toastMessage || !toastIcon) return;
        
        // 移除之前的类型类
        toast.classList.remove('error', 'warning', 'success');
        
        // 添加新的类型类
        if (type !== 'success') {
            toast.classList.add(type);
        }
        
        // 设置图标
        const iconName = type === 'error' ? 'exclamation-circle' : 
                        type === 'warning' ? 'exclamation-triangle' : 'check-circle';
        
        toastIcon.innerHTML = window.DashTabIcons.getIcon(iconName, { size: 16 });
        toastMessage.textContent = message;
        
        // 显示toast
        toast.classList.add('show');
        window.DashTabLibs.utils.addAnimation(toast, 'slideInRight');
        
        // 3秒后自动隐藏
        setTimeout(() => {
            window.DashTabLibs.utils.addAnimation(toast, 'slideOutRight', () => {
                toast.classList.remove('show');
            });
        }, 3000);
    }
    
    // 处理窗口大小变化
    handleResize() {
        // 响应式调整
        const width = window.innerWidth;
        
        if (width <= 480) {
            document.documentElement.style.setProperty('--sites-per-row', '2');
        } else if (width <= 768) {
            document.documentElement.style.setProperty('--sites-per-row', '3');
        } else if (width <= 1200) {
            document.documentElement.style.setProperty('--sites-per-row', '4');
        } else {
            document.documentElement.style.setProperty('--sites-per-row', this.settings.sitesPerRow);
        }
        
        this.render();
    }
    
    // 处理右键菜单
    handleContextMenu(e) {
        const siteItem = e.target.closest('.site-item');
        if (!siteItem) {
            this.hideContextMenu();
            return;
        }
        
        e.preventDefault();
        
        const siteId = siteItem.dataset.siteId;
        this.contextMenuSite = this.data.sites.find(s => s.id === siteId);
        
        if (!this.contextMenuSite) return;
        
        const contextMenu = document.getElementById('context-menu');
        if (!contextMenu) return;
        
        // 显示菜单
        contextMenu.style.display = 'block';
        contextMenu.style.left = e.pageX + 'px';
        contextMenu.style.top = e.pageY + 'px';
        
        // 绑定菜单项事件（只绑定一次）
        if (!contextMenu.dataset.bound) {
            const editItem = document.getElementById('edit-site');
            const deleteItem = document.getElementById('delete-site');
            const openNewTabItem = document.getElementById('open-new-tab');
            
            editItem?.addEventListener('click', () => this.editSite());
            deleteItem?.addEventListener('click', () => this.deleteSite());
            openNewTabItem?.addEventListener('click', () => this.openSiteInNewTab());
            
            contextMenu.dataset.bound = 'true';
        }
    }
    
    // 隐藏右键菜单
    hideContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
        this.contextMenuSite = null;
    }
    
    // 编辑网站
    editSite() {
        if (!this.contextMenuSite) return;
        
        // 填充表单
        const nameInput = document.getElementById('site-name');
        const urlInput = document.getElementById('site-url');
        const colorInput = document.getElementById('site-color');
        const tagSelect = document.getElementById('site-tag');
        
        if (nameInput) nameInput.value = this.contextMenuSite.name;
        if (urlInput) urlInput.value = this.contextMenuSite.url;
        if (colorInput) colorInput.value = this.contextMenuSite.color;
        if (tagSelect) tagSelect.value = this.contextMenuSite.tag || this.contextMenuSite.group;
        
        // 更新颜色选择器状态
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(opt => {
            opt.classList.remove('active');
            if (opt.dataset.color === this.contextMenuSite.color) {
                opt.classList.add('active');
            }
        });
        
        // 修改表单提交处理为编辑模式
        const form = document.getElementById('add-site-form');
        const submitBtn = document.getElementById('submit-site-btn');
        
        if (form && submitBtn) {
            form.dataset.editMode = 'true';
            form.dataset.editId = this.contextMenuSite.id;
            submitBtn.textContent = '保存修改';
        }
        
        // 显示模态框
        this.showAddSiteModal();
        this.hideContextMenu();
    }
    
    // 删除网站
    async deleteSite() {
        if (!this.contextMenuSite) return;
        
        if (confirm(`确定要删除网站"${this.contextMenuSite.name}"吗？`)) {
            try {
                // 从数据中移除
                this.data.sites = this.data.sites.filter(s => s.id !== this.contextMenuSite.id);
                
                // 删除访问统计
                delete this.data.visitStats[this.contextMenuSite.id];
                
                // 保存数据
                await this.saveData();
                
                // 重新渲染
                this.render();
                
                this.showToast(`网站"${this.contextMenuSite.name}"已删除`, 'success');
                
            } catch (error) {
                console.error('删除网站失败:', error);
                this.showToast('删除失败，请重试', 'error');
            }
        }
        
        this.hideContextMenu();
    }
    
    // 在新标签页打开网站
    openSiteInNewTab() {
        if (!this.contextMenuSite) return;
        
        this.updateSiteVisitStats(this.contextMenuSite.id);
        
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url: this.contextMenuSite.url });
        } else {
            window.open(this.contextMenuSite.url, '_blank');
        }
        
        this.hideContextMenu();
    }
    
    // 处理键盘快捷键
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + K: 聚焦搜索框
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Escape: 关闭模态框
        if (e.key === 'Escape') {
            this.hideAddSiteModal();
            this.hideSettingsModal();
            this.hideSearchEngineModal();
            this.hideContextMenu();
        }
        
        // Ctrl/Cmd + 加号: 添加网站
        if ((e.ctrlKey || e.metaKey) && e.key === '=') {
            e.preventDefault();
            this.showAddSiteModal();
        }
    }
    
    // 导出数据
    async exportData() {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({ action: 'exportData' }, (response) => {
                    if (response && response.exportData) {
                        this.downloadJson(response.exportData, 'dashtab-backup.json');
                        this.showToast('数据导出成功', 'success');
                    } else {
                        this.showToast('导出失败', 'error');
                    }
                });
            } else {
                // 本地环境
                const exportData = {
                    data: this.data,
                    settings: this.settings,
                    exportTime: Date.now(),
                    version: '1.0.0'
                };
                this.downloadJson(exportData, 'dashtab-backup.json');
                this.showToast('数据导出成功', 'success');
            }
        } catch (error) {
            console.error('导出数据失败:', error);
            this.showToast('导出失败', 'error');
        }
    }
    
    // 导入数据
    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    if (confirm('导入数据将覆盖现有数据，确定继续吗？')) {
                        if (typeof chrome !== 'undefined' && chrome.runtime) {
                            chrome.runtime.sendMessage({ 
                                action: 'importData', 
                                importData: importData 
                            }, (response) => {
                                if (response && response.success) {
                                    location.reload();
                                } else {
                                    this.showToast('导入失败', 'error');
                                }
                            });
                        } else {
                            // 本地环境
                            this.data = importData.data || this.data;
                            this.settings = importData.settings || this.settings;
                            await this.saveData();
                            await this.saveSettings();
                            location.reload();
                        }
                    }
                } catch (error) {
                    console.error('导入数据失败:', error);
                    this.showToast('导入失败，文件格式错误', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
    
    // 重置数据
    async resetData() {
        if (confirm('确定要重置所有数据吗？此操作不可恢复！')) {
            if (confirm('最后确认：真的要删除所有网站和设置吗？')) {
                try {
                    if (typeof chrome !== 'undefined' && chrome.runtime) {
                        chrome.runtime.sendMessage({ action: 'resetData' }, (response) => {
                            if (response && response.success) {
                                location.reload();
                            } else {
                                this.showToast('重置失败', 'error');
                            }
                        });
                    } else {
                        // 本地环境
                        localStorage.clear();
                        location.reload();
                    }
                } catch (error) {
                    console.error('重置数据失败:', error);
                    this.showToast('重置失败', 'error');
                }
            }
        }
    }
    
    // 下载JSON文件
    downloadJson(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
    
    // 显示搜索引擎管理模态框
    showSearchEngineModal() {
        const modal = document.getElementById('search-engine-modal');
        if (modal) {
            modal.classList.add('show');
            modal.style.display = 'flex';
            
            window.DashTabLibs.utils.addAnimation(modal, 'fadeIn');
            
            // 渲染搜索引擎列表
            this.renderSearchEngineList();
        }
    }
    
    // 隐藏搜索引擎管理模态框
    hideSearchEngineModal() {
        const modal = document.getElementById('search-engine-modal');
        if (modal) {
            modal.classList.remove('show');
            window.DashTabLibs.utils.addAnimation(modal, 'fadeOut', () => {
                modal.style.display = 'none';
            });
        }
        
        // 清空表单
        const form = document.getElementById('add-search-engine-form');
        if (form) {
            form.reset();
        }
    }
    
    // 渲染搜索引擎列表
    renderSearchEngineList() {
        const container = document.getElementById('search-engine-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.entries(this.settings.searchEngines).forEach(([key, engine]) => {
            const item = document.createElement('div');
            item.className = 'search-engine-item';
            
            const isDefault = key === this.settings.defaultSearchEngine;
            
            item.innerHTML = `
                <div class="engine-info">
                    <div class="engine-name">${engine.name}</div>
                    <div class="engine-url">${engine.url}</div>
                </div>
                <div class="engine-actions">
                    ${isDefault ? 
                        '<button class="engine-btn default">默认</button>' : 
                        `<button class="engine-btn make-default" data-key="${key}">设为默认</button>`
                    }
                    <button class="engine-btn delete" data-key="${key}">删除</button>
                </div>
            `;
            
            container.appendChild(item);
        });
        
        // 绑定事件
        container.addEventListener('click', (e) => {
            const target = e.target;
            const key = target.dataset.key;
            
            if (target.classList.contains('make-default')) {
                this.setDefaultSearchEngine(key);
            } else if (target.classList.contains('delete')) {
                this.deleteSearchEngine(key);
            }
        });
    }
    
    // 处理添加搜索引擎
    async handleAddSearchEngine(e) {
        e.preventDefault();
        
        const form = e.target;
        const name = form.querySelector('#engine-name').value.trim();
        const url = form.querySelector('#engine-url').value.trim();
        
        if (!name || !url) {
            this.showToast('请填写完整信息', 'error');
            return;
        }
        
        if (!url.includes('%s')) {
            this.showToast('搜索URL必须包含 %s 占位符', 'error');
            return;
        }
        
        try {
            // 生成唯一key
            const key = name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
            
            // 添加到设置
            this.settings.searchEngines[key] = { name, url };
            
            // 保存设置
            await this.saveSettings();
            
            // 重新渲染列表
            this.renderSearchEngineList();
            
            // 更新搜索引擎下拉框
            this.updateSearchEngineSelect();
            
            // 清空表单
            form.reset();
            
            this.showToast(`搜索引擎"${name}"添加成功`, 'success');
        } catch (error) {
            console.error('添加搜索引擎失败:', error);
            this.showToast('添加失败，请重试', 'error');
        }
    }
    
    // 设置默认搜索引擎
    async setDefaultSearchEngine(key) {
        try {
            this.settings.defaultSearchEngine = key;
            await this.saveSettings();
            
            // 重新渲染列表
            this.renderSearchEngineList();
            
            // 更新搜索引擎下拉框
            this.updateSearchEngineSelect();
            
            const engineName = this.settings.searchEngines[key].name;
            this.showToast(`"${engineName}"已设为默认搜索引擎`, 'success');
        } catch (error) {
            console.error('设置默认搜索引擎失败:', error);
            this.showToast('设置失败，请重试', 'error');
        }
    }
    
    // 删除搜索引擎
    async deleteSearchEngine(key) {
        const engine = this.settings.searchEngines[key];
        if (!engine) return;
        
        if (key === this.settings.defaultSearchEngine) {
            this.showToast('不能删除默认搜索引擎', 'error');
            return;
        }
        
        if (confirm(`确定要删除搜索引擎"${engine.name}"吗？`)) {
            try {
                delete this.settings.searchEngines[key];
                await this.saveSettings();
                
                // 重新渲染列表
                this.renderSearchEngineList();
                
                // 更新搜索引擎下拉框
                this.updateSearchEngineSelect();
                
                this.showToast(`搜索引擎"${engine.name}"已删除`, 'success');
            } catch (error) {
                console.error('删除搜索引擎失败:', error);
                this.showToast('删除失败，请重试', 'error');
            }
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 等待所有外部资源加载完成
    setTimeout(() => {
        window.dashTab = new DashTab();
    }, 100);
});

// 监听来自background script的消息
if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'dataUpdated' && window.dashTab) {
            // 数据更新，重新加载
            window.dashTab.loadData().then(() => {
                window.dashTab.render();
            });
        }
    });
}
