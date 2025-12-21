# Verificar fecha de los cartones generados
# Debe mostrar 20251221 (21/12/2025)

Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "VERIFICACION DE FECHA EN CARTONES" -ForegroundColor Yellow
Write-Host "Fecha esperada: 20251221 (21/12/2025)" -ForegroundColor Yellow
Write-Host ("=" * 60) -ForegroundColor Cyan

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

Write-Host "`nConsultando cartones por sala..." -ForegroundColor Cyan

$query = @"
SELECT 
    room as Sala,
    COUNT(*) as Total,
    MIN(card_serial) as Primer_Serial,
    MAX(card_serial) as Ultimo_Serial
FROM bingo_cards_pool 
GROUP BY room
ORDER BY 
    CASE room 
        WHEN 'starter' THEN 1
        WHEN 'bronce' THEN 2
        WHEN 'plata' THEN 3
        WHEN 'oro' THEN 4
    END;
"@

& $mysqlPath -u root -pbingo2024 bingo_24k -e $query

Write-Host ("`n" + ("=" * 60)) -ForegroundColor Cyan
Write-Host "Si los seriales muestran 20251221, la fecha es correcta" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Cyan
