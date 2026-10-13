param(
    [string]$ResourceGroup = 'rg-foundry-contoso',
    [string]$Account = 'foundry-contoso',
    [string]$Uitvoer = '.\foundry-rollen.csv'
)

Connect-AzAccount | Out-Null

$resource = Get-AzCognitiveServicesAccount -ResourceGroupName $ResourceGroup -Name $Account
$toewijzingen = Get-AzRoleAssignment -Scope $resource.Id

$overzicht = $toewijzingen |
    Select-Object DisplayName, SignInName, ObjectType, RoleDefinitionName, Scope,
        @{ Name = 'Herkomst'; Expression = { if ($_.Scope -eq $resource.Id) { 'direct' } else { 'niet direct' } } } |
    Sort-Object Herkomst, RoleDefinitionName, DisplayName

$overzicht | Format-Table -AutoSize
$overzicht | Export-Csv -Path $Uitvoer -NoTypeInformation -Encoding UTF8

$perRol = $overzicht | Group-Object RoleDefinitionName | Sort-Object Count -Descending
$perRol | Format-Table Name, Count -AutoSize

$aantal = ($overzicht | Measure-Object).Count
Write-Host "$aantal roltoewijzingen op $Account, opgeslagen in $Uitvoer"
