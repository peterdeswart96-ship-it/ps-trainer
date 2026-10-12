param(
    [string]$Gebruiker = 'beheerder@contoso.onmicrosoft.com',
    [string]$Uitvoer = '.\dlp-beleid-en-regels.csv'
)

Connect-IPPSSession -UserPrincipalName $Gebruiker

$rapport = foreach ($beleid in Get-DlpCompliancePolicy) {
    $regels = @(Get-DlpComplianceRule -Policy $beleid.Name)

    if ($regels.Count -eq 0) {
        [pscustomobject]@{
            Beleid        = $beleid.Name
            Modus         = $beleid.Mode
            Regel         = '(geen regels)'
            Uitgeschakeld = $null
            Blokkeert     = $null
            Gevoelig      = $null
        }
    }

    foreach ($regel in $regels) {
        [pscustomobject]@{
            Beleid        = $beleid.Name
            Modus         = $beleid.Mode
            Regel         = $regel.Name
            Uitgeschakeld = $regel.Disabled
            Blokkeert     = $regel.BlockAccess
            Gevoelig      = $regel.ContentContainsSensitiveInformation | ConvertTo-Json -Depth 4 -Compress
        }
    }
}

$rapport | Format-Table Beleid, Modus, Regel, Uitgeschakeld, Blokkeert -AutoSize
$rapport | Export-Csv -Path $Uitvoer -NoTypeInformation -Encoding UTF8

Disconnect-ExchangeOnline -Confirm:$false
$aantal = ($rapport | Measure-Object).Count
Write-Host "$aantal rijen in het rapport, opgeslagen in $Uitvoer"
