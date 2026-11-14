@echo off
cd /d "%~dp0"
".local\runtime\Scripts\python.exe" -m training.job_status --watch
if errorlevel 1 pause
