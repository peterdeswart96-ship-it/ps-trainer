param(
    [string]$ResourceGroup = 'rg-foundry-contoso',
    [string]$Account = 'foundry-contoso',
    [double]$Drempel = 0.8
)

Connect-AzAccount | Out-Null

$resource = Get-AzCognitiveServicesAccount -ResourceGroupName $ResourceGroup -Name $Account
$regio = $resource.Location -replace '\s', ''

$deployments = Get-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroup -AccountName $Account |
    Select-Object Name,
        @{ Name = 'Model'; Expression = { $_.Properties.Model.Name } },
        @{ Name = 'Versie'; Expression = { $_.Properties.Model.Version } },
        @{ Name = 'Type'; Expression = { $_.Sku.Name } },
        @{ Name = 'Capaciteit'; Expression = { $_.Sku.Capacity } }

$deployments | Format-Table -AutoSize

$quota = Get-AzCognitiveServicesUsage -Location $regio |
    Where-Object { $_.Limit -gt 0 -and ($_.CurrentValue / $_.Limit) -ge $Drempel } |
    Sort-Object { $_.CurrentValue / $_.Limit } -Descending |
    Select-Object Name, CurrentValue, Limit, Unit,
        @{ Name = 'Gebruikt'; Expression = { '{0:P0}' -f ($_.CurrentValue / $_.Limit) } }

if ($quota) {
    $quota | Format-Table -AutoSize
}
else {
    Write-Host "Geen quotaregel boven de drempel van $($Drempel * 100)% in $regio"
}

$aantalDeployments = ($deployments | Measure-Object).Count
$aantalQuota = ($quota | Measure-Object).Count
Write-Host "$aantalDeployments deployments op $Account, $aantalQuota quotaregels boven de drempel in $regio"
