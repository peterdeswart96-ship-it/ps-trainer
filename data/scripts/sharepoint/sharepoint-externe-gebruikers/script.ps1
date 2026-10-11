param(
    [string]$AdminUrl = 'https://contoso-admin.sharepoint.com',
    [string]$SiteUrl
)

Connect-SPOService -Url $AdminUrl

$paginagrootte = 50
$positie = 0
$gasten = @()

do {
    $parameters = @{ Position = $positie; PageSize = $paginagrootte }
    if ($SiteUrl) { $parameters.SiteUrl = $SiteUrl }
    $pagina = @(Get-SPOExternalUser @parameters)
    $gasten += $pagina
    $positie += $pagina.Count
} while ($pagina.Count -eq $paginagrootte)

$gasten | Group-Object { $_.Email.Split('@')[-1] } | Sort-Object Count -Descending | Select-Object Name, Count | Format-Table -AutoSize
