import { fetchCardsFeed } from "./mrsClient.js";

fetchCardsFeed().catch(err => {
  console.error("Failed to fetch cards feed:", err);
  process.exit(1);
});
