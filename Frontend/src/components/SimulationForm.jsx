import { useState } from "react";
import DecisionResult from "./DecisionResult";
function SimulationForm() {
  /*
    Mantengo en un solo objeto los datos del pedido
    que el usuario quiere simular.
  */
  const [order, setOrder] = useState({
    amount: 60000,
    weight: 2,
    commune: "Quintero",
    deliveryType: "HOME_DELIVERY",
  });

  const [decision, setDecision] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /*
    Actualizo solamente el campo del formulario
    que el usuario acaba de modificar.
  */
  function handleChange(event) {
    const { name, value } = event.target;

    setOrder((currentOrder) => ({
      ...currentOrder,
      [name]: value,
    }));
  }

  /*
    Envío el pedido al backend para que el Rule Engine
    determine courier, precio y tipos de entrega.
  */
  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setDecision(null);

    try {
      const orderToSend = {
        ...order,
        amount: Number(order.amount),
        weight: Number(order.weight),
      };

      const response = await fetch("http://localhost:3000/simulations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderToSend),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo simular el pedido");
      }

      setDecision(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="page-header">
        <h2>Simular pedido</h2>
        <p>
          Prueba un pedido para conocer el courier, precio y tipos de entrega
          resultantes.
        </p>
      </div>

      <div className="card form-card">
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="amount">Monto del pedido</label>
            <input
              id="amount"
              name="amount"
              type="number"
              value={order.amount}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="weight">Peso (kg)</label>
            <input
              id="weight"
              name="weight"
              type="number"
              value={order.weight}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="commune">Comuna</label>
            <input
              id="commune"
              name="commune"
              type="text"
              value={order.commune}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="deliveryType">Tipo de entrega</label>
            <select
              id="deliveryType"
              name="deliveryType"
              value={order.deliveryType}
              onChange={handleChange}
            >
              <option value="HOME_DELIVERY">Despacho a domicilio</option>
              <option value="STORE_PICKUP">Retiro en tienda</option>
              <option value="PICKUP_POINT">Punto de retiro</option>
            </select>
          </div>

          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Simulando..." : "Simular pedido"}
            </button>
          </div>
        </form>

        {error && <div className="alert alert-error">{error}</div>}
      </div>

      <DecisionResult decision={decision} />
    </section>
  );
}

export default SimulationForm;
