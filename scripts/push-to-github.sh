#!/usr/bin/env bash
set -Eeuo pipefail

# Upload this project to the existing public GitHub repository without
# replacing its Git history. Uses the Git credentials configured on this Mac.
REPO_URL="${FORTUNE_MASTER_REPO_URL:-https://github.com/zhuhong123wangyang-glitch/wmywbyt.git}"
BRANCH="${FORTUNE_MASTER_BRANCH:-main}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/fortune-master-push.XXXXXX")"
WORKTREE="$TMP_ROOT/repo"

cleanup() { rm -rf "$TMP_ROOT"; }
trap cleanup EXIT

if ! command -v git >/dev/null 2>&1; then
  echo "错误：需要先安装 Git。" >&2
  exit 1
fi
if ! command -v rsync >/dev/null 2>&1; then
  echo "错误：需要 rsync（macOS 通常已自带）。" >&2
  exit 1
fi

# Avoid a confusing push failure caused by missing commit identity.
if ! git config --global user.name >/dev/null 2>&1 || ! git config --global user.email >/dev/null 2>&1; then
  echo "请先配置 Git 提交身份：" >&2
  echo '  git config --global user.name "Your Name"' >&2
  echo '  git config --global user.email "you@example.com"' >&2
  exit 1
fi

echo "正在获取目标仓库：$REPO_URL"
git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$WORKTREE"

# Overlay project files onto the existing main branch while preserving .git.
rsync -a --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='.DS_Store' \
  "$PROJECT_ROOT/" "$WORKTREE/"

cd "$WORKTREE"
git add -A
if git diff --cached --quiet; then
  echo "仓库内容已是最新，无需创建提交。"
else
  git commit -m "feat: publish Fortune Master public web app"
fi

echo "正在推送到 $BRANCH ..."
git push origin "HEAD:$BRANCH"
echo "上传完成： https://github.com/zhuhong123wangyang-glitch/wmywbyt"
