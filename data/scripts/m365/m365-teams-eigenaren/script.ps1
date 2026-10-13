param(
    [int]$MinEigenaren = 2
)

Connect-MicrosoftTeams | Out-Null

$teams = Get-Team -Archived $false

$overzicht = foreach ($team in $teams) {
    $gebruikers = @(Get-TeamUser -GroupId $team.GroupId)
    $eigenaren = @($gebruikers | Where-Object { $_.Role -eq 'owner' })
    [pscustomobject]@{
        Team       = $team.DisplayName
        Zichtbaar  = $team.Visibility
        Eigenaren  = $eigenaren.Count
        Leden      = $gebruikers.Count - $eigenaren.Count
        Eigenaar1  = ($eigenaren | Select-Object -First 1).User
    }
}

$risico = $overzicht | Where-Object { $_.Eigenaren -lt $MinEigenaren } | Sort-Object -Property Eigenaren, Team

$risico | Format-Table -AutoSize
Write-Output "$(@($risico).Count) van $(@($overzicht).Count) teams hebben minder dan $MinEigenaren eigenaren."
