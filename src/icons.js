// DashTab Icons Bundle - Unicode & SVG Icons

// 创建图标管理器
class IconManager {
  constructor() {
    this.icons = new Map()
    this.initializeIcons()
  }
  
  // 初始化图标映射
  initializeIcons() {
    // 使用Unicode字符和简洁SVG的混合方案
    const iconData = {
      // 核心功能图标
      'compass': { type: 'emoji', value: '🧭' },
      'search': { type: 'emoji', value: '🔍' },
      'flame': { type: 'emoji', value: '🔥' },
      'fire': { type: 'emoji', value: '🔥' },
      'grid': { type: 'text', value: '⊞' },
      'plus': { type: 'text', value: '+' },
      'settings': { type: 'emoji', value: '⚙️' },
      'cog': { type: 'emoji', value: '⚙️' },
      'times': { type: 'text', value: '✕' },
      'x': { type: 'text', value: '✕' },
      'close': { type: 'text', value: '✕' },
      'save': { type: 'emoji', value: '💾' },
      'edit': { type: 'emoji', value: '✏️' },
      'trash': { type: 'emoji', value: '🗑️' },
      'delete': { type: 'emoji', value: '🗑️' },
      'external-link': { type: 'text', value: '↗' },
      'check': { type: 'text', value: '✓' },
      'check-circle': { type: 'text', value: '✓' },
      'alert-circle': { type: 'text', value: '⚠' },
      'exclamation-circle': { type: 'text', value: '⚠' },
      'alert-triangle': { type: 'text', value: '⚠' },
      'exclamation-triangle': { type: 'text', value: '⚠' },
      'download': { type: 'text', value: '⬇' },
      'upload': { type: 'text', value: '⬆' },
      'chevron-left': { type: 'text', value: '‹' },
      'chevron-right': { type: 'text', value: '›' },
      'bookmark': { type: 'emoji', value: '🔖' },
      'loader': { type: 'text', value: '↻' },
      'loading': { type: 'text', value: '↻' },
      'spin': { type: 'text', value: '↻' },
      
      // 扩展图标
      'palette': { type: 'emoji', value: '🎨' },
      'eye': { type: 'emoji', value: '👁️' },
      'eye-off': { type: 'text', value: '🚫' },
      'heart': { type: 'emoji', value: '❤️' },
      'star': { type: 'emoji', value: '⭐' },
      'home': { type: 'emoji', value: '🏠' },
      'folder': { type: 'emoji', value: '📁' },
      'file': { type: 'emoji', value: '📄' },
      'user': { type: 'emoji', value: '👤' },
      'mail': { type: 'emoji', value: '📧' },
      'phone': { type: 'emoji', value: '📞' },
      'calendar': { type: 'emoji', value: '📅' },
      'clock': { type: 'emoji', value: '🕐' },
      'map': { type: 'emoji', value: '🗺️' },
      'camera': { type: 'emoji', value: '📷' }
    }
    
    // 将图标数据存储到Map中
    Object.entries(iconData).forEach(([name, data]) => {
      this.icons.set(name, data)
    })
  }
  
  // 获取图标字符串
  getIcon(name, options = {}) {
    const iconData = this.icons.get(name)
    if (!iconData) {
      console.warn(`图标 "${name}" 未找到`)
      return this.getIcon('bookmark') // 默认图标
    }
    
    const {
      size = 24,
      className = ''
    } = options
    
    // 根据图标类型返回相应的字符
    return `<span class="dash-icon ${className}" style="font-size: ${size}px;">${iconData.value}</span>`
  }
  

  
  // 创建图标元素
  createElement(name, options = {}) {
    const div = document.createElement('div')
    div.innerHTML = this.getIcon(name, options)
    return div.firstElementChild
  }
  
  // 替换现有图标
  replaceIcon(element, name, options = {}) {
    const iconElement = this.createElement(name, options)
    element.innerHTML = ''
    element.appendChild(iconElement)
  }
  
  // 批量替换页面中的图标
  replaceAllIcons() {
    document.querySelectorAll('[data-icon]').forEach(element => {
      const iconName = element.getAttribute('data-icon')
      const size = element.getAttribute('data-size') || 24
      const color = element.getAttribute('data-color') || 'currentColor'
      const className = element.className
      
      this.replaceIcon(element, iconName, { size, color, className })
    })
  }
}

// 创建全局图标管理器
window.DashTabIcons = new IconManager()

// 输出到全局
console.log('DashTab Icons loaded:', window.DashTabIcons.icons.size, 'icons available')
