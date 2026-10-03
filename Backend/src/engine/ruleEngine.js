// ======================================================
// 1. EVALUACIÓN DE CONDICIONES
// ======================================================

/*
 * Evalúo una condición específica contra los datos del pedido.
 *
 * Ejemplo:
 * condition = {
 *   field: "amount",
 *   operator: ">",
 *   value: 50000
 * }
 *
 * order.amount = 60000
 *
 * Resultado:
 * 60000 > 50000 -> true
 */
function evaluateCondition(condition, order) {
  /*
   * Obtengo dinámicamente el valor del pedido que necesito evaluar.
   *
   * Si:
   * condition.field = "amount"
   *
   * Entonces:
   * order[condition.field]
   *
   * equivale a:
   * order["amount"]
   */
  const orderValue = order[condition.field];

  /*
   * Reviso qué operador utiliza la condición
   * y realizo la comparación correspondiente.
   */
  switch (condition.operator) {
    case ">":
      return orderValue > condition.value;

    case "<":
      return orderValue < condition.value;

    case "<=":
      return orderValue <= condition.value;

    case ">=":
      return orderValue >= condition.value;

    case "=":
      return orderValue === condition.value;

    /*
     * Si recibo un operador que el motor no conoce,
     * detengo la evaluación porque no puedo interpretarlo.
     */
    default:
      throw new Error(`Operador no soportado: ${condition.operator}`);
  }
}

// ======================================================
// 2. EVALUACIÓN DE UNA REGLA
// ======================================================

/*
 * Evalúo todas las condiciones que pertenecen a una regla.
 *
 * Uso .every() porque actualmente considero las condiciones
 * de una regla como un AND.
 *
 * Es decir:
 *
 * amount > 50000
 * AND
 * weight < 20
 *
 * Todas deben cumplirse para considerar que la regla coincide.
 */
function evaluateRule(rule, order) {
  return rule.conditions.every((condition) =>
    evaluateCondition(condition, order),
  );
}

// ======================================================
// 3. OBTENER REGLAS COINCIDENTES
// ======================================================

/*
 * Busco cuáles de las reglas disponibles se cumplen
 * para el pedido que estoy evaluando.
 *
 * Una regla debe cumplir dos requisitos:
 *
 * 1. Estar habilitada.
 * 2. Cumplir todas sus condiciones.
 *
 * El resultado será un array llamado matchedRules.
 */
function getMatchingRules(rules, order) {
  return rules.filter(
    (rule) =>
      /*
       * Primero verifico que la regla esté habilitada.
       */
      rule.enabled &&
      /*
       * Después evalúo sus condiciones contra el pedido.
       */
      evaluateRule(rule, order),
  );
}

// ======================================================
// 4. IDENTIFICAR QUÉ MODIFICA UNA ACCIÓN
// ======================================================

/*
 * Identifico qué parte del resultado intenta modificar
 * una determinada acción.
 *
 * Ejemplo:
 *
 * SET_COURIER
 *      ↓
 * courier
 *
 * SET_SHIPPING_PRICE
 *      ↓
 * shippingPrice
 *
 * Esto me permite saber qué reglas están intentando
 * modificar la misma parte del resultado.
 */
function getActionTarget(action) {
  switch (action.type) {
    case "SET_COURIER":
      return "courier";

    case "SET_SHIPPING_PRICE":
      return "shippingPrice";

    case "ENABLE_DELIVERY_TYPE":
    case "DISABLE_DELIVERY_TYPE":
      return `deliveryType:${action.value}`;

    default:
      return null;
  }
}

// ======================================================
// 5. AGRUPAR REGLAS POR TARGET
// ======================================================

/*
 * Agrupo las reglas coincidentes según la parte
 * del resultado que intentan modificar.
 *
 * Ejemplo:
 *
 * matchedRules:
 *
 * Blue Express -> SET_COURIER
 * FedEx        -> SET_COURIER
 * Envío gratis -> SET_SHIPPING_PRICE
 *
 * Resultado:
 *
 * {
 *   courier: [
 *     Blue Express,
 *     FedEx
 *   ],
 *
 *   shippingPrice: [
 *     Envío gratis
 *   ]
 * }
 *
 * Esto es importante porque las reglas que modifican
 * targets diferentes pueden coexistir.
 *
 * En cambio, las reglas que modifican el mismo target
 * pueden competir entre ellas.
 */
