#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then . "$HOME/.nvm/nvm.sh"; fi
printf '\n=== Fortune Master V1.5.0 · 本机验证 ===\n'
if ! command -v node >/dev/null 2>&1; then
  echo '未检测到 Node.js 20+，请先安装 https://nodejs.org/'
  read -r -p '按回车退出...' _; exit 1
fi
printf 'Node: '; node -v
printf 'npm: '; npm -v
echo '1/2: 旧功能、八宫纳甲、四化、格局候选、合盘与安全回归测试...'
npm test
if [ -d node_modules/lunar-typescript ] && [ -d node_modules/iztro ]; then
  printf '\n2/2: 实际排盘引擎自检（八字、紫微12宫与合盘）...\n'
  if npm run selfcheck; then
    echo '第三方排盘基本自检通过（不代表已验证所有历法边界）。'
  else
    echo '排盘引擎自检失败，请保存完整输出排查。'
  fi
else
  echo '2/2: 缺少 npm 依赖，跳过真实八字/紫微自检；每日签、六爻、梅花测试仍可通过。'
fi
read -r -p '按回车结束...' _
