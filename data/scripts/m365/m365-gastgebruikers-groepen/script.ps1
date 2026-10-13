param(
    [string]$Uitvoer = '.\gasten-en-groepen.csv'
)

Connect-MgGraph -Scopes 'User.Read.All', 'GroupMember.Read.All' -NoWelcome

$gasten = Get-MgUser -Filter "userType eq 'Guest'" -All -Property Id, DisplayName, Mail, CreatedDateTime, ExternalUserState

$rapport = foreach ($gast in $gasten) {
    $groepen = @(Get-MgUserMemberOf -UserId $gast.Id -All |
        Where-Object { $_.AdditionalProperties['@odata.type'] -eq '#microsoft.graph.group' })
    [pscustomobject]@{
        Gast       = $gast.DisplayName
        Mail       = $gast.Mail
        Aangemaakt = $gast.CreatedDateTime.ToString('yyyy-MM-dd')
        Status     = $gast.ExternalUserState
        Groepen    = $groepen.Count
        Namen      = ($groepen | ForEach-Object { $_.AdditionalProperties['displayName'] } | Sort-Object) -join '; '
    }
}

$rapport | Sort-Object -Property Groepen -Descending | Format-Table -AutoSize
$rapport | Export-Csv -Path $Uitvoer -NoTypeInformation -Encoding UTF8

$zonderGroep = @($rapport | Where-Object { $_.Groepen -eq 0 })
Write-Output "$(@($rapport).Count) gasten, waarvan $($zonderGroep.Count) zonder groepslidmaatschap. Rapport: $Uitvoer"
