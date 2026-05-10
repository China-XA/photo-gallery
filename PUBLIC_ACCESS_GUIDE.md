# 公网访问配置指南

本文档提供免费的公网访问解决方案，让你的图片长廊可以通过互联网从任何设备访问。

---

## 方案一：使用 localtunnel（最简单，推荐新手）

### 特点
- ✅ 完全免费
- ✅ 无需注册账号
- ✅ 简单易用
- ⚠️ 链接每次重启会变化
- ⚠️ 有广告（页面底部）

### 配置步骤

#### 1. 安装 localtunnel

在终端中运行：

```bash
npm install -g localtunnel
```

#### 2. 启动开发服务器

在项目目录中运行：

```bash
# 先安装项目依赖（仅首次需要）
npm install

# 启动开发服务器
npm run dev
```

保持这个终端窗口运行，不要关闭。

#### 3. 创建公网链接

再打开一个新的终端窗口，运行：

```bash
lt --port 5173
```

你会看到类似输出：

```
your url is: https://long-cool-name.loca.lt
```

#### 4. 访问你的网站

在浏览器中打开显示的链接即可！

**重要**：第一次访问时，需要在页面输入你的本地端口号（5173），然后点击 "Click to Continue"。

---

## 方案二：使用 ngrok（更稳定，推荐正式使用）

### 特点
- ✅ 免费账号足够日常使用
- ✅ 链接固定（重启后不变，需要重启服务）
- ✅ 更稳定，访问速度快
- ✅ 无广告
- ⚠️ 需要注册账号（免费）

### 配置步骤

#### 1. 下载安装 ngrok

访问：https://ngrok.com/download

选择 Windows/macOS/Linux 版本下载安装。

#### 2. 注册 ngrok 账号

1. 访问：https://dashboard.ngrok.com/signup
2. 使用邮箱注册（免费）
3. 登录后进入 Dashboard

#### 3. 获取认证 Token

1. 在 Dashboard 左侧菜单找到 "Your Authtoken"
2. 复制你的 authtoken（类似：`2abc123xyz...`）

#### 4. 配置 ngrok

在终端中运行：

```bash
ngrok config add-authtoken 你的token
```

#### 5. 启动开发服务器

在项目目录中运行：

```bash
npm install
npm run dev
```

保持终端运行。

#### 6. 启动 ngrok

再打开一个新终端，运行：

```bash
ngrok http 5173
```

你会看到类似输出：

```
Session Status                online
Account                       your@email.com
Forwarding                    https://abc123xyz.ngrok-free.app
```

#### 7. 访问你的网站

使用显示的 `https://abc123xyz.ngrok-free.app` 链接访问！

---

## 方案三：使用 Cloudflare Tunnel（最专业，完全免费）

### 特点
- ✅ 完全免费
- ✅ 无限流量
- ✅ 链接永久固定
- ✅ 无广告
- ✅ 最稳定
- ⚠️ 需要安装 Cloudflare 客户端
- ⚠️ 配置稍复杂

### 配置步骤

#### 1. 下载 cloudflared

访问：https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

下载对应系统的版本。

#### 2. 登录 Cloudflare 账号

访问：https://dash.cloudflare.com/

注册一个免费账号。

#### 3. 创建 Tunnel

在终端运行：

```bash
cloudflared tunnel create my-gallery
```

保存显示的 Tunnel ID。

#### 4. 配置文件

在项目目录创建文件 `.cloudflared/config.yml`：

```yaml
tunnel: 你的Tunnel ID
credentials-file: /path/to/credentials-file.json

ingress:
  - hostname: my-gallery.trycloudflare.com
    service: http://localhost:5173
  - service: http://localhost:5173
```

#### 5. 运行 Tunnel

```bash
cloudflared tunnel run my-gallery
```

#### 6. 访问网站

使用显示的 `https://my-gallery.trycloudflare.com` 链接访问！

---

## 移动端访问说明

所有方案都支持 iOS 和 Android 系统的浏览器访问：

### iOS（Safari、Chrome、Firefox）
- 直接在手机浏览器中打开生成的链接
- 如果提示安全警告，点击"访问网站"即可

### Android（Chrome、Samsung Internet、Firefox）
- 直接打开链接
- 首次访问可能需要确认

### 注意事项
- 确保你的电脑保持开机状态
- 确保开发服务器持续运行
- 手机和电脑需要连接网络（不要求同一网络）

---

## 性能限制说明

### localtunnel
- 带宽：有限共享
- 同时访问人数：建议不超过 5 人
- 适用：小规模分享、开发测试

### ngrok（免费版）
- 并发连接数：有限
- 带宽：有限
- 适用：个人使用、小团队分享、开发测试

### Cloudflare Tunnel
- 带宽：无限
- 连接数：无限
- 适用：正式使用、长期部署

---

## 适用场景

| 场景 | 推荐方案 |
|------|----------|
| 快速演示给朋友看 | localtunnel |
| 临时分享给客户 | ngrok |
| 长期个人作品展示 | Cloudflare Tunnel |
| 开发调试 | 任意方案均可 |
| 生产环境正式使用 | Cloudflare Tunnel |

---

## 常见问题

### Q: 链接打不开怎么办？
A: 检查你的电脑防火墙设置，确保允许 5173 端口的入站连接。

### Q: 为什么访问很慢？
A: 这是正常的，因为数据需要经过第三方服务器转发。

### Q: 链接会过期吗？
A:
- localtunnel：每次重启服务都会变化
- ngrok：免费版链接固定，但 8 小时后会断开
- Cloudflare：永久固定

### Q: 我的图片会上传到他们的服务器吗？
A: 不会。图片仍在你的电脑上，只是通过他们的服务器转发访问请求。

### Q: 安全吗？
A: 所有流量都是加密的，但他人的服务器会看到请求。建议不要在公网访问敏感操作。

---

## 快速启动命令汇总

```bash
# 进入项目目录
cd "c:\Users\25451\Desktop\TRAE项目\project_ChenHongMei"

# 安装依赖（仅首次）
npm install

# 启动开发服务器（终端1）
npm run dev

# 使用 localtunnel（终端2）
lt --port 5173

# 或使用 ngrok（终端2）
ngrok http 5173
```

---

## 重要提醒

⚠️ **公网访问注意事项：**

1. **账号安全**：当前登录账号是简化的（admin/admin123），公网访问时建议修改为更复杂的密码

2. **隐私保护**：公网链接可能被搜索引擎收录，建议分享时使用

3. **电脑状态**：访问期间必须保持电脑开机且程序运行

4. **流量限制**：免费方案都有一定流量/带宽限制，不适合大量用户访问

5. **测试用途**：这些方案主要适合临时演示和开发测试，重要用途建议部署到专业平台
