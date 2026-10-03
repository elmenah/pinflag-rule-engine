function RuleList({ rules, loading, error }) {
  if (loading) {
    return <p>Cargando reglas...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  if (rules.length === 0) {
    return <p>No existen reglas configuradas.</p>;
  }

  return (
    <section>
      <div className="page-header">
        <h2>Reglas configuradas</h2>
        <p>Reglas activas de la marca ordenadas por prioridad.</p>
      </div>

      <div className="rules-list">
        {rules.map((rule) => (
          <article className="rule-card" key={rule.id}>
            <div className="rule-header">
              <h3>{rule.name}</h3>

              <span
                className={`status-badge ${
                  rule.enabled ? "status-active" : "status-disabled"
                }`}
              >
                {rule.enabled ? "Activa" : "Desactivada"}
              </span>
            </div>

            <div className="rule-body">
              <div className="rule-block">
                <strong>SI</strong>

                {rule.conditions.map((condition, index) => (
                  <p key={index}>
                    {condition.field} {condition.operator}{" "}
                    {String(condition.value)}
                  </p>
                ))}
              </div>

              <div className="rule-block">
                <strong>ENTONCES</strong>

                <p>
                  {rule.action.type} → {String(rule.action.value)}
                </p>
              </div>

              <div className="rule-block priority">
                <strong>PRIORIDAD</strong>
                <span className="priority-number">{rule.priority}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RuleList;
