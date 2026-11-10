---
name: fortune-profiles
description: 本地出生资料档案服务，必须获得用户明确同意才能保存。
---

# 个人命盘档案 V1.4

`node src/cli.mjs profiles --action list` 可列出本机已有档案。`save` 必须携带 `--consent true`；编辑时添加 `--id <uuid>`；读取必须有 `--id`；删除必须 `--confirm true`。文件保存在项目 `data/profiles.json`，默认为权限 `0600` 的明文 JSON；最长 200 项，不加密、不跨设备同步。不要无意储存用户真实姓名或他人出生资料，不向联网模型上传档案，用户提出删除时只删除明确选中的档案。
