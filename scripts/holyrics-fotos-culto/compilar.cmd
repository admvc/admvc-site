@echo off
rem Volta a fazer o FotosCulto.exe a partir de src\FotosCulto.cs, com o compilador de C# que ja vem no Windows.
cd /d "%~dp0"
"%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /codepage:65001 /optimize+ /out:FotosCulto.exe src\FotosCulto.cs
if errorlevel 1 (echo Falhou a compilar. & pause & exit /b 1)
echo FotosCulto.exe pronto.
