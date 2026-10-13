[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [string]$Pad,
    [string]$SkuPartNumber = 'SPE_E3'
)

Connect-MgGraph -Scopes 'User.ReadWrite.All', 'Organization.Read.All' -NoWelcome

$sku = Get-MgSubscribedSku -All | Where-Object { $_.SkuPartNumber -eq $SkuPartNumber }
if (-not $sku) {
    throw "De licentie $SkuPartNumber bestaat niet in deze tenant."
}

$resultaat = foreach ($regel in Import-Csv -Path $Pad) {
    $upn = $regel.UserPrincipalName
    try {
        $gebruiker = Get-MgUser -UserId $upn -Property Id, AccountEnabled, AssignedLicenses, LicenseAssignmentStates -ErrorAction Stop
    }
    catch {
        [pscustomobject]@{ Gebruiker = $upn; Uitkomst = 'Niet gevonden' }
        continue
    }

    $heeftLicentie = $gebruiker.AssignedLicenses.SkuId -contains $sku.SkuId
    $viaGroep = [bool]($gebruiker.LicenseAssignmentStates | Where-Object { $_.SkuId -eq $sku.SkuId -and $_.AssignedByGroup })

    if ($gebruiker.AccountEnabled) {
        $uitkomst = 'Overgeslagen: account is nog actief'
    }
    elseif (-not $heeftLicentie) {
        $uitkomst = 'Geen licentie'
    }
    elseif ($viaGroep) {
        $uitkomst = 'Overgeslagen: licentie komt via een groep'
    }
    elseif ($PSCmdlet.ShouldProcess($upn, "Licentie $SkuPartNumber intrekken")) {
        Set-MgUserLicense -UserId $gebruiker.Id -AddLicenses @() -RemoveLicenses @($sku.SkuId) | Out-Null
        $uitkomst = 'Ingetrokken'
    }
    else {
        $uitkomst = 'Droge run'
    }
    [pscustomobject]@{ Gebruiker = $upn; Uitkomst = $uitkomst }
}

$resultaat | Format-Table -AutoSize
$resultaat | Group-Object -Property Uitkomst | Sort-Object -Property Name | ForEach-Object { Write-Output "$($_.Name): $($_.Count)" }
