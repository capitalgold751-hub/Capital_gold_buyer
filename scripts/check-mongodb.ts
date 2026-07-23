import dns from "node:dns";
import { getMongoDb } from "../db";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

try {
  const db = await getMongoDb();
  await db.command({ ping: 1 });

  console.log(`MongoDB connected: ${db.databaseName}`);
  process.exit(0);
} catch (error: any) {
  console.error("MongoDB connection failed");
  console.error("Name:", error?.name);
  console.error("Message:", error?.message);
  console.error("Code:", error?.code);
  console.error(error);
  process.exit(1);
}