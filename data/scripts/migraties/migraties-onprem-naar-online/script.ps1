param(
    [string]$BronSite = 'https://sharepoint.contoso.local/sites/afdeling',
    [string]$DoelSite = 'https://contoso.sharepoint.com/sites/afdeling',
    [switch]$AlleenScannen
)

Import-Module Microsoft.SharePoint.MigrationTool.PowerShell

$bronAccount = Get-Credential -Message 'Account voor SharePoint on-premises'

Register-SPMTMigration -Force -ScanOnly $AlleenScannen.IsPresent -PreserveUserPermissionsForSharePointSource $true -SkipListsWithName 'Workflow Tasks;Style Library'

Add-SPMTTask -SharePointSourceSiteUrl $BronSite -SharePointSourceCredential $bronAccount -TargetSiteUrl $DoelSite -MigrateAll

Start-SPMTMigration

$sessie = Get-SPMTMigration
$sessie.StatusOfTasks

Unregister-SPMTMigration
