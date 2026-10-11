$adminUrl = 'https://contoso-admin.sharepoint.com'
Connect-SPOService -Url $adminUrl

$sites = Get-SPOSite -Limit All -IncludePersonalSite $false | ForEach-Object { Get-SPOSite -Identity $_.Url }

$rapport = foreach ($site in $sites) {
    [PSCustomObject]@{
        Url         = $site.Url
        Eigenaar    = $site.Owner
        OpslagGB    = [math]::Round($site.StorageUsageCurrent / 1024, 1)
        Delen       = $site.SharingCapability
        LaatsteWijz = $site.LastContentModifiedDate
    }
}

$rapport | Where-Object { $_.Delen -eq 'ExternalUserAndGuestSharing' } |
    Sort-Object OpslagGB -Descending |
    Format-Table -AutoSize
