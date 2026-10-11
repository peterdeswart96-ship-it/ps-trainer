param(
    [string]$Share = '\\fs01\afdeling',
    [double]$MaxGB = 250
)

$bestanden = Get-ChildItem -Path $Share -Recurse -File -ErrorAction SilentlyContinue

$teGroot = $bestanden | Where-Object { $_.Length -gt ($MaxGB * 1GB) } |
    Select-Object FullName, @{ Name = 'GB'; Expression = { [math]::Round($_.Length / 1GB, 1) } }

$perMap = $bestanden | Group-Object { $_.DirectoryName.Substring($Share.Length).TrimStart('\').Split('\')[0] } |
    ForEach-Object {
        [pscustomobject]@{
            Map      = $_.Name
            Aantal   = $_.Count
            TotaalGB = [math]::Round(($_.Group | Measure-Object -Property Length -Sum).Sum / 1GB, 1)
        }
    }

$perMap | Sort-Object TotaalGB -Descending | Export-Csv -Path '.\grootte-per-map.csv' -NoTypeInformation -Encoding UTF8
$teGroot | Export-Csv -Path '.\te-grote-bestanden.csv' -NoTypeInformation -Encoding UTF8
Write-Host "$(@($teGroot).Count) bestanden boven $MaxGB GB."
