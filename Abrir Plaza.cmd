@echo off
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (python iniciar.py) else (py -3 iniciar.py)
if errorlevel 1 pause
