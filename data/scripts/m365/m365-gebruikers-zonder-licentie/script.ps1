param(
    [switch]$AlleenIngeschakeld
)

Connect-MgGraph -Scopes 'User.Read.All' -NoWelcome

$parameters = @{
    Filter           = 'assignedLicenses/$count eq 0'
    ConsistencyLevel = 'eventual'
    CountVariable    = 'aantal'
    All              = $true
    Property         = 'Id', 'DisplayName', 'UserPrincipalName', 'UserType', 'AccountEnabled', 'CreatedDateTime'
}
$zonderLicentie = Get-MgUser @parameters

if ($AlleenIngeschakeld) {
    $zonderLicentie = $zonderLicentie | Where-Object { $_.AccountEnabled }
}

$leden = @($zonderLicentie | Where-Object { $_.UserType -eq 'Member' })
$gasten = @($zonderLicentie | Where-Object { $_.UserType -eq 'Guest' })

$leden |
    Sort-Object -Property CreatedDateTime |
    Select-Object -Property DisplayName, UserPrincipalName, AccountEnabled, CreatedDateTime |
    Format-Table -AutoSize

Write-Output "$($leden.Count) leden en $($gasten.Count) gasten zonder licentie (Graph telde $aantal)."
