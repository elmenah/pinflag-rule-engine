const pool = require("./db/database");

async function testDatabase() {
  try {
    const result = await pool.query(
      "SELECT name, priority, enabled FROM rules"
    );

    console.log("Conexión exitosa");
    console.log(result.rows);
  } catch (error) {
    console.error("Error conectando a PostgreSQL:");
    console.error(error);
  } finally {
    await pool.end();
  }
}

testDatabase();