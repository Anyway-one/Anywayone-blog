# Anywayone Blog

Anywayone Blog 是一个面向个人长期维护的内容系统，同一仓库规划包含三个应用：

- `web/`：面向读者的展示端，Next.js App Router + TypeScript。
- `admin/`：内容管理端，React + Vite + Ant Design，当前开发中。
- `backend/`：内容与媒体 API，规划使用 Python 3.11+ + FastAPI，暂未开发。

当前开发阶段推进 `web/` 与 `admin/`，`backend/` 留待下一阶段。产品、架构和 UI 决策见 [doc/README.md](./doc/README.md)。

## 环境要求

- Node.js 24 LTS（见 `.nvmrc`）
- pnpm 10.34+

## 开始开发

```bash
pnpm install
pnpm dev:web
pnpm dev:admin
```

展示端打开 [http://localhost:3000](http://localhost:3000)，管理端打开 [http://localhost:5173](http://localhost:5173)。

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
- `NEXT_PUBLIC_API_BASE_URL`：FastAPI 地址；后端未开发期间可以留空。

Admin 可将 `admin/.env.example` 复制为 `admin/.env.local`：

- `VITE_API_BASE_URL`：管理端使用的 FastAPI API 地址。
- `VITE_WEB_URL`：从管理端跳转到公开展示端时使用的地址。

任何 `.env*` 本地文件都不得提交，只有 `.env.example` 可以进入版本库。

## 目录说明

```text
Anywayone-blog/
├── web/          # 面向读者的展示端
├── admin/        # 当前开发中的内容管理端
├── backend/      # 预留，暂不开发
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
- 概览、文章、摄影集和站点设置页面骨架。
- 文章编辑器与摄影集编辑器的本地交互界面。

后端 API 可用前，Admin 不展示虚构统计或内容；保存、发布和上传动作只提供界面状态，不会持久化数据。

## Git 约定

- 不提交密钥、构建产物、依赖目录、IDE 工作区或系统临时文件。
- 分支建议使用 `feature/*`、`fix/*` 或项目约定的 `codex/*` 前缀。
- 涉及 UI 的变更至少检查 1440px、768px、390px 和 360px 宽度。
- 提交前运行 `pnpm lint:web && pnpm typecheck:web && pnpm build:web`。
