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
        // Tab状态管理 - 完善的记忆功能
        this.categoriesOrder = this.loadCategoriesOrder(); // 加载分类顺序
        this.availableCategories = this.loadAvailableCategories(); // 加载可用分类列表
        // 设置当前tab，如果没有保存的或者是'all'，则使用第一个可用的tab
        const savedCurrentCategory = localStorage.getItem('dashTabCurrentCategory');
        if (!savedCurrentCategory || savedCurrentCategory === 'all') {
            this.currentCategory = this.availableCategories.length > 0 ? this.availableCategories[0].name : 'all';
        } else {
            this.currentCategory = savedCurrentCategory;
        }
        this.currentPage = 1;
        this.sitesPerPage = 30; // 每页显示的网站数量
        this.draggedSite = null;
        this.contextMenuSite = null;
        this.sortableInstance = null;
        this.tagSortableInstance = null;
        this.searchInstance = null;
        
        // 确保库已加载
        this.waitForLibraries().then(() => {
            this.init();
        });
    }
    
    // 加载Tab顺序配置
    loadCategoriesOrder() { // 函数功能：加载分类顺序，从localStorage获取或返回默认空数组
        try {
            const savedOrder = localStorage.getItem('dashTabCategoriesOrder');
            return savedOrder ? JSON.parse(savedOrder) : [];
        } catch (error) {
            console.warn('加载Tab顺序失败:', error);
            return [];
        }
    }
    
    // 保存Tab顺序配置
    saveCategoriesOrder() { // 函数功能：保存分类顺序到localStorage
        try {
            localStorage.setItem('dashTabCategoriesOrder', JSON.stringify(this.categoriesOrder));
        } catch (error) {
            console.error('保存Tab顺序失败:', error);
        }
    }
    
    // 加载可用tab列表
    loadAvailableCategories() { // 函数功能：加载可用分类列表，从localStorage获取或返回默认空数组
        try {
            const savedCategories = localStorage.getItem('dashTabAvailableCategories');
            if (savedCategories) {
                return JSON.parse(savedCategories);
            }
            // 默认返回空数组
            return [];
        } catch (error) {
            console.warn('加载可用tab失败:', error);
            return [];
        }
    }
    
    // 保存可用tab列表
    saveAvailableCategories() { // 函数功能：保存可用分类列表到localStorage
        try {
            localStorage.setItem('dashTabAvailableCategories', JSON.stringify(this.availableCategories));
        } catch (error) {
            console.error('保存可用tab失败:', error);
        }
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
            
            // 获取天气信息
            this.initWeather();
            
            // 初始化拖拽排序
            this.initializeSortable();
            
            // 初始化tab拖拽排序
            this.initializeCategorySortable();
            
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

                        // 兼容旧版本数据结构
                        if (this.data.groups && typeof this.data.groups === 'object' && !Array.isArray(this.data.groups)) {
                            console.log('检测到旧版分类数据结构，正在转换...');
                            const newCategories = [];
                            for (const key in this.data.groups) {
                                if (Object.hasOwnProperty.call(this.data.groups, key)) {
                                    newCategories.push({ name: this.data.groups[key].name, removable: true });
                                }
                            }
                            this.availableCategories = newCategories;
                            this.saveAvailableCategories();
                            // 将旧的groups对象清空或移除，避免混淆
                            this.data.groups = []; 
                            this.saveData(); // 保存转换后的数据
                        } else if (Array.isArray(this.data.groups)) {
                            // 如果是新版本，直接使用
                            this.availableCategories = this.data.groups;
                        }

                        // 如果availableCategories为空，设置默认值
                        if (this.availableCategories.length === 0) {
                            this.saveAvailableCategories();
                        }

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
        
        // 初始化tab筛选
        this.updateCategoryFilter();
        
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
    
    // 初始化tab拖拽排序
    initializeCategorySortable() {
        const tagFilter = document.getElementById('tag-filter');
        if (tagFilter && window.DashTabLibs.Sortable) {
            // 销毁之前的实例
            if (this.tagSortableInstance) {
                this.tagSortableInstance.destroy();
            }
            
            this.tagSortableInstance = window.DashTabLibs.utils.createSortable(tagFilter, {
                animation: 200,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                dragClass: 'sortable-drag',
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
    
    // 处理tab排序结束
    async handleTagSortEnd(evt) {
        try {
            const { oldIndex, newIndex } = evt;
            if (oldIndex === newIndex) return;
            
            // 获取当前tab顺序（排除添加tab按钮）
            const tagElements = document.querySelectorAll('.tag-tab:not(.add-tag-btn)');
            const newTabsOrder = Array.from(tagElements).map(tab => tab.dataset.group);
            
            // 更新tabsOrder属性
            this.categoriesOrder = newTabsOrder;
            
            // 保存到localStorage
            this.saveCategoriesOrder();
            
            // 兼容旧版本：同时保存到settings中
            this.settings.tagOrder = newTabsOrder;
            localStorage.setItem('dashTabCategoryOrder', JSON.stringify(newTabsOrder));
            
            // 保存设置
            await this.saveSettings();
            
            this.showToast('Tab顺序已更新', 'success');
         } catch (error) {
             console.error('Tab排序失败:', error);
             this.showToast('Tab排序失败，请重试', 'error');
         }
    }
    
    // 应用分类排序
    applyCategoryOrder() { // 函数功能：应用保存的分类顺序到UI，并兼容旧数据
        // 优先使用新的categoriesOrder属性
        let categoryOrder = this.categoriesOrder;
        
        // 如果categoriesOrder为空，尝试从旧版本兼容
        if (!categoryOrder || categoryOrder.length === 0) {
            const savedOrder = localStorage.getItem('dashTabCategoryOrder');
            if (savedOrder) {
                try {
                    categoryOrder = JSON.parse(savedOrder);
                    this.categoriesOrder = categoryOrder; // 同步到新属性
                    this.saveCategoriesOrder(); // 保存到新存储位置
                } catch (e) {
                    console.warn('解析分类顺序失败:', e);
                }
            } else if (this.settings.tagOrder) {
                categoryOrder = this.settings.tagOrder;
                this.categoriesOrder = categoryOrder;
                this.saveCategoriesOrder();
            }
        }
        
        if (!categoryOrder || categoryOrder.length === 0) return;
        
        const container = document.getElementById('tag-filter');
        if (!container) return;
        
        const categoryElements = Array.from(container.querySelectorAll('.tag-tab:not(.add-tag-btn)'));
        const addCategoryBtn = container.querySelector('.add-tag-btn');
        
        // 按照保存的顺序重新排列分类
        categoryOrder.forEach(categoryName => {
            const categoryElement = categoryElements.find(el => el.dataset.group === categoryName);
            if (categoryElement) {
                container.appendChild(categoryElement);
            }
        });
        
        // 确保添加分类按钮始终在最后
        if (addCategoryBtn) {
            container.appendChild(addCategoryBtn);
        }
    }
    
    // 获取用于排序的网站列表
    getFilteredSitesForSort() {
        if (this.currentCategory === 'all') {
            return this.data.sites;
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
        
        // tab筛选
        const tagTabs = document.querySelectorAll('.tag-tab');
        tagTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tag = tab.dataset.group; // 保持使用data-group属性以兼容现有代码
                this.filterByCategory(tag);
            });
        });
        
        // 自定义tab输入
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
        
        // 分类管理按钮
        const manageCategoriesBtn = document.getElementById('manage-categories-btn');
        const addCategoryBtn = document.getElementById('add-category-btn');

        manageCategoriesBtn?.addEventListener('click', () => this.showCategoryManagementModal());
        addCategoryBtn?.addEventListener('click', () => this.showAddCategoryModal());

        // 分类管理模态框
        const categoryManagementModal = document.getElementById('category-management-modal');
        const closeCategoryManagementBtn = document.getElementById('close-category-management-btn');
        const openAddCategoryModalBtn = document.getElementById('open-add-category-modal-btn');

        closeCategoryManagementBtn?.addEventListener('click', () => this.hideCategoryManagementModal());
        categoryManagementModal?.addEventListener('click', (e) => {
            if (e.target === categoryManagementModal) {
                this.hideCategoryManagementModal();
            }
        });
        openAddCategoryModalBtn?.addEventListener('click', () => this.showAddCategoryModal());

        // 添加新分类模态框
        const addCategoryModal = document.getElementById('add-category-modal');
        const closeAddCategoryModalBtn = document.getElementById('close-add-category-modal-btn');
        const cancelAddCategoryBtn = document.getElementById('cancel-add-category-btn');
        const addCategoryForm = document.getElementById('add-category-form');

        closeAddCategoryModalBtn?.addEventListener('click', () => this.hideAddCategoryModal());
        cancelAddCategoryBtn?.addEventListener('click', () => this.hideAddCategoryModal());
        addCategoryModal?.addEventListener('click', (e) => {
            if (e.target === addCategoryModal) {
                this.hideAddCategoryModal();
            }
        });
        addCategoryForm?.addEventListener('submit', (e) => this.handleAddNewCategory(e));
        
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
            // 更新tab选择器选项
            this.updateSiteTagSelect();
            
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
        
        // 验证tab
        if (!data.tag) {
            this.showFormError('tab-error', '请选择tab');
            isValid = false;
        } else if (data.tag.length > 10) {
            this.showFormError('tab-error', 'tab名称不能超过10个字符');
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
    
    // 按tab筛选
    filterByCategory(category) { // 函数功能：按分类筛选网站，更新当前分类并渲染UI
        this.currentCategory = category;
        this.currentPage = 1;
        
        // 保存当前分类状态到本地存储
        localStorage.setItem('dashTabCurrentCategory', category);
        
        // 更新分类状态
        const categoryTabs = document.querySelectorAll('.tag-tab');
        categoryTabs.forEach(tab => {
            if (tab.dataset.group === category) {
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
            this.initializeCategorySortable();
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
        
        // 始终显示普通网站列表
        this.renderAllSites(sites);
        this.renderEmptyState(sites.length === 0);
    }
    

    
    // 获取筛选后的网站
    getFilteredSites() {
        let sites = this.data.sites;
        
        // 按tab筛选
        if (this.currentCategory !== 'all') {
            sites = sites.filter(site => (site.tag || site.group) === this.currentCategory);
        }
        
        // 按order排序
        sites.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // 分页
        const startIndex = (this.currentPage - 1) * this.sitesPerPage;
        const endIndex = startIndex + this.sitesPerPage;
        
        return sites.slice(startIndex, endIndex);
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
            if (this.currentCategory !== 'all') {
                count = this.data.sites.filter(site => (site.category || site.group) === this.currentCategory).length;
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
        if (this.currentCategory === 'frequent') {
            sites = this.getFrequentSites();
        } else if (this.currentCategory !== 'all') {
            sites = sites.filter(site => (site.category || site.group) === this.currentCategory);
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
    
    // 更新网站添加表单中的tab选择器
    updateSiteTagSelect() {
        const select = document.getElementById('site-tag');
        if (!select) return;
        
        // 保存当前选中的值
        const currentValue = select.value;
        
        // 清空选项
        select.innerHTML = '';
        
        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '请选择分类';
        select.appendChild(defaultOption);
        
        // 添加现有的分类选项
        this.availableCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            select.appendChild(option);
        });
        
        // 恢复之前选中的值（如果仍然存在）
        if (currentValue && this.availableCategories.some(category => category.name === currentValue)) {
            select.value = currentValue;
        }
    }
    
    // 更新tab筛选 - 支持动态tab管理
    updateCategoryFilter() { // 函数功能：更新分类筛选UI，根据可用分类动态渲染
        const container = document.getElementById('tag-filter');
        if (!container) return;
        
        // 清空容器
        container.innerHTML = '';

        // 添加“全部”分类
        const allCategoryElement = document.createElement('div');
        allCategoryElement.className = 'tag-tab';
        if ('all' === this.currentCategory) {
            allCategoryElement.classList.add('active');
        }
        allCategoryElement.dataset.group = 'all';
        allCategoryElement.textContent = '全部';
        allCategoryElement.addEventListener('click', () => this.filterByCategory('all'));
        container.appendChild(allCategoryElement);
        
        
            // 按照保存的顺序或默认顺序渲染分类
        const orderedCategories = this.getOrderedCategories();
        
        orderedCategories.forEach(category => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'tag-tab';
            if (category.name === this.currentCategory) {
                categoryElement.classList.add('active');
            }
            categoryElement.dataset.group = category.name;
            
            // 创建分类内容容器
            const categoryContent = document.createElement('span');
            categoryContent.className = 'tab-content';
            categoryContent.textContent = category.name;
            categoryElement.appendChild(categoryContent);
            
            // 添加点击事件
            categoryElement.addEventListener('click', () => this.filterByCategory(category.name));
            
            // 添加双击编辑事件（仅对可删除的分类）
            if (category.removable) {
                categoryContent.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    this.editCategoryName(category.name, categoryContent);
                });
            }
            
            container.appendChild(categoryElement);
        });
        
        // 重新初始化拖拽排序
        this.initializeCategorySortable();
    }
    
    // 获取有序的分类列表
    getOrderedCategories() { // 函数功能：获取有序的分类列表，按保存顺序排列并更新新分类
        if (this.categoriesOrder.length === 0) {
            return this.availableCategories;
        }
        
        const orderedCategories = [];
        const remainingCategories = [...this.availableCategories];
        
        // 按保存的顺序添加分类
        this.categoriesOrder.forEach(categoryName => {
            const categoryIndex = remainingCategories.findIndex(category => category.name === categoryName);
            if (categoryIndex !== -1) {
                orderedCategories.push(remainingCategories.splice(categoryIndex, 1)[0]);
            }
        });
        
        // 添加剩余的分类（新添加的分类）
        if (remainingCategories.length > 0) {
            orderedCategories.push(...remainingCategories);
            // 同时更新categoriesOrder以包含新分类
            remainingCategories.forEach(category => {
                this.categoriesOrder.push(category.name);
            });
            // 保存更新后的顺序
            this.saveCategoriesOrder();
        }
        
        return orderedCategories;
    }
    
    // 显示分类管理模态框
    showCategoryManagementModal() {
        const modal = document.getElementById('category-management-modal');
        if (modal) {
            modal.classList.add('show');
            modal.style.display = 'flex';
            window.DashTabLibs.utils.addAnimation(modal, 'fadeIn');
            this.renderCategoryList();
        }
    }

    // 隐藏分类管理模态框
    hideCategoryManagementModal() {
        const modal = document.getElementById('category-management-modal');
        if (modal) {
            modal.classList.remove('show');
            window.DashTabLibs.utils.addAnimation(modal, 'fadeOut', () => {
                modal.style.display = 'none';
            });
        }
    }

    // 显示添加新分类模态框
    showAddCategoryModal() { // 函数功能：显示添加新分类的模态框，并初始化表单
        const modal = document.getElementById('add-category-modal');
        const tagNameInput = document.getElementById('add-category-name');
        
        // 清空表单
        tagNameInput.value = '';
        
        // 清除错误信息
        document.getElementById('add-category-name-error').textContent = '';
        
        // 显示模态框
        modal.style.display = 'flex';
        
        // 聚焦到tab名称输入框
        setTimeout(() => {
            tagNameInput.focus();
        }, 100);
    }
    
    // 隐藏添加新分类模态框
    hideAddCategoryModal() {
        const modal = document.getElementById('add-category-modal');
        const form = document.getElementById('add-category-form');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
        if (form) {
            form.reset();
        }
    }
    
    
    
    // 处理添加新分类
    async handleAddNewCategory(e) { // 函数功能：验证并添加新分类，更新列表和UI
        e.preventDefault();
        const form = e.target;
        const nameInput = form.querySelector('#add-category-name');
        const nameError = form.querySelector('#add-category-name-error');
        
        // 清除之前的错误
        nameError.textContent = '';
        
        const name = nameInput.value.trim();
        
        // 验证输入
        let hasError = false;
        
        if (!name) {
            nameError.textContent = '请输入分类名称';
            hasError = true;
        } else if (name.length > 10) {
            nameError.textContent = '分类名称不能超过10个字符';
            hasError = true;
        } else if (this.availableCategories.some(category => category.name === name)) {
            nameError.textContent = '该分类已存在';
            hasError = true;
        }
        
        if (hasError) return;
        
        try {
            // 添加新tab
            const newTag = {
                name: name,
                removable: true
            };
            
            this.availableCategories.push(newTag);
            this.categoriesOrder.push(name);
            this.saveAvailableCategories();
            this.saveCategoriesOrder();
            
            // 更新分类筛选器和网站表单选择器
            this.updateCategoryFilter();
            this.updateSiteTagSelect();
            
            // 自动切换到新分类
            this.filterByCategory(name);
            
            // 关闭模态框
            this.hideAddCategoryModal();
            this.renderCategoryList(); // 重新渲染分类列表
            
            this.showToast(`分类"${name}"添加成功`, 'success');
        } catch (error) {
            console.error('添加分类失败:', error);
            this.showToast('添加分类失败，请重试', 'error');
        }
    }
    
    // 删除分类
    deleteCategory(categoryName) { // 函数功能：删除指定分类，并处理相关网站迁移
        // 确认删除
        if (!confirm(`确定要删除分类 "${categoryName}" 吗？\n\n删除后，该分类下的所有网站将被移动到"全部"分类。`)) {
            return;
        }
        
        try {
            // 将该tab下的所有网站移动到"全部"分类
            this.data.sites.forEach(site => {
                if (site.tag === categoryName) {
                    site.tag = 'all';
                }
            });
            
            // 从availableCategories中移除
            this.availableCategories = this.availableCategories.filter(category => category.name !== categoryName);
            
            // 从categoriesOrder中移除
            this.categoriesOrder = this.categoriesOrder.filter(name => name !== categoryName);
            
            // 如果当前显示的是被删除的tab，切换到"全部"tab
            if (this.currentCategory === categoryName) {
                this.currentCategory = 'all';
            }
            
            // 保存数据
            this.saveAvailableCategories();
            this.saveCategoriesOrder();
            this.saveData();
            
            // 更新UI
            this.updateCategoryFilter();
            this.updateSiteTagSelect();
            this.render();
            
            // 显示成功消息
            this.showToast('分类删除成功', 'success');
            this.renderCategoryList(); // 重新渲染分类列表
        } catch (error) {
            console.error('删除分类失败:', error);
            this.showToast('删除分类失败，请重试', 'error');
        }
    }
    
    // 获取分类名称的辅助方法
    getCategoryName(categoryName) { // 函数功能：根据键查找分类名称
        const category = this.availableCategories.find(c => c.name === categoryName);
        return category ? category.name : categoryName;
    }

    // 渲染分类列表
    renderCategoryList() {
        const categoryListContainer = document.getElementById('category-list');
        if (!categoryListContainer) return;

        categoryListContainer.innerHTML = '';

        if (this.availableCategories.length === 0) {
            categoryListContainer.innerHTML = '<p class="empty-list-message">暂无自定义分类</p>';
            return;
        }

        this.availableCategories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-list-item';
            categoryItem.innerHTML = `
                <span class="category-name">${category.name}</span>
                <div class="category-actions">
                    ${category.removable ? `<button class="modern-btn danger small delete-category-btn" data-category-name="${category.name}">删除</button>` : ''}
                </div>
            `;
            categoryListContainer.appendChild(categoryItem);
        });

        // 绑定删除事件
        categoryListContainer.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const categoryName = e.target.dataset.categoryName;
                this.deleteCategory(categoryName);
            });
        });
    }
    
    // 编辑分类名称
    editCategoryName(categoryName, categoryContentElement) { // 函数功能：编辑指定分类的名称
        const category = this.availableCategories.find(c => c.name === categoryName);
        if (!category || !category.removable) return;
        
        const originalName = category.name;
        
        // 创建输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalName;
        input.className = 'tab-edit-input';
        input.style.cssText = `
            background: transparent;
            border: 1px solid var(--accent);
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 14px;
            font-weight: 500;
            color: inherit;
            width: 100%;
            outline: none;
        `;
        
        // 替换文本内容为输入框
        categoryContentElement.textContent = '';
        categoryContentElement.appendChild(input);
        
        // 选中文本
        input.focus();
        input.select();
        
        // 保存编辑
        const saveEdit = () => {
            const newName = input.value.trim();
            
            if (!newName) {
                // 如果为空，恢复原名称
                categoryContentElement.textContent = originalName;
                return;
            }
            
            if (newName.length > 10) {
                this.showToast('tab名称不能超过10个字符', 'error');
                categoryContentElement.textContent = originalName;
                return;
            }

            if (newName !== originalName && this.availableCategories.some(c => c.name === newName)) {
                this.showToast('该分类已存在', 'error');
                categoryContentElement.textContent = originalName;
                return;
            }
            
            if (newName !== originalName) {
                 // 更新tab名称
                 category.name = newName;
                 category.key = newName;

                 // 更新网站中的分类
                 this.data.sites.forEach(site => {
                    if (site.tag === originalName) {
                        site.tag = newName;
                    }
                });

                 this.saveAvailableCategories();
                 this.saveData();
                 this.updateSiteTagSelect(); // 更新网站表单中的tab选择器
                 this.showToast('Tab名称修改成功', 'success');
                 this.renderCategoryList(); // 重新渲染分类列表
             }
            
            // 恢复文本显示
            categoryContentElement.textContent = newName;
        };
        
        // 取消编辑
        const cancelEdit = () => {
            categoryContentElement.textContent = originalName;
        };
        
        // 绑定事件
        input.addEventListener('blur', saveEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur(); // 触发保存
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
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
    
    // 在新tab打开网站
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

    // 初始化天气功能
    async initWeather() {
        try {
            // 获取地理位置
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        this.fetchWeather(position.coords.latitude, position.coords.longitude);
                    },
                    (error) => {
                        console.warn('获取位置失败:', error);
                        this.updateWeatherDisplay('📍', '--°', '位置获取失败');
                    },
                    { timeout: 10000, enableHighAccuracy: false }
                );
            } else {
                this.updateWeatherDisplay('📍', '--°', '不支持定位');
            }
        } catch (error) {
            console.error('天气初始化失败:', error);
            this.updateWeatherDisplay('❌', '--°', '天气获取失败');
        }
    }
    
    // 获取天气信息
    async fetchWeather(lat, lon) {
        try {
            // 使用免费的OpenWeatherMap API (需要API key，这里使用示例key)
            // 实际使用时需要申请正式的API key
            const apiKey = 'demo'; // 替换为真实的API key
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`
            );
            
            if (!response.ok) {
                // 如果OpenWeatherMap不可用，尝试使用其他免费API
                await this.fetchWeatherAlternative(lat, lon);
                return;
            }
            
            const data = await response.json();
            const weather = this.parseWeatherData(data);
            this.updateWeatherDisplay(weather.icon, weather.temp, weather.description);
            
        } catch (error) {
            console.warn('主要天气API失败，尝试备用方案:', error);
            await this.fetchWeatherAlternative(lat, lon);
        }
    }
    
    // 备用天气API
    async fetchWeatherAlternative(lat, lon) {
        try {
            // 使用wttr.in API（免费且无需API key）
            const response = await fetch(
                `https://wttr.in/${lat},${lon}?format=%C+%t&lang=zh`
            );
            
            if (response.ok) {
                const data = await response.text();
                const parts = data.trim().split(' ');
                const description = parts[0] || '晴天';
                const temp = parts[1] || '--°';
                
                const icon = this.getWeatherIcon(description);
                this.updateWeatherDisplay(icon, temp, description);
            } else {
                this.updateWeatherDisplay('🌤️', '--°', '天气获取失败');
            }
        } catch (error) {
            console.error('备用天气API也失败:', error);
            this.updateWeatherDisplay('🌤️', '--°', '天气获取失败');
        }
    }
    
    // 解析天气数据
    parseWeatherData(data) {
        const temp = Math.round(data.main.temp) + '°';
        const description = data.weather[0].description;
        const weatherCode = data.weather[0].id;
        const icon = this.getWeatherIconByCode(weatherCode);
        
        return { icon, temp, description };
    }
    
    // 根据天气代码获取emoji图标
    getWeatherIconByCode(code) {
        if (code >= 200 && code < 300) return '⛈️'; // 雷暴
        if (code >= 300 && code < 400) return '🌦️'; // 毛毛雨
        if (code >= 500 && code < 600) return '🌧️'; // 雨
        if (code >= 600 && code < 700) return '❄️'; // 雪
        if (code >= 700 && code < 800) return '🌫️'; // 雾霾
        if (code === 800) return '☀️'; // 晴天
        if (code > 800) return '☁️'; // 多云
        return '🌤️'; // 默认
    }
    
    // 根据天气描述获取emoji图标
    getWeatherIcon(description) {
        const desc = description.toLowerCase();
        if (desc.includes('雨') || desc.includes('rain')) return '🌧️';
        if (desc.includes('雪') || desc.includes('snow')) return '❄️';
        if (desc.includes('雷') || desc.includes('thunder')) return '⛈️';
        if (desc.includes('雾') || desc.includes('fog')) return '🌫️';
        if (desc.includes('云') || desc.includes('cloud')) return '☁️';
        if (desc.includes('晴') || desc.includes('clear') || desc.includes('sunny')) return '☀️';
        return '🌤️';
    }
    
    // 更新天气显示
    updateWeatherDisplay(icon, temp, description) {
        const weatherIcon = document.querySelector('.weather-icon');
        const weatherTemp = document.querySelector('.weather-temp');
        const weatherDesc = document.querySelector('.weather-desc');
        
        if (weatherIcon) weatherIcon.textContent = icon;
        if (weatherTemp) weatherTemp.textContent = temp;
        if (weatherDesc) weatherDesc.textContent = description;
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
