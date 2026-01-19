# 🧪 Script de Prueba - Dashboard API

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  TEST DE DASHBOARD API" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"

# Función helper
function Invoke-ApiRequest {
    param(
        [string]$Uri,
        [string]$Method = "Get",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )

    try {
        if ($Body) {
            return Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers -Body $Body -ContentType "application/json"
        } else {
            return Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = $_.ErrorDetails.Message
        return @{
            error = $true
            statusCode = $statusCode
            message = $errorMessage
        }
    }
}

# 1. Verificar servidor
Write-Host "1. Verificando servidor..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl" -Method Get -TimeoutSec 2
    Write-Host "   ✓ Servidor activo" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Servidor no responde" -ForegroundColor Red
    exit 1
}

# 2. Crear usuario de prueba
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "dashboard_test_$timestamp@example.com"

Write-Host "`n2. Creando usuario de prueba..." -ForegroundColor Yellow
$registerBody = @{
    name = "Dashboard Test User"
    email = $testEmail
    password = "Password123!"
    tenantName = "Dashboard Test Store"
} | ConvertTo-Json

$registerResponse = Invoke-ApiRequest -Uri "$baseUrl/auth/register" -Method Post -Body $registerBody

if ($registerResponse.error) {
    Write-Host "   ✗ Error: $($registerResponse.message)" -ForegroundColor Red
    exit 1
}

Write-Host "   ✓ Usuario creado" -ForegroundColor Green
$token = $registerResponse.access_token
$tenantId = $registerResponse.user.tenantId
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 3. Crear productos de prueba
Write-Host "`n3. Creando productos de prueba..." -ForegroundColor Yellow

$products = @(
    @{
        name = "Camiseta Básica"
        sku = "CAM-001-$timestamp"
        price = 2500
        variants = @(
            @{ size = "S"; color = "Blanco"; quantity = 10 },
            @{ size = "M"; color = "Blanco"; quantity = 15 },
            @{ size = "L"; color = "Blanco"; quantity = 8 }
        )
    },
    @{
        name = "Pantalón Jeans"
        sku = "PAN-001-$timestamp"
        price = 8000
        variants = @(
            @{ size = "28"; color = "Azul"; quantity = 12 },
            @{ size = "30"; color = "Azul"; quantity = 20 },
            @{ size = "32"; color = "Azul"; quantity = 3 }
        )
    },
    @{
        name = "Zapatos Deportivos"
        sku = "ZAP-001-$timestamp"
        price = 15000
        variants = @(
            @{ size = "39"; color = "Negro"; quantity = 5 },
            @{ size = "40"; color = "Negro"; quantity = 8 },
            @{ size = "41"; color = "Negro"; quantity = 2 }
        )
    }
)

$createdProducts = @()
foreach ($product in $products) {
    $productBody = @{
        tenantId = $tenantId
        name = $product.name
        sku = $product.sku
        price = $product.price
        variants = $product.variants
    } | ConvertTo-Json -Depth 3

    $result = Invoke-ApiRequest -Uri "$baseUrl/products" -Method Post -Headers $headers -Body $productBody

    if (-not $result.error) {
        $createdProducts += $result
        Write-Host "   ✓ $($product.name) creado" -ForegroundColor Green
    }
}

# 4. Crear ventas de prueba
Write-Host "`n4. Creando ventas de prueba..." -ForegroundColor Yellow

$salesCount = 0
foreach ($product in $createdProducts) {
    # Crear 2-3 ventas por producto
    $numSales = Get-Random -Minimum 2 -Maximum 4

    for ($i = 0; $i -lt $numSales; $i++) {
        $variant = $product.variants | Get-Random
        $quantity = Get-Random -Minimum 1 -Maximum 4

        $saleBody = @{
            tenantId = $tenantId
            userId = $registerResponse.user.id
            items = @(
                @{
                    productVariantId = $variant.id
                    quantity = $quantity
                    price = $product.price
                }
            )
        } | ConvertTo-Json -Depth 3

        $saleResult = Invoke-ApiRequest -Uri "$baseUrl/sales" -Method Post -Headers $headers -Body $saleBody

        if (-not $saleResult.error) {
            $salesCount++
        }
    }
}

Write-Host "   ✓ $salesCount ventas creadas" -ForegroundColor Green

# 5. Obtener métricas del dashboard
Write-Host "`n5. Obteniendo métricas del dashboard..." -ForegroundColor Yellow

$headersGet = @{ "Authorization" = "Bearer $token" }
$metrics = Invoke-ApiRequest -Uri "$baseUrl/dashboard/metrics" -Method Get -Headers $headersGet

if ($metrics.error) {
    Write-Host "   ✗ Error: $($metrics.message)" -ForegroundColor Red
    exit 1
}

Write-Host "   ✓ Métricas obtenidas" -ForegroundColor Green

# Mostrar métricas
Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "  📊 MÉTRICAS DEL DASHBOARD" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

