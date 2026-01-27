import { config, buildHeaders } from "./config.js";
import fs from "fs/promises";

export async function fetchCardsFeed({ mode = "develop", tab = "all" } = {}) {
  const url = `${config.MRS_BASE_URL}/api/v1/mrs/7591269/cards_feed`;
  console.log(`Fetching from ${url}...`);
  
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(config),
    body: JSON.stringify({ mode, tab }),
  });
  
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  await fs.writeFile(config.OUTPUT_PATH, JSON.stringify(json, null, 2));
  console.log(`Data saved to ${config.OUTPUT_PATH}`);
  return json;
}
