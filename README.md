# Anywayone Blog

Anywayone Blog 是一个面向个人长期维护的内容系统，同一仓库规划包含三个应用：

- `web/`：面向读者的展示端，Next.js App Router + TypeScript。
- `admin/`：内容管理端，React + Vite + Ant Design，当前开发中。
- `backend/`：内容与媒体 API，Python 3.11+ + FastAPI，当前开发中。

当前三个应用均已进入开发阶段。产品、架构和 UI 决策见 [doc/README.md](./doc/README.md)。

## 环境要求

- Node.js 24 LTS（见 `.nvmrc`）
- pnpm 10.34+
- Python 3.11+（Backend 固定使用 Python 3.12）
- uv 0.11+

## 开始开发

```bash
pnpm install
pnpm dev:web
pnpm dev:admin
cd backend && uv sync
uv run uvicorn app.main:app --reload --port 8000
```

展示端打开 [http://localhost:3000](http://localhost:3000)，管理端打开 [http://localhost:5173](http://localhost:5173)，API 文档打开 [http://localhost:8000/docs](http://localhost:8000/docs)。

常用检查：

```bash
pnpm lint:web
pnpm typecheck:web
pnpm build:web
pnpm lint:admin
pnpm typecheck:admin
pnpm build:admin
```

如果本机安装了 [Task](https://taskfile.dev/)，也可以执行 `task web:dev`、`task web:check`、`task admin:dev` 和 `task admin:check`。

## 环境变量

复制 `web/.env.example` 为 `web/.env.local`，按本地环境填写：

- `NEXT_PUBLIC_SITE_URL`：展示端公开地址。
- `NEXT_PUBLIC_API_BASE_URL`：FastAPI 地址；未配置时展示端使用空数据状态。

Admin 可将 `admin/.env.example` 复制为 `admin/.env.local`：

- `VITE_API_BASE_URL`：管理端使用的 FastAPI API 地址。
- `VITE_WEB_URL`：从管理端跳转到公开展示端时使用的地址。

Backend 使用 `backend/.env`，字段模板见 `backend/.env.example`。首次启动前执行：

```bash
cd backend
uv run alembic upgrade head
uv run python -m app.cli create-admin
```

PostgreSQL 数据库本身需要预先创建，表、索引和约束统一由 Alembic 创建和升级。完整的首次安装、迁移状态检查及生产升级说明见 [Backend 安装与数据库迁移文档](./backend/README.md)。项目不单独维护可能与迁移记录不一致的手写 `schema.sql`。

任何 `.env*` 本地文件都不得提交，只有 `.env.example` 可以进入版本库。

## 目录说明

```text
Anywayone-blog/
├── web/          # 面向读者的展示端
├── admin/        # 当前开发中的内容管理端
├── backend/      # 当前开发中的 FastAPI 后端
├── deploy/       # Docker Compose、Caddy 与生产部署脚本
├── doc/          # 产品、架构和 UI 文档
└── Taskfile.yml  # 可选的跨端命令入口
```

文档目录继续使用 `doc/`。`.doc` 是 Word 文件扩展名，不适合作为目录名；当前文档链接已经以 `doc/` 为基线，也无需为命名风格做无收益迁移。

## 当前 Web 范围

- Anywayone 品牌导航和响应式移动菜单。
- 首页 IP 首屏、“了解更多”翻屏、个人档案与站点日志空状态。
- 文章、摄影和关于我一级页面骨架。
- 基础 Metadata、robots、sitemap、404 与错误边界。

文章、摄影、个人资料和联系方式不会使用虚构数据。FastAPI 接口可用前，公开页面显示明确空状态。

## 当前 Admin 范围

- Anywayone 品牌工作台和响应式管理布局。
- 圆角悬浮侧栏、二级菜单与移动端抽屉导航。
- FastAPI 管理员登录、会话恢复、受保护路由与安全退出。
- 概览、文章、摄影集和站点设置页面骨架。
- 文章列表筛选、搜索和分页，以及文章创建、自动保存、预览、发布、撤回与版本冲突保护。
- 摄影集编辑器的本地交互界面。

Admin 登录和文章管理已使用真实后端接口；统计、摄影、分类、媒体与设置接口仍不展示虚构数据，相应保存和上传动作目前不会持久化数据。

## 当前 Backend 范围

- FastAPI 应用、异步 PostgreSQL 连接和存活/就绪检查。
- Alembic 初始迁移、管理员安全初始化和结构化请求日志。
- 管理员登录、刷新令牌轮换、退出和当前用户接口。
- 文章草稿、保存、发布、撤回、公开列表与详情 API。
- Markdown 安全渲染、文章版本、乐观锁、审计日志和 Outbox。

## 自托管部署

仓库提供 GitHub Actions、ARM64 Docker 镜像、Docker Compose、Caddy 和宿主机 PostgreSQL 的单机部署参考实现。该实现包含 Anywayone 项目的默认仓库名、镜像名、域名和健康检查地址，Fork 后不能直接当作一键部署模板使用。

Fork 定制项、服务器初始化、GitHub Environment、数据库私网连接、HTTPS、首次管理员和回退操作见 [开源自托管部署指南](./doc/07-开源部署指南.md)。`deploy/*.env.example` 仅为字段模板，真实环境文件、个人服务器清单和运维记录不得提交到开源仓库。

## Git 约定

- 不提交密钥、构建产物、依赖目录、IDE 工作区或系统临时文件。
- 分支建议使用 `feature/*`、`fix/*` 或项目约定的 `codex/*` 前缀。
- 涉及 UI 的变更至少检查 1440px、768px、390px 和 360px 宽度。
- 提交前运行 `pnpm lint:web && pnpm typecheck:web && pnpm build:web`。
