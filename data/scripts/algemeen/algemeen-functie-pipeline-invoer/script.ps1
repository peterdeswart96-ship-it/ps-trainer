function Get-OpslagStatus {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory, ValueFromPipelineByPropertyName)]
        [string]$Naam,

        [Parameter(Mandatory, ValueFromPipelineByPropertyName)]
        [ValidateRange(0, 1000)]
        [double]$GebruiktGB,

        [ValidateRange(1, 1000)]
        [double]$LimietGB = 50
    )

    process {
        $percentage = [math]::Round(100 * $GebruiktGB / $LimietGB)
        [pscustomobject]@{
            Naam       = $Naam
            Percentage = $percentage
            Status     = if ($percentage -ge 90) { 'Kritiek' } elseif ($percentage -ge 75) { 'Waarschuwing' } else { 'OK' }
        }
    }
}

$postvakken = @(
    [pscustomobject]@{ Naam = 'anna';    GebruiktGB = 12 }
    [pscustomobject]@{ Naam = 'bram';    GebruiktGB = 40 }
    [pscustomobject]@{ Naam = 'chantal'; GebruiktGB = 45 }
)

$postvakken | Get-OpslagStatus -LimietGB 50 | Sort-Object -Property Percentage -Descending | Format-Table -AutoSize
