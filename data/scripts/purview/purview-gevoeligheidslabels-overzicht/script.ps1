param(
    [string]$Gebruiker = 'beheerder@contoso.onmicrosoft.com',
    [string]$Uitvoer = '.\gevoeligheidslabels.csv'
)

Connect-IPPSSession -UserPrincipalName $Gebruiker

$labels = Get-Label |
    Sort-Object Priority |
    Select-Object DisplayName, Name, Guid, ContentType, Priority, ParentId

$labels | Format-Table -AutoSize
$labels | Export-Csv -Path $Uitvoer -NoTypeInformation -Encoding UTF8

Disconnect-ExchangeOnline -Confirm:$false
$aantal = ($labels | Measure-Object).Count
Write-Host "$aantal gevoeligheidslabels, opgeslagen in $Uitvoer"
