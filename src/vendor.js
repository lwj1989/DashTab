// DashTab Vendor Libraries Bundle

// 导入所有需要的库
import Sortable from 'sortablejs'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { Lunar } from 'lunar-javascript'
import tinycolor from 'tinycolor2'
import validator from 'validator'
import Fuse from 'fuse.js'
import 'animate.css'

// 扩展dayjs功能
dayjs.locale('zh-cn')

// 创建全局对象
window.DashTabLibs = {
  // 拖拽排序
  Sortable,
  
  // 时间日期
  dayjs,
  
  // 农历计算
  Lunar,
  
  // 颜色工具
  tinycolor,
  
  // 表单验证
  validator,
  
  // 模糊搜索
  Fuse,
  
  // 工具函数
  utils: {
    // 生成随机颜色
    generateRandomColor() {
      const colors = [
        '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
        '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
        '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
        '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'
      ]
      return colors[Math.floor(Math.random() * colors.length)]
    },
    
    // 根据背景色自动选择文字颜色
    getContrastColor(backgroundColor) {
      const color = tinycolor(backgroundColor)
      return color.isLight() ? '#1f2937' : '#ffffff'
    },
    
    // 格式化时间
    formatTime(date = new Date()) {
      return dayjs(date).format('YYYY年MM月DD日 dddd HH:mm:ss')
    },
    
    // 获取农历信息
    getLunarInfo(date = new Date()) {
      try {
        const lunar = Lunar.fromDate(date)
        
        return {
          year: lunar.getYearInGanZhi() + '年',
          month: lunar.getMonthInChinese(),
          day: lunar.getDayInChinese(),
          fullText: `${lunar.getYearInGanZhi()}年 ${lunar.getMonthInChinese()}${lunar.getDayInChinese()}`
        }
      } catch (error) {
        console.warn('农历计算失败:', error)
        return {
          year: '甲子年',
          month: '正月',
          day: '初一',
          fullText: '甲子年 正月初一'
        }
      }
    },
    
    // URL验证
    isValidUrl(string) {
      return validator.isURL(string, {
        protocols: ['http', 'https'],
        require_protocol: false
      })
    },
    
    // 电子邮件验证
    isValidEmail(email) {
      return validator.isEmail(email)
    },
    
    // 创建拖拽排序实例
    createSortable(element, options = {}) {
      const defaultOptions = {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: (evt) => {
          console.log('排序变化:', evt)
        }
      }
      
      return Sortable.create(element, { ...defaultOptions, ...options })
    },
    
    // 创建搜索实例
    createSearch(list, options = {}) {
      const defaultOptions = {
        keys: ['name', 'url', 'group'],
        threshold: 0.3,
        includeScore: true
      }
      
      return new Fuse(list, { ...defaultOptions, ...options })
    },
    
    // 添加动画类
    addAnimation(element, animationName, callback) {
      element.classList.add('animate__animated', `animate__${animationName}`)
      
      const handleAnimationEnd = () => {
        element.classList.remove('animate__animated', `animate__${animationName}`)
        element.removeEventListener('animationend', handleAnimationEnd)
        if (callback) callback()
      }
      
      element.addEventListener('animationend', handleAnimationEnd)
    },
    
    // 防抖函数
    debounce(func, wait, immediate) {
      let timeout
      return function executedFunction(...args) {
        const later = () => {
          timeout = null
          if (!immediate) func(...args)
        }
        const callNow = immediate && !timeout
        clearTimeout(timeout)
        timeout = setTimeout(later, wait)
        if (callNow) func(...args)
      }
    },
    
    // 节流函数
    throttle(func, limit) {
      let inThrottle
      return function executedFunction(...args) {
        if (!inThrottle) {
          func.apply(this, args)
          inThrottle = true
          setTimeout(() => inThrottle = false, limit)
        }
      }
    }
  }
}

// 输出到全局
console.log('DashTab Vendor Libraries loaded:', Object.keys(window.DashTabLibs))
