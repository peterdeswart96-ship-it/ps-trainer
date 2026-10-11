Import-Module Sharegate

$plan = Import-Csv -Path '.\migratieplan.csv'   # kolommen: Bron, Doel, Bibliotheek
$instellingen = New-CopySettings -OnContentItemExists IncrementalUpdate

foreach ($regel in $plan) {
    $bronSite = Connect-Site -Url $regel.Bron -Browser
    $doelSite = Connect-Site -Url $regel.Doel -Browser

    $bronLijst = Get-List -Site $bronSite -Name $regel.Bibliotheek
    $doelLijst = Get-List -Site $doelSite -Name $regel.Bibliotheek

    $resultaat = Copy-Content -SourceList $bronLijst -DestinationList $doelLijst -CopySettings $instellingen
    Export-Report $resultaat -Path ".\rapporten\$($regel.Bibliotheek).xlsx"
}
