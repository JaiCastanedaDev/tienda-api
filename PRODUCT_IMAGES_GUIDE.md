# Guía: Añadir Imágenes al Crear/Editar Productos

## Descripción General

Ahora puedes añadir imágenes de productos/variantes directamente al crear o editar un producto sin necesidad de hacer una petición adicional.

## 1. Crear Producto con Imágenes en Variantes

**Endpoint:** `POST /products`

**Descripción:** Crea un producto con variantes que incluyen imágenes.

### Ejemplo de Petición

```json
{
  "name": "Camiseta Premium",
  "sku": "TSHIRT-001",
  "price": 2999,
  "variants": [
    {
      "size": "M",
      "color": "Negro",
      "quantity": 10,
      "images": [
        {
          "url": "https://example.com/images/tshirt-black-m-1.jpg",
          "alt": "Camiseta negra frontal talla M",
          "isPrimary": true,
          "sortOrder": 0
        },
        {
          "url": "https://example.com/images/tshirt-black-m-2.jpg",
          "alt": "Camiseta negra posterior talla M",
          "isPrimary": false,
          "sortOrder": 1
        }
      ]
    },
    {
      "size": "L",
      "color": "Negro",
      "quantity": 15,
      "images": [
        {
          "url": "https://example.com/images/tshirt-black-l-1.jpg",
          "alt": "Camiseta negra frontal talla L",
          "isPrimary": true,
          "sortOrder": 0
        }
      ]
    },
    {
      "size": "M",
      "color": "Blanco",
      "quantity": 8,
      "images": [
        {
          "url": "https://example.com/images/tshirt-white-m-1.jpg",
          "alt": "Camiseta blanca frontal talla M",
          "isPrimary": true
        }
      ]
    }
  ]
}
```

### Propiedades de Imagen

| Propiedad | Tipo | Requerida | Descripción |
|-----------|------|-----------|-------------|
| `url` | string (URL válida) | ✅ Sí | URL completa de la imagen |
| `alt` | string | ❌ No | Texto alternativo para accesibilidad |
| `isPrimary` | boolean | ❌ No (default: false) | Marca la imagen como principal |
| `sortOrder` | number | ❌ No (default: 0) | Orden de visualización (0, 1, 2...) |

### Respuesta Exitosa (201 Created)

```json
{
  "id": "prod-123",
  "tenantId": "tenant-1",
  "name": "Camiseta Premium",
  "sku": "TSHIRT-001",
  "price": 2999,
  "active": true,
  "createdAt": "2025-02-03T10:30:00Z",
  "updatedAt": "2025-02-03T10:30:00Z",
  "variants": [
    {
      "id": "var-123",
      "productId": "prod-123",
      "size": "M",
      "color": "Negro",
      "createdAt": "2025-02-03T10:30:00Z",
      "updatedAt": "2025-02-03T10:30:00Z",
      "stock": {
        "id": "stock-123",
        "productVariantId": "var-123",
        "quantity": 10,
        "createdAt": "2025-02-03T10:30:00Z",
        "updatedAt": "2025-02-03T10:30:00Z"
      },
      "images": [
        {
          "id": "img-123",
          "productVariantId": "var-123",
          "url": "https://example.com/images/tshirt-black-m-1.jpg",
          "alt": "Camiseta negra frontal talla M",
          "isPrimary": true,
          "sortOrder": 0,
          "createdAt": "2025-02-03T10:30:00Z",
          "updatedAt": "2025-02-03T10:30:00Z"
        },
        {
          "id": "img-124",
          "productVariantId": "var-123",
          "url": "https://example.com/images/tshirt-black-m-2.jpg",
          "alt": "Camiseta negra posterior talla M",
          "isPrimary": false,
          "sortOrder": 1,
          "createdAt": "2025-02-03T10:30:00Z",
          "updatedAt": "2025-02-03T10:30:00Z"
        }
      ]
    }
  ]
}
```

---

## 2. Editar Producto y Añadir Imágenes

**Endpoint:** `PUT /products/:id`

**Descripción:** Actualiza la metadata de un producto y añade imágenes a su primera variante.

