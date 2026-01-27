const sqlite3 = require('sqlite3').verbose();
const md5 = require('md5');

const DBSOURCE = "db.sqlite";

let db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
      console.error(err.message);
      throw err;
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email text UNIQUE, 
            password text, 
            token text
            )`,
        (err) => {
            if (err) {
                // Table already created
            } else {
                // Table just created, creating some rows
                // var insert = 'INSERT INTO user (email, password) VALUES (?,?)'
                // db.run(insert, ["admin@example.com", md5("admin123456")])
            }
        });  

        db.run(`CREATE TABLE rules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            rules_json TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES user(id)
        )`,
        (err) => {
            if (err) {
                // Table already created
            }
        });
    }
});

module.exports = db;
