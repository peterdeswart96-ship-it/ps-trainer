param(
    [string]$Uitvoer = '.\foundry-resources.csv'
)

Connect-AzAccount | Out-Null

$soorten = 'AIServices', 'OpenAI'
$abonnementen = Get-AzSubscription | Where-Object State -eq 'Enabled'

$resources = foreach ($abonnement in $abonnementen) {
    Set-AzContext -SubscriptionId $abonnement.Id | Out-Null
    Get-AzCognitiveServicesAccount |
        Where-Object { $_.AccountType -in $soorten } |
        Select-Object @{ Name = 'Abonnement'; Expression = { $abonnement.Name } },
            ResourceGroupName, AccountName, AccountType, Location,
            @{ Name = 'Sku'; Expression = { $_.Sku.Name } },
            PublicNetworkAccess, Endpoint
}

$resources = $resources | Sort-Object Abonnement, ResourceGroupName, AccountName
$resources | Format-Table -AutoSize
$resources | Export-Csv -Path $Uitvoer -NoTypeInformation -Encoding UTF8

$aantal = ($resources | Measure-Object).Count
Write-Host "$aantal Foundry- en OpenAI-resources, opgeslagen in $Uitvoer"
