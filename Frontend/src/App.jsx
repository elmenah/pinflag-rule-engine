import { useEffect, useState } from "react";
import RuleList from "./components/RuleList";
import "./App.css";
import SimulationForm from "./components/SimulationForm";
import CreateRuleForm from "./components/CreateRuleForm";

function App() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("rules");
  const brandId = rules.length > 0 ? rules[0].brand_id : null;
  /*
    Cargo las reglas existentes cuando se inicia
    la aplicación.
  */
  useEffect(() => {
    async function loadRules() {
      try {
        const response = await fetch("http://localhost:3000/rules");

        if (!response.ok) {
          throw new Error("No se pudieron obtener las reglas");
        }

        const data = await response.json();

        setRules(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadRules();
  }, []);

  function handleRuleCreated(newRule) {
    setRules((currentRules) =>
      [...currentRules, newRule].sort((a, b) => b.priority - a.priority),
    );
  }

  return (
  <div className="app">
    <header className="app-header">
      <div className="header-content">
        <h1>Pinflag Rule Engine</h1>
        <p>Motor de reglas de despacho</p>
      </div>

      <nav className="app-nav">
        <button
          type="button"
          className={activeView === "rules" ? "active" : ""}
          onClick={() => setActiveView("rules")}
        >
          Reglas
        </button>

        <button
          type="button"
          className={activeView === "create" ? "active" : ""}
          onClick={() => setActiveView("create")}
        >
          Crear regla
        </button>

        <button
          type="button"
          className={activeView === "simulation" ? "active" : ""}
          onClick={() => setActiveView("simulation")}
        >
          Simular pedido
        </button>
      </nav>
    </header>

    <main className="app-content">
      {activeView === "rules" && (
        <RuleList rules={rules} loading={loading} error={error} />
      )}

      {activeView === "create" && brandId && (
        <CreateRuleForm
          brandId={brandId}
          onRuleCreated={handleRuleCreated}
        />
      )}

      {activeView === "simulation" && <SimulationForm />}
    </main>
  </div>
);
}

export default App;
