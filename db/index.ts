
import dns from "node:dns";
import {
  MongoClient,
  type Document,
  type Filter,
  type Sort,
  type UpdateFilter,
} from "mongodb";

if (process.platform === "win32") {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
}

export { COLLECTIONS } from "./schema";

declare global {
  var __capitalMongoClient: MongoClient | undefined;
  var __capitalMongoPromise: Promise<MongoClient> | undefined;
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured. Add it to .env.local.`);
  return value;
}

async function getMongoClient() {
  if (globalThis.__capitalMongoClient) return globalThis.__capitalMongoClient;
  if (!globalThis.__capitalMongoPromise) {
    const client = new MongoClient(required("MONGODB_URI"), {
      maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE || 10),
      minPoolSize: 0,
      maxIdleTimeMS: 30_000,
      serverSelectionTimeoutMS: 8_000,
      connectTimeoutMS: 8_000,
    });
    globalThis.__capitalMongoPromise = client.connect().then((connected) => {
      globalThis.__capitalMongoClient = connected;
      return connected;
    }).catch((error) => {
      globalThis.__capitalMongoPromise = undefined;
      throw error;
    });
  }
  return globalThis.__capitalMongoPromise;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB?.trim() || "capital_gold");
}

export type DatabaseFilter = {
  field: string;
  op: "==" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "not-in" | "array-contains";
  value: unknown;
};

export type ListOptions = {
  filters?: DatabaseFilter[];
  orderBy?: { field: string; direction?: "asc" | "desc" };
  limit?: number;
};

function mongoFilter(filters: DatabaseFilter[] = []): Filter<Document> {
  const result: Record<string, unknown> = {};
  for (const filter of filters || []) {
    switch (filter.op) {
      case "==": result[filter.field] = filter.value; break;
      case "!=": result[filter.field] = { $ne: filter.value }; break;
      case ">": result[filter.field] = { $gt: filter.value }; break;
      case ">=": result[filter.field] = { $gte: filter.value }; break;
      case "<": result[filter.field] = { $lt: filter.value }; break;
      case "<=": result[filter.field] = { $lte: filter.value }; break;
      case "in": result[filter.field] = { $in: Array.isArray(filter.value) ? filter.value : [] }; break;
      case "not-in": result[filter.field] = { $nin: Array.isArray(filter.value) ? filter.value : [] }; break;
      case "array-contains": result[filter.field] = filter.value; break;
    }
  }
  return result;
}

function withoutMongoId<T>(row: Document | null): T | null {
  if (!row) return null;
  const { _id: _ignored, ...data } = row;
  return data as T;
}

export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  if (!id) return null;
  const db = await getMongoDb();
  return withoutMongoId<T>(await db.collection(collectionName).findOne({ id }));
}

export async function setDocument<T>(collectionName: string, id: string, data: T, merge = false) {
  const db = await getMongoDb();
  const payload = { ...(data as Record<string, unknown>), id };
  if (merge) {
    await db.collection(collectionName).updateOne({ id }, { $set: payload as Document }, { upsert: true });
  } else {
    await db.collection(collectionName).replaceOne({ id }, payload as Document, { upsert: true });
  }
  return payload as T;
}

export async function updateDocument(collectionName: string, id: string, data: Document) {
  const db = await getMongoDb();
  const result = await db.collection(collectionName).updateOne({ id }, { $set: data });
  if (!result.matchedCount) throw new Error(`${collectionName} document '${id}' was not found.`);
}

export async function listDocuments<T>(collectionName: string, options: ListOptions = {}): Promise<T[]> {
  const db = await getMongoDb();
  let cursor = db.collection(collectionName).find(mongoFilter(options.filters));
  if (options.orderBy) {
    const sort: Sort = { [options.orderBy.field]: options.orderBy.direction === "desc" ? -1 : 1 };
    cursor = cursor.sort(sort);
  }
  if (options.limit) cursor = cursor.limit(Math.min(options.limit, 500));
  const rows = await cursor.toArray();
  return rows.map((row) => withoutMongoId<T>(row) as T);
}

export async function findFirst<T>(collectionName: string, options: ListOptions = {}): Promise<T | null> {
  const rows = await listDocuments<T>(collectionName, { ...options, limit: 1 });
  return rows[0] || null;
}

export async function countDocuments(collectionName: string, options: Omit<ListOptions, "orderBy" | "limit"> = {}) {
  const db = await getMongoDb();
  return db.collection(collectionName).countDocuments(mongoFilter(options.filters));
}

export async function updateDocuments(collectionName: string, options: Omit<ListOptions, "orderBy" | "limit">, data: Document) {
  const db = await getMongoDb();
  const result = await db.collection(collectionName).updateMany(mongoFilter(options.filters), { $set: data } as UpdateFilter<Document>);
  return result.modifiedCount;
}

// Kept for compatibility with the existing health route.
export async function pingFirestore() {
  const db = await getMongoDb();
  await db.command({ ping: 1 });
  return { database: db.databaseName, provider: "mongodb", connected: true };
}
