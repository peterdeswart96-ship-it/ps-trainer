[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$ResourceGroup = 'rg-foundry-contoso',
    [string]$Account = 'foundry-contoso',
    [string]$Identiteit = 'func-pscoach-contoso',
    [guid]$RolId = '53ca6127-db72-4b80-b1b0-d745d6d5456d'
)

Connect-AzAccount -WhatIf:$false | Out-Null

$resource = Get-AzCognitiveServicesAccount -ResourceGroupName $ResourceGroup -Name $Account -ErrorAction Stop
$scope = $resource.Id

$principals = @(Get-AzADServicePrincipal -DisplayName $Identiteit)
if ($principals.Count -ne 1) {
    throw "Verwacht precies 1 service principal met de naam $Identiteit, gevonden: $($principals.Count)"
}
$principal = $principals[0]

$bestaand = @(Get-AzRoleAssignment -ObjectId $principal.Id -Scope $scope -RoleDefinitionId $RolId |
    Where-Object { $scope -eq $_.Scope -or $scope.StartsWith($_.Scope + '/', [StringComparison]::OrdinalIgnoreCase) })
if ($bestaand.Count -gt 0) {
    Write-Host "$Identiteit heeft deze rol al, op $($bestaand[0].Scope)"
    return
}

if ($PSCmdlet.ShouldProcess($scope, "Rol $RolId toewijzen aan $Identiteit")) {
    New-AzRoleAssignment -ObjectId $principal.Id -ObjectType ServicePrincipal -RoleDefinitionId $RolId -Scope $scope -Description "Toegang voor $Identiteit tot Foundry-resource $Account"
}
