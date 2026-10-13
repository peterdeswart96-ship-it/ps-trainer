param(
    [int]$DrempelPercentage = 90
)

Connect-MgGraph -Scopes 'LicenseAssignment.Read.All' -NoWelcome

$skus = Get-MgSubscribedSku -All

$overzicht = foreach ($sku in $skus) {
    $totaal = $sku.PrepaidUnits.Enabled
    $toegewezen = $sku.ConsumedUnits
    [pscustomobject]@{
        Licentie           = $sku.SkuPartNumber
        Totaal             = $totaal
        Toegewezen         = $toegewezen
        Vrij               = $totaal - $toegewezen
        PercentageGebruikt = if ($totaal -gt 0) { [math]::Round(100 * $toegewezen / $totaal) } else { 0 }
    }
}

$overzicht | Sort-Object -Property PercentageGebruikt -Descending | Format-Table -AutoSize

$bijnaVol = $overzicht | Where-Object { $_.Totaal -gt 0 -and $_.PercentageGebruikt -ge $DrempelPercentage }
Write-Output "$(@($bijnaVol).Count) van $(@($overzicht).Count) licenties zijn voor minstens $DrempelPercentage procent in gebruik."
