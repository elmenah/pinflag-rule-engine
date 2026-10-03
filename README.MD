# Pinflag Rule Engine

Prototipo de un motor de reglas de despacho desarrollado para la prueba técnica de Pinflag.

El sistema permite configurar reglas por marca para determinar el courier, precio de envío y tipos de entrega disponibles de un pedido. Cuando varias reglas coinciden, el motor resuelve la decisión de forma determinista utilizando prioridades explícitas y mantiene una traza que permite explicar posteriormente por qué se tomó una decisión.

## Tecnologías

### Frontend
- React
- Vite
- JavaScript

### Backend
- Node.js
- Express

### Base de datos
- PostgreSQL 16
- Docker

## Arquitectura

```text
React
  │
  │ HTTP / JSON
  ▼
Express API
  │
  ├── Rule Engine
  │
  ▼
PostgreSQL
```

El Rule Engine está separado de las rutas HTTP para que la lógica de evaluación pueda probarse independientemente de Express y PostgreSQL.

## Funcionalidades implementadas

- Visualización de las reglas configuradas.
- Creación de nuevas reglas.
- Validación de reglas inválidas.
- Condiciones sobre monto, peso, comuna y tipo de entrega.
- Acciones para:
  - asignar courier;
  - modificar precio de envío;
  - habilitar tipos de entrega;
  - bloquear tipos de entrega.
- Prioridades configurables.
- Resolución determinista cuando varias reglas afectan el mismo aspecto.
- Detección de conflictos cuando reglas incompatibles tienen la misma prioridad.
- Simulación de pedidos desde React.
- Visualización del courier resultante.
- Visualización del precio de envío.
- Visualización de los tipos de entrega disponibles.
- Explicación de las reglas que coincidieron, fueron aplicadas o rechazadas.
- Uso de configuración base cuando ninguna regla coincide.
- Persistencia de cada decisión y su trazabilidad.
- Recuperación de una decisión histórica sin volver a ejecutar las reglas.

## Modelo de una regla

Ejemplo:

```json
{
  "name": "Pedidos sobre $50.000 usan Blue Express",
  "conditions": [
    {
      "field": "amount",
      "operator": ">",
      "value": 50000
    }
  ],
  "action": {
    "type": "SET_COURIER",
    "value": "BLUE_EXPRESS"
  },
  "priority": 100,
  "enabled": true
}
```

Actualmente, múltiples condiciones dentro de una regla se evalúan utilizando lógica `AND`.

## Resolución de conflictos

Las reglas se agrupan según el aspecto de la decisión que modifican.

Por ejemplo:

```text
SET_COURIER
→ courier

SET_SHIPPING_PRICE
→ shippingPrice

DISABLE_DELIVERY_TYPE PICKUP_POINT
→ deliveryType:PICKUP_POINT
```

Reglas que modifican aspectos diferentes pueden coexistir.

Cuando varias reglas modifican el mismo aspecto:

1. Gana la regla con mayor prioridad.
2. Si las reglas de mayor prioridad producen el mismo resultado, no existe un conflicto real.
3. Si tienen la misma prioridad y producen resultados incompatibles, el motor registra un conflicto y no selecciona arbitrariamente una de ellas.

## Caso de ejemplo

El proyecto incluye las reglas:

```text
Monto > $50.000
→ BLUE_EXPRESS
Prioridad 100

Peso < 20 kg
→ FEDEX
Prioridad 50
```

Para un pedido de:

```text
Monto: $60.000
Peso: 2 kg
```

ambas reglas coinciden.

El motor selecciona `BLUE_EXPRESS` porque su regla tiene prioridad `100`, mientras que la regla de FedEx tiene prioridad `50`.

La explicación de esta decisión queda almacenada en la traza.

## Configuración base

La marca de demostración utiliza:

```text
Courier: CHILEXPRESS
Precio de envío: $3.990

Tipos de entrega:
- HOME_DELIVERY
- STORE_PICKUP
- PICKUP_POINT
```

Si ninguna regla coincide, esta configuración se mantiene y la decisión registra que se utilizó la configuración base.

# Cómo ejecutar el proyecto

## Requisitos

Tener instalados:

- Node.js
- npm
- Docker Desktop
- Git

## 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd PruebaTecnicaPingFlag
```

## 2. Levantar PostgreSQL

Desde la raíz:

```bash
docker compose up -d
```

Docker crea una instancia PostgreSQL y ejecuta automáticamente:

```text
Backend/database/schema.sql
Backend/database/seed.sql
```

Los datos iniciales se cargan al crear por primera vez el volumen de PostgreSQL.

La base queda expuesta localmente en el puerto `5433`.

## 3. Configurar el backend

Entrar a:

```bash
cd Backend
```

Crear un archivo `.env` con:

```env
DB_HOST=localhost
DB_PORT=5433
DB_NAME=pinflag
DB_USER=pinflag
DB_PASSWORD=pinflag
```

Instalar dependencias:

```bash
npm install
```

Ejecutar:

```bash
node src/server.js
```

La API queda disponible en:

```text
http://localhost:3000
```

## 4. Ejecutar el frontend

Desde otra terminal:

```bash
cd Frontend
npm install
npm run dev
```

Abrir:

```text
http://localhost:5173
```

# Pruebas manuales recomendadas

### Conflicto resuelto por prioridad

```text
Monto: 60000
Peso: 2
Comuna: Quintero
Tipo: HOME_DELIVERY
```

Deben coincidir las reglas de Blue Express y FedEx.

Resultado esperado:

```text
Courier: BLUE_EXPRESS
```

La interfaz muestra que FedEx no fue aplicada por tener menor prioridad.

### Ninguna regla coincide

```text
Monto: 30000
Peso: 25
Comuna: Quintero
Tipo: HOME_DELIVERY
```

El sistema conserva la configuración base y explica que ninguna regla coincidió.

### Regla inválida

Desde "Crear regla", intentar crear una condición numérica con un valor no numérico.

La API rechaza la regla y React muestra el mensaje de validación.

# API

### Obtener reglas

```text
GET /rules
```

### Crear regla

```text
POST /rules
```

### Simular pedido

```text
POST /simulations
```

### Recuperar decisión histórica

```text
GET /decisions/:id
```

# Trazabilidad

Cada simulación almacena un snapshot en PostgreSQL con:

- pedido recibido;
- resultado final;
- reglas coincidentes;
- reglas aplicadas;
- reglas rechazadas;
- conflictos;
- motivos de la decisión.

Esto permite consultar una decisión histórica utilizando su ID sin volver a ejecutar el Rule Engine con las reglas actuales.

# Alcance y próximos pasos

Este proyecto es un prototipo funcional enfocado en resolución de reglas, conflictos y trazabilidad.

En una versión de producción agregaría:

- autenticación y autorización por marca;
- edición y eliminación de reglas;
- validación de reglas más avanzada;
- versionado de reglas;
- paginación;
- pruebas automatizadas de API e integración;
- observabilidad y métricas;
- manejo de múltiples marcas desde la interfaz;
- configuración de CORS por ambiente;
- CI/CD;
- despliegue en infraestructura cloud.

Las condiciones compuestas actualmente utilizan `AND`. Grupos `OR` y expresiones anidadas quedarían como una extensión del modelo.