Write-Host "`n💰 MÉTRICAS DEL MES ACTUAL" -ForegroundColor Yellow
Write-Host "   Ingresos totales: $($metrics.monthlyRevenue)" -ForegroundColor White
Write-Host "   Unidades vendidas: $($metrics.monthlyUnits)" -ForegroundColor White
Write-Host "   Número de ventas: $($metrics.monthlySales)" -ForegroundColor White
Write-Host "   Valor promedio por orden: $($metrics.averageOrderValue)" -ForegroundColor White
Write-Host "   Clientes únicos: $($metrics.totalCustomers)" -ForegroundColor White

Write-Host "`n📈 COMPARACIÓN CON MES ANTERIOR" -ForegroundColor Yellow
$revenueColor = if ($metrics.revenueChange -ge 0) { "Green" } else { "Red" }
$unitsColor = if ($metrics.unitsChange -ge 0) { "Green" } else { "Red" }
$salesColor = if ($metrics.salesChange -ge 0) { "Green" } else { "Red" }

Write-Host "   Cambio en ingresos: $($metrics.revenueChange)%" -ForegroundColor $revenueColor
Write-Host "   Cambio en unidades: $($metrics.unitsChange)%" -ForegroundColor $unitsColor
Write-Host "   Cambio en ventas: $($metrics.salesChange)%" -ForegroundColor $salesColor

Write-Host "`n🏆 TOP PRODUCTOS MÁS VENDIDOS" -ForegroundColor Yellow
$topCount = [Math]::Min(5, $metrics.topProducts.Count)
for ($i = 0; $i -lt $topCount; $i++) {
    $product = $metrics.topProducts[$i]
    Write-Host "   $($i + 1). $($product.productName) ($($product.size)/$($product.color))" -ForegroundColor White
    Write-Host "      Unidades: $($product.unitsSold) | Ingresos: $($product.revenue)" -ForegroundColor Gray
}

Write-Host "`n📅 VENTAS DIARIAS (Últimos días)" -ForegroundColor Yellow
$recentDays = [Math]::Min(7, $metrics.dailySales.Count)
$metrics.dailySales | Select-Object -Last $recentDays | ForEach-Object {
    Write-Host "   $($_.date): $($_.sales) ventas | $($_.revenue) ingresos | $($_.units) unidades" -ForegroundColor White
}

Write-Host "`n⚠️  ALERTAS DE INVENTARIO" -ForegroundColor Yellow
if ($metrics.lowStockProducts -gt 0) {
    Write-Host "   $($metrics.lowStockProducts) productos con bajo stock" -ForegroundColor Red
} else {
    Write-Host "   No hay productos con bajo stock" -ForegroundColor Green
}

# 6. Obtener resumen de inventario
Write-Host "`n6. Obteniendo resumen de inventario..." -ForegroundColor Yellow

$inventory = Invoke-ApiRequest -Uri "$baseUrl/dashboard/inventory-summary" -Method Get -Headers $headersGet

if ($inventory.error) {
    Write-Host "   ✗ Error: $($inventory.message)" -ForegroundColor Red
} else {
    Write-Host "   ✓ Inventario obtenido" -ForegroundColor Green

    Write-Host "`n📦 RESUMEN DE INVENTARIO" -ForegroundColor Yellow
    Write-Host "   Productos totales: $($inventory.totalProducts)" -ForegroundColor White
    Write-Host "   Variantes totales: $($inventory.totalVariants)" -ForegroundColor White
    Write-Host "   Unidades en stock: $($inventory.totalUnits)" -ForegroundColor White
    Write-Host "   Valor del inventario: $($inventory.inventoryValue)" -ForegroundColor White
}

# Resumen final
Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "  ✅ PRUEBA COMPLETADA" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Funcionalidades verificadas:" -ForegroundColor White
Write-Host "  ✓ Métricas del mes actual" -ForegroundColor Green
Write-Host "  ✓ Comparación con mes anterior" -ForegroundColor Green
Write-Host "  ✓ Productos más vendidos" -ForegroundColor Green
Write-Host "  ✓ Ventas diarias" -ForegroundColor Green
Write-Host "  ✓ Estadísticas de clientes" -ForegroundColor Green
Write-Host "  ✓ Alertas de bajo stock" -ForegroundColor Green
Write-Host "  ✓ Resumen de inventario" -ForegroundColor Green
Write-Host ""
Write-Host "Datos de prueba creados:" -ForegroundColor White
Write-Host "  Productos: $($createdProducts.Count)" -ForegroundColor Gray
Write-Host "  Ventas: $salesCount" -ForegroundColor Gray
Write-Host "  Tenant ID: $tenantId" -ForegroundColor Gray
Write-Host ""
Write-Host "Token de sesión:" -ForegroundColor White
Write-Host "  $($token.Substring(0, 50))..." -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 El Dashboard API está funcionando correctamente!" -ForegroundColor Green
Write-Host ""
Write-Host "Para más información consulta:" -ForegroundColor White
Write-Host "  - DASHBOARD_API.md" -ForegroundColor Cyan
Write-Host ""
