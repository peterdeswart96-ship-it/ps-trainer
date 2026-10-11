param(
    [string]$AdminUrl = 'https://contoso-admin.sharepoint.com',
    [ValidateSet('Disabled', 'ExistingExternalUserSharingOnly', 'ExternalUserSharingOnly', 'ExternalUserAndGuestSharing')]
    [string]$MaxNiveau = 'ExternalUserSharingOnly'
)

$niveau = @{
    Disabled                        = 0
    ExistingExternalUserSharingOnly = 1
    ExternalUserSharingOnly         = 2
    ExternalUserAndGuestSharing     = 3
}

Connect-SPOService -Url $AdminUrl

$tenant = Get-SPOTenant
$sites = Get-SPOSite -Limit All -IncludePersonalSite $false | ForEach-Object { Get-SPOSite -Identity $_.Url }

$teRuim = $sites | Where-Object { $niveau["$($_.SharingCapability)"] -gt $niveau[$MaxNiveau] }

Write-Host "Tenantinstelling: $($tenant.SharingCapability)"
$teRuim | Select-Object Url, SharingCapability, Owner | Sort-Object SharingCapability | Format-Table -AutoSize
