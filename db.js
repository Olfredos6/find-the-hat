let mysql = require("mysql2")

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}

const QUERY_CREATE_TABLE_PROFILES = `CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
  name VARCHAR(100) NOT NULL
)`;

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
  is_win BOOLEAN,
  profile INT,
  FOREIGN KEY(profile) REFERENCES profiles(id)
)`;

const QUERY_LEADERBOARD = `SELECT 
SUM(s.score) AS score, p.name 
FROM profiles AS p
JOIN scores AS s ON s.profile = p.id
WHERE is_win = true
GROUP BY p.name
ORDER BY score DESC`;

function logErrorMessage(err){
  console.log(err.errno?.toString, err.message)
}

module.exports = new (function () {

  return {
    connection: mysql.createConnection(DB_CONFIG),
    createScoresTableIfNotExists: function(){
      return this.connection.promise().query(QUERY_CREATE_TABLE_SCORE)
      .catch(e => { logErrorMessage(e) })
    },
    createProfilesTableIfNotExists: function(){
      return this.connection.promise().query(QUERY_CREATE_TABLE_PROFILES)
      .catch(e => { logErrorMessage(e) })
    },
    DBSetup: function(){
      this.createProfilesTableIfNotExists()
      .then(_ => {
        this.createScoresTableIfNotExists();
      })
      .catch(e => { logErrorMessage(e) })
    },
    getAllProfiles: function(){
      return this.connection.promise().query("SELECT id, name FROM profiles")
      .then( results => results[0])
      .catch(e => { logErrorMessage(e) })
    },
    insertScore: function(profile_id, field_size, hole_count, steps, is_win){
      return this.connection.promise()
      .query(
        `INSERT INTO scores (profile, field_size, hole_count, steps, is_win) VALUES (?, ?, ?, ?, ?)`, 
        [profile_id, field_size, hole_count, steps, is_win]
      )
      .then((results) => {
        return results;
      })
      .catch(e => { logErrorMessage(e) })
    },
    insertProfile: function(name){
      return this.connection.promise()
      .query(`INSERT INTO profiles (name) VALUES (?)`, [name])
      .then(result => result)
      .catch(e => { logErrorMessage(e) })
    },
    getLeaderBoard(){
      return this.connection.promise().query(QUERY_LEADERBOARD)
    }
  }
})();