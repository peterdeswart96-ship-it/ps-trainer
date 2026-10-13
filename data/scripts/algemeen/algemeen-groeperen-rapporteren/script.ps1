param(
    [string]$Uitvoermap = (Join-Path ([System.IO.Path]::GetTempPath()) 'ps-trainer-demo'),
    [int]$Top = 3
)

$events = @(
    [pscustomobject]@{ Tijd = [datetime]'2026-10-12T09:15:00'; Gebruiker = 'anna@contoso.com'; Actie = 'FileDeleted';  Site = 'hr' }
    [pscustomobject]@{ Tijd = [datetime]'2026-10-12T09:40:00'; Gebruiker = 'bram@contoso.com'; Actie = 'FileDownloaded'; Site = 'finance' }
    [pscustomobject]@{ Tijd = [datetime]'2026-10-12T10:05:00'; Gebruiker = 'anna@contoso.com'; Actie = 'FileDeleted';  Site = 'hr' }
    [pscustomobject]@{ Tijd = [datetime]'2026-10-12T10:20:00'; Gebruiker = 'chantal@contoso.com'; Actie = 'FileShared'; Site = 'sales' }
    [pscustomobject]@{ Tijd = [datetime]'2026-10-12T11:00:00'; Gebruiker = 'anna@contoso.com'; Actie = 'FileDownloaded'; Site = 'hr' }
    [pscustomobject]@{ Tijd = [datetime]'2026-10-12T11:30:00'; Gebruiker = 'bram@contoso.com'; Actie = 'FileDownloaded'; Site = 'finance' }
    [pscustomobject]@{ Tijd = [datetime]'2026-10-12T13:45:00'; Gebruiker = 'daan@contoso.com'; Actie = 'FileShared'; Site = 'sales' }
    [pscustomobject]@{ Tijd = [datetime]'2026-10-12T14:10:00'; Gebruiker = 'bram@contoso.com'; Actie = 'FileDeleted'; Site = 'finance' }
)

$perGebruiker = $events |
    Group-Object -Property Gebruiker |
    ForEach-Object {
        [pscustomobject]@{
            Gebruiker = $_.Name
            Aantal    = $_.Count
            Acties    = ($_.Group.Actie | Sort-Object -Unique) -join '; '
            Laatste   = ($_.Group | Measure-Object -Property Tijd -Maximum).Maximum
        }
    } |
    Sort-Object -Property @{ Expression = 'Aantal'; Descending = $true }, Gebruiker

$perGebruiker | Select-Object -First $Top | Format-Table -AutoSize

New-Item -ItemType Directory -Path $Uitvoermap -Force | Out-Null
$perGebruiker | Export-Csv -Path (Join-Path $Uitvoermap 'per-gebruiker.csv') -NoTypeInformation -Encoding UTF8
$perGebruiker | ConvertTo-Json -Depth 3 | Set-Content -Path (Join-Path $Uitvoermap 'per-gebruiker.json') -Encoding UTF8
Write-Output "$(@($perGebruiker).Count) gebruikers weggeschreven naar $Uitvoermap."
