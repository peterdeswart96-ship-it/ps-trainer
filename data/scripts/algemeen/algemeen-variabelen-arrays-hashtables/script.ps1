param(
    [string[]]$Afdelingen = @('IT', 'Sales', 'Finance')
)

$licentiesPerAfdeling = @{
    IT      = 12
    Sales   = 7
    Finance = 4
}

$rapport = @()
foreach ($afdeling in $Afdelingen) {
    $aantal = $licentiesPerAfdeling[$afdeling]
    $rapport += [pscustomobject]@{ Afdeling = $afdeling; Licenties = $aantal }
}

$totaal = ($rapport | Measure-Object -Property Licenties -Sum).Sum
$rapport | Sort-Object -Property Licenties -Descending | Format-Table -AutoSize
Write-Output "Totaal: $totaal licenties over $($rapport.Count) afdelingen."
