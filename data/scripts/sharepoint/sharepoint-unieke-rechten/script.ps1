param(
    [string]$Csv = '.\sites.csv',
    [string]$ClientId = '00000000-0000-0000-0000-000000000000',
    [string]$Uitvoer = '.\unieke-rechten.csv'
)

$rapport = foreach ($site in Import-Csv -Path $Csv) {
    try {
        Connect-PnPOnline -Url $site.Url -Interactive -ClientId $ClientId -ErrorAction Stop
        $lijsten = Get-PnPList -Includes HasUniqueRoleAssignments -ErrorAction Stop
    }
    catch {
        Write-Warning "Overgeslagen: $($site.Url): $($_.Exception.Message)"
        continue
    }

    $lijsten |
        Where-Object { $_.HasUniqueRoleAssignments } |
        Select-Object @{ Name = 'Site'; Expression = { $site.Url } },
            Title,
            @{ Name = 'Pad'; Expression = { $_.RootFolder.ServerRelativeUrl } }
}

$rapport | Export-Csv -Path $Uitvoer -Encoding UTF8
$aantal = ($rapport | Measure-Object).Count
Write-Host "$aantal lijsten met unieke rechten, opgeslagen in $Uitvoer"
