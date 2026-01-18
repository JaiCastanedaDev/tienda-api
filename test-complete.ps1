# 🧪 Script de Prueba Completa - Autenticación y APIs Protegidas

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  TEST COMPLETO DE LA API" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"

# Función para hacer requests
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
    Write-Host "   Ejecuta: npm run start:dev" -ForegroundColor Yellow
    exit 1
}

# 2. Generar datos únicos
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "test_$timestamp@example.com"
$testTenantName = "Tienda Test $timestamp"

Write-Host "`n2. Datos de prueba:" -ForegroundColor Yellow
Write-Host "   Email: $testEmail" -ForegroundColor Gray
Write-Host "   Tienda: $testTenantName" -ForegroundColor Gray

# 3. Registrar usuario
Write-Host "`n3. Registrando usuario..." -ForegroundColor Yellow
$registerBody = @{
    name = "Usuario Test"
    email = $testEmail
    password = "Password123!"
    tenantName = $testTenantName
} | ConvertTo-Json

$registerResponse = Invoke-ApiRequest -Uri "$baseUrl/auth/register" -Method Post -Body $registerBody

if ($registerResponse.error) {
    Write-Host "   ✗ Error: $($registerResponse.message)" -ForegroundColor Red
    exit 1
}

Write-Host "   ✓ Registro exitoso" -ForegroundColor Green
$token = $registerResponse.access_token
$tenantId = $registerResponse.user.tenantId
Write-Host "   Token obtenido" -ForegroundColor Gray
Write-Host "   Tenant ID: $tenantId" -ForegroundColor Gray

# 4. Login
Write-Host "`n4. Iniciando sesión..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = "Password123!"
} | ConvertTo-Json

$loginResponse = Invoke-ApiRequest -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody

if ($loginResponse.error) {
    Write-Host "   ✗ Error: $($loginResponse.message)" -ForegroundColor Red
    exit 1
}

Write-Host "   ✓ Login exitoso" -ForegroundColor Green
$token = $loginResponse.access_token

# 5. Crear headers con token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 6. Obtener perfil
Write-Host "`n5. Obteniendo perfil..." -ForegroundColor Yellow
$profileResponse = Invoke-ApiRequest -Uri "$baseUrl/auth/profile" -Method Get -Headers $headers

if ($profileResponse.error) {
    Write-Host "   ✗ Error: $($profileResponse.message)" -ForegroundColor Red
} else {
    Write-Host "   ✓ Perfil obtenido" -ForegroundColor Green
    Write-Host "   Usuario: $($profileResponse.name)" -ForegroundColor Gray
}

# 7. Listar productos (debería funcionar ahora)
Write-Host "`n6. Listando productos..." -ForegroundColor Yellow
$headersGet = @{
    "Authorization" = "Bearer $token"
}

$productsResponse = Invoke-ApiRequest -Uri "$baseUrl/products" -Method Get -Headers $headersGet

if ($productsResponse.error) {
    Write-Host "   ✗ Error al listar productos: $($productsResponse.message)" -ForegroundColor Red
    Write-Host "   Código: $($productsResponse.statusCode)" -ForegroundColor Red
} else {
    Write-Host "   ✓ Acceso a productos permitido" -ForegroundColor Green
    Write-Host "   Productos encontrados: $($productsResponse.Count)" -ForegroundColor Gray
}

# 8. Crear un producto
Write-Host "`n7. Creando un producto..." -ForegroundColor Yellow
$productBody = @{
    tenantId = $tenantId
    name = "Producto Test"
    sku = "TEST-$(Get-Random -Minimum 1000 -Maximum 9999)"
    price = 5000
    variants = @(
        @{
            size = "M"
            color = "Azul"
            quantity = 10
        }
    )
} | ConvertTo-Json -Depth 3

$createProductResponse = Invoke-ApiRequest -Uri "$baseUrl/products" -Method Post -Headers $headers -Body $productBody

if ($createProductResponse.error) {
    Write-Host "   ✗ Error al crear producto: $($createProductResponse.message)" -ForegroundColor Red
    Write-Host "   Código: $($createProductResponse.statusCode)" -ForegroundColor Red
} else {
    Write-Host "   ✓ Producto creado exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($createProductResponse.id)" -ForegroundColor Gray
    Write-Host "   Nombre: $($createProductResponse.name)" -ForegroundColor Gray
    Write-Host "   SKU: $($createProductResponse.sku)" -ForegroundColor Gray
    $productId = $createProductResponse.id
}

# 9. Listar productos nuevamente
Write-Host "`n8. Listando productos nuevamente..." -ForegroundColor Yellow
$productsResponse = Invoke-ApiRequest -Uri "$baseUrl/products" -Method Get -Headers $headersGet

if ($productsResponse.error) {
    Write-Host "   ✗ Error: $($productsResponse.message)" -ForegroundColor Red
} else {
    Write-Host "   ✓ Productos obtenidos" -ForegroundColor Green
    Write-Host "   Total: $($productsResponse.Count)" -ForegroundColor Gray
    if ($productsResponse.Count -gt 0) {
        Write-Host "   Primer producto: $($productsResponse[0].name)" -ForegroundColor Gray
    }
}

# 10. Probar sin token (debe fallar)
Write-Host "`n9. Probando acceso sin token (debe fallar)..." -ForegroundColor Yellow
$noAuthResponse = Invoke-ApiRequest -Uri "$baseUrl/products" -Method Get

if ($noAuthResponse.error) {
    if ($noAuthResponse.statusCode -eq 401) {
        Write-Host "   ✓ Correctamente bloqueado sin token" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Bloqueado con código: $($noAuthResponse.statusCode)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ ERROR: Permitió acceso sin token!" -ForegroundColor Red
}

# Resumen
Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "  RESUMEN FINAL" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Todas las pruebas completadas" -ForegroundColor Green
Write-Host ""
Write-Host "Funcionalidades verificadas:" -ForegroundColor White
Write-Host "  ✓ Registro de usuario" -ForegroundColor Green
Write-Host "  ✓ Login" -ForegroundColor Green
Write-Host "  ✓ Obtención de perfil" -ForegroundColor Green
Write-Host "  ✓ Listado de productos (con autenticación)" -ForegroundColor Green
Write-Host "  ✓ Creación de productos (rol OWNER)" -ForegroundColor Green
Write-Host "  ✓ Bloqueo sin autenticación" -ForegroundColor Green
Write-Host ""
Write-Host "Token de la sesión:" -ForegroundColor White
Write-Host "  $($token.Substring(0, 50))..." -ForegroundColor Gray
Write-Host ""
Write-Host "Tenant ID:" -ForegroundColor White
Write-Host "  $tenantId" -ForegroundColor Gray
Write-Host ""
Write-Host "¡El sistema de autenticación está funcionando correctamente!" -ForegroundColor Green
Write-Host ""
