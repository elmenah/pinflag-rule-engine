function DecisionResult({ decision }) {
  if (!decision) {
    return null;
  }

  const { result, trace } = decision;

  return (
    <section className="decision">
      <div className="decision-header">
        <h2>Resultado de la simulación</h2>

        <span className="decision-badge">
          {trace.matchedRules.length === 0
            ? "SIN REGLAS COINCIDENTES"
            : decision.status}
        </span>
      </div>

      <div className="result-grid">
        <div className="result-card">
          <span>Courier asignado</span>
          <strong>{result.courier}</strong>
        </div>

        <div className="result-card">
          <span>Precio del envío</span>
          <strong>${result.shippingPrice.toLocaleString("es-CL")}</strong>
        </div>

        <div className="result-card">
          <span>Tipos de entrega disponibles</span>

          <ul className="delivery-types">
            {result.availableDeliveryTypes.map((deliveryType) => (
              <li key={deliveryType}>{deliveryType}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="trace-card">
        <h3>¿Por qué se tomó esta decisión?</h3>

        {trace.matchedRules.length === 0 ? (
          <div className="trace-section">
            <strong>Ninguna regla coincidió</strong>
            <p>
              El pedido no coincidió con ninguna regla. Se utilizó la
              configuración base de la marca.
            </p>
          </div>
        ) : (
          <div className="trace-section">
            <strong>Reglas que coincidieron</strong>

            {trace.matchedRules.map((rule) => (
              <div className="trace-rule" key={rule.id}>
                <strong>{rule.name}</strong>
                <p>Prioridad {rule.priority}</p>
              </div>
            ))}
          </div>
        )}

        {trace.appliedRules.length > 0 && (
          <div className="trace-section">
            <strong>Reglas aplicadas</strong>

            {trace.appliedRules.map((rule) => (
              <div className="trace-rule" key={rule.id}>
                <strong>✓ {rule.name}</strong>
                <p>Aplicada con prioridad {rule.priority}</p>
              </div>
            ))}
          </div>
        )}

        {trace.rejectedRules.length > 0 && (
          <div className="trace-section">
            <strong>Reglas no aplicadas</strong>

            {trace.rejectedRules.map((item, index) => (
              <div className="trace-rule" key={`${item.rule.id}-${index}`}>
                <strong>{item.rule.name}</strong>
                <p>{item.reason}</p>
              </div>
            ))}
          </div>
        )}

        {trace.conflicts.length > 0 && (
          <div className="trace-section">
            <strong>Conflictos detectados</strong>

            {trace.conflicts.map((conflict, index) => (
              <div className="trace-rule" key={index}>
                <strong>{conflict.target}</strong>
                <p>{conflict.reason}</p>
              </div>
            ))}
          </div>
        )}

        <span className="decision-id">ID de decisión: {decision.id}</span>
      </div>
    </section>
  );
}

export default DecisionResult;
