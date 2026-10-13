param(
    [string[]]$VerplichteTags = @('Eigenaar', 'Kostenplaats', 'Omgeving'),
    [string]$Uitvoer = '.\foundry-tags.csv'
)

Connect-AzAccount | Out-Null

$resources = Get-AzCognitiveServicesAccount |
    Where-Object { $_.AccountType -in 'AIServices', 'OpenAI' }

$rapport = @(foreach ($resource in $resources) {
    $aanwezig = @()
    if ($resource.Tags) {
        $aanwezig = @($resource.Tags.Keys)
    }
    $ontbreekt = @($VerplichteTags | Where-Object { $_ -notin $aanwezig })
    [PSCustomObject]@{
        Resource      = $resource.AccountName
        ResourceGroup = $resource.ResourceGroupName
        AantalTags    = $aanwezig.Count
        Ontbreekt     = $ontbreekt -join ', '
        Compleet      = ($ontbreekt.Count -eq 0)
    }
})

$rapport | Sort-Object Compleet, Resource | Format-Table -AutoSize
$rapport | Export-Csv -Path $Uitvoer -NoTypeInformation -Encoding UTF8

$onvolledig = @($rapport | Where-Object { -not $_.Compleet })
Write-Host "$($onvolledig.Count) van $(@($rapport).Count) resources missen een verplichte tag, rapport in $Uitvoer"
