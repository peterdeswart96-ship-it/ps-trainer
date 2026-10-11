Connect-MgGraph -Scopes 'User.Read.All', 'AuditLog.Read.All'
$grens = (Get-Date).AddDays(-90)
$gebruikers = Get-MgUser -All -Filter 'accountEnabled eq true' -Property DisplayName, UserPrincipalName, SignInActivity
$gebruikers | Where-Object { $_.SignInActivity.LastSignInDateTime -lt $grens } | Select-Object DisplayName, UserPrincipalName
