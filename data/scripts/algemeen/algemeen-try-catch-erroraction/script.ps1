param(
    [string[]]$Bestanden = @('.\instellingen.json', '.\ontbreekt.json', '.\kapot.json'),
    [switch]$StopBijFout
)

$mislukt = @()
$verwerkt = 0

foreach ($bestand in $Bestanden) {
    try {
        $config = Get-Content -Path $bestand -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop
        Write-Output "${bestand}: omgeving $($config.Omgeving)"
    }
    catch [System.Management.Automation.ItemNotFoundException] {
        Write-Warning "Bestand niet gevonden: $bestand"
        $mislukt += $bestand
    }
    catch {
        Write-Warning "Onverwachte fout bij ${bestand}: $($_.Exception.Message)"
        $mislukt += $bestand
        if ($StopBijFout) { throw }
    }
    finally {
        $verwerkt++
    }
}

Write-Output "$verwerkt bestanden verwerkt, $($mislukt.Count) mislukt."
