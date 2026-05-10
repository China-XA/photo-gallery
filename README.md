# 个人图片长廊

一个带有登录功能和精美动画特效的个人图片展示网站。

## 功能特性

- 🔐 用户登录验证
- 🎨 精美的渐变背景设计
- ✨ 流畅的动画特效（使用 Framer Motion）
- 📱 响应式布局，支持移动端
- 🖼️ 图片点击放大预览
- 🔗 支持公网访问

## 技术栈

- React 18 + TypeScript
- Vite
- React Router DOM
- Framer Motion

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

项目将在 `http://localhost:5173` 启动，同时也可以通过局域网访问（`http://你的IP:5173`）。

### 3. 登录账号

默认登录账号：
- 用户名：`admin`
- 密码：`admin123`

你可以在 `src/context/AuthContext.tsx` 中修改登录账号。

### 4. 替换图片

在 `src/components/Gallery.tsx` 中修改 `images` 数组，替换为你自己的图片链接。

## 公网访问配置

### 方法一：使用内网穿透工具（推荐用于开发测试）

#### 使用 ngrok

1. 下载并安装 [ngrok](https://ngrok.com/)
2. 启动开发服务器：`npm run dev`
3. 在新终端中运行：`ngrok http 5173`
4. 复制 ngrok 提供的公网链接即可访问

#### 使用 localtunnel

1. 全局安装：`npm install -g localtunnel`
2. 启动开发服务器：`npm run dev`
3. 运行：`lt --port 5173`
4. 复制提供的公网链接即可访问

### 方法二：部署到云平台（推荐用于生产环境）

#### Vercel 部署

1. 将代码推送到 GitHub 仓库
2. 访问 [Vercel](https://vercel.com) 并导入你的仓库
3. 按照提示完成部署
4. 部署成功后会获得一个公网链接

#### Netlify 部署

1. 将代码推送到 GitHub 仓库
2. 访问 [Netlify](https://www.netlify.com) 并导入你的仓库
3. 按照提示完成部署
4. 部署成功后会获得一个公网链接

### 方法三：云服务器部署

1. 购买云服务器（如阿里云、腾讯云等）
2. 在服务器上安装 Node.js
3. 上传项目代码
4. 运行 `npm install && npm run build`
5. 使用 Nginx 或类似工具托管 `dist` 文件夹
6. 配置域名和 SSL 证书

## 项目结构

```
project_ChenHongMei/
├── src/
│   ├── components/
│   │   ├── Login.tsx          # 登录页面组件
│   │   ├── Login.css          # 登录页面样式
│   │   ├── Gallery.tsx        # 图片长廊组件
│   │   └── Gallery.css        # 图片长廊样式
│   ├── context/
│   │   └── AuthContext.tsx    # 认证上下文
│   ├── App.tsx                # 主应用组件
│   ├── main.tsx               # 应用入口
│   └── index.css              # 全局样式
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## 自定义配置

### 修改端口

在 `vite.config.ts` 中修改 `port` 配置。

### 修改登录账号

在 `src/context/AuthContext.tsx` 中修改 `login` 函数的验证逻辑。

### 调整动画效果

在各组件的 `motion` 属性中修改动画参数。

## 构建生产版本

```bash
npm run build
```

构建产物将生成在 `dist` 文件夹中。

## 许可证

MIT