function groupRulesByTarget(matchedRules) {
  /*
   * Creo inicialmente un objeto vacío donde
   * voy a construir los grupos.
   */
  const groups = {};

  /*
   * Recorro todas las reglas que coincidieron
   * con el pedido.
   */
  matchedRules.forEach((rule) => {
    /*
     * Averiguo qué parte del resultado quiere
     * modificar esta regla.
     */
    const target = getActionTarget(rule.action);

    /*
     * Si todavía no existe un grupo para ese target,
     * creo un array vacío.
     */
    if (!groups[target]) {
      groups[target] = [];
    }

    /*
     * Agrego la regla completa al grupo correspondiente.
     */
    groups[target].push(rule);
  });

  /*
   * Devuelvo todas las reglas agrupadas por target.
   */
  return groups;
}

// ======================================================
// 6. OBTENER REGLA CON MAYOR PRIORIDAD
// ======================================================

/*
 * Busco una regla con la prioridad más alta
 * dentro de un grupo.
 *
 * Esta función NO decide por sí sola si existe
 * un conflicto.
 *
 * Su única responsabilidad es encontrar una regla
 * con la prioridad máxima.
 */
function getHighestPriorityRule(rules) {
  /*
   * Inicialmente considero la primera regla
   * como posible ganadora.
   */
  let winner = rules[0];

  /*
   * Recorro todas las reglas del grupo.
   */
  for (const rule of rules) {
    /*
     * Si encuentro una regla con una prioridad
     * superior a la del winner actual,
     * reemplazo el winner.
     */
    if (rule.priority > winner.priority) {
      winner = rule;
    }
  }

  /*
   * Devuelvo la regla con la prioridad más alta encontrada.
   *
   * Todavía podría existir otra regla con la misma prioridad.
   * Ese caso lo reviso en resolveRuleGroup().
   */
  return winner;
}

// ======================================================
// 7. RESOLVER CONFLICTOS ENTRE REGLAS DEL MISMO TARGET
// ======================================================

/*
 * Resuelvo un grupo de reglas que intenta modificar
 * exactamente el mismo target.
 *
 * Ejemplo:
 *
 * Blue Express -> courier
 * FedEx        -> courier
 *
 * Aquí determino si existe un ganador válido
 * o si las reglas producen un conflicto.
 */
function resolveRuleGroup(rules) {
  /*
   * Busco una de las reglas que tenga la prioridad más alta.
   *
   * Todavía no puedo considerarla ganadora definitiva,
   * porque podría existir otra regla con la misma prioridad.
   */
  const winner = getHighestPriorityRule(rules);

  /*
   * Busco TODAS las reglas que tengan la misma prioridad
   * que el posible ganador.
   *
   * Ejemplo:
   *
   * Blue Express -> prioridad 100
   * FedEx        -> prioridad 100
   * Chilexpress  -> prioridad 50
   *
   * Me quedaría solamente con:
   *
   * [Blue Express, FedEx]
   */
  const samePriorityRules = rules.filter((rule) => {
    return rule.priority === winner.priority;
  });

  /*
   * Si solamente encuentro una regla con la prioridad máxima,
   * no existe empate y puedo considerarla ganadora.
   */
  if (samePriorityRules.length === 1) {
    return {
      status: "RESOLVED",
      winner: winner,
    };
  }

  /*
   * Si llego hasta aquí significa que encontré
   * dos o más reglas empatadas en la prioridad máxima.
   *
   * Ahora reviso si alguna intenta aplicar un valor
   * diferente al del posible ganador.
   *
   * Ejemplo:
   *
   * Blue Express -> BLUE_EXPRESS
   * FedEx        -> FEDEX
   *
   * Como los valores son diferentes,
   * considero que existe un conflicto.
   */
  const hasConflict = samePriorityRules.some((rule) => {
  return (
    rule.action.type !== winner.action.type ||
    rule.action.value !== winner.action.value
  );
});

  /*
   * Si encuentro valores diferentes entre las reglas
   * empatadas, devuelvo un conflicto.
   *
   * No selecciono ninguna como ganadora porque hacerlo
   * sería una decisión arbitraria.
   */
  if (hasConflict) {
    return {
      status: "CONFLICT",
      winner: null,
      conflictingRules: samePriorityRules,
    };
  }

  /*
   * Si existen varias reglas con la misma prioridad,
   * pero todas quieren aplicar exactamente el mismo valor,
   * no considero que exista un conflicto.
   *
   * Ejemplo:
   *
   * Regla A -> prioridad 100 -> BLUE_EXPRESS
   * Regla B -> prioridad 100 -> BLUE_EXPRESS
   *
   * El resultado será BLUE_EXPRESS independientemente
   * de cuál de las dos utilice.
   */
  return {
    status: "RESOLVED",
    winner: winner,
  };
}

