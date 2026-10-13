param(
    [int]$MinLicenties = 2
)

$gebruikers = @(
    [pscustomobject]@{ Naam = 'Anna Visser';  Afdeling = 'Finance'; Actief = $true;  Licenties = 3 }
    [pscustomobject]@{ Naam = 'Bram de Boer'; Afdeling = 'IT';      Actief = $true;  Licenties = 1 }
    [pscustomobject]@{ Naam = 'Chantal Smit'; Afdeling = 'IT';      Actief = $false; Licenties = 2 }
    [pscustomobject]@{ Naam = 'Daan Mulder';  Afdeling = 'Sales';   Actief = $true;  Licenties = 2 }
)

$resultaat = $gebruikers |
    Where-Object { $_.Actief -and $_.Licenties -ge $MinLicenties } |
    Sort-Object -Property Naam |
    Select-Object -Property Naam, Afdeling

$resultaat | Format-Table -AutoSize
Write-Output "$(@($resultaat).Count) gebruikers met minimaal $MinLicenties licenties."
