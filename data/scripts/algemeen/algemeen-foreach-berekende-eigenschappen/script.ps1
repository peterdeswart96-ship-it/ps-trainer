param(
    [double]$MinGB = 1,
    [datetime]$Peildatum = (Get-Date)
)

$sites = @(
    [pscustomobject]@{ Url = 'https://contoso.sharepoint.com/sites/archief'; OpslagMB = 2048; Gewijzigd = [datetime]'2026-01-15' }
    [pscustomobject]@{ Url = 'https://contoso.sharepoint.com/sites/it';      OpslagMB = 512;  Gewijzigd = [datetime]'2026-09-30' }
    [pscustomobject]@{ Url = 'https://contoso.sharepoint.com/sites/finance'; OpslagMB = 4096; Gewijzigd = [datetime]'2025-03-01' }
    [pscustomobject]@{ Url = 'https://contoso.sharepoint.com/sites/nieuw';   OpslagMB = $null; Gewijzigd = [datetime]'2026-10-01' }
)

$groot = foreach ($site in $sites) {
    if ($site.OpslagMB / 1024 -lt $MinGB) { continue }
    $site
}

$groot |
    Select-Object -Property @{ Name = 'Site'; Expression = { $_.Url.Split('/')[-1] } },
                            @{ Name = 'GB'; Expression = { [math]::Round($_.OpslagMB / 1024, 1) } },
                            @{ Name = 'DagenGeleden'; Expression = { ($Peildatum - $_.Gewijzigd).Days } } |
    Sort-Object -Property DagenGeleden -Descending |
    Format-Table -AutoSize

Write-Output "$(@($groot).Count) van $($sites.Count) sites zijn minimaal $MinGB GB."
