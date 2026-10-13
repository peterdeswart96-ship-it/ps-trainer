param(
    [int]$MaxPogingen = 4,
    [double]$BasisWachtSec = 0.1
)

$script:aanroepen = 0

function Get-DemoPagina {
    param([string]$Url)
    $script:aanroepen++
    if ($Url -eq 'pagina2' -and $script:aanroepen -le 3) {
        throw [System.InvalidOperationException]::new('429 Too Many Requests')
    }
    switch ($Url) {
        'pagina1' { @{ value = @(1..3 | ForEach-Object { [pscustomobject]@{ Id = $_ } }); '@odata.nextLink' = 'pagina2' } }
        'pagina2' { @{ value = @(4..6 | ForEach-Object { [pscustomobject]@{ Id = $_ } }); '@odata.nextLink' = 'pagina3' } }
        'pagina3' { @{ value = @(7..8 | ForEach-Object { [pscustomobject]@{ Id = $_ } }) } }
    }
}

function Invoke-MetRetry {
    param(
        [scriptblock]$Actie,
        [int]$MaxPogingen = 4,
        [double]$BasisWachtSec = 0.1
    )
    for ($poging = 1; $poging -le $MaxPogingen; $poging++) {
        try {
            return & $Actie
        }
        catch {
            $tijdelijk = $_.Exception.Message -match '^(429|503)'
            if (-not $tijdelijk -or $poging -eq $MaxPogingen) { throw }
            $wacht = $BasisWachtSec * [math]::Pow(2, $poging - 1)
            Write-Warning "Poging $poging mislukt ($($_.Exception.Message)); opnieuw over $wacht s."
            Start-Sleep -Milliseconds ($wacht * 1000)
        }
    }
}

$alles = [System.Collections.Generic.List[object]]::new()
$url = 'pagina1'
while ($url) {
    $antwoord = Invoke-MetRetry -Actie { Get-DemoPagina -Url $url } -MaxPogingen $MaxPogingen -BasisWachtSec $BasisWachtSec
    $alles.AddRange([object[]]$antwoord.value)
    $url = $antwoord['@odata.nextLink']
}

Write-Output "$($alles.Count) items opgehaald in $($script:aanroepen) aanroepen."
