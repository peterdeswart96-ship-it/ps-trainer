# Rapport: ingeschakelde accounts die 90 dagen niet hebben ingelogd
Connect-MgGraph -Scopes "User.Read.All", "AuditLog.Read.All"

$grens = (Get-Date).AddDays(-90)

$users = Get-MgUser -Property DisplayName, UserPrincipalName, AccountEnabled, SignInActivity

$inactief = $users | Where-Object {
    $_.AccountEnabled -and
    ($null -eq $_.SignInActivity.LastSignInDateTime -or
     $_.SignInActivity.LastSignInDateTime -lt $grens)
}

$inactief |
    Select-Object DisplayName, UserPrincipalName,
        @{ Name = 'LaatsteLogin'; Expression = { $_.SignInActivity.LastSignInDateTime } } |
    Sort-Object LaatsteLogin |
    Export-Csv -Path '.\inactieve-gebruikers.csv' -NoTypeInformation -Encoding UTF8

Write-Output "$($inactief.Count) inactieve accounts gevonden"
