@echo off
REM Commit and push changes
cd /d "d:\Projects\wish.worktrees\agents-full-project-readme"

echo Checking git status...
git status

echo.
echo Staging all changes...
git add -A

echo.
echo Creating commit...
git commit -m "Fix music player: remove 60-second window and looping; add kaacha mango girls theme" -m "- Music player now plays full song duration instead of hardcoded 60-second clip
- Fixed infinite looping: song stops at end instead of restarting
- Removed song_start and song_duration parameters from frontend and backend
- Added proper onEnded event handler for graceful song completion
- Added new Kaacha Mango theme variant for girls with soft green palette
- Theme uses leaf particles and Nunito font for feminine appeal"

echo.
echo Verifying commit...
git log --oneline -1

echo.
echo Pushing to remote...
git push

echo.
echo Done!
pause
