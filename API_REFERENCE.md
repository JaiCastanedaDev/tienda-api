# 📚 Documentación Completa de APIs - Tienda API

## Índice

1. [Información General](#información-general)
2. [Autenticación](#autenticación)
3. [Productos](#productos)
4. [Ventas](#ventas)
5. [Dashboard](#dashboard)
6. [Stock](#stock)
7. [IA (OpenRouter)](#ia-openrouter)
8. [Códigos de Estado](#códigos-de-estado)
9. [Ejemplos de Integración](#ejemplos-de-integración)

---

## Información General

### Base URL

Si tu app tiene prefijo global configurado (`app.setGlobalPrefix('api')`), la base será:
```
http://localhost:3000/api
```

Si NO hay prefijo global, la base será:
```
http://localhost:3000
```

> Los ejemplos de este documento asumen el prefijo `/api` **si** está configurado.

### Autenticación
La mayoría de los endpoints requieren autenticación JWT. Incluye el token en el header:
```
Authorization: Bearer <tu-token-jwt>
```

### Formato de Respuesta
Todas las respuestas son en formato JSON.

### Roles Disponibles
- **OWNER**: Dueño de la tienda (acceso completo)
- **SELLER**: Vendedor (acceso limitado)

---

## 🔐 Autenticación

### 1. Registro de Usuario

**Endpoint:** `POST /auth/register`

**Autenticación:** No requerida

**Descripción:** Registra un nuevo usuario y crea automáticamente un tenant (tienda).

**Body:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "Password123!",
  "tenantName": "Mi Tienda",
  "role": "OWNER"
}
```

**Campos:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| name | string | Sí | Nombre completo del usuario |
| email | string | Sí | Email único (global) |
| password | string | Sí | Contraseña (mínimo 8 caracteres) |
| tenantName | string | No | Nombre de la tienda (opcional) |
| role | string | No | OWNER o SELLER (default: OWNER) |

**Respuesta Exitosa (201):**
```json
{
  "user": {
    "id": "uuid",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "role": "OWNER",
    "tenantId": "uuid-tenant",
    "createdAt": "2026-01-18T10:30:00.000Z"
  },
  "tenant": {
    "id": "uuid-tenant",
    "name": "Mi Tienda"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores:**
- `409 Conflict`: Email ya registrado
- `400 Bad Request`: Datos inválidos

---

### 2. Inicio de Sesión

**Endpoint:** `POST /auth/login`

**Autenticación:** No requerida

**Descripción:** Autentica un usuario y retorna un token JWT.

**Body:**
```json
{
  "email": "juan@example.com",
  "password": "Password123!"
}
```

**Campos:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| email | string | Sí | Email del usuario |
| password | string | Sí | Contraseña |

**Respuesta Exitosa (200):**
```json
{
  "user": {
    "id": "uuid",
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "role": "OWNER",
    "tenantId": "uuid-tenant"
  },
  "tenant": {
    "id": "uuid-tenant",
    "name": "Mi Tienda",
    "plan": "free"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores:**
- `401 Unauthorized`: Credenciales inválidas
- `401 Unauthorized`: Tenant no disponible

---

### 3. Obtener Perfil Completo

**Endpoint:** `GET /auth/profile`

**Autenticación:** Requerida (JWT)

**Roles:** OWNER, SELLER

**Descripción:** Obtiene el perfil completo del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta Exitosa (200):**
```json
{
  "id": "uuid",
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "role": "OWNER",
  "tenantId": "uuid-tenant",
  "createdAt": "2026-01-18T10:30:00.000Z",
  "tenant": {
    "id": "uuid-tenant",
    "name": "Mi Tienda",
    "plan": "free"
  }
}
```

---

### 4. Obtener Usuario Actual

**Endpoint:** `GET /auth/me`

**Autenticación:** Requerida (JWT)

**Roles:** OWNER, SELLER

**Descripción:** Obtiene información básica del usuario autenticado.

**Respuesta Exitosa (200):**
```json
{
  "id": "uuid",
  "email": "juan@example.com",
  "name": "Juan Pérez",
  "role": "OWNER",
  "tenantId": "uuid-tenant"
}
```

---

### 5. Cambiar Contraseña

**Endpoint:** `PATCH /auth/change-password`

**Autenticación:** Requerida (JWT)

**Roles:** OWNER, SELLER

**Descripción:** Cambia la contraseña del usuario autenticado.

**Body:**
```json
{
  "oldPassword": "Password123!",
  "newPassword": "NewPassword456!"
}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Contraseña actualizada exitosamente"
}
```

**Errores:**
- `401 Unauthorized`: Contraseña actual incorrecta
- `400 Bad Request`: Nueva contraseña igual a la actual

---

## 📦 Productos

### 1. Crear Producto

**Endpoint:** `POST /products`

**Autenticación:** Requerida (JWT)

**Roles:** Solo OWNER

**Descripción:** Crea un nuevo producto con sus variantes. El **tenant** se determina automáticamente desde el token JWT.

**Body:**
```json
{
  "name": "Camiseta Básica",
  "sku": "CAM-001",
  "price": 2500,
  "variants": [
    { "size": "S", "color": "Blanco", "quantity": 10 }
  ]
}
```

**Campos:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| name | string | Sí | Nombre del producto |
| sku | string | Sí | Código único del producto (único por tenant) |
| price | number | Sí | Precio en centavos |
| variants | array | No | Array de variantes |

**Respuesta Exitosa (201):**
```json
{
  "id": "uuid",
  "tenantId": "uuid-tenant",
  "name": "Camiseta Básica",
  "sku": "CAM-001",
  "price": 2500,
  "active": true,
  "createdAt": "2026-01-18T10:30:00.000Z",
  "updatedAt": "2026-01-18T10:30:00.000Z",
  "variants": [
    {
      "id": "uuid-variant",
      "productId": "uuid",
      "size": "M",
      "color": "Blanco",
      "createdAt": "2026-01-18T10:30:00.000Z",
      "stock": {
        "id": "uuid-stock",
        "quantity": 15,
        "productVariantId": "uuid-variant"
      }
    }
  ]
}
```

**Errores:**
- `403 Forbidden`: Usuario no es OWNER
- `400 Bad Request`: Datos inválidos
- `409 Conflict`: SKU ya existe

---

### 2. Listar Productos

**Endpoint:** `GET /products`

**Autenticación:** Requerida (JWT)

**Roles:** OWNER, SELLER

**Descripción:** Lista todos los productos del tenant.

**Respuesta Exitosa (200):**
```json
[
  {
    "id": "uuid",
    "tenantId": "uuid-tenant",
    "name": "Camiseta Básica",
    "sku": "CAM-001",
    "price": 2500,
    "active": true,
    "createdAt": "2026-01-18T10:30:00.000Z",
    "variants": [
      {
        "id": "uuid-variant",
        "size": "M",
        "color": "Blanco",
        "stock": {
          "quantity": 15
        }
      }
    ]
  }
]
```

---

### 3. Agregar Stock (por producto)

**Endpoint:** `POST /products/:id/stock`

**Autenticación:** Requerida (JWT)

**Roles:** Solo OWNER

**Descripción:** Agrega stock a una variante específica del producto. El **tenant** se determina automáticamente desde el token JWT.

**Body:**
```json
{
  "size": "M",
  "color": "Blanco",
  "quantity": 10
}
```

**Campos:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| size | string | Sí | Talla de la variante |
| color | string | Sí | Color de la variante |
| quantity | number | Sí | Cantidad a agregar (positivo) |

**Respuesta Exitosa (200):**
```json
{
  "id": "uuid-stock",
  "productVariantId": "uuid-variant",
  "quantity": 25,
  "updatedAt": "2026-01-18T11:00:00.000Z"
}
```

**Errores:**
- `404 Not Found`: Producto o variante no encontrada
- `403 Forbidden`: Usuario no es OWNER

---

### 4. Agregar Imagen a Variante

**Endpoint:** `POST /products/variant-image`

**Autenticación:** Requerida (JWT)

**Roles:** Solo OWNER

**Descripción:** Asocia una o más imágenes a una variante (producto + talla + color). Permite marcar una imagen como principal (`isPrimary`).

**Body:**
```json
{
  "productId": "uuid-product",
  "size": "M",
  "color": "Negro",
  "url": "https://.../imagen.jpg",
  "alt": "Camiseta negra talla M",
  "isPrimary": true,
  "sortOrder": 0
}
```

**Respuesta Exitosa (201/200):**
```json
{
  "id": "uuid-image",
  "productVariantId": "uuid-variant",
  "url": "https://.../imagen.jpg",
  "alt": "Camiseta negra talla M",
  "isPrimary": true,
  "sortOrder": 0,
  "createdAt": "2026-01-26T02:30:00.000Z",
  "updatedAt": "2026-01-26T02:30:00.000Z"
}
```

---

> Nota: `GET /products` ahora incluye `variants.images` ordenadas (primero `isPrimary=true`, luego por `sortOrder`).

---

### 5. Actualizar Producto (Editar)

**Endpoint:** `PUT /products/:id`

**Autenticación:** Requerida (JWT)

**Roles:** Solo OWNER

**Descripción:** Actualiza la **metadata** del producto (nombre, SKU, precio). **No modifica stock**.

> Si el frontend envía `variants`, serán ignoradas por el backend. Para inventario usa `POST /products/:id/stock` o los endpoints de `/stock`.

**Body:**
```json
{
  "name": "Jean Slim Adidas",
  "sku": "JNS-2QKT62",
  "price": 164759
}
```

**Respuesta Exitosa (200):**
Devuelve el producto actualizado incluyendo `variants.stock` e `variants.images`.

---

### 6. Eliminar Producto

**Endpoint:** `DELETE /products/:id`

**Autenticación:** Requerida (JWT)

**Roles:** Solo OWNER

**Descripción:** Elimina un producto de forma **lógica** (soft delete) marcándolo como `active=false`. Esto evita romper ventas/históricos.

**Respuesta Exitosa (200):**
```json
{ "message": "Producto eliminado" }
```

Si ya estaba eliminado:
```json
{ "message": "Producto ya estaba eliminado" }
```

---

## 🧾 Ventas

### 1. Crear Venta

**Endpoint:** `POST /sales`

**Autenticación:** Requerida (JWT)

**Roles:** OWNER, SELLER

**Descripción:** Registra una nueva venta y descuenta automáticamente el stock. El **tenant** y el **userId** se determinan automáticamente desde el token JWT.

**Body:**
```json
{
  "items": [
    { "productId": "uuid-product", "size": "M", "color": "Blanco", "quantity": 2 }
  ]
}
```

> Seguridad: la API valida que los productos vendidos pertenezcan al tenant del usuario logueado.


**Campos:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| items | array | Sí | Array de productos vendidos |
| items[].productId | string | Sí | ID del producto |
| items[].size | string | Sí | Talla de la variante |
| items[].color | string | Sí | Color de la variante |
| items[].quantity | number | Sí | Cantidad vendida |

**Respuesta Exitosa (201):**
```json
{
  "id": "uuid-sale",
  "tenantId": "uuid-tenant",
  "userId": "uuid-user",
  "total": 7500,
  "createdAt": "2026-01-18T11:30:00.000Z",
  "items": [
    {
      "id": "uuid-item",
      "saleId": "uuid-sale",
      "productVariantId": "uuid-variant",
      "quantity": 2,
      "price": 2500
    }
  ]
}
```

**Errores:**
- `404 Not Found`: Producto o variante no encontrada
- `400 Bad Request`: Stock insuficiente
- `400 Bad Request`: Datos inválidos

---

### 2. Listar Ventas

**Endpoint:** `GET /sales`

**Autenticación:** Requerida (JWT)

**Roles:** OWNER, SELLER

**Descripción:** Lista las ventas del tenant.

**Respuesta Exitosa (200):**
```json
{
  "message": "Lista de ventas",
  "userId": "uuid-user"
}
```

*Nota: Este endpoint está pendiente de implementación completa.*

---

## 📊 Dashboard

### 1. Obtener Métricas del Dashboard

**Endpoint:** `GET /dashboard/metrics`

**Autenticación:** Requerida (JWT)

**Roles:** OWNER, SELLER

**Descripción:** Obtiene métricas completas del negocio.

**Respuesta Exitosa (200):**
```json
{
  "monthlyRevenue": 150000,
  "monthlyUnits": 45,
  "monthlySales": 12,
  "revenueChange": 25,
  "unitsChange": 15,
  "salesChange": 20,
  "topProducts": [
    {
      "productId": "uuid",
      "productName": "Camiseta Básica",
      "sku": "CAM-001",
      "variantId": "uuid-variant",
      "size": "M",
      "color": "Azul",
      "unitsSold": 15,
      "revenue": 37500
    }
  ],
  "dailySales": [
    {
      "date": "2026-01-18",
      "sales": 3,
      "revenue": 15000,
      "units": 8
    }
  ],
  "averageOrderValue": 12500,
  "totalCustomers": 8,
  "lowStockProducts": 3
}
```

**Campos de Respuesta:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| monthlyRevenue | number | Ingresos totales del mes actual |
| monthlyUnits | number | Unidades vendidas en el mes |
| monthlySales | number | Número de ventas realizadas |
| revenueChange | number | % de cambio vs mes anterior |
| unitsChange | number | % de cambio en unidades |
| salesChange | number | % de cambio en ventas |
| topProducts | array | Top 10 productos más vendidos |
| dailySales | array | Ventas diarias (últimos 30 días) |
| averageOrderValue | number | Ticket promedio |
| totalCustomers | number | Clientes únicos del mes |
| lowStockProducts | number | Productos con < 5 unidades |

---

### 2. Obtener Resumen de Inventario

**Endpoint:** `GET /dashboard/inventory-summary`

**Autenticación:** Requerida (JWT)

**Roles:** Solo OWNER

**Descripción:** Obtiene un resumen del inventario total.

**Respuesta Exitosa (200):**
```json
{
  "totalProducts": 25,
  "totalVariants": 75,
  "totalUnits": 450,
  "inventoryValue": 2250000
}
```

**Campos de Respuesta:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| totalProducts | number | Total de productos activos |
| totalVariants | number | Total de variantes |
| totalUnits | number | Unidades totales en stock |
| inventoryValue | number | Valor total del inventario |

---

## 📦 Stock

> Nota de seguridad: aunque algunos DTOs contienen `tenantId`, el backend **fuerza** el `tenantId` desde el token JWT para evitar que un cliente manipule el tenant.

### 1. Listar Stock

**Endpoint:** `GET /stock`

**Autenticación:** Requerida (JWT)

**Roles:** OWNER, SELLER

**Descripción:** Lista el stock por variante (producto + talla + color) para el tenant del usuario.

**Query params (opcionales):**
| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| lowOnly | boolean | Si `true`, retorna solo variantes con bajo stock (< 5) |

**Ejemplo:**
- `GET /stock?lowOnly=true`

**Respuesta Exitosa (200):**
```json
[
  {
    "id": "uuid-variant",
    "productId": "uuid-product",
    "size": "M",
    "color": "Blanco",
    "product": {
      "id": "uuid-product",
      "name": "Camiseta Básica",
      "sku": "CAM-001",
      "price": 2500,
      "active": true
    },
    "stock": {
      "id": "uuid-stock",
      "productVariantId": "uuid-variant",
      "quantity": 15
    }
  }
]
```

---

### 2. Ver Stock de una Variante

**Endpoint:** `GET /stock/variant`

**Autenticación:** Requerida (JWT)

**Roles:** OWNER, SELLER

**Query params:**
| Parámetro | Tipo | Requerido | Descripción |
|----------|------|-----------|-------------|
| productVariantId | string (UUID) | Sí | ID de la variante (**productVariant.id**) |

> Importante: este endpoint requiere el **ID de la variante** (tabla `product_variants`). No uses `stock.id`.

**Ejemplos:**
- `GET /stock/variant?productVariantId=uuid-variant`
- `GET /stock/variant/uuid-variant`

**Respuesta Exitosa (200):**
```json
{
  "id": "uuid-variant",
  "productId": "uuid-product",
  "size": "M",
  "color": "Blanco",
  "product": {
    "id": "uuid-product",
    "tenantId": "uuid-tenant",
    "name": "Camiseta Básica",
    "sku": "CAM-001",
    "price": 2500,
    "active": true
  },
  "stock": {
    "id": "uuid-stock",
    "productVariantId": "uuid-variant",
    "quantity": 15
  }
}
```

**Errores:**
- `404 Not Found`: Variante no encontrada

---

### 3. Ajustar Stock (Incremento/Decremento)

**Endpoint:** `POST /stock/adjust`

**Autenticación:** Requerida (JWT)

**Roles:** Solo OWNER

**Descripción:** Ajusta el stock de una variante sumando (IN) o restando (OUT) unidades.

**Body:**
```json
{
  "tenantId": "uuid-tenant",
  "productVariantId": "uuid-variant",
  "quantity": 5,
  "reason": "Ingreso de mercadería"
}
```

> `quantity` puede ser positivo (entra stock) o negativo (sale stock). No puede ser 0.

**Respuesta Exitosa (200):**
```json
{
  "stock": { "id": "uuid-stock", "productVariantId": "uuid-variant", "quantity": 20 },
  "previousQuantity": 15,
  "newQuantity": 20,
  "movement": { "type": "IN", "quantity": 5, "reason": "Ingreso de mercadería" }
}
```

**Errores:**
- `400 Bad Request`: quantity = 0
- `400 Bad Request`: Stock insuficiente para decremento
- `404 Not Found`: Variante no encontrada
- `403 Forbidden`: Usuario no es OWNER

---

### 4. Establecer Stock (Cantidad Exacta)

**Endpoint:** `POST /stock/set`

**Autenticación:** Requerida (JWT)

**Roles:** Solo OWNER

**Descripción:** Establece el stock de una variante a un valor exacto.

**Body:**
```json
{
  "tenantId": "uuid-tenant",
  "productVariantId": "uuid-variant",
  "quantity": 12,
  "reason": "Conteo físico"
}
```

**Respuesta Exitosa (200):**
```json
{
  "stock": { "id": "uuid-stock", "productVariantId": "uuid-variant", "quantity": 12 },
  "previousQuantity": 20,
  "newQuantity": 12,
  "movement": { "type": "OUT", "quantity": 8, "reason": "Conteo físico" }
}
```

**Errores:**
- `400 Bad Request`: quantity negativo
- `404 Not Found`: Variante no encontrada
- `403 Forbidden`: Usuario no es OWNER

---

### 5. Listar Movimientos de Stock

**Endpoint:** `GET /stock/movements`

**Autenticación:** Requerida (JWT)

**Roles:** Solo OWNER

**Query params (opcionales):**
| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| take | number | Cantidad de movimientos a retornar (default 50) |

**Respuesta Exitosa (200):**
```json
[
  {
    "id": "uuid-movement",
    "tenantId": "uuid-tenant",
    "productVariantId": "uuid-variant",
    "type": "IN",
    "quantity": 5,
    "createdAt": "2026-01-18T12:00:00.000Z",
    "productVariant": {
      "id": "uuid-variant",
      "size": "M",
      "color": "Blanco",
      "product": {
        "id": "uuid-product",
        "name": "Camiseta Básica",
        "sku": "CAM-001",
        "price": 2500
      }
    }
  }
]
```

---

## 🤖 IA (OpenRouter)

> Todos los endpoints de IA requieren JWT y respetan el `tenantId` del token.

### 1. Obtener modelo activo

**Endpoint:** `GET /ai/models`

**Autenticación:** Requerida (JWT)

**Roles:** OWNER, SELLER

**Descripción:** Devuelve el modelo configurado por defecto.

---

### 2. Chat (preguntas sobre ventas/stock/productos)

**Endpoint:** `POST /ai/chat`

**Autenticación:** Requerida (JWT)

**Roles:** OWNER, SELLER

**Body:**
```json
{
  "message": "¿Qué productos debo reponer esta semana?",
  "context": "Enfócate en ropa deportiva" 
}
```

- `context` es opcional.

**Respuesta Exitosa (200):**
```json
{
  "model": "openai/gpt-4o-mini",
  "usage": { "total_tokens": 1234 },
  "answer": "..."
}
```

---

### 3. Insights (recomendación de compra para el próximo mes)

**Endpoint:** `POST /ai/insights`

**Autenticación:** Requerida (JWT)

**Roles:** Solo OWNER

**Body (opcional):**
```json
{ "days": 30 }
```

**Respuesta Exitosa (200):**
```json
{
  "model": "openai/gpt-4o-mini",
  "days": 30,
  "usage": { "total_tokens": 1449 },
  "insights": "..."
}
```

> La IA construye un contexto interno con: top ventas, low-stock, slow-movers, conteos de catálogo e inventario.

---

## 📋 Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado exitosamente |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - No autenticado o token inválido |
| 403 | Forbidden - No tiene permisos |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Conflicto (ej: email duplicado) |
| 500 | Internal Server Error - Error del servidor |

---

## 🔑 Estructura del Token JWT

El token JWT contiene la siguiente información:

```json
{
  "sub": "uuid-user",
  "email": "juan@example.com",
  "tenantId": "uuid-tenant",
  "role": "OWNER",
  "iat": 1642512345,
  "exp": 1642598745
}
```

**Campos:**
- `sub`: ID del usuario
- `email`: Email del usuario
- `tenantId`: ID del tenant (para filtrado automático)
- `role`: Rol del usuario
- `iat`: Fecha de emisión (timestamp)
- `exp`: Fecha de expiración (timestamp) - 24 horas

---

## 📱 Ejemplos de Integración

### JavaScript / Fetch API

```javascript
// 1. Login
const login = async (email, password) => {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  localStorage.setItem('token', data.access_token);
  return data;
};

// 2. Obtener productos
const getProducts = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/products', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};

// 3. Crear producto
const createProduct = async (productData) => {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(productData)
  });
  return await response.json();
};

// 4. Obtener métricas del dashboard
const getDashboardMetrics = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:3000/dashboard/metrics', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};
```

---

### Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Uso
const login = async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('token', data.access_token);
  return data;
};

const getProducts = () => api.get('/products');
const createProduct = (product) => api.post('/products', product);
const getDashboard = () => api.get('/dashboard/metrics');
```

---

### React Hook Personalizado

```jsx
import { useState, useEffect } from 'react';

const useApi = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const request = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`http://localhost:3000${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    return response.json();
  };

  const login = async (email, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.access_token);
    localStorage.setItem('token', data.access_token);
    return data;
  };

  return {
    login,
    get: (url) => request(url),
    post: (url, body) => request(url, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  };
};

// Uso en componente
function Dashboard() {
  const api = useApi();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    api.get('/dashboard/metrics').then(setMetrics);
  }, []);

  return <div>{/* Render metrics */}</div>;
}
```

---

### PowerShell

```powershell
# 1. Login
$loginBody = @{
    email = "juan@example.com"
    password = "Password123!"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3000/auth/login" `
    -Method Post -Body $loginBody -ContentType "application/json"

$token = $response.access_token

# 2. Obtener productos
$headers = @{ "Authorization" = "Bearer $token" }
$products = Invoke-RestMethod -Uri "http://localhost:3000/products" `
    -Method Get -Headers $headers

# 3. Crear producto
$productBody = @{
    tenantId = $response.user.tenantId
    name = "Nuevo Producto"
    sku = "PROD-001"
    price = 5000
    variants = @(
        @{ size = "M"; color = "Azul"; quantity = 10 }
    )
} | ConvertTo-Json -Depth 3

$headers["Content-Type"] = "application/json"
$newProduct = Invoke-RestMethod -Uri "http://localhost:3000/products" `
    -Method Post -Body $productBody -Headers $headers

# 4. Dashboard
$metrics = Invoke-RestMethod -Uri "http://localhost:3000/dashboard/metrics" `
    -Method Get -Headers $headers
```

---

## 📊 Resumen de Endpoints

### Públicos (Sin autenticación)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /auth/register | Registrar usuario |
| POST | /auth/login | Iniciar sesión |

### Protegidos (Con autenticación)

#### Autenticación
| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| GET | /auth/profile | ALL | Obtener perfil completo |
| GET | /auth/me | ALL | Obtener usuario actual |
| PATCH | /auth/change-password | ALL | Cambiar contraseña |

#### Productos
| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| POST | /products | OWNER | Crear producto |
| GET | /products | ALL | Listar productos |
| POST | /products/:id/stock | OWNER | Agregar stock |
| POST | /products/variant-image | OWNER | Agregar imagen a variante |
| PUT | /products/:id | OWNER | Actualizar producto |
| DELETE | /products/:id | OWNER | Eliminar producto |

#### Ventas
| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| POST | /sales | ALL | Crear venta |
| GET | /sales | ALL | Listar ventas |

#### Dashboard
| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| GET | /dashboard/metrics | ALL | Métricas del dashboard |
| GET | /dashboard/inventory-summary | OWNER | Resumen de inventario |

#### Stock
| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| GET | /stock | ALL | Listar stock por variante |
| GET | /stock/variant | ALL | Ver stock de una variante |
| POST | /stock/adjust | OWNER | Ajustar stock (+/-) |
| POST | /stock/set | OWNER | Establecer stock (exacto) |
| GET | /stock/movements | OWNER | Listar movimientos |

#### IA
| Método | Endpoint | Roles | Descripción |
|--------|----------|-------|-------------|
| GET | /ai/models | ALL | Obtener modelo activo |
| POST | /ai/chat | ALL | Consultar al modelo |
| POST | /ai/insights | OWNER | Obtener insights de compra |

---

## 🔒 Consideraciones de Seguridad

1. **Tokens JWT**: Expiran en 24 horas
2. **HTTPS**: Usar siempre en producción
3. **Rate Limiting**: Implementar para prevenir abuso
4. **CORS**: Configurar orígenes permitidos
5. **Validación**: Todos los inputs son validados
6. **Multi-tenant**: Datos automáticamente filtrados por tenant
7. **Hash**: Contraseñas con bcrypt (12 rounds)

---

## 📞 Soporte

Para más información, consulta:
- [AUTHENTICATION.md](AUTHENTICATION.md) - Guía de autenticación
- [DASHBOARD_API.md](DASHBOARD_API.md) - Detalles del dashboard
- [README.md](README.md) - Documentación general

---

**Versión de la API:** 1.0.0  
**Última actualización:** 18 de Enero, 2026
