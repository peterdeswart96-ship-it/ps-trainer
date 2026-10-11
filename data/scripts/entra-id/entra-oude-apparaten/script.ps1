[CmdletBinding(SupportsShouldProcess)]
param(
    [int]$Dagen = 180
)

Connect-MgGraph -Scopes "Device.ReadWrite.All"
$grens = (Get-Date).AddDays(-$Dagen)

$oud = Get-MgDevice -All |
    Where-Object { $_.ApproximateLastSignInDateTime -lt $grens }

foreach ($apparaat in $oud) {
    if ($PSCmdlet.ShouldProcess($apparaat.DisplayName, 'Apparaat uitschakelen')) {
        try {
            Update-MgDevice -DeviceId $apparaat.Id -BodyParameter @{ accountEnabled = $false } -ErrorAction Stop
            Write-Verbose "Uitgeschakeld: $($apparaat.DisplayName)"
        }
        catch {
            Write-Warning "Mislukt voor $($apparaat.DisplayName): $($_.Exception.Message)"
        }
    }
}
