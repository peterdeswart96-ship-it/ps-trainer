param(
    [string]$AdminUrl = 'https://contoso-admin.sharepoint.com',
    [string]$Uitvoer = '.\copilot-gereedheid.csv'
)

Connect-SPOService -Url $AdminUrl

$sites = Get-SPOSite -Limit All -IncludePersonalSite $false | ForEach-Object { Get-SPOSite -Identity $_.Url }

$rapport = foreach ($site in $sites) {
    [PSCustomObject]@{
        Url    = $site.Url
        Delen  = $site.SharingCapability
        RcdAan = [bool]$site.RestrictContentOrgWideSearch
    }
}

$rapport | Export-Csv -Path $Uitvoer -NoTypeInformation -Encoding UTF8

$tenant = Get-SPOTenant
Write-Host "Sitebeheerders mogen RCD zelf beheren: $($tenant.DelegateRestrictedContentDiscoverabilityManagement)"

$rapport | Group-Object RcdAan | Select-Object Name, Count
