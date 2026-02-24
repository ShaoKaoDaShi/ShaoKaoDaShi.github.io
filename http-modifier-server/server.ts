import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import db, { User, Rule } from "./database.js";

const app = express();
const HTTP_PORT = 3000;

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.listen(HTTP_PORT, () => {
  console.log(`Server running on port ${HTTP_PORT}`);
});

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Ok" });
});

import { createHash } from "crypto";

function md5(text: string): string {
  return createHash("md5").update(text).digest("hex");
}

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  message?: string;
  data?: {
    id: number;
    email: string;
    token: string;
  };
  error?: string;
}

app.post(
  "/api/login",
  (
    req: Request<object, LoginResponse, LoginRequest>,
    res: Response<LoginResponse>,
  ) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const row = db
      .query<User, [string]>("SELECT * FROM user WHERE email = ?")
      .get(email);

    if (row) {
      if (row.password === md5(password)) {
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
      const hashedPassword = md5(password);
      const token = md5(email + Date.now());
      const result = db.run(
        "INSERT INTO user (email, password, token) VALUES (?,?,?)",
        [email, hashedPassword, token],
      );
      res.json({
        message: "Registered and logged in",
        data: {
          id: Number(result.lastInsertRowid),
          email: email,
          token: token,
        },
      });
    }
  },
);

interface AuthenticatedRequest extends Request {
  user: User;
}

const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    const row = db
      .query<User, [string]>("SELECT * FROM user WHERE token = ?")
      .get(token);
    if (!row) {
      return res.sendStatus(403);
    }
    (req as AuthenticatedRequest).user = row;
    next();
  } else {
    res.sendStatus(401);
  }
};

interface SyncPushRequest {
  rules: unknown;
}

interface SyncPushResponse {
  message?: string;
  error?: string;
}

app.post(
  "/api/sync/push",
  authenticate,
  (req: Request, res: Response<SyncPushResponse>) => {
    const authReq = req as AuthenticatedRequest;
    const { rules } = req.body as SyncPushRequest;
    if (!rules) {
      res.status(400).json({ error: "Rules data is required" });
      return;
    }

    const rulesJson = JSON.stringify(rules);
    const userId = authReq.user.id;

    const existingRow = db
      .query<
        Pick<Rule, "id">,
        [number]
      >("SELECT id FROM rules WHERE user_id = ?")
      .get(userId);

    if (existingRow) {
      db.run(
        "UPDATE rules SET rules_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
        [rulesJson, userId],
      );
      res.json({ message: "Rules synced successfully" });
    } else {
      db.run("INSERT INTO rules (user_id, rules_json) VALUES (?,?)", [
        userId,
        rulesJson,
      ]);
      res.json({ message: "Rules synced successfully" });
    }
  },
);

interface SyncPullResponse {
  data?: {
    rules: unknown;
  };
  error?: string;
}

app.get(
  "/api/sync/pull",
  authenticate,
  (req: Request, res: Response<SyncPullResponse>) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const row = db
      .query<
        Pick<Rule, "rules_json">,
        [number]
      >("SELECT rules_json FROM rules WHERE user_id = ?")
      .get(userId);

    if (row) {
      try {
        const rules = JSON.parse(row.rules_json);
        res.json({ data: { rules } });
      } catch {
        res.status(500).json({ error: "Failed to parse stored rules" });
      }
    } else {
      res.json({ data: { rules: [] } });
    }
  },
);
