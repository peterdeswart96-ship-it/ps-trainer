param(
    [string]$Gebruiker = 'beheerder@contoso.onmicrosoft.com',
    [string]$Csv = '.\verwacht.csv',
    [string]$Uitvoer = '.\retentie-controle.csv'
)

Connect-IPPSSession -UserPrincipalName $Gebruiker

$beleidslijst = Get-RetentionCompliancePolicy

$rapport = foreach ($verwacht in Import-Csv -Path $Csv) {
    $beleid = $beleidslijst | Where-Object { $_.Name -eq $verwacht.Beleid }

    if (-not $beleid) {
        [pscustomobject]@{
            Beleid      = $verwacht.Beleid
            Uitkomst    = 'ontbreekt'
            Afwijkingen = ''
        }
        continue
    }

    $regel = Get-RetentionComplianceRule -Policy $beleid.Name | Select-Object -First 1
    $afwijkingen = @()

    if (-not $beleid.Enabled) { $afwijkingen += 'beleid staat uit' }
    if ($beleid.Mode -ne 'Enforce') { $afwijkingen += "modus is $($beleid.Mode)" }

    if (-not $regel) {
        $afwijkingen += 'geen regel'
    }
    else {
        if ($regel.Disabled) { $afwijkingen += 'regel staat uit' }
        if ("$($regel.RetentionDuration)" -ne $verwacht.Duur) { $afwijkingen += "duur is $($regel.RetentionDuration)" }
        if ("$($regel.RetentionComplianceAction)" -ne $verwacht.Actie) { $afwijkingen += "actie is $($regel.RetentionComplianceAction)" }
    }

    [pscustomobject]@{
        Beleid      = $verwacht.Beleid
        Uitkomst    = if ($afwijkingen.Count -eq 0) { 'in orde' } else { 'afwijking' }
        Afwijkingen = $afwijkingen -join '; '
    }
}

$rapport | Format-Table -AutoSize
$rapport | Export-Csv -Path $Uitvoer -NoTypeInformation -Encoding UTF8

Disconnect-ExchangeOnline -Confirm:$false
$totaal = ($rapport | Measure-Object).Count
$afwijkend = ($rapport | Where-Object { $_.Uitkomst -ne 'in orde' } | Measure-Object).Count
Write-Host "Afwijkend of ontbrekend: $afwijkend van de $totaal. Rapport opgeslagen in $Uitvoer"
