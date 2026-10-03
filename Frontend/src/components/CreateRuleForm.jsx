import { useState } from "react";

function CreateRuleForm({ brandId, onRuleCreated }) {
  const [form, setForm] = useState({
    name: "",
    field: "amount",
    operator: ">",
    conditionValue: "",
    actionType: "SET_COURIER",
    actionValue: "",
    priority: 50,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    /*
      amount y weight necesitan valores numéricos.
      commune y deliveryType utilizan strings.
    */
    const conditionValue =
      form.field === "amount" || form.field === "weight"
        ? Number(form.conditionValue)
        : form.conditionValue;

    /*
      El precio de envío también debe enviarse
      como número al backend.
    */
    const actionValue =
      form.actionType === "SET_SHIPPING_PRICE"
        ? Number(form.actionValue)
        : form.actionValue;

    const newRule = {
      brand_id: brandId,
      name: form.name,
      conditions: [
        {
          field: form.field,
          operator: form.operator,
          value: conditionValue,
        },
      ],
      action: {
        type: form.actionType,
        value: actionValue,
      },
      priority: Number(form.priority),
      enabled: true,
    };

    try {
      const response = await fetch("http://localhost:3000/rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newRule),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo crear la regla");
      }

      setSuccess("Regla creada correctamente.");

      /*
        Informo a App que se creó una regla para que
        pueda actualizar la lista sin recargar la página.
      */
      onRuleCreated(data);

      setForm({
        name: "",
        field: "amount",
        operator: ">",
        conditionValue: "",
        actionType: "SET_COURIER",
        actionValue: "",
        priority: 50,
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="page-header">
        <h2>Crear nueva regla</h2>
        <p>Define cuándo debe ejecutarse una acción y qué prioridad tendrá.</p>
      </div>

      <div className="card form-card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-group full">
            <label>Nombre de la regla</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej: Blue Express sobre $50.000"
            />
          </div>

          <div className="form-section-title">SI</div>

          <div className="form-group">
            <label>Campo</label>
            <select name="field" value={form.field} onChange={handleChange}>
              <option value="amount">Monto</option>
              <option value="weight">Peso</option>
              <option value="commune">Comuna</option>
              <option value="deliveryType">Tipo de entrega</option>
            </select>
          </div>

          <div className="form-group">
            <label>Operador</label>
            <select
              name="operator"
              value={form.operator}
              onChange={handleChange}
            >
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value=">=">&gt;=</option>
              <option value="<=">&lt;=</option>
              <option value="==">==</option>
              <option value="!=">!=</option>
            </select>
          </div>

          <div className="form-group full">
            <label>Valor</label>
            <input
              name="conditionValue"
              value={form.conditionValue}
              onChange={handleChange}
            />
          </div>

          <div className="form-section-title">ENTONCES</div>

          <div className="form-group">
            <label>Acción</label>
            <select
              name="actionType"
              value={form.actionType}
              onChange={handleChange}
            >
              <option value="SET_COURIER">Asignar courier</option>
              <option value="SET_SHIPPING_PRICE">Cambiar precio</option>
              <option value="ENABLE_DELIVERY_TYPE">
                Habilitar tipo de entrega
              </option>
              <option value="DISABLE_DELIVERY_TYPE">
                Bloquear tipo de entrega
              </option>
            </select>
          </div>

          <div className="form-group">
            <label>Valor de la acción</label>
            <input
              name="actionValue"
              value={form.actionValue}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Prioridad</label>
            <input
              type="number"
              name="priority"
              value={form.priority}
              onChange={handleChange}
            />
          </div>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear regla"}
            </button>
          </div>
        </form>

        {error && <div className="alert alert-error">⚠ {error}</div>}

        {success && <div className="alert alert-success">✓ {success}</div>}
      </div>
    </section>
  );
}

export default CreateRuleForm;
