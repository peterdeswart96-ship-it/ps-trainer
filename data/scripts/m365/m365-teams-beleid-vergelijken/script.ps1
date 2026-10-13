param(
    [Parameter(Mandatory)]
    [string]$GebruikerA,
    [Parameter(Mandatory)]
    [string]$GebruikerB
)

Connect-MicrosoftTeams | Out-Null

function Get-VergaderBeleid {
    param([string]$Upn)
    $gebruiker = Get-CsOnlineUser -Identity $Upn
    $naam = if ($gebruiker.TeamsMeetingPolicy) { "$($gebruiker.TeamsMeetingPolicy)" } else { 'Global' }
    [pscustomobject]@{ Gebruiker = $Upn; Naam = $naam; Beleid = Get-CsTeamsMeetingPolicy -Identity $naam }
}

$a = Get-VergaderBeleid -Upn $GebruikerA
$b = Get-VergaderBeleid -Upn $GebruikerB

if ($a.Naam -eq $b.Naam) {
    Write-Output "Beide gebruikers hebben hetzelfde beleid: $($a.Naam)."
    return
}

$negeer = 'Identity', 'Description'
$verschillen = foreach ($eigenschap in $a.Beleid.PSObject.Properties.Name) {
    if ($eigenschap -in $negeer) { continue }
    $waardeA = "$($a.Beleid.$eigenschap)"
    $waardeB = "$($b.Beleid.$eigenschap)"
    if ($waardeA -ne $waardeB) {
        [pscustomobject]@{ Instelling = $eigenschap; WaardeA = $waardeA; WaardeB = $waardeB }
    }
}

Write-Output "$($a.Gebruiker): $($a.Naam) | $($b.Gebruiker): $($b.Naam)"
$verschillen | Format-Table -AutoSize
Write-Output "$(@($verschillen).Count) instellingen verschillen."
