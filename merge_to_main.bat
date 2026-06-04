@echo off
REM Merge current branch to main
REM This script merges changes from the topic branch to the base branch

echo Checking current worktree status...
cd /d "d:\Projects\wish.worktrees\agents-full-project-readme"
git status

echo.
echo Getting current branch name...
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%

echo.
echo Finding main worktree...
cd /d "d:\Projects\wish"
if exist ".git" (
    echo Main worktree found at: d:\Projects\wish
) else (
    echo ERROR: Main worktree not found
    pause
    exit /b 1
)

echo.
echo Merging %CURRENT_BRANCH% into main branch...
git merge %CURRENT_BRANCH%

echo.
echo Checking for merge conflicts...
git status

echo.
echo Merge complete!
echo.
echo To push the merged changes, run:
echo git push
pause
