param(
    [int]$MinPogingen = 3
)

$regels = @(
    '2026-10-12 09:15:02 WARN user=anna@contoso.com ip=203.0.113.10 result=failure'
    '2026-10-12 09:16:40 INFO user=bram@contoso.com ip=198.51.100.7 result=success'
    '2026-10-12 09:17:03 WARN user=anna@contoso.com ip=203.0.113.10 result=failure'
    '2026-10-12 09:17:45 WARN user=chantal@contoso.com ip=192.0.2.44 result=failure'
    'onbekend formaat zonder velden'
    '2026-10-12 09:18:10 WARN user=daan@contoso.com ip=203.0.113.10 result=failure'
    '2026-10-12 09:19:21 WARN user=eva@contoso.com ip=203.0.113.10 result=failure'
    '2026-10-12 09:20:02 INFO user=chantal@contoso.com ip=192.0.2.44 result=success'
)

$patroon = '^(?<tijd>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (?<niveau>\w+) user=(?<gebruiker>\S+) ip=(?<ip>\d{1,3}(?:\.\d{1,3}){3}) result=(?<resultaat>\w+)$'

$gebeurtenissen = foreach ($regel in $regels) {
    if ($regel -match $patroon) {
        [pscustomobject]@{
            Tijd      = [datetime]$Matches.tijd
            Gebruiker = $Matches.gebruiker
            Ip        = $Matches.ip
            Resultaat = $Matches.resultaat
        }
    }
    else {
        Write-Warning "Regel niet herkend: $regel"
    }
}

$verdacht = $gebeurtenissen |
    Where-Object -Property Resultaat -EQ -Value 'failure' |
    Group-Object -Property Ip |
    Where-Object -Property Count -GE -Value $MinPogingen

foreach ($groep in $verdacht) {
    $gebruikers = ($groep.Group.Gebruiker | Sort-Object -Unique) -join ', '
    Write-Output "$($groep.Name): $($groep.Count) mislukte pogingen voor $gebruikers"
}
