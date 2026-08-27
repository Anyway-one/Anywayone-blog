# Anywayone Backend

Anywayone Blog 的 FastAPI 后端，使用 SQLAlchemy 2.0 异步模式、PostgreSQL 和 Alembic。

## 环境要求

- Python 3.11+（项目当前通过 `.python-version` 使用 Python 3.12）
- [uv](https://docs.astral.sh/uv/)
- PostgreSQL 14+

## 首次安装

### 1. 创建空数据库

Alembic 负责创建表、索引和约束，但不会创建 PostgreSQL 数据库本身。先在 PostgreSQL 中创建一个空数据库和具有该数据库权限的用户。

已有 PostgreSQL 用户时，可以直接创建数据库：

```bash
createdb --host=127.0.0.1 --port=5432 --username=anywayone anywayone_blog_dev
```

也可以由 PostgreSQL 管理员执行：

```sql
CREATE USER anywayone WITH PASSWORD '请替换为安全密码';
CREATE DATABASE anywayone_blog_dev OWNER anywayone;
```

生产环境不要让应用使用 PostgreSQL 超级用户。数据库名称、用户和密码可以自行调整，只需与 `.env` 保持一致。

### 2. 配置环境变量

在 `backend/` 目录执行：

```bash
cp .env.example .env
```

编辑 `.env`，至少正确设置以下字段：

```dotenv
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=anywayone_blog_dev
DATABASE_USER=anywayone
DATABASE_PASSWORD=请替换为数据库密码
DATABASE_SSL_MODE=prefer
SECRET_KEY=请替换为至少32位的随机字符串
```

可以用下面的命令生成 `SECRET_KEY`：

```bash
openssl rand -hex 32
```

`.env` 包含敏感信息，已被 Git 忽略，禁止提交。远程或生产数据库应启用 PostgreSQL SSL；`DATABASE_SSL_MODE=disable` 只适合可信内网或已建立安全隧道的环境。

### 3. 安装依赖并创建表

```bash
uv sync
uv run alembic upgrade head
```

看到类似下面的输出即表示迁移已执行：

```text
Running upgrade -> 20260827_0001, initial schema
```

重复执行 `uv run alembic upgrade head` 是安全的。Alembic 只会执行尚未应用的迁移，并通过数据库中的 `alembic_version` 表记录当前版本。

### 4. 创建首个管理员

必须先完成数据库迁移，再执行：

```bash
uv run python -m app.cli create-admin
```

命令会交互式询问管理员信息，密码不会作为命令行参数出现。成功后会输出：

```text
Administrator created.
```

### 5. 启动服务

```bash
uv run uvicorn app.main:app --reload --port 8000
```

开发环境地址：

- API 文档：<http://localhost:8000/docs>
- 存活检查：<http://localhost:8000/health/live>
- 数据库就绪检查：<http://localhost:8000/health/ready>

`/health/ready` 返回 `200` 且 `database` 为 `ok`，表示应用可以正常访问数据库。

## 数据库迁移

Alembic 迁移文件位于 `alembic/versions/`，它们是数据库结构的唯一可信来源。项目不手动维护另一份 `schema.sql`，避免 SQL 快照与实际迁移发生偏差。

查看当前数据库版本：

```bash
uv run alembic current
```

查看迁移历史：

```bash
uv run alembic history
```

将数据库升级到最新版本：

```bash
uv run alembic upgrade head
```

生产部署时，应先备份数据库，再在新版本 API 启动前运行该升级命令。不要删除 `alembic_version` 表，也不要绕过 Alembic 手动修改已经投入使用的表结构。

### 开发新的迁移

修改 SQLAlchemy 模型后生成迁移草稿：

```bash
uv run alembic revision --autogenerate -m "describe the change"
```

生成后必须人工检查 `upgrade()` 和 `downgrade()`，确认数据迁移、约束名称和回退逻辑正确，再执行：

```bash
uv run alembic upgrade head
```

回退最近一次迁移仅用于明确评估过影响的场景：

```bash
uv run alembic downgrade -1
```

回退可能删除字段或数据，生产环境执行前必须检查对应迁移的 `downgrade()` 并完成备份。

## 日常开发

```bash
uv run ruff check .
uv run ruff format --check .
uv run pyright
uv run pytest
```
