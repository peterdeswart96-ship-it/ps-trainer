param(
    [ValidateSet('D7', 'D30', 'D90', 'D180')]
    [string]$Periode = 'D90',
    [int]$MinDagenInactief = 60,
    [datetime]$Peildatum = (Get-Date)
)

Connect-MgGraph -Scopes 'Reports.Read.All' -NoWelcome

$bestand = Join-Path ([System.IO.Path]::GetTempPath()) "activeuser-$Periode.csv"
Get-MgReportOffice365ActiveUserDetail -Period $Periode -OutFile $bestand

$rapport = foreach ($rij in Import-Csv -Path $bestand) {
    $datums = foreach ($dienst in 'Exchange', 'OneDrive', 'SharePoint', 'Teams') {
        $tekst = $rij."$dienst Last Activity Date"
        if ($tekst) { [datetime]::ParseExact($tekst, 'yyyy-MM-dd', [cultureinfo]::InvariantCulture) }
    }
    $laatste = ($datums | Measure-Object -Maximum).Maximum
    [pscustomobject]@{
        Gebruiker         = $rij.'User Principal Name'
        LaatsteActiviteit = $laatste
        DagenInactief     = if ($laatste) { ($Peildatum.Date - $laatste).Days } else { $null }
    }
}

$inactief = @($rapport | Where-Object { $null -eq $_.DagenInactief -or $_.DagenInactief -ge $MinDagenInactief })

$inactief | Sort-Object -Property DagenInactief -Descending | Format-Table -AutoSize
Write-Output "$($inactief.Count) van $(@($rapport).Count) gebruikers waren de laatste $MinDagenInactief dagen niet actief (of nooit)."
