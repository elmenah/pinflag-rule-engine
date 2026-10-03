# Diseño del sistema de reglas de despacho

## 1. Requisitos que identifiqué

El problema principal que busco resolver es que un mismo pedido puede coincidir con varias reglas de despacho que intenten modificar una misma decisión.

Por ejemplo:

- monto > $50.000 → usar Blue Express;
- peso < 20 kg → usar FedEx.

Un pedido de $60.000 y 2 kg cumple ambas condiciones. Sin un criterio explícito, el resultado dependería del orden de ejecución de las reglas.

A partir de esto definí los siguientes requisitos:

- Un mismo pedido y conjunto de reglas debe producir siempre el mismo resultado.
- La marca debe poder indicar qué regla tiene mayor importancia sin depender de un desarrollador.
- Una regla puede tener una o más condiciones.
- Las condiciones pueden evaluar monto, peso, comuna y tipo de entrega.
- Las acciones pueden modificar courier, precio de envío o disponibilidad de tipos de entrega.
- Reglas que modifican aspectos diferentes deben poder coexistir.
- Si dos reglas intentan modificar el mismo aspecto de forma incompatible, el conflicto debe resolverse explícitamente.
- La decisión debe explicar qué reglas coincidieron, cuáles se aplicaron, cuáles no y por qué.
- Una decisión histórica debe poder reconstruirse sin volver a ejecutar las reglas actuales.

---

## 2. Solución propuesta

### Representación de reglas

Representé cada regla como datos en lugar de codificar su comportamiento directamente en el código.

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

Esto permite crear nuevas reglas desde la interfaz sin modificar el Rule Engine.

Para este prototipo, múltiples condiciones dentro de una misma regla utilizan lógica `AND`. No implementé grupos `OR` ni expresiones anidadas porque aumentarían considerablemente la complejidad del modelo y no son necesarias para demostrar la solución principal.

También decidí que cada regla tenga una sola acción. Si una misma condición debe producir dos efectos, se crean dos reglas.

Por ejemplo:

```text
amount > 50000 → SET_COURIER BLUE_EXPRESS
amount > 50000 → SET_SHIPPING_PRICE 0
```

Esto simplifica la resolución de conflictos y la trazabilidad.

### Prioridad y resolución de conflictos

Cada regla tiene una prioridad numérica definida por la marca.

Un número mayor representa mayor prioridad.

La prioridad solo es relevante cuando dos o más reglas que coinciden intentan modificar el mismo aspecto de la decisión.

Ejemplo:

```text
amount > 50000 → BLUE_EXPRESS → prioridad 100
weight < 20    → FEDEX        → prioridad 50
```

Para un pedido de $60.000 y 2 kg ambas reglas coinciden, pero se aplica Blue Express.

Las reglas se agrupan por el objetivo que modifican:

```text
SET_COURIER
→ courier

SET_SHIPPING_PRICE
→ shippingPrice

ENABLE/DISABLE_DELIVERY_TYPE
→ deliveryType:<tipo>
```

Por esto, una regla que cambia el courier y otra que cambia el precio pueden aplicarse simultáneamente.

Si dos reglas incompatibles tienen la misma prioridad máxima, decidí no seleccionar una arbitrariamente. El motor registra un conflicto y mantiene el valor base para ese aspecto.

Si dos reglas con la misma prioridad producen exactamente el mismo resultado, no lo considero un conflicto real.

### Configuración base

Asumí que cada marca tiene una configuración base:

- courier por defecto;
- precio de envío;
- tipos de entrega disponibles.

Las reglas modifican esa configuración.

Si ninguna regla coincide, el resultado continúa siendo la configuración base y la traza indica que no hubo reglas aplicables.

Esta es una decisión de diseño del prototipo, ya que el enunciado solicita contemplar el estado donde ninguna regla coincide, pero no define cuál debe ser el resultado en ese caso.

### Flujo de decisión

```text
Pedido
  ↓
Configuración base de la marca
  ↓
Obtener reglas activas
  ↓
Evaluar condiciones
  ↓
Reglas coincidentes
  ↓
Agrupar por aspecto modificado
  ↓
Resolver conflictos y prioridades
  ↓
Aplicar reglas ganadoras
  ↓
Resultado final
  ↓
Guardar resultado + traza
```

### Arquitectura

```text
React
  │
  │ HTTP / JSON
  ▼
Express API
  │
  ├──── Rule Engine
  │
  ▼
PostgreSQL
```

