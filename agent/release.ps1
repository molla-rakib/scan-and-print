# Builds the agent for shops and publishes it into the website's public/downloads folder.
#
#   1. Bump `version` in agent/Cargo.toml
#   2. powershell -ExecutionPolicy Bypass -File agent/release.ps1
#   3. Commit public/downloads and deploy. Installed agents pick up the update within ~6 hours.
param([string]$Server = "https://mudron.org")

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$env:MUDRON_SERVER = $Server.TrimEnd("/")
cargo build --release
if ($LASTEXITCODE -ne 0) { throw "cargo build failed" }

$version = (Select-String -Path Cargo.toml -Pattern '^version = "(.+)"').Matches[0].Groups[1].Value
$out = Join-Path $PSScriptRoot "..\public\downloads"
New-Item -ItemType Directory -Force $out | Out-Null

$exe = Join-Path $out "Mudron.exe"
Copy-Item "target\release\mudron.exe" $exe -Force
$hash = (Get-FileHash $exe -Algorithm SHA256).Hash.ToLower()

# Read by installed agents to decide whether to update (see src/update.rs).
$manifest = [ordered]@{ version = $version; url = "/downloads/Mudron.exe"; sha256 = $hash }
$manifest | ConvertTo-Json | Set-Content (Join-Path $out "agent.json") -Encoding ascii

Write-Host "Published agent $version for $($env:MUDRON_SERVER)"
Write-Host "  $exe"
Write-Host "  sha256 $hash"
