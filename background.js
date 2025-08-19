// DashTab Chrome扩展后台脚本 - Service Worker版本

// 全局变量
let isInitialized = false;

// API可用性检查
function checkChromeAPI() {
    const requiredAPIs = ['storage', 'runtime', 'tabs'];
    const optionalAPIs = ['alarms'];
    
    const available = {};
    const missing = [];
    
    requiredAPIs.forEach(api => {
        if (chrome[api]) {
            available[api] = true;
        } else {
            available[api] = false;
            missing.push(api);
        }
    });
    
    optionalAPIs.forEach(api => {
        available[api] = !!chrome[api];
    });
    
    if (missing.length > 0) {
        console.error('缺少必需的Chrome API:', missing);
        return false;
    }
    
    console.log('Chrome API可用性:', available);
    return true;
}

// 初始化默认设置
const defaultSettings = {
    theme: 'auto', // auto, light, dark
    sitesPerRow: 5,
    searchEngines: {
        google: { name: 'Google', url: 'https://www.google.com/search?q=%s' },
        baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=%s' },
        bing: { name: '必应', url: 'https://www.bing.com/search?q=%s' },
        zhihu: { name: '知乎', url: 'https://www.zhihu.com/search?type=content&q=%s' },
        github: { name: 'GitHub', url: 'https://github.com/search?q=%s' }
    },
    defaultSearchEngine: 'google'
};

// 初始化默认数据
const defaultData = {
    sites: [],
    groups: {
        work: { name: '工作', sites: [] },
        study: { name: '学习', sites: [] },
        dev: { name: '开发', sites: [] },
        design: { name: '设计', sites: [] },
        life: { name: '生活', sites: [] },
        entertainment: { name: '娱乐', sites: [] }
    },
    visitStats: {},
    lastBackup: null
};

// Service Worker启动时的初始化
chrome.runtime.onStartup.addListener(async () => {
    console.log('DashTab Service Worker 启动');
    await initializeExtension();
});

// 扩展安装或启动时的初始化
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('DashTab扩展已安装/更新，原因:', details.reason);
    
    try {
        await initializeExtension();
        
        // 检查是否是首次安装
        if (details.reason === 'install') {
            // 设置默认配置
            await chrome.storage.local.set({
                dashTabSettings: defaultSettings,
                dashTabData: defaultData
            });
            console.log('DashTab默认配置已设置');
            
            // 显示欢迎页面
            chrome.tabs.create({
                url: chrome.runtime.getURL('popup.html') + '?welcome=true'
            });
        }
        
        // 检查是否是更新
        if (details.reason === 'update') {
            // 获取当前配置并合并新的默认设置
            const result = await chrome.storage.local.get(['dashTabSettings']);
            const currentSettings = result.dashTabSettings || {};
            const mergedSettings = { ...defaultSettings, ...currentSettings };
            
            await chrome.storage.local.set({
                dashTabSettings: mergedSettings
            });
            console.log('DashTab配置已更新');
        }
    } catch (error) {
        console.error('初始化失败:', error);
    }
});

// 初始化函数
async function initializeExtension() {
    if (isInitialized) return;
    
    try {
        // 设置闹钟监听器
        setupAlarmListener();
        
        // 检查并创建定期备份闹钟
        if (chrome.alarms) {
            try {
                await chrome.alarms.create('dailyBackup', { 
                    delayInMinutes: 1, 
                    periodInMinutes: 1440 
                });
                console.log('定期备份闹钟已创建');
            } catch (alarmError) {
                console.error('创建闹钟失败:', alarmError);
            }
        } else {
            console.warn('chrome.alarms API不可用');
        }
        
        isInitialized = true;
        console.log('DashTab扩展初始化完成');
    } catch (error) {
        console.error('扩展初始化失败:', error);
    }
}

// 处理新标签页打开
chrome.tabs.onCreated.addListener((tab) => {
    // 如果是新标签页，确保使用我们的页面
    if (tab.url === 'chrome://newtab/' || tab.pendingUrl === 'chrome://newtab/') {
        console.log('新标签页已创建');
    }
});

// 处理标签页更新（用于统计访问频率）
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && 
        !tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith('edge://') &&
        !tab.url.startsWith('about:') &&
        !tab.url.startsWith('moz-extension://')) {
        
        // 更新访问统计
        await updateVisitStats(tab.url);
    }
});

// 更新网站访问统计
async function updateVisitStats(url) {
    try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        // 使用async/await替代回调
        const result = await chrome.storage.local.get(['dashTabData']);
        const data = result.dashTabData || { sites: [], visitStats: {} };
        
        // 检查这个域名是否在我们的网站列表中
        const matchingSite = data.sites.find(site => {
            try {
                const siteUrlObj = new URL(site.url);
                return siteUrlObj.hostname === domain;
            } catch (e) {
                return false;
            }
        });
        
        if (matchingSite) {
            // 更新访问统计
            if (!data.visitStats[matchingSite.id]) {
                data.visitStats[matchingSite.id] = {
                    count: 0,
                    lastVisit: Date.now()
                };
            }
            
            data.visitStats[matchingSite.id].count++;
            data.visitStats[matchingSite.id].lastVisit = Date.now();
            
            // 保存更新的数据
            await chrome.storage.local.set({ dashTabData: data });
            console.log(`访问统计已更新: ${domain}`);
        }
    } catch (error) {
        console.error('更新访问统计时出错:', error);
    }
}

