# Toto 生产部署指南

## 前置条件

| 要求 | 说明 |
|------|------|
| 操作系统 | Ubuntu 22.04+ (推荐) 或其他 Linux 发行版 |
| 内存 | 最低 2 GB，推荐 4 GB |
| Docker | 24.0+ |
| Docker Compose | v2 (内置于 Docker Desktop / `docker compose` 命令) |
| 域名 | 已将 A 记录指向服务器 IP |
| 防火墙 | 开放端口 80、443、22 |

Caddy 会自动通过 Let's Encrypt 申请 TLS 证书，无需手动配置 SSL。

---

## 步骤 1：准备 .env 文件

### 生成各密钥

```bash
# JWT_SECRET — 随机 32 字节十六进制
openssl rand -hex 32

# ENCRYPTION_KEY — Fernet 密钥（用于加密存储 AI API Key）
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# ADMIN_PASSWORD_HASH — bcrypt 哈希（将 YOUR_PASSWORD 替换为实际密码）
python3 -c "import bcrypt; print(bcrypt.hashpw(b'YOUR_PASSWORD', bcrypt.gensalt()).decode())"
```

### 复制并填写 .env

```bash
cp .env.example .env
nano .env
```

各变量说明：

| 变量 | 说明 | 示例 |
|------|------|------|
| `POSTGRES_PASSWORD` | PostgreSQL 密码 | `s3cur3-db-pass` |
| `JWT_SECRET` | JWT 签名密钥 (openssl 生成) | `a1b2c3...` |
| `ENCRYPTION_KEY` | Fernet 密钥 44 字符 | `xyzABC...=` |
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD_HASH` | bcrypt 哈希后的管理员密码 | `$2b$12$...` |
| `DOMAIN` | 你的域名 | `toto.example.com` |
| `CELERY_WORKER_CONCURRENCY` | Celery 并发数，建议 2-4 | `2` |

---

## 步骤 2：拉取代码并部署

```bash
git clone <repo-url> toto
cd toto
cp .env.example .env
nano .env        # 填入上一步生成的值
./deploy.sh
```

`deploy.sh` 会：
1. 验证所有必需环境变量（包括 `ENCRYPTION_KEY` 长度校验）
2. `git pull` 拉取最新代码
3. `docker compose build` 构建镜像
4. `docker compose up -d` 启动所有服务
5. 轮询 `/health` 端点直到 API 就绪（最多 60 秒）
6. 显式执行 `alembic upgrade head` 确认数据库迁移
7. 探测 `/api/auth/login` 验证认证模块正常
8. 打印最终访问 URL

---

## 步骤 3：验证部署

```bash
# 检查所有容器状态
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# 查看 API 日志
docker compose logs -f api

# 手动健康检查
curl https://your-domain.com/health
```

浏览器访问 `https://your-domain.com`，使用配置的管理员账号登录。

---

## 步骤 4：配置 AI 提供商

1. 登录 Toto Web UI
2. 进入 **设置 → AI 配置**
3. 点击 **添加 Provider**
4. 推荐使用 **DeepSeek**（价格低、速度快、中文友好）：
   - Base URL: `https://api.deepseek.com/v1`
   - Model: `deepseek-chat`
   - API Key: 填入从 [platform.deepseek.com](https://platform.deepseek.com) 获取的 Key

也支持 OpenAI、Anthropic Claude 或任何兼容 OpenAI API 格式的自定义 Provider。

---

## 步骤 5：配置飞书推送（可选）

1. 打开飞书，进入目标群聊
2. 群设置 → **机器人** → **添加机器人** → **自定义机器人**
3. 复制生成的 Webhook URL（格式：`https://open.feishu.cn/open-apis/bot/v2/hook/...`）
4. 在 Toto 中：**设置 → 飞书推送** → 粘贴 Webhook URL → 启用

启用后，每日早晨会自动推送今日任务提醒，AI 复盘完成后也会推送报告摘要。

---

## 备份与恢复

### 设置每日自动备份

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点备份，日志写入 /var/log/toto-backup.log
0 2 * * * /path/to/toto/backup.sh >> /var/log/toto-backup.log 2>&1
```

备份内容：
- PostgreSQL 完整 dump（gzip 压缩）
- `.env` 文件副本
- 自动保留最近 30 天，删除更早的备份

### 恢复数据库

```bash
# 交互式恢复（会提示确认）
./restore.sh ./backups/2026-05-28

# 手动恢复命令
gunzip -c ./backups/2026-05-28/toto.sql.gz | docker compose exec -T postgres psql -U postgres -d toto
```

---

## 升级

```bash
cd toto
git pull
./deploy.sh
```

`deploy.sh` 会重新构建镜像并执行数据库迁移，通常无停机时间（取决于迁移复杂度）。

---

## 故障排查

### API 返回 503

```bash
docker compose logs api --tail=50
```

常见原因：数据库迁移失败。检查 `alembic upgrade head` 输出。

### Celery Worker 不工作（AI 复盘任务不执行）

```bash
docker compose logs worker beat --tail=50
```

常见原因：Redis 连接失败，检查 `REDIS_URL` 配置。

```bash
# 手动测试 Redis 连通性
docker compose exec worker redis-cli -u "$REDIS_URL" ping
```

### 飞书推送失败

- 检查 Webhook URL 是否正确（飞书机器人页面重新复制）
- 检查服务器出站网络是否能访问 `open.feishu.cn`：
  ```bash
  curl -I https://open.feishu.cn
  ```
- 检查飞书机器人是否已被禁用

### Caddy 无法获取 TLS 证书

- 确认域名 A 记录已生效：`dig +short your-domain.com`
- 确认端口 80/443 在防火墙中开放
- 查看 Caddy 日志：`docker compose logs caddy`

### 磁盘空间不足

```bash
# 查看 Docker 占用
du -sh /var/lib/docker

# 清理未使用的镜像和容器
docker system prune -f

# 查看备份占用
du -sh ./backups/
```

---

## 安全建议

- **修改默认管理员密码**：在 `.env` 中更新 `ADMIN_PASSWORD_HASH`，重启 api 容器生效
- **防火墙规则**：仅开放 80、443、22 端口；PostgreSQL (5432) 和 Redis (6379) 不对外暴露（生产 compose 已用 `ports: !reset []` 屏蔽）
- **定期备份并测试恢复**：至少每月执行一次 `./restore.sh` 验证备份可用性
- **监控磁盘使用**：`du -sh /var/lib/docker` 日志和镜像会随时间增长
- **定期更新依赖**：`git pull && ./deploy.sh` 会拉取最新镜像
- **轮换密钥**：如果怀疑 `JWT_SECRET` 或 `ENCRYPTION_KEY` 泄露，更新 `.env` 并重启所有服务（注意：轮换 `ENCRYPTION_KEY` 会导致已存储的 AI API Key 无法解密，需重新输入）
