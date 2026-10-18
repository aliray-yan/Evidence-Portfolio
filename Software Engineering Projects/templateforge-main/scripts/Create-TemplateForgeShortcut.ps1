$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$exe = Join-Path $root "TemplateForge.exe"
$icon = Join-Path $root "launcher\TemplateForgeLauncher\TemplateForge.ico"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "TemplateForge.lnk"

if (-not (Test-Path $exe)) {
  throw "TemplateForge.exe was not found at $exe. Build the launcher first."
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $exe
$shortcut.WorkingDirectory = $root
$shortcut.IconLocation = $icon
$shortcut.Description = "Open TemplateForge"
$shortcut.Save()

Write-Host "Created desktop shortcut: $shortcutPath"
