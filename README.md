<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# 🏪 Tienda API - Sistema Multi-tenant con Autenticación JWT

API RESTful construida con NestJS para gestión de tiendas multi-tenant con sistema completo de autenticación y autorización.

## ✨ Características Principales

- 🔐 **Autenticación JWT** completa con bcrypt
- 🏢 **Multi-tenant** con aislamiento de datos
- 👥 **Control de acceso basado en roles** (OWNER, SELLER)
- 📦 **Gestión de productos** con variantes y stock
- 🧾 **Sistema de ventas** integrado
- 📊 **Dashboard con métricas** avanzadas y estadísticas
- ✅ **Validación de datos** con class-validator
- 🗄️ **Prisma ORM** con PostgreSQL
- 📝 **Documentación completa** con ejemplos

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno

Crea un archivo `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/database"
JWT_SECRET=tu-clave-secreta-muy-segura-minimo-32-caracteres
```

### 3. Ejecutar migraciones

```bash
npx prisma migrate dev
```

### 4. Iniciar el servidor

```bash
npm run start:dev
```

El servidor estará disponible en `http://localhost:3000`

## 🔐 Autenticación

### Registro de Usuario

```bash
POST /auth/register
Content-Type: application/json

{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "Password123!",
  "tenantId": "uuid-del-tenant",
  "role": "OWNER"
}
```

### Login

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "juan@example.com",
  "password": "Password123!",
  "tenantId": "uuid-del-tenant"
}
```

**Respuesta:**
```json
{
  "user": { ... },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Usar el Token

Incluye el token en el header `Authorization` de todas las peticiones protegidas:

```
Authorization: Bearer <tu-token-jwt>
```

## 📚 Documentación Completa

- **[API_REFERENCE.md](API_REFERENCE.md)** - 📖 Referencia completa de todas las APIs
- **[AUTHENTICATION.md](AUTHENTICATION.md)** - Guía completa de autenticación y seguridad
- **[DASHBOARD_API.md](DASHBOARD_API.md)** - API de métricas y estadísticas del dashboard
- **[API_EXAMPLES.md](API_EXAMPLES.md)** - Ejemplos prácticos con PowerShell
- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Resumen de la implementación

## 🧪 Probar la API

### Autenticación
```powershell
.\test-auth.ps1
```

### Dashboard
```powershell
.\test-dashboard.ps1
```

### Completo
```powershell
.\test-complete.ps1
```

Estos scripts probarán automáticamente:
- ✅ Registro de usuarios
- ✅ Login
- ✅ Obtención de perfil
- ✅ Acceso a rutas protegidas
- ✅ Bloqueo sin autenticación

## 🛡️ Roles y Permisos

| Endpoint | OWNER | SELLER |
|----------|-------|--------|
| GET /products | ✅ | ✅ |
| POST /products | ✅ | ❌ |
| POST /products/:id/stock | ✅ | ❌ |
| GET /sales | ✅ | ✅ |
| POST /sales | ✅ | ✅ |

## 📁 Estructura del Proyecto

```
src/
├── auth/                   # Sistema de autenticación
│   ├── decorators/        # @CurrentUser, @Roles
│   ├── dto/               # DTOs de login/registro
│   ├── guards/            # JwtAuthGuard, RolesGuard
│   ├── interfaces/        # Tipos e interfaces
│   └── strategies/        # JWT Strategy
├── dashboard/             # API de métricas y estadísticas
├── prisma/                # Configuración de Prisma
├── products/              # Gestión de productos
└── sales/                 # Gestión de ventas
```

## 🔒 Seguridad Implementada

- ✅ Hash de contraseñas con bcrypt (12 salt rounds)
- ✅ Tokens JWT con expiración de 24 horas
- ✅ Validación de entrada en todos los endpoints
- ✅ Arquitectura multi-tenant segura
- ✅ Control de acceso basado en roles (RBAC)
- ✅ Tipos seguros con TypeScript

## Description$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
