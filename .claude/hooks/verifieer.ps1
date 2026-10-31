# Stop-hook: controleert gewijzigde code voordat Claude de beurt afsluit.
# Exit 2 + melding op stderr = Claude moet eerst herstellen.
$ErrorActionPreference = 'Continue'
$invoer = [Console]::In.ReadToEnd()
try { $j = $invoer | ConvertFrom-Json } catch { $j = $null }
if ($j -and $j.stop_hook_active) { exit 0 }   # lus-beveiliging

$root = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }
Set-Location $root

$gewijzigd = git status --porcelain 2>$null
$relevant = $gewijzigd | Where-Object { $_ -match ' "?(data|schema|tests|tools|oefenen|woordenboek|legacy|assets|\.github)/|\.(mjs|js|html|json)"?$' }
$fouten = @()

if ($relevant) {
    $uit = npm test --silent 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) { $fouten += "npm test mislukt:`n$($uit.Trim())" }
}

if ($fouten.Count -gt 0) {
    [Console]::Error.WriteLine(($fouten -join "`n`n"))
    exit 2
}
exit 0
