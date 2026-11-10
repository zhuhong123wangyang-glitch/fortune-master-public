# Fortune Master 公网版 V0.2.0 测试报告

日期：2026-11-10（免费试用 Blueprint 更新）

## 本地检查结果

- `node --check`：`server/`、`src/`、`public/`、`tests/`、`test/`、`scripts/` 下全部 JavaScript / MJS 文件通过语法检查。
- `node --test`：80 项测试全部通过，0 失败。
- `render.yaml`：免费试用配置，仅包含 1 个 Oregon Web Service，不创建 PostgreSQL 或其他付费资源。
- 公网工作台覆盖八字、紫微斗数、六爻、梅花易数、每日一签、黄历、双人合盘、命盘档案。
- 云端保存采用独立随机身份 Token 与独立加密秘密。身份 Token 会随 API 请求用于设备隔离；加密秘密不发送到服务端。云端记录内容在浏览器内用 HKDF + AES-256-GCM 加密，数据库外层标题只保留模块类别。
- 命盘档案默认仅本机保存；用户逐条另行勾选后可加密同步云端。
- CSP 仅允许加载同源脚本，工作台主脚本已外置，不再依赖内联脚本。

## 尚未完成的线上验收

- 当前开发容器无法稳定访问 npm Registry，依赖安装未完成；因此没有在此环境真实启动 Express 服务，也没有对真实 `lunar-typescript`、`iztro` npm 包及 PostgreSQL 做端到端验收。
- Render 服务与数据库尚未创建，尚无真实 `onrender.com` 分享网址。部署后必须通过 `/api/health` 并完成样例排盘和云端保存验收。
- 每日签簿仍使用服务端临时文件，Render 重启、休眠或重新部署可能清除历史。勾选保存的问题也会进入该临时签簿，不属于 AES 加密记录；请勿输入高度敏感内容。重要签文应另存到本机或加密云端记录库。
- 免费 Web Service 空闲 15 分钟后会休眠；当前 Blueprint 不创建数据库。若以后启用 `0.1c-256mb` PostgreSQL，Render 官方定价页目前显示约 US$6/月，实际费用以 Dashboard 为准。

## 复现命令

```bash
npm install
npm test
npm start
```
