@echo off
setlocal
set "ROOT=%~dp0"
set "LAUNCHER=%ROOT%builds\windows\DotNetMasteryLauncher.exe"

if exist "%LAUNCHER%" (
  "%LAUNCHER%"
) else (
  echo Built launcher was not found. Running from source with dotnet...
  dotnet run --project "%ROOT%launcher\DotNetMastery.Launcher.csproj"
)