// ======================================================
// 8. APLICAR UNA ACCIÓN
// ======================================================

/*
 * Aplico la acción de una regla ganadora
 * sobre el resultado del pedido.
 */
function applyAction(result, action) {
  /*
   * Si la acción asigna un courier,
   * reemplazo el courier actual.
   */
  if (action.type === "SET_COURIER") {
    result.courier = action.value;
    return;
  }

  /*
   * Si la acción modifica el precio de envío,
   * reemplazo el precio actual.
   */
  if (action.type === "SET_SHIPPING_PRICE") {
    result.shippingPrice = action.value;
    return;
  }

  /*
   * Si la acción habilita un tipo de entrega,
   * primero compruebo que no exista para evitar duplicados.
   */
  if (action.type === "ENABLE_DELIVERY_TYPE") {
    if (!result.availableDeliveryTypes.includes(action.value)) {
      result.availableDeliveryTypes.push(action.value);
    }

    return;
  }

  /*
   * Si la acción bloquea un tipo de entrega,
   * lo elimino de la lista de tipos disponibles.
   */
  if (action.type === "DISABLE_DELIVERY_TYPE") {
    result.availableDeliveryTypes =
      result.availableDeliveryTypes.filter((deliveryType) => {
        return deliveryType !== action.value;
      });

    return;
  }
}

// ======================================================
// 9. EVALUAR PEDIDO COMPLETO
// ======================================================

/*
 * Esta es la función principal del Rule Engine.
 *
 * Aquí coordino todas las funciones anteriores para
 * transformar:
 *
 * PEDIDO + REGLAS + CONFIGURACIÓN BASE
 *
 * en:
 *
 * RESULTADO + TRAZABILIDAD
 */
