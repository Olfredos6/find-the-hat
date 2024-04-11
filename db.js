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
  score INT GENERATED ALWAYS AS (
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
    createScoresTableIfNotExists: function(){
      return this.connection.promise().query(QUERY_CREATE_TABLE_SCORE)
      .catch(e => {console.log(e)})
    },
    insertScore: function(field_size, hole_count, steps, is_win){
      return this.connection.promise()
      .query(
        `INSERT INTO scores (field_size, hole_count, steps, is_win) VALUES (?, ?, ?, ?)`, 
        [field_size, hole_count, steps, is_win]
      )
      .then((results) => {
        // console.log("Score saved!")
        return results;
      })
      .catch(e => {
        console.log(`Error: ${e}`)
      })
    }
  }
})();