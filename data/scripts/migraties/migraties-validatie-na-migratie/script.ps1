param(
    [string]$Share = '\\fs01\afdeling',
    [string]$SiteUrl = 'https://contoso.sharepoint.com/sites/afdeling',
    [string]$Bibliotheek = 'Documents',
    [string]$ClientId = '00000000-0000-0000-0000-000000000000'
)

Connect-PnPOnline -Url $SiteUrl -Interactive -ClientId $ClientId

$bron = Get-ChildItem -Path $Share -Recurse -File -ErrorAction SilentlyContinue
$doel = Get-PnPListItem -List $Bibliotheek -PageSize 500 |
    Where-Object { $_.FileSystemObjectType -eq 'File' }

$bronBytes = ($bron | Measure-Object -Property Length -Sum).Sum
$doelBytes = ($doel | ForEach-Object { [long]$_.FieldValues['File_x0020_Size'] } | Measure-Object -Sum).Sum

[pscustomobject]@{
    BronAantal = @($bron).Count
    DoelAantal = @($doel).Count
    BronGB     = [math]::Round($bronBytes / 1GB, 2)
    DoelGB     = [math]::Round($doelBytes / 1GB, 2)
    Gelijk     = (@($bron).Count -eq @($doel).Count)
} | Export-Csv -Path '.\validatie.csv' -NoTypeInformation -Encoding UTF8
