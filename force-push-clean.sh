#!/bin/bash

# 强制推送清理后的代码到 GitHub 的脚本
# 用途：在新分支上提交清理commit，推送到GitHub，然后回到原分支

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 保存当前分支名
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${GREEN}当前分支: ${CURRENT_BRANCH}${NC}"

# 临时分支名
TEMP_BRANCH="new-main"

# 检查是否有未提交的更改
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}错误: 当前有未提交的更改，请先提交或储藏${NC}"
    exit 1
fi

# 删除已存在的临时分支（如果存在）
if git show-ref --verify --quiet "refs/heads/${TEMP_BRANCH}"; then
    echo -e "${YELLOW}删除已存在的分支: ${TEMP_BRANCH}${NC}"
    git branch -D "${TEMP_BRANCH}"
fi

# 创建新的干净分支（基于当前分支）
echo -e "${GREEN}创建新分支: ${TEMP_BRANCH}${NC}"
git checkout  --orphan "${TEMP_BRANCH}"

# 提交更改（跳过 pre-commit hooks）
echo -e "${GREEN}提交更改: global${NC}"
git commit --allow-empty -m "global" --no-verify

# 强制推送到 GitHub 的 main 分支
echo -e "${YELLOW}强制推送到 github 的 main 分支...${NC}"
git push github "${TEMP_BRANCH}:main" --force
echo -e "${GREEN}推送成功！${NC}"

# 切换回原分支
echo -e "${GREEN}切换回原分支: ${CURRENT_BRANCH}${NC}"
git checkout "${CURRENT_BRANCH}"

# 删除临时分支
git branch -D "${TEMP_BRANCH}"
echo -e "${GREEN}已删除临时分支${NC}"

echo -e "${GREEN}完成！${NC}"
