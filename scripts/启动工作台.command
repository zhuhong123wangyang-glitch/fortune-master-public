#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; fi
printf '\n=== Fortune Master V1.5.0 · 专业规则升级版工作台 ===\n'
if ! command -v node >/dev/null 2>&1; then
  echo '需要 Node.js 20 或以上，请先安装 https://nodejs.org/'
  read -r -p '按回车退出...' _; exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node $(node -v) 版本过低，请升级至 20 或以上。"
  read -r -p '按回车退出...' _; exit 1
fi
if [ ! -d node_modules/lunar-typescript ] || [ ! -d node_modules/iztro ]; then
  echo '首次安装历法与紫微依赖；下载失败时每日签、六爻、梅花仍可使用，合盘/八字/紫微需联网安装。'
  if ! npm install --ignore-scripts --no-audit --no-fund; then
    echo 'npm 下载失败：将继续启动；双人合盘、八字和紫微需要安装依赖后才能计算。'
  fi
fi
# 仅在本版本签簿不存在时，从较新的旧版本复制；不删除或覆盖任何旧版个人数据。
NEW_SIGNBOOK="$DIR/data/signbook.json"
if [ ! -e "$NEW_SIGNBOOK" ]; then
  for OLD_DIR in "$HOME/Desktop/fortune-master-v1.4" "$HOME/Desktop/fortune-master-v1.3.2" "$HOME/Desktop/fortune-master-v1.3.1" "$HOME/Desktop/fortune-master-v1.3"; do
    OLD_SIGNBOOK="$OLD_DIR/data/signbook.json"
    if [ -f "$OLD_SIGNBOOK" ] && [ ! -L "$OLD_SIGNBOOK" ]; then
      mkdir -p "$DIR/data"
      cp -p "$OLD_SIGNBOOK" "$NEW_SIGNBOOK"
      chmod 600 "$NEW_SIGNBOOK" 2>/dev/null || true
      echo "已复制旧版历史签簿（原文件保留）：$OLD_DIR"
      break
    fi
  done
fi
# 对个人档案执行保护性迁移：仅目标不存在时复制上个版本的明文档案。
# 数据在用户本机，迁移前不发往任何网络服务。
NEW_PROFILES="$DIR/data/profiles.json"
OLD_PROFILES="$HOME/Desktop/fortune-master-v1.4/data/profiles.json"
if [ ! -e "$NEW_PROFILES" ] && [ ! -L "$NEW_PROFILES" ] && [ -f "$OLD_PROFILES" ] && [ ! -L "$OLD_PROFILES" ]; then
  mkdir -p "$DIR/data"
  cp -p "$OLD_PROFILES" "$NEW_PROFILES"
  chmod 600 "$NEW_PROFILES" 2>/dev/null || true
  echo '已复制 V1.4 本机命盘档案；旧文件未被改动。'
fi
PORT="${FORTUNE_PORT:-8766}"
case "$PORT" in ''|*[!0-9]*) echo 'FORTUNE_PORT 必须是端口数字';exit 1;; esac
if [ "$PORT" -lt 1024 ] || [ "$PORT" -gt 65535 ]; then echo '端口范围应为 1024–65535'; exit 1; fi
# 旧版占用 8766 时不再中断，更不复用旧页面：自动为新版选择一个空闲端口。
if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "注意：$PORT 已被旧版或其他服务占用，新版自动选择其他端口。"
  FOUND=''
  CANDIDATE=8767
  while [ "$CANDIDATE" -le 8799 ]; do
    if ! lsof -nP -iTCP:"$CANDIDATE" -sTCP:LISTEN >/dev/null 2>&1; then FOUND="$CANDIDATE"; break; fi
    CANDIDATE=$((CANDIDATE+1))
  done
  if [ -z "$FOUND" ]; then echo '未找到可用端口 8767–8799，请关闭已有工作台。';exit 1; fi
  PORT="$FOUND"
fi
URL="http://127.0.0.1:$PORT"
echo "当前版本 V1.5.0 · 地址：$URL"
( sleep 2; if command -v open >/dev/null 2>&1; then open "$URL"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL" >/dev/null 2>&1; fi ) &
echo '如需停止服务，在此窗口按 Control+C。'
exec env FORTUNE_PORT="$PORT" node src/server.mjs
