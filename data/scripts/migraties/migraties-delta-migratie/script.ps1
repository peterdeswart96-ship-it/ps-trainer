param(
    [string]$Bron = '\\fs01\afdeling',
    [string]$DoelSite = 'https://contoso.sharepoint.com/sites/afdeling',
    [string]$Bibliotheek = 'Documents',
    [string]$Submap = 'Archief',
    [Parameter(Mandatory)]
    [datetime]$EersteRun
)

Import-Module Microsoft.SharePoint.MigrationTool.PowerShell

Register-SPMTMigration -Force -EnableMultiRound $true -MigrateFilesModifiedAfter $EersteRun.AddHours(-1)

Add-SPMTTask -FileShareSource $Bron -TargetSiteUrl $DoelSite -TargetList $Bibliotheek -TargetListRelativePath $Submap

Start-SPMTMigration

$sessie = Get-SPMTMigration
$sessie.StatusOfTasks

Unregister-SPMTMigration
