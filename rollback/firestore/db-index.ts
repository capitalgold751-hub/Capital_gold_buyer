import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import {
  FieldValue,
  getFirestore,
  type DocumentData,
  type Firestore,
  type OrderByDirection,
  type Query,
  type WhereFilterOp,
} from "firebase-admin/firestore";

export { FieldValue };
export { COLLECTIONS } from "./schema";

declare global {
  var __capitalFirebaseApp: App | undefined;
  var __capitalFirestore: Firestore | undefined;
  var __capitalFirebaseAuth: Auth | undefined;
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured. Add the Firebase server credentials to .env.local.`);
  return value;
}

function firebaseProjectId() {
  return required("FIREBASE_PROJECT_ID");
}

export function getFirebaseAdminApp() {
  if (globalThis.__capitalFirebaseApp) return globalThis.__capitalFirebaseApp;
  const existing = getApps()[0];
  if (existing) {
    globalThis.__capitalFirebaseApp = existing;
    return existing;
  }
  const projectId = firebaseProjectId();
  const emulatorMode = Boolean(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST);
  const app = emulatorMode
    ? initializeApp({ projectId })
    : initializeApp({
      projectId,
      credential: cert({
        projectId,
        clientEmail: required("FIREBASE_CLIENT_EMAIL"),
        privateKey: required("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
      }),
    });
  globalThis.__capitalFirebaseApp = app;
  return app;
}

export function getFirebaseAuth() {
  globalThis.__capitalFirebaseAuth ??= getAuth(getFirebaseAdminApp());
  return globalThis.__capitalFirebaseAuth;
}

export function getFirestoreDb() {
  if (!globalThis.__capitalFirestore) {
    const databaseId = process.env.FIRESTORE_DATABASE_ID?.trim() || "(default)";
    const database = getFirestore(getFirebaseAdminApp(), databaseId);
    database.settings({ ignoreUndefinedProperties: true });
    globalThis.__capitalFirestore = database;
  }
  return globalThis.__capitalFirestore;
}

export type FirestoreFilter = {
  field: string;
  op: WhereFilterOp;
  value: unknown;
};

export type ListOptions = {
  filters?: FirestoreFilter[];
  orderBy?: { field: string; direction?: OrderByDirection };
  limit?: number;
};

function buildQuery(collectionName: string, options: ListOptions = {}) {
  let query: Query<DocumentData> = getFirestoreDb().collection(collectionName);
  for (const filter of options.filters || []) query = query.where(filter.field, filter.op, filter.value);
  if (options.orderBy) query = query.orderBy(options.orderBy.field, options.orderBy.direction || "asc");
  if (options.limit) query = query.limit(options.limit);
  return query;
}

export async function getDocument<T>(collectionName: string, id: string): Promise<T | null> {
  if (!id) return null;
  const snapshot = await getFirestoreDb().collection(collectionName).doc(id).get();
  return snapshot.exists ? snapshot.data() as T : null;
}

export async function setDocument<T extends DocumentData>(collectionName: string, id: string, data: T, merge = false) {
  await getFirestoreDb().collection(collectionName).doc(id).set(data, { merge });
  return data;
}

export async function updateDocument(collectionName: string, id: string, data: DocumentData) {
  await getFirestoreDb().collection(collectionName).doc(id).update(data);
}

export async function listDocuments<T>(collectionName: string, options: ListOptions = {}): Promise<T[]> {
  const snapshot = await buildQuery(collectionName, options).get();
  return snapshot.docs.map((document) => document.data() as T);
}

export async function findFirst<T>(collectionName: string, options: ListOptions = {}): Promise<T | null> {
  const rows = await listDocuments<T>(collectionName, { ...options, limit: 1 });
  return rows[0] || null;
}

export async function countDocuments(collectionName: string, options: Omit<ListOptions, "orderBy" | "limit"> = {}) {
  const snapshot = await buildQuery(collectionName, options).count().get();
  return snapshot.data().count;
}

export async function updateDocuments(collectionName: string, options: Omit<ListOptions, "orderBy" | "limit">, data: DocumentData) {
  const snapshot = await buildQuery(collectionName, options).get();
  if (snapshot.empty) return 0;
  const database = getFirestoreDb();
  const chunks: typeof snapshot.docs[] = [];
  for (let index = 0; index < snapshot.docs.length; index += 400) chunks.push(snapshot.docs.slice(index, index + 400));
  for (const documents of chunks) {
    const batch = database.batch();
    for (const document of documents) batch.update(document.ref, data);
    await batch.commit();
  }
  return snapshot.size;
}

export async function pingFirestore() {
  await getFirestoreDb().collection("_system").doc("health").get();
  return { database: process.env.FIRESTORE_DATABASE_ID?.trim() || "(default)", connected: true };
}
