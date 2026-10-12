param(
    [string]$AdminUrl = 'https://contoso-admin.sharepoint.com',
    [string]$Csv = '.\inactieve-sites.csv',
    [ValidateSet('ReadOnly', 'NoAccess', 'Unlock')]
    [string]$Status = 'ReadOnly',
    [switch]$Uitvoeren
)

Connect-SPOService -Url $AdminUrl

foreach ($site in Import-Csv -Path $Csv) {
    if (([uri]$site.Url).AbsolutePath.Trim('/') -eq '') {
        Write-Warning "Overgeslagen (hoofdsite): $($site.Url)"
        continue
    }

    try {
        $huidig = (Get-SPOSite -Identity $site.Url -ErrorAction Stop).LockState
        if ($Uitvoeren) {
            Set-SPOSite -Identity $site.Url -LockState $Status -ErrorAction Stop
            Write-Host "$($site.Url): $huidig -> $Status"
        }
        else {
            Write-Host "Droge run: $($site.Url) staat op $huidig, zou $Status worden"
        }
    }
    catch {
        Write-Warning "Mislukt op $($site.Url): $($_.Exception.Message)"
    }
}
