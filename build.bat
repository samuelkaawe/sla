@echo off
cd /d %~dp0
set PY=
where py >nul 2>nul && set PY=py
if "%PY%"=="" where python >nul 2>nul && set PY=python
if "%PY%"=="" goto nopy
%PY% -m pip install -r server\requirements.txt pyinstaller || goto erro
%PY% -m PyInstaller --noconfirm --onefile --noconsole --name PhonePad --add-data "www;www" --collect-all vgamepad server\server.py || goto erro
echo.
echo Pronto: dist\PhonePad.exe
pause
exit /b 0
:nopy
echo Python nao encontrado.
echo Instale em https://www.python.org/downloads/ marcando "Add python.exe to PATH" e rode de novo.
pause
exit /b 1
:erro
echo.
echo Algo falhou. Leia a mensagem acima.
pause
exit /b 1
