param(
    [string]$Bron = '\\fs01\afdeling',
    [string]$DoelSite = 'https://contoso.sharepoint.com/sites/afdeling',
    [string]$Bibliotheek = 'Documents',
    [string]$Submap = 'Archief'
)

Import-Module Microsoft.SharePoint.MigrationTool.PowerShell

Register-SPMTMigration -Force -MigrateFileVersionHistory $false -ReplacementOfInvalidChar '_'

Add-SPMTTask -FileShareSource $Bron -TargetSiteUrl $DoelSite -TargetList $Bibliotheek -TargetListRelativePath $Submap

Start-SPMTMigration -NoShow

$sessie = Get-SPMTMigration
while ($sessie.Status -ne 'Finished') {
    foreach ($taak in $sessie.StatusOfTasks) {
        Write-Host "Voortgang: $($taak.MigratingProgressPercentage)%"
    }
    Start-Sleep -Seconds 30
}

Unregister-SPMTMigration
