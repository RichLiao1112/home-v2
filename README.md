# Home v2

现代化导航主页，基于 `Next.js 14 + React 18 + Tailwind CSS + Zustand`。  
支持 Docker 单容器部署（内置 Nginx，单端口对外）。

## 核心能力

- 登录鉴权（容器环境变量密码，签名会话 Cookie）
- 多配置 key（新增 / 删除 / 切换 / URL 同步）
- 分类与卡片管理（增删改查、拖拽排序、移动端适配）
- 卡片 WAN/LAN 双地址（自动按访问环境优先打开）
- 全局搜索命令面板（拼音首字母 + 全拼 + 模糊匹配）
- 配置快照（手动创建、恢复前自动备份、导入前自动备份）
- 导入导出增强（导入预检 + 差异预览 + 覆盖确认）
- 回收站（软删除、恢复、永久删除、按时间筛选与搜索）
- Unsplash 背景 + 本地图片搜索 + 可选清晰度
- PWA（manifest + service worker + 离线页）

## 快速开始

### 本地开发

```bash
npm install
npm run dev
```

默认访问：`http://localhost:3000`

### Docker Compose（推荐）

```bash
cp .env.example .env
docker compose up -d --build
```

默认访问：`http://localhost:3131`

## 部署与挂载

`docker-compose.yml` 当前挂载：

- `./data/home.json:/app/data/home.json`（配置数据）
- `./assets:/app/assets`（可上传/可编辑图片）

说明：

- 内置静态图标在镜像内 `/app/media-builtin/imgs`，通过 `/media/imgs/*` 访问。
- 运行期上传资源建议放 `assets`，同样可被搜索与访问。

## 环境变量

`.env.example`：

- `LOGIN_PASSWORD`：登录密码（必填，生产请改强密码）
- `AUTH_SECRET`：会话签名密钥（生产强烈建议配置随机长串）
- `AUTH_SESSION_MAX_AGE_SECONDS`：会话有效期（秒）
- `SNAPSHOT_MAX_PER_KEY`：每个 key 最大快照数量
- `NEXT_PUBLIC_RECYCLE_RETENTION_DAYS`：回收站自动清理天数（默认 30）
- `UNSPLASH_ACCESS_KEY`：Unsplash API Key
- `ASSETS_DIR`：用户可写资源目录（容器内）
- `BUILTIN_MEDIA_DIR`：镜像内置媒体目录（容器内）

## 搜索命令面板

打开方式：

- `/`
- `Ctrl+K`

支持：

- 结果上下键选择 + 回车执行
- 结果列表跟随光标自动滚动
- 右侧预览（卡片/命令/配置/历史）
- 最近打开与最近操作历史

前缀筛选语法：

- `key:` / `k:`：仅搜索配置 key
- `card:` / `c:`：仅搜索卡片标题
- `cat:`：仅搜索分类
- `desc:`：仅搜索备注
- `wan:`：仅搜索 WAN 地址
- `lan:`：仅搜索 LAN 地址
- `/xxx`：命令模式

卡片二级快捷键（选中卡片后）：

- `Alt+E`：编辑
- `Alt+D`：删除（进回收站）
- `Alt+C`：复制链接
- `Alt+L`：打开 LAN
- `Alt+W`：打开 WAN

## 导入、快照、回收站

- 导入时先进行格式校验与差异预览
- 确认导入前会自动创建 `before_import` 快照
- 快照时间统一按北京时间（`Asia/Shanghai`）显示
- 删除分类/卡片为软删除，进入回收站
- 回收站支持关键词搜索、时间筛选、恢复/永久删除/清空

## PWA 与离线

- 已提供 `manifest.webmanifest`
- Service Worker：`public/sw.js`
- 离线兜底页：`public/offline.html`

## 技术栈

- 框架：Next.js 14 / React 18
- 样式：Tailwind CSS
- 状态管理：Zustand
- 图标：Lucide React
- 拼音检索：pinyin-pro
- 部署：Docker + Nginx（单容器）
