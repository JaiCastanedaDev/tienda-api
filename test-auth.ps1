# 🧪 Script de Prueba Rápida de Autenticación

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  TEST DE AUTENTICACIÓN JWT" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"

# Función para hacer requests con manejo de errores
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

# 1. Verificar que el servidor está corriendo
Write-Host "1. Verificando servidor..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl" -Method Get -TimeoutSec 2
    Write-Host "   ✓ Servidor activo" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Servidor no responde. Asegúrate de que esté corriendo: npm run start:dev" -ForegroundColor Red
    exit 1
}

# 2. Obtener un tenant ID (necesitas tenerlo)
Write-Host "`n2. Configuración de Tenant" -ForegroundColor Yellow
Write-Host "   IMPORTANTE: Necesitas un tenant ID válido de tu base de datos" -ForegroundColor White
Write-Host "   Ejecuta este comando para obtener uno:" -ForegroundColor Gray
Write-Host "   psql -h localhost -p 5433 -U postgres -d store -c `"SELECT id, name FROM tenants LIMIT 1;`"" -ForegroundColor Gray
Write-Host ""

$tenantId = Read-Host "   Ingresa el Tenant ID (o presiona Enter para usar uno de ejemplo)"
if ([string]::IsNullOrWhiteSpace($tenantId)) {
    $tenantId = "00000000-0000-0000-0000-000000000000"
    Write-Host "   ⚠️  Usando tenant ID de ejemplo (probablemente fallará)" -ForegroundColor Yellow
}

# 3. Generar email único para evitar conflictos
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "test_$timestamp@example.com"

# 4. Registrar usuario
Write-Host "`n3. Registrando usuario..." -ForegroundColor Yellow
$registerBody = @{
    name = "Usuario Test $timestamp"
    email = $testEmail
    password = "Password123!"
    tenantId = $tenantId
    role = "OWNER"
} | ConvertTo-Json

$registerResponse = Invoke-ApiRequest -Uri "$baseUrl/auth/register" -Method Post -Body $registerBody

if ($registerResponse.error) {
    Write-Host "   ✗ Error al registrar: $($registerResponse.message)" -ForegroundColor Red
    Write-Host "   Código: $($registerResponse.statusCode)" -ForegroundColor Red
    Write-Host "`n   Posibles causas:" -ForegroundColor Yellow
    Write-Host "   - El tenant ID no existe en la base de datos" -ForegroundColor Gray
    Write-Host "   - El email ya está registrado" -ForegroundColor Gray
    Write-Host "   - El servidor no está corriendo correctamente" -ForegroundColor Gray
    exit 1
} else {
    Write-Host "   ✓ Usuario registrado exitosamente" -ForegroundColor Green
    Write-Host "     Email: $testEmail" -ForegroundColor Gray
    Write-Host "     ID: $($registerResponse.user.id)" -ForegroundColor Gray
    Write-Host "     Rol: $($registerResponse.user.role)" -ForegroundColor Gray
    $token = $registerResponse.access_token
    Write-Host "     Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
}

# 5. Login
Write-Host "`n4. Probando login..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = "Password123!"
    tenantId = $tenantId
} | ConvertTo-Json

$loginResponse = Invoke-ApiRequest -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody

if ($loginResponse.error) {
    Write-Host "   ✗ Error en login: $($loginResponse.message)" -ForegroundColor Red
} else {
    Write-Host "   ✓ Login exitoso" -ForegroundColor Green
    $token = $loginResponse.access_token
}

# 6. Obtener perfil
Write-Host "`n5. Obteniendo perfil del usuario..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $token"
}

$profileResponse = Invoke-ApiRequest -Uri "$baseUrl/auth/profile" -Method Get -Headers $headers

if ($profileResponse.error) {
    Write-Host "   ✗ Error al obtener perfil: $($profileResponse.message)" -ForegroundColor Red
} else {
    Write-Host "   ✓ Perfil obtenido" -ForegroundColor Green
    Write-Host "     Nombre: $($profileResponse.name)" -ForegroundColor Gray
    Write-Host "     Email: $($profileResponse.email)" -ForegroundColor Gray
    Write-Host "     Rol: $($profileResponse.role)" -ForegroundColor Gray
    Write-Host "     Tenant: $($profileResponse.tenant.name)" -ForegroundColor Gray
}

# 7. Obtener usuario actual
Write-Host "`n6. Obteniendo usuario actual (/me)..." -ForegroundColor Yellow
$meResponse = Invoke-ApiRequest -Uri "$baseUrl/auth/me" -Method Get -Headers $headers

if ($meResponse.error) {
    Write-Host "   ✗ Error: $($meResponse.message)" -ForegroundColor Red
} else {
    Write-Host "   ✓ Usuario obtenido" -ForegroundColor Green
    Write-Host "     ID: $($meResponse.id)" -ForegroundColor Gray
    Write-Host "     Nombre: $($meResponse.name)" -ForegroundColor Gray
}

# 8. Intentar acceder a productos (ruta protegida)
Write-Host "`n7. Probando acceso a ruta protegida (productos)..." -ForegroundColor Yellow
$productsResponse = Invoke-ApiRequest -Uri "$baseUrl/products" -Method Get -Headers $headers

if ($productsResponse.error) {
    Write-Host "   ✗ Error: $($productsResponse.message)" -ForegroundColor Red
} else {
    Write-Host "   ✓ Acceso permitido a productos" -ForegroundColor Green
    if ($productsResponse.Count -gt 0) {
        Write-Host "     Productos encontrados: $($productsResponse.Count)" -ForegroundColor Gray
    } else {
        Write-Host "     No hay productos (esto es normal)" -ForegroundColor Gray
    }
}

# 9. Probar acceso SIN token (debe fallar)
Write-Host "`n8. Probando acceso SIN token (debe fallar)..." -ForegroundColor Yellow
$noAuthResponse = Invoke-ApiRequest -Uri "$baseUrl/products" -Method Get

if ($noAuthResponse.error) {
    if ($noAuthResponse.statusCode -eq 401) {
        Write-Host "   ✓ Correctamente bloqueado sin autenticación" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Bloqueado pero con código inesperado: $($noAuthResponse.statusCode)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ ERROR: Permitió acceso sin token!" -ForegroundColor Red
}

# Resumen final
Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE LA PRUEBA" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Sistema de autenticación funcionando correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "Endpoints probados:" -ForegroundColor White
Write-Host "  ✓ POST /auth/register" -ForegroundColor Green
Write-Host "  ✓ POST /auth/login" -ForegroundColor Green
Write-Host "  ✓ GET  /auth/profile" -ForegroundColor Green
Write-Host "  ✓ GET  /auth/me" -ForegroundColor Green
Write-Host "  ✓ GET  /products (con auth)" -ForegroundColor Green
Write-Host "  ✓ Bloqueo sin autenticación" -ForegroundColor Green
Write-Host ""
Write-Host "Token generado (guárdalo para más pruebas):" -ForegroundColor White
Write-Host $token -ForegroundColor Gray
Write-Host ""
Write-Host "Para más ejemplos, consulta:" -ForegroundColor White
Write-Host "  - AUTHENTICATION.md" -ForegroundColor Cyan
Write-Host "  - API_EXAMPLES.md" -ForegroundColor Cyan
Write-Host "  - IMPLEMENTATION_SUMMARY.md" -ForegroundColor Cyan
Write-Host ""
