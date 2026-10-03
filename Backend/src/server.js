const express = require("express");
const pool = require("./db/database");
const { evaluateOrder } = require("./engine/ruleEngine");
const cors = require("cors");
const app = express();
const PORT = 3000;
/*
  Permito que el frontend de React pueda realizar
  peticiones HTTP a esta API.
*/
app.use(cors());
/*
  Permito que Express interprete los JSON que llegan
  en el body de las peticiones.
*/
app.use(express.json());

const VALID_FIELDS = ["amount", "weight", "commune", "deliveryType"];

const VALID_DELIVERY_TYPES = [
  "HOME_DELIVERY",
  "STORE_PICKUP",
  "PICKUP_POINT",
];

const VALID_OPERATORS = [">", "<", ">=", "<=", "==", "!="];

const VALID_ACTION_TYPES = [
  "SET_COURIER",
  "SET_SHIPPING_PRICE",
  "ENABLE_DELIVERY_TYPE",
  "DISABLE_DELIVERY_TYPE",
];

/*
  Ruta básica para comprobar que la API está funcionando.
*/
app.get("/", (req, res) => {
  res.json({
    message: "Pinflag API funcionando",
  });
});

/*
  Obtengo todas las reglas desde PostgreSQL
  ordenadas desde mayor a menor prioridad.
*/
app.get("/rules", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM rules ORDER BY priority DESC",
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error obteniendo reglas:", error);

    res.status(500).json({
      error: "Error obteniendo las reglas",
    });
  }
});

/*
  Creo una nueva regla y la guardo en PostgreSQL.
*/
app.post("/rules", async (req, res) => {
  try {
    /*
      Extraigo del body los datos enviados por el cliente.
    */
    const { brand_id, name, conditions, action, priority, enabled } = req.body;

    /*Valido que los campos principales de la regla existan
    antes de intentar guardarla en la base de datos.
    */
    if (
      !brand_id ||
      !name ||
      !Array.isArray(conditions) ||
      conditions.length === 0 ||
      !action ||
      typeof priority !== "number"
    ) {
      return res.status(400).json({
        error: "La regla contiene datos inválidos o incompletos",
      });
    }

    const hasInvalidCondition = conditions.some((condition) => {
      if (
        !VALID_FIELDS.includes(condition.field) ||
        !VALID_OPERATORS.includes(condition.operator) ||
        condition.value === undefined
      ) {
        return true;
      }

      if (
        (condition.field === "amount" || condition.field === "weight") &&
        typeof condition.value !== "number"
      ) {
        return true;
      }

      if (
        (condition.field === "commune" || condition.field === "deliveryType") &&
        typeof condition.value !== "string"
      ) {
        return true;
      }

      return false;
    });

    if (hasInvalidCondition) {
      return res.status(400).json({
        error: "La regla contiene una condición inválida",
      });
    }

    /*
  Valido que la acción sea soportada por el Rule Engine
  y que tenga un valor definido.
*/
    if (
      !action.type ||
      !VALID_ACTION_TYPES.includes(action.type) ||
      action.value === undefined
    ) {
      return res.status(400).json({
        error: "La regla contiene una acción inválida",
      });
    }

    /*
      Inserto la regla usando parámetros ($1, $2...)
      en lugar de concatenar los datos directamente en el SQL.
    */
    const result = await pool.query(
      `INSERT INTO rules (
        brand_id,
        name,
        conditions,
        action,
        priority,
        enabled
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        brand_id,
        name,
        JSON.stringify(conditions),
        JSON.stringify(action),
        priority,
        enabled,
      ],
    );

    /*
      rows[0] contiene la regla que PostgreSQL acaba de crear.
      201 significa que el recurso fue creado correctamente.
    */
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creando regla:", error);

    res.status(500).json({
      error: "Error creando la regla",
    });
  }
});

app.post("/simulations", async (req, res) => {
  try {
    const order = req.body;

    /*
  Valido que el pedido tenga los datos necesarios
  y que cada uno tenga el tipo esperado.
*/
    if (
      typeof order.amount !== "number" ||
      typeof order.weight !== "number" ||
      typeof order.commune !== "string" ||
      order.commune.trim() === "" ||
      typeof order.deliveryType !== "string"||
      !VALID_DELIVERY_TYPES.includes(order.deliveryType)
    ) {
      return res.status(400).json({
        error: "El pedido contiene datos inválidos o incompletos",
      });
    }

    /*
      Obtengo la marca demo junto con su configuración base.
    */
    const brandResult = await pool.query(
      "SELECT * FROM brands WHERE name = $1",
      ["Pinflag Demo"],
    );

    if (brandResult.rows.length === 0) {
      return res.status(404).json({
        error: "Marca no encontrada",
      });
    }

    const brand = brandResult.rows[0];

    /*
      Obtengo las reglas activas pertenecientes a esta marca.
    */
    const rulesResult = await pool.query(
      `SELECT *
       FROM rules
       WHERE brand_id = $1
       AND enabled = true`,
      [brand.id],
    );

    const rules = rulesResult.rows;

    /*
      Envío al Rule Engine:
      - pedido recibido
      - reglas almacenadas en PostgreSQL
      - configuración base de la marca
    */
    const decision = evaluateOrder(order, rules, brand.base_config);

    /*
  Guardo un snapshot de la decisión para poder
  reconstruir posteriormente qué ocurrió sin
  volver a ejecutar las reglas.
*/
    const savedDecision = await pool.query(
      `INSERT INTO decisions (
    brand_id,
    order_data,
    result,
    trace
  )
  VALUES ($1, $2, $3, $4)
  RETURNING *`,
      [
        brand.id,
        JSON.stringify(order),
        JSON.stringify(decision.result),
        JSON.stringify(decision.trace),
      ],
    );

    res.status(201).json({
      id: savedDecision.rows[0].id,
      status: decision.status,
      result: decision.result,
      trace: decision.trace,
      created_at: savedDecision.rows[0].created_at,
    });
  } catch (error) {
    console.error("Error simulando pedido:", error);

    res.status(500).json({
      error: "Error simulando el pedido",
    });
  }
});

/*
  Recupero una decisión histórica por su ID.
  No vuelvo a ejecutar el Rule Engine, sino que leo
  directamente el snapshot guardado en PostgreSQL.
*/
app.get("/decisions/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query("SELECT * FROM decisions WHERE id = $1", [
      id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Decisión no encontrada",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error obteniendo decisión:", error);

    res.status(500).json({
      error: "Error obteniendo la decisión",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