// 处理扩展图标点击
chrome.action.onClicked.addListener((tab) => {
    // 如果当前标签页不是新标签页，打开新标签页
    if (!tab.url.includes(chrome.runtime.getURL('popup.html'))) {
        chrome.tabs.create({
            url: chrome.runtime.getURL('popup.html')
        });
    }
});

// 处理来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 使用异步函数处理消息
    handleMessage(request, sender, sendResponse);
    return true; // 保持消息通道开放
});

// 异步消息处理函数
async function handleMessage(request, sender, sendResponse) {
    try {
        switch (request.action) {
            case 'getData':
                // 获取所有数据
                const result = await chrome.storage.local.get(['dashTabData', 'dashTabSettings']);
                sendResponse({
                    data: result.dashTabData || { sites: [], groups: {}, visitStats: {} },
                    settings: result.dashTabSettings || {}
                });
                break;
                
            case 'saveData':
                // 保存数据
                await chrome.storage.local.set({
                    dashTabData: request.data
                });
                sendResponse({ success: true });
                break;
                
            case 'saveSettings':
                // 保存设置
                await chrome.storage.local.set({
                    dashTabSettings: request.settings
                });
                sendResponse({ success: true });
                break;
                
            case 'exportData':
                // 导出数据
                const exportResult = await chrome.storage.local.get(['dashTabData', 'dashTabSettings']);
                const manifest = chrome.runtime.getManifest();
                const exportData = {
                    data: exportResult.dashTabData || {},
                    settings: exportResult.dashTabSettings || {},
                    exportTime: Date.now(),
                    version: manifest.version
                };
                sendResponse({ exportData: exportData });
                break;
                
            case 'importData':
                // 导入数据
                try {
                    const importData = request.importData;
                    await chrome.storage.local.set({
                        dashTabData: importData.data || {},
                        dashTabSettings: importData.settings || {}
                    });
                    sendResponse({ success: true });
                } catch (error) {
                    sendResponse({ success: false, error: error.message });
                }
                break;
                
            case 'resetData':
                // 重置所有数据
                await chrome.storage.local.clear();
                // 重新设置默认数据
                await chrome.storage.local.set({
                    dashTabSettings: defaultSettings,
                    dashTabData: defaultData
                });
                sendResponse({ success: true });
                break;
                
            default:
                sendResponse({ error: '未知操作' });
                break;
        }
    } catch (error) {
        console.error('消息处理错误:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// 安全的闹钟监听器设置
function setupAlarmListener() {
    if (chrome.alarms && chrome.alarms.onAlarm) {
        chrome.alarms.onAlarm.addListener(async (alarm) => {
            if (alarm.name === 'dailyBackup') {
                await performDailyBackup();
            }
        });
        console.log('闹钟监听器已设置');
    } else {
        console.warn('chrome.alarms.onAlarm API不可用');
        // 如果不支持闹钟，使用setTimeout作为备选方案
        setTimeout(async () => {
            await performDailyBackup();
            // 设置24小时后再次执行
            setInterval(performDailyBackup, 24 * 60 * 60 * 1000);
        }, 60000); // 1分钟后开始
    }
}

// 执行每日备份
async function performDailyBackup() {
    try {
        const result = await chrome.storage.local.get(['dashTabData']);
        if (result.dashTabData) {
            const backupData = {
                ...result.dashTabData,
                lastBackup: Date.now()
            };
            
            await chrome.storage.local.set({
                dashTabData: backupData
            });
            console.log('数据备份完成');
        }
    } catch (error) {
        console.error('数据备份失败:', error);
    }
}

// 监听存储变化
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local') {
        console.log('本地存储已更新:', Object.keys(changes));
        
        // 通知所有打开的标签页数据已更新
        try {
            const tabs = await chrome.tabs.query({});
            const dashTabUrl = chrome.runtime.getURL('popup.html');
            
            for (const tab of tabs) {
                if (tab.url && tab.url.includes(dashTabUrl)) {
                    try {
                        await chrome.tabs.sendMessage(tab.id, {
                            action: 'dataUpdated',
                            changes: changes
                        });
                    } catch (error) {
                        // 忽略无法发送消息的标签页（可能已关闭或未准备好）
                        console.debug('无法向标签页发送消息:', tab.id);
                    }
                }
            }
        } catch (error) {
            console.error('通知标签页更新失败:', error);
        }
    }
});

// Service Worker错误处理
self.addEventListener('error', (event) => {
    console.error('Service Worker错误:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
});

// Service Worker启动完成后的延迟初始化
async function delayedInitialize() {
    // 等待一小段时间确保Chrome API完全准备好
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 检查API可用性
    if (!checkChromeAPI()) {
        throw new Error('Chrome API不完整，无法初始化扩展');
    }
    
    if (!isInitialized) {
        await initializeExtension();
    }
}

// 立即尝试初始化
delayedInitialize().catch(error => {
    console.error('延迟初始化失败:', error);
    // 如果失败，再等待更长时间重试
    setTimeout(() => {
        initializeExtension().catch(err => {
            console.error('重试初始化失败:', err);
        });
    }, 1000);
});

console.log('DashTab Service Worker已加载');
