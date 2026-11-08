@echo off
rem Volta a fazer o BaixarVideo.exe a partir de src\BaixarVideo.cs, com o compilador de C# que já vem no Windows.
cd /d "%~dp0"
"%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /codepage:65001 /optimize+ /out:BaixarVideo.exe src\BaixarVideo.cs
if errorlevel 1 (echo Falhou a compilar. & pause & exit /b 1)
echo BaixarVideo.exe pronto.
