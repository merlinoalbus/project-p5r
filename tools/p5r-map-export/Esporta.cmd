@echo off
setlocal
set "P5R_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%P5R_PY%" (
  "%P5R_PY%" "%~dp0esporta.py" %*
) else (
  py -3 "%~dp0esporta.py" %*
)
if errorlevel 1 (
  echo Esportazione non completata. Leggere il messaggio precedente.
) else (
  echo Esportazione e verifiche completate.
)
pause
