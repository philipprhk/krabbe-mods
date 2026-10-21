# Baut bin\krabbe.exe aus src\Krabbe.cs mit dem C#-Compiler, der bei Windows dabei ist.
$ErrorActionPreference = 'Stop'
$net = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
$wpf = Join-Path $net 'WPF'
$hier = Split-Path -Parent $MyInvocation.MyCommand.Path
New-Item -ItemType Directory -Force (Join-Path $hier 'bin') | Out-Null

& (Join-Path $net 'csc.exe') /nologo /target:winexe /optimize+ `
  /out:"$hier\bin\krabbe.exe" `
  /r:"$wpf\PresentationFramework.dll" /r:"$wpf\PresentationCore.dll" /r:"$wpf\WindowsBase.dll" `
  /r:"$net\System.Xaml.dll" `
  "$hier\src\Krabbe.cs"
if ($LASTEXITCODE -ne 0) { throw "Bauen fehlgeschlagen ($LASTEXITCODE)" }
'bin\krabbe.exe gebaut'
