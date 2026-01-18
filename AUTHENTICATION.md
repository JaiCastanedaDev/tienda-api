# Autenticación JWT - API de Tienda

## 📋 Descripción

Sistema de autenticación completo implementado con JWT (JSON Web Tokens), bcrypt para hash de contraseñas y arquitectura multitenant.

## 🔒 Características de Seguridad

- **Hash de contraseñas**: Bcrypt con 12 rounds de salt
- **JWT**: Tokens con expiración de 24 horas
- **Multi-tenant**: Aislamiento de datos por tenant
- **Guards de autorización**: Control de acceso basado en roles (OWNER, SELLER)
- **Validación de datos**: Class-validator en todos los DTOs

## 🚀 Endpoints de Autenticación

### 1. Registro de Usuario

**POST** `/auth/register`

```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "MiPassword123!",
  "tenantId": "uuid-del-tenant",
  "role": "SELLER" // Opcional, por defecto es SELLER
}
```

**Respuesta:**
```json
{
  "user": {
    "id": "uuid",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "role": "SELLER",
    "tenantId": "uuid-del-tenant",
    "createdAt": "2026-01-18T..."
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Inicio de Sesión

**POST** `/auth/login`

```json
{
  "email": "juan@example.com",
  "password": "MiPassword123!",
  "tenantId": "uuid-del-tenant"
}
```

**Respuesta:**
```json
{
  "user": {
    "id": "uuid",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "role": "SELLER",
    "tenantId": "uuid-del-tenant"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Obtener Perfil

**GET** `/auth/profile`

**Headers:**
```
Authorization: Bearer <tu-token-jwt>
```

**Respuesta:**
```json
{
  "id": "uuid",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "role": "SELLER",
  "tenantId": "uuid-del-tenant",
  "createdAt": "2026-01-18T...",
  "tenant": {
    "id": "uuid",
    "name": "Mi Tienda",
    "plan": "free"
  }
}
```

### 4. Obtener Usuario Actual

**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer <tu-token-jwt>
```

**Respuesta:**
```json
{
  "id": "uuid",
  "email": "juan@example.com",
  "name": "Juan Pérez",
  "role": "SELLER",
  "tenantId": "uuid-del-tenant"
}
```

### 5. Cambiar Contraseña

**PATCH** `/auth/change-password`

**Headers:**
```
Authorization: Bearer <tu-token-jwt>
```

**Body:**
```json
{
  "oldPassword": "MiPassword123!",
  "newPassword": "NuevaPassword456!"
}
```

**Respuesta:**
```json
{
  "message": "Contraseña actualizada exitosamente"
}
```

## 🛡️ Protección de Rutas

### Uso de Guards

Todas las rutas protegidas usan el `JwtAuthGuard` y opcionalmente el `RolesGuard`:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserPayload } from '../auth/interfaces/user-payload.interface';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  
  // Solo OWNER puede crear productos
  @Post()
  @Roles('OWNER')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }

  // OWNER y SELLER pueden ver productos
  @Get()
  @Roles('OWNER', 'SELLER')
  findAll(@CurrentUser() user: UserPayload) {
    // Acceso al usuario actual
    console.log(user.id, user.role, user.tenantId);
    return this.productsService.listProducts();
  }
}
```

## 🔑 Decoradores Disponibles

### @CurrentUser()

Inyecta el usuario actual autenticado en el controlador:

```typescript
@Get('my-data')
@UseGuards(JwtAuthGuard)
getData(@CurrentUser() user: UserPayload) {
  return { userId: user.id, tenantId: user.tenantId };
}
```

### @Roles(...roles)

Define qué roles pueden acceder a un endpoint:

```typescript
@Post('admin-only')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER')
adminAction() {
  return { message: 'Solo OWNER puede hacer esto' };
}
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` con:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/database"
JWT_SECRET=tu-clave-secreta-muy-segura-minimo-32-caracteres
```

**⚠️ IMPORTANTE**: En producción, usa una clave JWT fuerte y única.

## 📝 Roles Disponibles

- **OWNER**: Dueño de la tienda, acceso completo
- **SELLER**: Vendedor, acceso limitado a funciones de venta

## 🧪 Probando la API

### Con cURL

1. **Registro:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Password123!",
    "tenantId": "tu-tenant-id"
  }'
```

2. **Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "tenantId": "tu-tenant-id"
  }'
```

3. **Acceder a ruta protegida:**
```bash
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

## 🔧 Estructura del Proyecto

```
src/auth/
├── auth.controller.ts      # Controlador con endpoints
├── auth.service.ts         # Lógica de negocio
├── auth.module.ts          # Módulo de autenticación
├── decorators/
│   ├── current-user.decorator.ts  # Decorator para obtener usuario
│   └── roles.decorator.ts         # Decorator para roles
├── dto/
│   ├── login.dto.ts        # DTO de login
│   └── register.dto.ts     # DTO de registro
├── guards/
│   ├── jwt-auth.guard.ts   # Guard JWT
│   └── roles.guard.ts      # Guard de roles
├── interfaces/
│   ├── jwt-payload.interface.ts    # Payload del JWT
│   └── user-payload.interface.ts   # Usuario autenticado
└── strategies/
    └── jwt.strategy.ts     # Estrategia Passport JWT
```

## 🔐 Mejores Prácticas Implementadas

1. ✅ **Passwords hasheados** con bcrypt (12 salt rounds)
2. ✅ **Tokens con expiración** (24 horas)
3. ✅ **Validación de datos** con class-validator
4. ✅ **Separación de concerns** (Controller/Service/Strategy)
5. ✅ **Multi-tenant** con aislamiento de datos
6. ✅ **Control de acceso basado en roles** (RBAC)
7. ✅ **Manejo de errores** apropiado
8. ✅ **Tipos seguros** con TypeScript

## 📚 Dependencias Utilizadas

- `@nestjs/jwt` - Manejo de JWT
- `@nestjs/passport` - Autenticación con Passport
- `passport-jwt` - Estrategia JWT para Passport
- `bcrypt` - Hash de contraseñas
- `class-validator` - Validación de DTOs
- `class-transformer` - Transformación de objetos

## 🚨 Notas de Seguridad

1. **Nunca** expongas el `JWT_SECRET` en el código
2. **Siempre** usa HTTPS en producción
3. **Cambia** el JWT_SECRET en cada ambiente
4. **Considera** implementar refresh tokens para sesiones largas
5. **Implementa** rate limiting para prevenir ataques de fuerza bruta
6. **Valida** todos los inputs del usuario
7. **Registra** intentos de login fallidos

## 📖 Recursos Adicionales

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [JWT.io](https://jwt.io/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
