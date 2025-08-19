# DashTab - Chrome浏览器导航扩展

一个现代化、极简的Chrome新标签页导航扩展，提供本地存储、智能搜索、网站管理等功能。

## ✨ 特性

- 🔒 **隐私保护** - 所有数据本地存储，无需联网
- 🎨 **现代设计** - 极简界面，支持明暗主题自动切换
- 🚀 **快速访问** - 智能搜索和常用网站快速导航
- 📱 **响应式** - 适配不同屏幕尺寸
- 🎯 **高度可定制** - 自定义颜色、分组、排序

## 🚀 快速开始

### 安装方法

1. **下载项目**
   ```bash
   git clone <repository-url>
   cd DashTab
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **构建项目**
   ```bash
   npm run build:all
   ```

4. **加载扩展**
   - 打开Chrome浏览器
   - 访问 `chrome://extensions/`
   - 开启「开发者模式」
   - 点击「加载已解压的扩展程序」
   - 选择项目根目录

### 基本使用

1. **添加网站**
   - 点击右下角的「+」按钮
   - 填写网站名称和URL
   - 选择颜色和分组
   - 点击保存

2. **搜索功能**
   - 在顶部搜索框输入关键词
   - 选择搜索引擎（Google、百度、必应等）
   - 按回车键或点击搜索按钮

3. **网站管理**
   - 拖拽网站块重新排序
   - 右键点击编辑或删除网站
   - 使用分组功能组织网站

4. **主题切换**
   - 点击右下角设置图标
   - 选择明亮/暗黑主题
   - 系统会自动保存偏好设置

## 🛠️ 开发

### 技术栈

- **前端框架**: 原生JavaScript (ES6+)
- **构建工具**: Vite
- **UI库**: Font Awesome 图标
- **存储**: Chrome Storage API
- **依赖库**:
  - `sortablejs` - 拖拽排序
  - `dayjs` - 时间处理
  - `lunar-javascript` - 农历计算
  - `tinycolor2` - 颜色处理
  - `validator` - 数据验证
  - `fuse.js` - 模糊搜索
  - `animate.css` - 动画效果

### 项目结构

```
DashTab/
├── manifest.json          # Chrome扩展清单
├── popup.html             # 新标签页HTML
├── popup.css              # 主样式文件
├── popup.js               # 主要逻辑
├── background.js          # 后台服务
├── icons/                 # 扩展图标
│   └── icon.svg
├── libs/                  # 构建后的库文件
│   ├── icons.js
│   ├── style.css
│   └── vendor.js
├── src/                   # 源码目录
│   ├── icons.js
│   └── vendor.js
├── package.json           # 项目配置
├── vite.*.config.js       # 构建配置
└── README.md              # 项目文档
```

### 开发命令

```bash
# 开发模式
npm run dev

# 构建库文件
npm run build:libs

# 构建图标
npm run build:icons

# 构建所有
npm run build:all

# 预览
npm run preview
```

### 开发流程

1. **修改代码**
   - 编辑相应的源文件
   - 运行构建命令更新库文件

2. **测试扩展**
   - 在Chrome扩展管理页面点击刷新
   - 打开新标签页查看效果

3. **调试技巧**
   - 使用Chrome开发者工具
   - 查看Console输出和Network请求
   - 检查Storage数据

## 📋 功能详解

### 数据存储
- 使用`chrome.storage.local`本地存储
- 支持数据导入导出（计划中）
- 自动备份和恢复机制

### 搜索引擎
- 内置主流搜索引擎
- 支持自定义搜索引擎
- 智能搜索建议

### 网站管理
- 分组管理网站
- 拖拽排序功能
- 访问频率统计
- 自定义图标和颜色

### 时间显示
- 24小时制时间
- 公历和农历日期
- 紧凑型显示

## 🤝 贡献

欢迎提交Issue和Pull Request！

### 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🔄 版本历史

- **v1.0.1** (当前版本)
  - 优化性能和稳定性
  - 修复已知问题
  - 改进用户体验

- **v1.0.0**
  - 初始发布版本
  - 包含所有核心功能

## 📞 支持

如果您遇到问题或有建议，请：

- 提交 [Issue](../../issues)
- 查看 [Wiki](../../wiki) 文档
- 联系开发团队

---

**DashTab Team** - 让每个新标签页都更高效 🚀
