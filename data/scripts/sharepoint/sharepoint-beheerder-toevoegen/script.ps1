param(
    [string]$AdminUrl = 'https://contoso-admin.sharepoint.com',
    [Parameter(Mandatory)]
    [string]$Beheerder,
    [string]$Csv = '.\sites.csv',
    [switch]$Uitvoeren
)

Connect-SPOService -Url $AdminUrl

$sites = Import-Csv -Path $Csv

foreach ($site in $sites) {
    if ($Uitvoeren) {
        try {
            Set-SPOUser -Site $site.Url -LoginName $Beheerder -IsSiteCollectionAdmin $true -ErrorAction Stop
            Write-Host "Toegevoegd: $Beheerder op $($site.Url)"
        }
        catch {
            Write-Warning "Mislukt op $($site.Url): $($_.Exception.Message)"
        }
    }
    else {
        Write-Host "Droge run: zou $Beheerder toevoegen op $($site.Url)"
    }
}