### Ejemplo de Petición

```json
{
  "name": "Camiseta Premium Edición 2025",
  "sku": "TSHIRT-001-V2",
  "price": 3499,
  "images": [
    {
      "url": "https://example.com/images/tshirt-updated-1.jpg",
      "alt": "Nueva foto frontal",
      "isPrimary": true,
      "sortOrder": 0
    },
    {
      "url": "https://example.com/images/tshirt-updated-2.jpg",
      "alt": "Nueva foto posterior",
      "isPrimary": false,
      "sortOrder": 1
    }
  ]
}
```

### Notas Importantes

- Las imágenes se añaden a la **primera variante** del producto
- Si una imagen tiene `isPrimary: true`, todas las imágenes anteriores del mismo tipo se marcarán como `isPrimary: false`
- Solo se pueden actualizar metadata (name, sku, price) e imágenes con este endpoint
- Para modificar stock o variantes, usa los endpoints específicos

### Respuesta Exitosa (200 OK)

```json
{
  "id": "prod-123",
  "tenantId": "tenant-1",
  "name": "Camiseta Premium Edición 2025",
  "sku": "TSHIRT-001-V2",
  "price": 3499,
  "active": true,
  "createdAt": "2025-02-03T10:30:00Z",
  "updatedAt": "2025-02-03T11:00:00Z",
  "variants": [
    {
      "id": "var-123",
      "productId": "prod-123",
      "size": "M",
      "color": "Negro",
      "createdAt": "2025-02-03T10:30:00Z",
      "updatedAt": "2025-02-03T10:30:00Z",
      "stock": {
        "id": "stock-123",
        "productVariantId": "var-123",
        "quantity": 10,
        "createdAt": "2025-02-03T10:30:00Z",
        "updatedAt": "2025-02-03T10:30:00Z"
      },
      "images": [
        {
          "id": "img-125",
          "productVariantId": "var-123",
          "url": "https://example.com/images/tshirt-updated-1.jpg",
          "alt": "Nueva foto frontal",
          "isPrimary": true,
          "sortOrder": 0,
          "createdAt": "2025-02-03T11:00:00Z",
          "updatedAt": "2025-02-03T11:00:00Z"
        },
        {
          "id": "img-126",
          "productVariantId": "var-123",
          "url": "https://example.com/images/tshirt-updated-2.jpg",
          "alt": "Nueva foto posterior",
          "isPrimary": false,
          "sortOrder": 1,
          "createdAt": "2025-02-03T11:00:00Z",
          "updatedAt": "2025-02-03T11:00:00Z"
        }
      ]
    }
  ]
}
```

---

## 3. Método Alternativo: Añadir Imágenes Separadamente

Si prefieres, también puedes seguir usando el endpoint antiguo para añadir imágenes a variantes específicas:

**Endpoint:** `POST /products/variant-image`

```json
{
  "productId": "prod-123",
  "size": "M",
  "color": "Negro",
  "url": "https://example.com/images/additional-image.jpg",
  "alt": "Foto adicional",
  "isPrimary": false,
  "sortOrder": 2
}
```

---

## Validaciones

- **URL válida**: Las URLs de las imágenes deben ser válidas (http:// o https://)
- **sortOrder**: Debe ser un número entero >= 0
- **isPrimary**: Solo puede ser un boolean true/false
- **Cantidad**: El campo `quantity` en variantes debe ser >= 0

## Errores Comunes

### Error 400: Bad Request
```json
{
  "statusCode": 400,
  "message": [
    "url must be a URL address"
  ]
}
```
**Solución:** Verifica que todas las URLs sean válidas (deben empezar con http:// o https://)

### Error 404: Not Found
```json
{
  "statusCode": 404,
  "message": "Producto no encontrado"
}
```
**Solución:** Verifica que el ID del producto sea correcto y pertenezca a tu tienda

### Error 403: Forbidden
```json
{
  "statusCode": 403,
  "message": "No puedes modificar productos de otra tienda"
}
```
**Solución:** Solo puedes modificar productos de tu tienda (tenant)

