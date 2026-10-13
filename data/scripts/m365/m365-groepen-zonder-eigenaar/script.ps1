param(
    [int]$DagenGeenVerlenging = 365
)

Connect-MgGraph -Scopes 'Group.Read.All' -NoWelcome

$groepen = Get-MgGroup -Filter "groupTypes/any(g:g eq 'Unified')" -All -Property Id, DisplayName, CreatedDateTime, RenewedDateTime, ResourceProvisioningOptions

$grens = (Get-Date).AddDays(-$DagenGeenVerlenging)

$rapport = foreach ($groep in $groepen) {
    $eigenaren = @(Get-MgGroupOwner -GroupId $groep.Id -All)
    $laatsteMoment = if ($groep.RenewedDateTime) { $groep.RenewedDateTime } else { $groep.CreatedDateTime }
    [pscustomobject]@{
        Groep          = $groep.DisplayName
        Eigenaren      = $eigenaren.Count
        IsTeam         = $groep.ResourceProvisioningOptions -contains 'Team'
        LaatstVerlengd = $laatsteMoment.ToString('yyyy-MM-dd')
        Verouderd      = $laatsteMoment -lt $grens
    }
}

$aandacht = @($rapport | Where-Object { $_.Eigenaren -eq 0 -or $_.Verouderd } | Sort-Object -Property Eigenaren, LaatstVerlengd)

$aandacht | Format-Table -AutoSize
Write-Output "$($aandacht.Count) van $(@($rapport).Count) groepen hebben geen eigenaar of zijn al $DagenGeenVerlenging dagen niet verlengd."
