# Fortune Master 公网试用版：下一步部署

## 当前版本

- GitHub 目标仓库：`https://github.com/zhuhong123wangyang-glitch/wmywbyt`
- 分支：`main`
- 仓库保持 Public。
- Render Blueprint 仅定义一个 Oregon 区域的免费 Node Web Service；不创建 PostgreSQL 或其他付费资源。
- 健康检查路径：`/api/health`。

## 1. 上传源码到 GitHub

解压 `Fortune-Master-Public-v0.2.0-free-preview.zip`，在 macOS Terminal 中进入解压后的 `fortune-master-public` 目录，然后运行：

```bash
bash scripts/push-to-github.sh
```

脚本会用本机已配置的 Git 凭据克隆现有 `main`，覆盖为这份项目源码，提交并推送；它不会改动 GitHub 账户设置，也不会创建云服务。第一次运行需确保已配置 Git 身份和 GitHub 推送授权。

如需改用其他仓库或分支，可在运行前设置：

```bash
FORTUNE_MASTER_REPO_URL=https://github.com/OWNER/REPO.git FORTUNE_MASTER_BRANCH=main bash scripts/push-to-github.sh
```

## 2. 在 Render 生成部署预览

源码推送成功后，在 Render 控制台选择 **New → Blueprint**，连接上述 GitHub 仓库并选择 `main`。Render 会读取仓库根目录的 `render.yaml`。审阅计划时确认仅包含 `fortune-master-public` 一个 **Free Web Service**，没有数据库、持久磁盘或付费服务，再应用计划。

上线后 Render 会提供 `https://<service-name>.onrender.com` 公网链接。先访问：

```text
https://<service-name>.onrender.com/api/health
```

预期 `status` 为 `ok`，数据库显示未配置。然后用浏览器实际测试八字、紫微、六爻、梅花、黄历、合盘和每日一签。

## 3. 免费版的已知限制

- Render 免费 Web Service 在 15 分钟无流量后休眠，恢复访问时可能冷启动。
- 免费服务的文件系统是临时存储，服务休眠、重启或重新部署时可能丢失服务端每日签簿历史。
- 命盘档案和本地记录保存在各访问者自己的浏览器；未配置 PostgreSQL 时云端记录同步关闭，不能跨设备同步。
- 当前环境未能成功从 npm Registry 安装依赖，因此真实第三方依赖加载和线上 API E2E 仍需在首次 Render 构建后验收。

## 4. 付费扩展（暂不启用）

长期云端保存需要另行增加 PostgreSQL。Render 当前公开价格中 `0.1c-256mb` PostgreSQL 约为 US$6/月，额外存储或用量可能另计。此版本不创建该数据库，需另行确认费用后再变更 Blueprint。
