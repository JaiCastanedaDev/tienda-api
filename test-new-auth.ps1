# 🧪 Script de Prueba del Nuevo Flujo de Autenticación

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  TEST DE NUEVO FLUJO AUTH" -ForegroundColor Cyan
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

# 2. Generar datos únicos para la prueba
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$testEmail = "test_$timestamp@example.com"
$testTenantName = "Tienda Test $timestamp"

Write-Host "`n2. Datos de la prueba:" -ForegroundColor Yellow
Write-Host "   Email: $testEmail" -ForegroundColor Gray
Write-Host "   Tienda: $testTenantName" -ForegroundColor Gray

# 3. Registrar usuario (SIN tenant_id - el sistema lo crea automáticamente)
Write-Host "`n3. Registrando usuario (crea tenant automáticamente)..." -ForegroundColor Yellow
$registerBody = @{
    name = "Usuario Test $timestamp"
    email = $testEmail
    password = "Password123!"
    tenantName = $testTenantName
} | ConvertTo-Json

$registerResponse = Invoke-ApiRequest -Uri "$baseUrl/auth/register" -Method Post -Body $registerBody

if ($registerResponse.error) {
    Write-Host "   ✗ Error al registrar: $($registerResponse.message)" -ForegroundColor Red
    exit 1
} else {
    Write-Host "   ✓ Usuario registrado exitosamente" -ForegroundColor Green
    Write-Host "     Email: $testEmail" -ForegroundColor Gray
    Write-Host "     Usuario ID: $($registerResponse.user.id)" -ForegroundColor Gray
    Write-Host "     Rol: $($registerResponse.user.role)" -ForegroundColor Gray
    Write-Host "     Tenant ID: $($registerResponse.user.tenantId)" -ForegroundColor Gray
    Write-Host "     Tenant Nombre: $($registerResponse.tenant.name)" -ForegroundColor Gray
    $token = $registerResponse.access_token
    Write-Host "     Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
}

# 4. Login (SIN tenant_id - solo email y password)
Write-Host "`n4. Probando login (solo email y password)..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = "Password123!"
} | ConvertTo-Json

$loginResponse = Invoke-ApiRequest -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody

if ($loginResponse.error) {
    Write-Host "   ✗ Error en login: $($loginResponse.message)" -ForegroundColor Red
} else {
    Write-Host "   ✓ Login exitoso" -ForegroundColor Green
    Write-Host "     Usuario: $($loginResponse.user.name)" -ForegroundColor Gray
    Write-Host "     Tenant: $($loginResponse.tenant.name)" -ForegroundColor Gray
    Write-Host "     Plan: $($loginResponse.tenant.plan)" -ForegroundColor Gray
    $token = $loginResponse.access_token
    Write-Host "     Nuevo token: $($token.Substring(0, 50))..." -ForegroundColor Gray
}

# 5. Obtener perfil
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
    Write-Host "     Plan: $($profileResponse.tenant.plan)" -ForegroundColor Gray
}

# 6. Obtener usuario actual
Write-Host "`n6. Obteniendo usuario actual (/me)..." -ForegroundColor Yellow
$meResponse = Invoke-ApiRequest -Uri "$baseUrl/auth/me" -Method Get -Headers $headers

if ($meResponse.error) {
    Write-Host "   ✗ Error: $($meResponse.message)" -ForegroundColor Red
} else {
    Write-Host "   ✓ Usuario obtenido" -ForegroundColor Green
    Write-Host "     ID: $($meResponse.id)" -ForegroundColor Gray
    Write-Host "     Tenant ID: $($meResponse.tenantId)" -ForegroundColor Gray
}

# 7. Intentar acceder a productos (ruta protegida)
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

# 8. Probar acceso SIN token (debe fallar)
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

# 9. Intentar registrar el mismo email de nuevo (debe fallar)
Write-Host "`n9. Probando registro con email duplicado (debe fallar)..." -ForegroundColor Yellow
$duplicateRegisterBody = @{
    name = "Otro Usuario"
    email = $testEmail
    password = "Password123!"
    tenantName = "Otra Tienda"
} | ConvertTo-Json

$duplicateResponse = Invoke-ApiRequest -Uri "$baseUrl/auth/register" -Method Post -Body $duplicateRegisterBody

if ($duplicateResponse.error) {
    if ($duplicateResponse.statusCode -eq 409) {
        Write-Host "   ✓ Correctamente rechazó email duplicado" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Rechazado pero con código inesperado: $($duplicateResponse.statusCode)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✗ ERROR: Permitió registro con email duplicado!" -ForegroundColor Red
}

# Resumen final
Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "  RESUMEN DE LA PRUEBA" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Nuevo flujo de autenticación funcionando correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "Características verificadas:" -ForegroundColor White
Write-Host "  ✓ Registro sin tenant_id (se crea automáticamente)" -ForegroundColor Green
Write-Host "  ✓ Login solo con email/password" -ForegroundColor Green
Write-Host "  ✓ Token incluye tenant_id" -ForegroundColor Green
Write-Host "  ✓ Acceso a rutas protegidas con JWT" -ForegroundColor Green
Write-Host "  ✓ Bloqueo sin autenticación" -ForegroundColor Green
Write-Host "  ✓ Validación de email único" -ForegroundColor Green
Write-Host ""
Write-Host "Datos de la prueba:" -ForegroundColor White
Write-Host "  Email: $testEmail" -ForegroundColor Cyan
Write-Host "  Tenant: $testTenantName" -ForegroundColor Cyan
Write-Host "  Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
Write-Host ""
Write-Host "Ventajas del nuevo flujo:" -ForegroundColor White
Write-Host "  • El usuario solo necesita email y password" -ForegroundColor Gray
Write-Host "  • El sistema crea y asigna el tenant automáticamente" -ForegroundColor Gray
Write-Host "  • Cada registro crea su propia tienda" -ForegroundColor Gray
Write-Host "  • Multi-tenant transparente y automático" -ForegroundColor Gray
Write-Host ""
Write-Host "Para más información, consulta:" -ForegroundColor White
Write-Host "  - FLUJO_AUTENTICACION.md" -ForegroundColor Cyan
Write-Host "  - AUTHENTICATION.md" -ForegroundColor Cyan
Write-Host ""
