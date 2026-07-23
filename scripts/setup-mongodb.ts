import { COLLECTIONS, getMongoDb } from "../db";

const db = await getMongoDb();
const collections = Object.values(COLLECTIONS);
const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
for (const name of collections) if (!existing.has(name)) await db.createCollection(name);

await Promise.all([
  db.collection(COLLECTIONS.users).createIndex({ id: 1 }, { unique: true }),
  db.collection(COLLECTIONS.users).createIndex({ email: 1 }, { unique: true, sparse: true }),
  db.collection(COLLECTIONS.leads).createIndex({ id: 1 }, { unique: true }),
  db.collection(COLLECTIONS.leads).createIndex({ updatedAt: -1 }),
  db.collection(COLLECTIONS.leads).createIndex({ assignedTo: 1, updatedAt: -1 }),
  db.collection(COLLECTIONS.appointments).createIndex({ id: 1 }, { unique: true }),
  db.collection(COLLECTIONS.appointments).createIndex({ assignedTo: 1, createdAt: -1 }),
  db.collection(COLLECTIONS.goldRates).createIndex({ id: 1 }, { unique: true }),
  db.collection(COLLECTIONS.goldRates).createIndex({ karat: 1 }, { unique: true }),
  db.collection(COLLECTIONS.goldRateHistory).createIndex({ id: 1 }, { unique: true }),
  db.collection(COLLECTIONS.goldRateHistory).createIndex({ karat: 1, updatedAt: -1 }),
  db.collection(COLLECTIONS.goldRateSyncStatus).createIndex({ id: 1 }, { unique: true }),
  db.collection(COLLECTIONS.branches).createIndex({ id: 1 }, { unique: true }),
  db.collection(COLLECTIONS.blogPosts).createIndex({ id: 1 }, { unique: true }),
  db.collection(COLLECTIONS.blogPosts).createIndex({ slug: 1 }, { unique: true }),
  db.collection(COLLECTIONS.analyticsEvents).createIndex({ id: 1 }, { unique: true }),
  db.collection(COLLECTIONS.analyticsEvents).createIndex({ createdAt: -1 }),
  db.collection(COLLECTIONS.analyticsEvents).createIndex({ sessionId: 1, createdAt: -1 }),
  db.collection(COLLECTIONS.analyticsEvents).createIndex({ eventName: 1, createdAt: -1 }),
]);
console.log(`MongoDB collections and indexes are ready in '${db.databaseName}'.`);
process.exit(0);
