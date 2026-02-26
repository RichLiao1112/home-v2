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

命令指令（可直接输入并回车执行）：

- `/settings`（别名：`/layout`、`/page-settings`）：打开页面设置
- `/snapshot`（别名：`/snapshots`、`/rollback`）：打开快照管理
- `/recycle`（别名：`/trash`、`/bin`）：打开回收站
- `/key`（别名：`/keys`、`/switch-key`）：进入 key 搜索模式
- `/create-key`（别名：`/new-key`、`/add-key`）：新建配置 key
- `/delete-key`（别名：`/remove-key`）：删除当前配置 key
- `/next-key`（别名：`/key-next`）：切换到下一个 key
- `/prev-key`（别名：`/previous-key`、`/key-prev`）：切换到上一个 key
- `/snapshot-now`（别名：`/create-snapshot`）：立即创建快照

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

## 生产部署 Checklist

部署前：

- [ ] 确认 `main` 分支已包含最新提交
- [ ] 准备 `.env`（至少配置 `LOGIN_PASSWORD`、`AUTH_SECRET`）
- [ ] 若使用 Unsplash，确认 `UNSPLASH_ACCESS_KEY` 可用
- [ ] 准备挂载目录：`./data`、`./assets`
- [ ] 确认宿主机端口未被占用（默认 `3131`）

环境变量（建议）：

- [ ] `LOGIN_PASSWORD` 使用强密码
- [ ] `AUTH_SECRET` 使用随机长串（至少 32 字符）
- [ ] `AUTH_SESSION_MAX_AGE_SECONDS` 按需求设置
- [ ] `SNAPSHOT_MAX_PER_KEY` 按存储策略设置
- [ ] `NEXT_PUBLIC_RECYCLE_RETENTION_DAYS` 按保留策略设置

构建与启动：

- [ ] `docker compose pull`（可选，更新基础镜像）
- [ ] `docker compose up -d --build`
- [ ] `docker compose ps` 确认容器 `healthy`
- [ ] 首次启动后确认 `/app/data/home.json` 已创建（或挂载文件可读写）

发布后验证：

- [ ] 页面可访问：`http://<host>:3131`
- [ ] 可正常登录并读取配置
- [ ] 修改配置后刷新仍保留（持久化生效）
- [ ] 上传图片后可通过 `/media/*` 访问并在搜索中出现
- [ ] 快照创建/恢复正常，时间显示为北京时间
- [ ] 搜索命令面板（`/` 或 `Ctrl+K`）可用

Jenkins（如使用）：

- [ ] Job 使用仓库最新代码
- [ ] 构建步骤包含 `docker build` 或 `docker compose build`
- [ ] 部署步骤包含停止旧容器并启动新容器
- [ ] 通过 Jenkins 注入环境变量（不要把密钥写死在仓库）
- [ ] 挂载参数与生产一致：`data/home.json`、`assets`

回滚预案：

- [ ] 部署前手动创建一次快照（或备份 `data/home.json`）
- [ ] 若发布异常，可先在 UI 内“快照恢复”
- [ ] 容器级回滚：切回上一镜像 tag 并重启
- [ ] 回滚后验证登录、配置读取、静态资源访问

常见排障：

- [ ] 页面可开但图片 404：检查 `assets` 挂载与 Nginx 路径
- [ ] 登录异常：检查 `LOGIN_PASSWORD` 与 `AUTH_SECRET` 是否一致传入
- [ ] 配置未持久化：检查 `data/home.json` 挂载是否可写
- [ ] Unsplash 无结果：检查 `UNSPLASH_ACCESS_KEY` 与网络连通性

## 技术栈

- 框架：Next.js 14 / React 18
- 样式：Tailwind CSS
- 状态管理：Zustand
- 图标：Lucide React
- 拼音检索：pinyin-pro
- 部署：Docker + Nginx（单容器）
