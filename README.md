# 电商商品图文生成器

一个用于自动生成商品图片和文案的电商工具，支持 DeepSeek AI 文案生成和 SiliconFlow 图像分析功能。

## 🚀 在线预览

部署后访问：`https://你的用户名.github.io/仓库名/`

## ✨ 功能特性

- 📸 **商品图片管理**：支持拖拽上传、删除商品图片
- 🤖 **AI 文案生成**：基于 DeepSeek API 生成抖音风格电商文案
- 🖼️ **图像分析**：使用 SiliconFlow API 分析图片生成卖点
- 💾 **数据持久化**：使用 localStorage 保存商品任务
- 📝 **商品编辑**：支持修改商品信息、品牌、材质等
- 📦 **批量处理**：支持批量生成商品图文

## 🛠️ 技术栈

- React 18 + TypeScript
- Tailwind CSS
- Vite
- DeepSeek API
- SiliconFlow API

## 📦 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 🚀 部署到 GitHub Pages

### 第一次部署

1. **创建 GitHub 仓库**
   - 访问 [github.com](https://github.com)
   - 点击右上角 "+" → "New repository"
   - 仓库名称：`ecommerce-generator`（或其他名称）
   - 选择 "Public"（公开）
   - 点击 "Create repository"

2. **上传代码**
   - 在仓库页面点击 "uploading an existing file"
   - 拖拽或选择本项目的所有文件（除了 `node_modules` 和 `dist` 文件夹）
   - 点击 "Commit changes"

3. **配置 GitHub Pages**
   - 进入仓库 Settings → Pages
   - Source 选择 "GitHub Actions"
   - 系统会自动识别 `.github/workflows/deploy.yml`

4. **等待部署**
   - 进入 Actions 标签页
   - 等待部署完成（约 2-3 分钟）
   - 部署成功后，访问 `https://你的用户名.github.io/仓库名/`

### 更新部署

当你修改代码后，只需重新上传修改的文件到 GitHub，GitHub Actions 会自动重新部署。

## 🔧 配置 API 密钥

项目需要配置以下 API 密钥才能使用 AI 功能：

1. **DeepSeek API**：用于生成电商文案
   - 在 `src/services/deepseek.ts` 中配置 `API_KEY`

2. **SiliconFlow API**：用于图像分析
   - 在 `src/services/siliconflow.ts` 中配置 `SILICONFLOW_API_KEY`

⚠️ **注意**：出于安全考虑，建议将 API 密钥存储在环境变量中，不要在代码中硬编码。

## 📁 项目结构

```
.
├── .github/workflows/    # GitHub Actions 配置
├── public/               # 静态资源
├── src/
│   ├── components/       # React 组件
│   ├── services/         # API 服务
│   │   ├── deepseek.ts   # DeepSeek API
│   │   ├── siliconflow.ts # SiliconFlow API
│   │   └── storage.ts    # 数据存储
│   ├── App.tsx          # 主应用组件
│   └── main.tsx         # 入口文件
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 📝 使用说明

1. **创建商品任务**：点击"单品制作"或"批量生成"
2. **上传商品图片**：拖拽或点击上传商品图片
3. **填写商品信息**：输入商品名称、品牌、材质等
4. **生成文案**：点击"AI生成文案"选择风格生成
5. **查看结果**：在右侧查看生成的标题、文案和海报
6. **编辑商品**：点击已完成的任务，可以编辑商品信息

## 📄 许可证

MIT License
