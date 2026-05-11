# Vercel 部署指南

本文档详细介绍如何将图片长廊项目部署到 Vercel 平台。

---

## 部署前准备

### 1. 创建 GitHub Personal Access Token

1. 登录 GitHub → 点击右上角头像 → **Settings**
2. 在左侧菜单找到 **Developer settings** → **Personal access tokens**
3. 点击 **Generate new token**
4. 设置 token 名称（如 `Gallery Token`）
5. 设置过期时间（建议选择 "No expiration"）
6. **必须勾选 `repo` 权限**（用于读写仓库）
7. 点击 **Generate token**
8. **复制生成的 token**（这是唯一一次看到它的机会！）

### 2. 准备存储图片的 GitHub 仓库

确保你有一个 GitHub 仓库用于存储图片（如 `photo-gallery-storage`）。

---

## 部署步骤

### 步骤 1：将代码推送到 GitHub

```bash
# 初始化 git（如果还没初始化）
git init

# 添加文件
git add .

# 提交
git commit -m "Initial commit"

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/China-XA/photo-gallery.git

# 推送到 GitHub
git push -u origin main
```

### 步骤 2：在 Vercel 中导入项目

1. 访问 [Vercel](https://vercel.com) 并使用 GitHub 账号登录
2. 点击 **New Project**
3. 在 "Import Git Repository" 中选择你的项目仓库
4. 点击 **Import**

### 步骤 3：配置环境变量

1. 在项目页面点击 **Settings** → **Environment Variables**
2. 添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `GITHUB_TOKEN` | 你的 Personal Access Token | 用于访问 GitHub API |
| `REACT_APP_GITHUB_OWNER` | `China-XA` | GitHub 用户名 |
| `REACT_APP_GITHUB_REPO` | `photo-gallery-storage` | 存储图片的仓库名 |

3. 点击 **Save**

### 步骤 4：部署项目

1. 返回项目首页
2. 点击 **Deploy** 或等待自动部署
3. 部署完成后会显示你的项目 URL（如 `https://your-project.vercel.app`）

---

## 验证部署

### 测试上传功能

1. 访问 Vercel 提供的域名
2. 使用默认账号登录：
   - 用户名：`admin`
   - 密码：`admin123`
3. 点击 "上传图片" 按钮，选择本地图片
4. 等待上传完成（图片会自动保存到 GitHub 仓库）

### 验证跨设备访问

1. 在手机浏览器中打开相同的 URL
2. 登录后应该能看到刚上传的图片

---

## 工作原理

```
用户上传图片
    ↓
Vercel Serverless 函数 (/api/upload)
    ↓
┌─────────────────────────┐
│  1. 上传图片文件到      │
│     GitHub 仓库/images/ │
├─────────────────────────┤
│  2. 更新图片列表到      │
│     GitHub/data/images.json │
└─────────────────────────┘
    ↓
其他设备访问时自动同步
    ↓
所有设备都能看到新图片
```

---

## 项目文件说明

### 新增文件

| 文件 | 作用 |
|------|------|
| `api/upload.ts` | 处理图片上传到 GitHub |
| `api/images.ts` | 从 GitHub 获取图片列表 |

### 修改的文件

| 文件 | 修改内容 |
|------|----------|
| `src/components/Gallery.tsx` | 添加同步功能和刷新按钮 |
| `vite.config.ts` | 移除 GitHub Pages 配置 |

---

## 自定义配置

### 修改登录账号

编辑 `src/context/AuthContext.tsx`，修改 `initialUsersData` 中的用户信息。

### 修改端口（本地开发）

在 `vite.config.ts` 中修改 `port` 配置。

### 添加自定义域名

1. 在 Vercel 项目页面 → **Settings** → **Domains**
2. 添加你的域名（如 `gallery.yourdomain.com`）
3. 在域名注册商处添加 DNS 记录：
   - 类型：`CNAME`
   - 主机记录：`gallery`
   - 记录值：`cname.vercel-dns.com`

---

## 故障排除

### 问题 1：上传失败，提示 "GitHub credentials not configured"

**原因**：Vercel 环境变量未配置或为空。

**解决方法**：
1. 进入 Vercel 项目 → **Settings** → **Environment Variables**
2. 确保 `GITHUB_TOKEN`、`REACT_APP_GITHUB_OWNER`、`REACT_APP_GITHUB_REPO` 已设置且值正确

### 问题 2：图片上传后不显示

**原因**：需要等待 Vercel 同步 GitHub 仓库的变化。

**解决方法**：
- 点击页面上的「🔃 同步」按钮
- 或刷新页面

### 问题 3：GitHub API 请求失败（401 Unauthorized）

**原因**：Token 权限不足或已过期。

**解决方法**：
1. 检查 Token 是否具有 `repo` 权限
2. 重新生成新的 Token
3. 更新 Vercel 环境变量

### 问题 4：图片大小限制

**原因**：GitHub 对单文件大小有限制（建议不超过 100MB）。

**解决方法**：
- 上传较小的图片
- 压缩图片后再上传

---

## 免费额度说明

| 资源 | 免费版限制 |
|------|------------|
| 带宽 | 100GB/月 |
| 函数执行时间 | 10秒 |
| 函数调用次数 | 无限制（冷启动有限制） |
| 项目数量 | 无限制 |

---

## 注意事项

1. **Token 安全**：不要将 `GITHUB_TOKEN` 提交到代码仓库
2. **API 速率限制**：GitHub API 每小时限制 5000 次请求
3. **图片存储**：图片保存在 GitHub 仓库，注意仓库大小限制（建议不超过 1GB）

---

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

本地开发时，Serverless 函数不会运行，图片会保存到浏览器 localStorage。