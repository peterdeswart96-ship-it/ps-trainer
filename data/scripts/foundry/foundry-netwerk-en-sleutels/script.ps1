param(
    [string]$Uitvoer = '.\foundry-netwerk-en-sleutels.csv'
)

Connect-AzAccount | Out-Null

$resources = Get-AzCognitiveServicesAccount |
    Where-Object { $_.AccountType -in 'AIServices', 'OpenAI' }

$rapport = @(foreach ($resource in $resources) {
    $standaardActie = $resource.NetworkRuleSet.DefaultAction
    $aantalPrivate = ($resource.PrivateEndpointConnections | Measure-Object).Count
    $publiekOpen = ($resource.PublicNetworkAccess -ne 'Disabled') -and ($standaardActie -ne 'Deny')
    $sleutelsAan = $resource.DisableLocalAuth -ne $true
    $risico = if ($publiekOpen -and $sleutelsAan) { 'hoog' } elseif ($publiekOpen -or $sleutelsAan) { 'middel' } else { 'laag' }
    [PSCustomObject]@{
        Resource            = $resource.AccountName
        ResourceGroup       = $resource.ResourceGroupName
        PublicNetworkAccess = $resource.PublicNetworkAccess
        StandaardActie      = $standaardActie
        PrivateEndpoints    = $aantalPrivate
        SleutelsToegestaan  = $sleutelsAan
        PubliekOpen         = $publiekOpen
        Risico              = $risico
    }
})

$volgorde = 'hoog', 'middel', 'laag'
$rapport | Sort-Object { $volgorde.IndexOf($_.Risico) }, Resource | Format-Table -AutoSize
$rapport | Export-Csv -Path $Uitvoer -NoTypeInformation -Encoding UTF8

$hoog = ($rapport | Where-Object Risico -eq 'hoog' | Measure-Object).Count
Write-Host "$hoog resources met risico hoog (publiek open en sleutels toegestaan), rapport in $Uitvoer"
