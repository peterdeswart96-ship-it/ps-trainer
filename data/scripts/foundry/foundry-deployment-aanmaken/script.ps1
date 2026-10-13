[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$ResourceGroup = 'rg-foundry-contoso',
    [string]$Account = 'foundry-contoso',
    [string]$Deployment = 'gpt-4o-test',
    [string]$Model = 'gpt-4o',
    [string]$Versie = '2024-11-20',
    [string]$Type = 'Standard',
    [int]$Capaciteit = 10
)

Connect-AzAccount -WhatIf:$false | Out-Null

$resource = Get-AzCognitiveServicesAccount -ResourceGroupName $ResourceGroup -Name $Account -ErrorAction Stop
$regio = $resource.Location -replace '\s', ''

$bestaand = Get-AzCognitiveServicesAccountDeployment -ResourceGroupName $ResourceGroup -AccountName $Account -Name $Deployment -ErrorAction SilentlyContinue
if ($bestaand) {
    Write-Host "Deployment $Deployment bestaat al en blijft ongewijzigd"
    return
}

$quotaNaam = "OpenAI.$Type.$Model"
$regel = Get-AzCognitiveServicesUsage -Location $regio | Where-Object Name -eq $quotaNaam
if (-not $regel) {
    throw "Geen quotaregel $quotaNaam in $regio gevonden: controleer model, type en regio"
}

$vrij = $regel.Limit - $regel.CurrentValue
if ($Capaciteit -gt $vrij) {
    throw "Te weinig quota voor $quotaNaam in ${regio}: $Capaciteit gevraagd, $vrij vrij"
}

$parameters = @{
    ResourceGroupName = $ResourceGroup
    AccountName       = $Account
    Name              = $Deployment
    Properties        = @{
        Model = @{ Name = $Model; Version = $Versie; Format = 'OpenAI' }
    }
    Sku               = @{ Name = $Type; Capacity = $Capaciteit }
}

if ($PSCmdlet.ShouldProcess("$Account/$Deployment", "Deployment aanmaken ($Model, $Type, capaciteit $Capaciteit)")) {
    New-AzCognitiveServicesAccountDeployment @parameters
}
