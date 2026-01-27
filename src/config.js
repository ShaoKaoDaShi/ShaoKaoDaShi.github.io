import dotenv from "dotenv";
dotenv.config();

export const config = {
  MRS_BASE_URL: process.env.MRS_BASE_URL ?? "https://zhongkui.bytedance.net",
  MRS_APP_ID: process.env.MRS_APP_ID ?? "112801",
  MRS_TOKEN: process.env.MRS_TOKEN,           // 对应 Authorization Bearer
  MRS_JWT: process.env.MRS_JWT,               // 对应 x-jwt-token
  TT_ENV: process.env.TT_ENV,                 // 可选：x-tt-env
  USE_PPE: process.env.USE_PPE,               // 可选：x-use-ppe
  CLIENT_LOCALE: process.env.CLIENT_LOCALE ?? "zh",
  OUTPUT_PATH: process.env.OUTPUT_PATH ?? "./data.json",
};

export function buildHeaders(cfg = config) {
  return {
    accept: "application/json",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
    "content-type": "application/json",
    ...(cfg.MRS_TOKEN && { authorization: `Bearer ${cfg.MRS_TOKEN}` }),
    ...(cfg.MRS_JWT && { "x-jwt-token": cfg.MRS_JWT }),
    "x-bits-auth-appid": cfg.MRS_APP_ID,
    "x-client-locale": cfg.CLIENT_LOCALE,
    "x-onesite": "1",
    ...(cfg.TT_ENV && { "x-tt-env": cfg.TT_ENV }),
    ...(cfg.USE_PPE && { "x-use-ppe": cfg.USE_PPE }),
    "Referer": "http://localhost:3099/"
  };
}
