[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [string]$Pad,
    [Parameter(Mandatory)]
    [string]$OudeSku,
    [Parameter(Mandatory)]
    [string]$NieuweSku
)

Connect-MgGraph -Scopes 'User.ReadWrite.All', 'Organization.Read.All' -NoWelcome

$skus = Get-MgSubscribedSku -All
$oud = $skus | Where-Object { $_.SkuPartNumber -eq $OudeSku }
$nieuw = $skus | Where-Object { $_.SkuPartNumber -eq $NieuweSku }
if (-not $oud -or -not $nieuw) {
    throw "Een van de licenties ($OudeSku, $NieuweSku) bestaat niet in deze tenant."
}

$gebruikers = @(Import-Csv -Path $Pad)
$vrij = $nieuw.PrepaidUnits.Enabled - $nieuw.ConsumedUnits
if ($vrij -lt $gebruikers.Count) {
    throw "Te weinig vrije licenties voor ${NieuweSku}: $vrij vrij voor $($gebruikers.Count) gebruikers."
}

$resultaat = foreach ($regel in $gebruikers) {
    $upn = $regel.UserPrincipalName
    $wissel = @{
        UserId         = $upn
        AddLicenses    = @(@{ SkuId = $nieuw.SkuId })
        RemoveLicenses = @($oud.SkuId)
        ErrorAction    = 'Stop'
    }
    if ($PSCmdlet.ShouldProcess($upn, "Licentie $OudeSku vervangen door $NieuweSku")) {
        try {
            Set-MgUserLicense @wissel | Out-Null
            $uitkomst = 'Gewisseld'
        }
        catch {
            $uitkomst = "Mislukt: $($_.Exception.Message)"
        }
    }
    else {
        $uitkomst = 'Droge run'
    }
    [pscustomobject]@{ Gebruiker = $upn; Uitkomst = $uitkomst }
}

$resultaat | Format-Table -AutoSize
$resultaat | Group-Object -Property { $_.Uitkomst -replace '(?s)^Mislukt:.*', 'Mislukt' } | Sort-Object -Property Name | ForEach-Object { Write-Output "$($_.Name): $($_.Count)" }
