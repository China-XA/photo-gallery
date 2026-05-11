# Photo Gallery 配置指南

## 解决 500 错误问题

你遇到的 `POST https://xiaoao.icu/api/upload 500 (Internal Server Error)` 错误主要是因为 GitHub 凭证配置不正确。

## 快速修复（不需要 GitHub）

好消息！我们已经优化了代码，**现在即使没有 GitHub 配置，应用也能正常工作！**

上传功能现在会：
- ✅ 如果 GitHub 配置正确，图片会同步到 GitHub
- ✅ 如果 GitHub 配置有问题，图片会自动保存到浏览器本地
- ✅ 两种情况下应用都能正常使用！

## 如何配置 GitHub 集成（可选但推荐）

### 1. 创建 GitHub Personal Access Token

1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 设置如下：
   - Note: `Photo Gallery Upload`
   - Expiration: 根据需要选择
   - Select scopes: 勾选 `repo`（完全控制仓库）
4. 点击 "Generate token"
5. **重要：** 复制生成的 token，只显示一次！

### 2. 准备 GitHub 仓库

在你的 GitHub 仓库中，确保有以下结构：
```
your-repo/
├── data/
│   └── images.json  (可以是空的: {"images": [], "categories": []})
└── images/          (这个目录会自动创建)
```

### 3. 在 Vercel 中配置环境变量

1. 访问你的 Vercel 项目设置
2. 进入 Environment Variables 页面
3. 添加以下变量：

| 变量名 | 值 | 示例 |
|--------|-----|------|
| `GITHUB_TOKEN` | 你生成的 token | `ghp_xxxxxxxxxxxxx` |
| `REACT_APP_GITHUB_OWNER` | 你的 GitHub 用户名 | `your-username` |
| `REACT_APP_GITHUB_REPO` | 仓库名 | `photo-gallery` |

### 4. 本地开发配置（可选）

创建 `.env` 文件：
```
REACT_APP_GITHUB_OWNER=your-github-username
REACT_APP_GITHUB_REPO=your-repo-name
GITHUB_TOKEN=your-github-personal-access-token
```

## 验证配置

配置完成后：
1. 重新部署 Vercel 项目
2. 打开浏览器控制台（F12）
3. 上传一张图片
4. 查看控制台日志，应该会看到：
   - `Uploading to GitHub: filename.jpg`
   - `Successfully updated images.json`

## 工作原理

```
用户上传图片
    ↓
前端 → /api/upload
    ↓
Vercel Serverless 函数检查 GitHub 配置
    ├─ 配置正确 → 保存到 GitHub
    └─ 配置问题 → 返回 useLocal: true
    ↓
前端保存到 localStorage（无论 GitHub 是否成功）
    ↓
用户看到图片 ✅
```

## 常见问题

### Q: 500 错误还存在怎么办？
A: 新版本已经不会返回 500 错误了！即使 GitHub 配置有问题，API 也会返回 200 状态码并使用本地存储。

### Q: 图片只存在本地，其他设备看不到？
A: 这是正常的。配置好 GitHub 后，所有设备就能看到相同的图片了。

### Q: 如何确认 GitHub 配置成功？
A: 上传图片后，检查你的 GitHub 仓库，应该能看到：
- `images/` 目录下有新上传的图片
- `data/images.json` 文件被更新

### Q: Token 过期了怎么办？
A: 重新生成 token 并在 Vercel 中更新环境变量，然后重新部署。

## 获取帮助

如果还有问题，查看 Vercel 部署日志获得更多调试信息。