Separé el Rule Engine de Express para que la lógica de negocio no dependa de HTTP ni de PostgreSQL.

React se encarga de mostrar y capturar información, pero no decide qué regla gana. Esa responsabilidad permanece en el backend.

En PostgreSQL utilicé `JSONB` para condiciones, acciones, pedidos, resultados y trazas. Elegí este enfoque porque el modelo de reglas es flexible y se representa naturalmente como objetos en JavaScript.

El trade-off es que parte de la validación de estructura queda en el backend en lugar de estar completamente impuesta por el esquema relacional.

### Trazabilidad

Cada simulación genera un registro en `decisions` que almacena:

- pedido original;
- resultado final;
- reglas coincidentes;
- reglas aplicadas;
- reglas rechazadas;
- conflictos;
- motivos.

Decidí guardar un snapshot de la decisión y no solamente referencias a los IDs de las reglas.

Esto permite explicar posteriormente qué ocurrió aunque una regla haya sido modificada después, sin volver a ejecutar el motor con la configuración actual.

---

## 3. Riesgos y decisiones pendientes

### Reglas existentes con conflictos

Una marca podría tener reglas históricas que, bajo el nuevo modelo de prioridades, queden empatadas y sean incompatibles.

No eliminaría ni modificaría esas reglas automáticamente. Las marcaría para revisión y permitiría que la marca defina explícitamente la prioridad correcta.

### Complejidad futura de las condiciones

El prototipo utiliza condiciones combinadas mediante `AND`.

Si en el futuro se necesitan expresiones como:

```text
(amount > 50000 AND weight < 20)
OR
commune == "Quintero"
```

extendería el modelo hacia grupos de condiciones anidados.

No lo implementé ahora para mantener el motor simple y explicable.

### Validación de reglas

El backend valida campos, operadores, tipos de datos y acciones conocidas.

En una versión productiva agregaría validaciones de dominio más estrictas, versionado de reglas y una etapa de validación previa que detecte combinaciones imposibles antes de activarlas.

---

## 4. Uso de Inteligencia Artificial

Utilicé IA como herramienta de apoyo durante el desarrollo, principalmente para discutir alternativas de diseño, revisar código, resolver dudas de JavaScript/React/PostgreSQL y detectar errores durante las pruebas.

La IA me ayudó a:

- analizar distintas formas de resolver reglas que se superponen;
- proponer estructuras iniciales para algunas funciones y componentes;
- revisar la lógica de prioridades y conflictos;
- explicar conceptos de JavaScript y React que necesitaba reforzar durante la implementación;
- proponer ejemplos de consultas SQL y validaciones de la API;
- detectar errores durante las pruebas, por ejemplo cuando había definido los tipos de acciones válidas pero todavía no estaba ejecutando esa validación antes del `INSERT`;
- proponer una estructura inicial para la interfaz y estilos CSS;
- revisar la documentación y ayudarme a organizar este documento.

Yo realicé y validé las decisiones principales del proyecto:

- elegí utilizar prioridades explícitas para resolver reglas que compiten por el mismo resultado;
- decidí no resolver arbitrariamente empates incompatibles;
- definí que acciones sobre aspectos distintos puedan coexistir;
- decidí utilizar una configuración base cuando ninguna regla coincide;
- implementé y fui integrando el Rule Engine, Express, PostgreSQL y React;
- ejecuté las pruebas manuales y comprobé los resultados contra la base de datos y la interfaz;
- adapté y corregí las propuestas de la IA cuando no representaban correctamente el comportamiento buscado;
- decidí qué funcionalidades incluir en el alcance final y cuáles dejar fuera.

No utilicé la IA como sustituto de la ejecución o validación del proyecto. Fui incorporando las propuestas de forma incremental, ejecutando el código y verificando cada comportamiento antes de continuar.

Un ejemplo concreto fue la validación de acciones en `POST /rules`: inicialmente la constante con los tipos permitidos existía, pero una prueba permitió descubrir que todavía no se utilizaba antes del `INSERT`. Después de identificarlo, incorporé la validación y repetí la prueba hasta comprobar que la API respondía `400` y no almacenaba la regla inválida.

También descarté agregar complejidad que no aportaba al objetivo principal del prototipo, como expresiones booleanas anidadas, resolución arbitraria de empates o lógica de decisión en el frontend.