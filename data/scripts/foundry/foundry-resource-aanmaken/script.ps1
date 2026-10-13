[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$ResourceGroup = 'rg-foundry-contoso',
    [string]$Account = 'foundry-contoso',
    [string]$Location = 'westeurope',
    [hashtable]$Tags = @{ Eigenaar = 'team-ai@contoso.com'; Kostenplaats = '1234'; Omgeving = 'test' }
)

Connect-AzAccount -WhatIf:$false | Out-Null

$groep = Get-AzResourceGroup -Name $ResourceGroup -ErrorAction SilentlyContinue
if (-not $groep) {
    if ($PSCmdlet.ShouldProcess($ResourceGroup, 'Resourcegroep aanmaken')) {
        New-AzResourceGroup -Name $ResourceGroup -Location $Location -Tag $Tags | Out-Null
    }
}
else {
    Write-Host "Resourcegroep $ResourceGroup bestaat al en blijft ongewijzigd"
}

$bestaand = Get-AzCognitiveServicesAccount -ResourceGroupName $ResourceGroup -Name $Account -ErrorAction SilentlyContinue
if ($bestaand) {
    Write-Host "Resource $Account bestaat al en blijft ongewijzigd"
    return
}

$parameters = @{
    ResourceGroupName   = $ResourceGroup
    Name                = $Account
    Type                = 'AIServices'
    SkuName             = 'S0'
    Location            = $Location
    CustomSubdomainName = $Account
    AssignIdentity      = $true
    DisableLocalAuth    = $true
    Tag                 = $Tags
}

if ($PSCmdlet.ShouldProcess($Account, 'Foundry-resource aanmaken')) {
    New-AzCognitiveServicesAccount @parameters |
        Select-Object AccountName, AccountType, Location, ProvisioningState
}
