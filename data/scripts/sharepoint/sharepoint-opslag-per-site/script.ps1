param(
    [string]$AdminUrl = 'https://contoso-admin.sharepoint.com',
    [int]$Top = 10
)

Connect-SPOService -Url $AdminUrl

$sites = Get-SPOSite -Limit All -IncludePersonalSite $false

$opslag = $sites | Select-Object Url,
    @{ Name = 'GebruiktGB'; Expression = { [math]::Round($_.StorageUsageCurrent / 1024, 1) } },
    @{ Name = 'QuotumGB'; Expression = { [math]::Round($_.StorageQuota / 1024, 1) } },
    @{ Name = 'PercentageVol'; Expression = { if ($_.StorageQuota -gt 0) { [math]::Round(100 * $_.StorageUsageCurrent / $_.StorageQuota, 1) } else { 0 } } }

$opslag | Sort-Object GebruiktGB -Descending | Select-Object -First $Top | Format-Table -AutoSize
