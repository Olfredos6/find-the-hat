let mysql = require("mysql2")

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}


const QUERY_CREATE_TABLE_SCORE = `CREATE TABLE IF NOT EXISTS scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
  field_size INT,
  hole_count INT,
  steps INT,
  score DECIMAL(10, 2) GENERATED ALWAYS AS (
      CASE
          WHEN steps > 0 THEN ROUND((field_size - hole_count) / steps)
          ELSE 0
      END
  ),
  is_win BOOLEAN
)`


module.exports = new (function () {

  return {
    connection: mysql.createConnection(DB_CONFIG),
    createScoresTable: function(){
      return this.connection.promise().query(QUERY_CREATE_TABLE_SCORE)
      .catch(e => {console.log(e)})
    }
  }
})();