[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
    [string]$VerlooptTag = 'VerlooptOp',
    [string]$OmgevingTag = 'Omgeving',
    [string]$Omgeving = 'test',
    [datetime]$Peildatum = (Get-Date)
)

Connect-AzAccount -WhatIf:$false | Out-Null

$resources = Get-AzCognitiveServicesAccount -ErrorAction Stop |
    Where-Object { $_.AccountType -in 'AIServices', 'OpenAI' }

$kandidaten = foreach ($resource in $resources) {
    $geldig = $false
    $tags = $resource.Tags
    if (-not $tags) { continue }
    $datum = [datetime]::MinValue
    $geldig = [datetime]::TryParseExact($tags[$VerlooptTag], 'yyyy-MM-dd', [cultureinfo]::InvariantCulture, [System.Globalization.DateTimeStyles]::None, [ref]$datum)
    if (-not $geldig -or $datum -ge $Peildatum.Date) { continue }
    if ($tags[$OmgevingTag] -ne $Omgeving) { continue }

    $aantalDeployments = (Get-AzCognitiveServicesAccountDeployment -ResourceGroupName $resource.ResourceGroupName -AccountName $resource.AccountName -ErrorAction Stop | Measure-Object).Count
    [PSCustomObject]@{
        Resource      = $resource.AccountName
        ResourceGroup = $resource.ResourceGroupName
        VerlooptOp    = $datum.ToString('yyyy-MM-dd')
        Deployments   = $aantalDeployments
    }
}

$kandidaten | Format-Table -AutoSize

foreach ($kandidaat in $kandidaten) {
    if ($kandidaat.Deployments -gt 0) {
        Write-Warning "$($kandidaat.Resource) heeft nog $($kandidaat.Deployments) deployments en wordt overgeslagen"
        continue
    }
    if ($PSCmdlet.ShouldProcess("$($kandidaat.ResourceGroup)/$($kandidaat.Resource)", 'Foundry-resource verwijderen')) {
        Remove-AzCognitiveServicesAccount -ResourceGroupName $kandidaat.ResourceGroup -Name $kandidaat.Resource -Confirm:$false
    }
}