function evaluateOrder(order, rules, baseConfig) {
  /*
   * 1. Creo una copia de la configuración base.
   *
   * No modifico directamente baseConfig.
   *
   * result será el resultado que iré modificando
   * a medida que aplique reglas ganadoras.
   */
  const result = { ...baseConfig };

  /*
   * 2. Creo los arrays necesarios para construir
   * la trazabilidad de la decisión.
   */

  /*
   * Guardo las reglas que finalmente fueron aplicadas.
   */
  const appliedRules = [];

  /*
   * Guardo las reglas que coincidieron con el pedido
   * pero finalmente no fueron necesarias o perdieron
   * contra otra regla.
   */
  const rejectedRules = [];

  /*
   * Guardo los conflictos encontrados.
   *
   * Esto me permitirá explicar posteriormente
   * qué reglas entraron en conflicto y sobre qué target.
   */
  const conflicts = [];

  /*
   * 3. Busco todas las reglas activas cuyas condiciones
   * se cumplen para este pedido.
   */
  const matchedRules = getMatchingRules(rules, order);

  /*
   * 4. Agrupo las reglas coincidentes según
   * lo que intentan modificar.
   *
   * Ejemplo:
   *
   * {
   *   courier: [rule1, rule2],
   *   shippingPrice: [rule3]
   * }
   */
  const groups = groupRulesByTarget(matchedRules);

  /*
   * 5. Recorro cada grupo.
   *
   * Cada grupo representa un target diferente.
   *
   * Por ejemplo:
   *
   * courier
   * shippingPrice
   */
  for (const target in groups) {
    /*
     * Obtengo todas las reglas que intentan
     * modificar este target.
     */
    const targetRules = groups[target];

    /*
     * Intento resolver las reglas de este grupo.
     *
     * Puedo obtener:
     *
     * RESOLVED
     *     → existe una regla ganadora válida.
     *
     * CONFLICT
     *     → existen reglas con la misma prioridad
     *       que quieren aplicar valores diferentes.
     */
    const resolution = resolveRuleGroup(targetRules);

    /*
     * Si encuentro un conflicto, guardo toda
     * la información necesaria para explicarlo.
     */
    if (resolution.status === "CONFLICT") {
      conflicts.push({
        target: target,
        rules: resolution.conflictingRules,
        reason: `No se aplicó ninguna regla sobre "${target}" porque existen reglas con la misma prioridad que intentan aplicar acciones incompatibles`,
      });

      /*
       * No aplico ninguna acción para este target.
       *
       * Como result comenzó siendo una copia de baseConfig,
       * este target conservará su valor base.
       *
       * Ejemplo:
       *
       * baseConfig.courier = "CHILEXPRESS"
       *
       * Blue Express 100
       * VS
       * FedEx 100
       *
       * → CONFLICT
       *
       * No aplico ninguna de las dos.
       *
       * result.courier continúa siendo "CHILEXPRESS".
       */

      /*
       * Paso directamente al siguiente grupo.
       *
       * Todo el código que está debajo de este continue
       * se omite durante esta vuelta del for.
       */
      continue;
    }

    /*
     * Si llego hasta aquí significa que NO hubo conflicto.
     *
     * Por lo tanto puedo obtener la regla ganadora
     * desde la resolución.
     */
    const winner = resolution.winner;

    /*
     * Aplico la acción de la regla ganadora
     * sobre el resultado.
     */
    applyAction(result, winner.action);

    /*
     * Ahora reviso las demás reglas del mismo grupo.
     *
     * Quiero guardar por qué coincidieron con el pedido
     * pero finalmente no fueron aplicadas.
     */
    for (const rule of targetRules) {
      /*
       * No proceso nuevamente la regla ganadora.
       */
      if (rule !== winner) {
        let reason;

        /*
         * CASO 1:
         *
         * La regla tiene una prioridad menor
         * que la regla ganadora.
         *
         * Ejemplo:
         *
         * Blue Express -> 100
         * FedEx        -> 50
         *
         * FedEx pierde por prioridad.
         */
        if (rule.priority < winner.priority) {
          reason = `Perdió contra "${winner.name}" por tener menor prioridad`;
        } else {
          /*
           * CASO 2:
           *
           * La regla tiene la misma prioridad,
           * pero también produce exactamente el mismo resultado.
           *
           * Ejemplo:
           *
           * Regla A -> 100 -> BLUE_EXPRESS
           * Regla B -> 100 -> BLUE_EXPRESS
           *
           * No existe conflicto.
           *
           * Una de las reglas se utiliza como winner
           * y la otra queda registrada como no necesaria.
           */
          reason = `No fue necesaria porque produce el mismo resultado que "${winner.name}"`;
        }

        /*
         * Guardo la regla junto con la explicación
         * de por qué no fue aplicada.
         */
        rejectedRules.push({
          rule: rule,
          reason: reason,
        });
      }
    }

    /*
     * Finalmente guardo la regla ganadora completa.
     *
     * Esto me permitirá explicar posteriormente
     * qué regla modificó el resultado.
     */
    appliedRules.push(winner);
  }

  /*
   * 6. Devuelvo el resultado final del pedido
   * junto con toda la trazabilidad de la decisión.
   *
   * Gracias a esto puedo saber:
   *
   * - Qué reglas coincidieron.
   * - Qué reglas se aplicaron.
   * - Qué reglas no se aplicaron.
   * - Por qué no se aplicaron.
   * - Qué conflictos ocurrieron.
   */
  return {
    status: conflicts.length > 0 ? "CONFLICT" : "RESOLVED",

    result: result,

    trace: {
      matchedRules: matchedRules,
      appliedRules: appliedRules,
      rejectedRules: rejectedRules,
      conflicts: conflicts,
    },
  };
}
/*
  Exporto evaluateOrder para poder utilizar el motor
  desde otros archivos, como server.js.
*/
module.exports = {
  evaluateOrder,
};