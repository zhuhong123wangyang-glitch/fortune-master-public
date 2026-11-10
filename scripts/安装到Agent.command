#!/bin/bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
echo "Fortune Master Skill V1.5.0 安装到本机 Agent 目录"
echo "源目录: $DIR"
for TARGET in "$HOME/.claude/skills/fortune-master" "$HOME/.codex/skills/fortune-master" "$HOME/.openclaw/workspace/skills/fortune-master"; do
  if [ -L "$TARGET" ]; then
    OLD="$(readlink "$TARGET")"
    case "$OLD" in
      */fortune-master-v1.0|*/fortune-master-v1.1|*/fortune-master-v1.2|*/fortune-master-v1.3|*/fortune-master-v1.3.1|*/fortune-master-v1.3.2|*/fortune-master-v1.4)
        echo "检测到旧版 V1.0–V1.4 软链接，更新为 V1.5.0：$TARGET"
        rm "$TARGET"
        ln -s "$DIR" "$TARGET"
        continue
        ;;
    esac
    echo "跳过（已有其他软链接，不覆盖）：$TARGET"
    continue
  fi
  if [ -e "$TARGET" ]; then
    echo "跳过（已有实体目录，不覆盖）：$TARGET"
    continue
  fi
  mkdir -p "$(dirname "$TARGET")"
  ln -s "$DIR" "$TARGET"
  echo "已建立软链接：$TARGET"
done
printf '\n安装目录不能移动，否则软链接将失效；运行 npm install --ignore-scripts 以安装历法与紫微依赖。\n'
read -r -p "按回车结束..." _
