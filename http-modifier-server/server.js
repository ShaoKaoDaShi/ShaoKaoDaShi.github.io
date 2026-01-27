const express = require("express");
const app = express();
const db = require("./database.js");
const md5 = require("md5");
const bodyParser = require("body-parser");
const cors = require("cors");

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const HTTP_PORT = 3000;

// Start server
app.listen(HTTP_PORT, () => {
  console.log("Server running on port %PORT%".replace("%PORT%", HTTP_PORT));
});

// Root endpoint
app.get("/", (req, res, next) => {
  res.json({ message: "Ok" });
});

// Login / Register Endpoint
app.post("/api/login", (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const sql = "SELECT * FROM user WHERE email = ?";
  db.get(sql, [email], (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }

    if (row) {
      // User exists, verify password
      if (row.password === md5(password)) {
        // Generate a simple token (for demo purposes, using md5 of email+timestamp)
        const token = md5(email + Date.now());
        db.run("UPDATE user SET token = ? WHERE id = ?", [token, row.id]);
        res.json({
          message: "Login successful",
          data: { id: row.id, email: row.email, token: token },
        });
      } else {
        res.status(401).json({ error: "Invalid password" });
      }
    } else {
      // User does not exist, register new user
      const hashedPassword = md5(password);
      const token = md5(email + Date.now());
      const insert = "INSERT INTO user (email, password, token) VALUES (?,?,?)";
      db.run(insert, [email, hashedPassword, token], function (err) {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.json({
          message: "Registered and logged in",
          data: { id: this.lastID, email: email, token: token },
        });
      });
    }
  });
});

// Middleware to authenticate token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    db.get("SELECT * FROM user WHERE token = ?", [token], (err, row) => {
      if (err || !row) {
        return res.sendStatus(403);
      }
      req.user = row;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// Push Rules (Sync Up)
app.post("/api/sync/push", authenticate, (req, res, next) => {
  const { rules } = req.body;
  if (!rules) {
    res.status(400).json({ error: "Rules data is required" });
    return;
  }

  const rulesJson = JSON.stringify(rules);
  const userId = req.user.id;

  // Check if user already has a rules entry
  db.get("SELECT id FROM rules WHERE user_id = ?", [userId], (err, row) => {
    if (row) {
      // Update existing
      db.run(
        "UPDATE rules SET rules_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
        [rulesJson, userId],
        function (err) {
          if (err) {
            res.status(400).json({ error: err.message });
            return;
          }
          res.json({ message: "Rules synced successfully" });
        }
      );
    } else {
      // Insert new
      db.run(
        "INSERT INTO rules (user_id, rules_json) VALUES (?,?)",
        [userId, rulesJson],
        function (err) {
          if (err) {
            res.status(400).json({ error: err.message });
            return;
          }
          res.json({ message: "Rules synced successfully" });
        }
      );
    }
  });
});

// Pull Rules (Sync Down)
app.get("/api/sync/pull", authenticate, (req, res, next) => {
  const userId = req.user.id;
  db.get("SELECT rules_json FROM rules WHERE user_id = ?", [userId], (err, row) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (row) {
      try {
        const rules = JSON.parse(row.rules_json);
        res.json({ data: { rules } });
      } catch (e) {
        res.status(500).json({ error: "Failed to parse stored rules" });
      }
    } else {
      res.json({ data: { rules: [] } }); // No rules stored yet
    }
  });
});
