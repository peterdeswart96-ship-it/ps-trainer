[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$Basis = (Join-Path ([System.IO.Path]::GetTempPath()) 'ps-trainer-demo'),
    [string[]]$Teams = @('finance', 'it', 'sales')
)

$mapOpties = @{
    ItemType    = 'Directory'
    Force       = $true
    ErrorAction = 'Stop'
}

foreach ($team in $Teams) {
    $pad = Join-Path -Path $Basis -ChildPath $team
    if ($PSCmdlet.ShouldProcess($pad, 'Map aanmaken')) {
        $nieuw = New-Item -Path $pad @mapOpties
        Write-Output "Aangemaakt: $($nieuw.FullName)"
    }
}
