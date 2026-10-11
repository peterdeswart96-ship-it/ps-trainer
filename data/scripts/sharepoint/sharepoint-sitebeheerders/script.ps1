param(
    [string]$AdminUrl = 'https://contoso-admin.sharepoint.com'
)

Connect-SPOService -Url $AdminUrl

$sites = Get-SPOSite -Limit All -IncludePersonalSite $false

$beheerders = foreach ($site in $sites) {
    Get-SPOUser -Site $site.Url -Limit All |
        Where-Object { $_.IsSiteAdmin } |
        ForEach-Object {
            [PSCustomObject]@{ Site = $site.Url; Beheerder = $_.LoginName }
        }
}

$beheerders | Group-Object Beheerder | Sort-Object Count -Descending | Select-Object Name, Count | Format-Table -AutoSize
