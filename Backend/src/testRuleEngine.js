const { evaluateOrder } = require("./engine/ruleEngine");

const order = {
  amount: 60000,
  weight: 2,
  commune: "Quintero",
  deliveryType: "HOME_DELIVERY",
};

// Configuración inicial de la marca
const baseConfig = {
  courier: "CHILEXPRESS",
  shippingPrice: 3990,
  availableDeliveryTypes: [
    "HOME_DELIVERY",
    "STORE_PICKUP",
    "PICKUP_POINT",
  ],
};

// Regla 1
const rule1 = {
  name: "Pedidos sobre $50.000 usan Blue Express",

  conditions: [
    {
      field: "amount",
      operator: ">",
      value: 50000,
    },
  ],

  action: {
    type: "SET_COURIER",
    value: "BLUE_EXPRESS",
  },

  priority: 100,
  enabled: true,
};

// Regla 2
const rule2 = {
  name: "Pedidos bajo 20kg usan FedEx",

  conditions: [
    {
      field: "weight",
      operator: "<",
      value: 20,
    },
  ],

  action: {
    type: "SET_COURIER",
    value: "FEDEX",
  },

  priority: 50,
  enabled: true,
};

// Regla 3
const rule3 = {
  name: "Pedidos sobre $80.000 tienen envío gratis",

  conditions: [
    {
      field: "amount",
      operator: ">",
      value: 80000,
    },
  ],

  action: {
    type: "SET_SHIPPING_PRICE",
    value: 0,
  },

  priority: 80,
  enabled: true,
};

// Regla 4
const rule4 = {
  name: "Bloquear punto de retiro sobre 15kg",

  conditions: [
    {
      field: "weight",
      operator: ">",
      value: 15,
    },
  ],

  action: {
    type: "DISABLE_DELIVERY_TYPE",
    value: "PICKUP_POINT",
  },

  priority: 70,
  enabled: true,
};


// Todas las reglas disponibles
const rules = [rule1, rule2, rule3, rule4];

// ======================================================
// PRUEBA DEL RULE ENGINE
// ======================================================
//Devuelve el resultado de evaluar la orden.
const decision = evaluateOrder(order, rules, baseConfig);


console.log(
  "Reglas coincidentes:",
  decision.trace.matchedRules.map((rule) => rule.name),
);

console.log(
  "Reglas aplicadas:",
  decision.trace.appliedRules.map((rule) => rule.name),
);

console.log(
  "Reglas rechazadas:",
  decision.trace.rejectedRules.map((rejected) => rejected.rule.name),
);

console.log(
  "Motivo de rechazo:",
  decision.trace.rejectedRules.map((rejected) => rejected.reason),
);
console.log(
  "Conflictos:",
  decision.trace.conflicts.map((conflict) => ({
    target: conflict.target,
    rules: conflict.rules.map((rule) => rule.name),
    reason: conflict.reason,
  })),
);
console.log("Resultado:", decision.result);