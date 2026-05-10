# Vercel Serverless 部署指南

本文档详细介绍如何将图片长廊项目部署到 Vercel，实现通过 GitHub 存储图片的功能。

---

## 前置条件

1. 一个 GitHub 账号
2. 一个 Vercel 账号（使用 GitHub 账号登录即可）
3. 本地安装 Node.js 和 npm

---

## 步骤一：创建 GitHub 仓库

1. 登录 [GitHub](https://github.com)
2. 点击 "New" 创建新仓库
3. 仓库名称建议：`photo-gallery`
4. 选择 "Public" 或 "Private"（建议 Private）
5. 点击 "Create repository"

---

## 步骤二：配置 GitHub Personal Access Token

1. 进入 GitHub Settings → Developer settings → Personal access tokens
2. 点击 "Generate new token"
3. 设置 Note：`Vercel Photo Gallery`
4. 选择权限：
   - `repo` - 全部勾选
   - `workflow` - 全部勾选
5. 点击 "Generate token"
6. **复制生成的 token，这是你唯一一次看到它的机会！**

---

## 步骤三：配置 Vercel 环境变量

1. 登录 [Vercel](https://vercel.com)
2. 点击 "Add New Project"
3. 选择你创建的 GitHub 仓库
4. 在 "Environment Variables" 中添加以下变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `GITHUB_TOKEN` | 你的 Personal Access Token | 用于访问 GitHub API |
| `REACT_APP_GITHUB_OWNER` | 你的 GitHub 用户名 | 仓库所有者 |
| `REACT_APP_GITHUB_REPO` | 你的仓库名称 | 如 `photo-gallery` |

5. 点击 "Deploy" 开始部署

---

## 步骤四：配置 Vite 基础路径

确保 `vite.config.ts` 中的 `base` 配置正确：

```typescript
export default defineConfig({
  // ...
  base: '/photo-gallery/',  // 改为你的仓库名称
})
```

---

## 步骤五：测试上传功能

1. 部署完成后，访问 Vercel 提供的域名
2. 使用默认账号登录：
   - 用户名：`admin`
   - 密码：`admin123`
3. 点击 "上传图片" 按钮，选择本地图片
4. 等待上传完成（图片会自动保存到 GitHub 仓库的 `public/images/` 目录）

---

## 工作原理

```
用户上传图片 → Vercel Serverless 函数 → GitHub API → 仓库更新
                                           ↓
                                    自动部署到 Vercel
```

### 文件结构

上传后，GitHub 仓库会包含：

```
public/
└── images/
    ├── 1704067200-0-photo.jpg
    └── 1704067201-1-photo.jpg

src/
└── data/
    └── images.json          # 记录所有图片信息
```

---

## 环境变量说明

### 前端环境变量（在 Vercel 中配置）

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `REACT_APP_GITHUB_OWNER` | 是 | GitHub 用户名 |
| `REACT_APP_GITHUB_REPO` | 是 | 仓库名称 |

### 后端环境变量（在 Vercel 中配置）

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `GITHUB_TOKEN` | 是 | GitHub Personal Access Token |

---

## 故障排除

### 问题 1：上传失败，提示 "GitHub token not configured"

**原因**：Vercel 环境变量 `GITHUB_TOKEN` 未配置或为空。

**解决方法**：
1. 进入 Vercel 项目 → Settings → Environment Variables
2. 确保 `GITHUB_TOKEN` 已设置且值正确

### 问题 2：图片上传后不显示

**原因**：Vercel 需要重新部署才能识别新上传的图片。

**解决方法**：
- 图片上传成功后，Vercel 会自动检测仓库变化并重新部署
- 如果没有自动部署，可以手动在 Vercel 中点击 "Redeploy"

### 问题 3：GitHub API 请求失败

**原因**：Token 权限不足或仓库不存在。

**解决方法**：
1. 检查 Token 是否具有 `repo` 权限
2. 检查 `REACT_APP_GITHUB_OWNER` 和 `REACT_APP_GITHUB_REPO` 是否正确

---

## 本地开发

### 安装依赖

```bash
npm install
```

### 创建本地环境变量文件

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，添加你的配置：

```env
REACT_APP_GITHUB_OWNER=your-github-username
REACT_APP_GITHUB_REPO=your-repo-name
```

> **注意**：本地开发时，`GITHUB_TOKEN` 不需要在前端设置（它只在 Serverless 函数中使用）

### 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173` 即可预览项目。

---

## 注意事项

1. **图片大小限制**：GitHub 建议单文件不超过 100MB，仓库总大小不超过 1GB
2. **API 速率限制**：GitHub API 每小时限制 5000 次请求，个人使用完全足够
3. **Token 安全**：不要将 `GITHUB_TOKEN` 提交到代码仓库，只在 Vercel 环境变量中配置
4. **自动部署**：每次向仓库提交代码，Vercel 会自动重新部署

---

## 备份与恢复

### 导出图片数据

1. 登录后点击 "导出图片" 按钮
2. 下载 JSON 文件到本地

### 导入图片数据

1. 登录后点击 "导入图片" 按钮
2. 选择之前导出的 JSON 文件
3. 确认替换当前所有图片

---

## 更新日志

### v1.0.0
- 支持通过 Vercel Serverless 函数上传图片到 GitHub
- 添加图片上传进度显示
- 支持图片导入/导出功能
- 支持多用户登录（通过 JSON 配置）