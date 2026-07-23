import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { MongoClient } from "mongodb";
import { COLLECTIONS } from "../db/schema";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

const projectId = required("FIREBASE_PROJECT_ID");
const firebase = initializeApp({ credential: cert({
  projectId,
  clientEmail: required("FIREBASE_CLIENT_EMAIL"),
  privateKey: required("FIREBASE_PRIVATE_KEY").replace(/^['"]|['"]$/g, "").replace(/\\n/g, "\n"),
})}, "migration-app");
const firestore = getFirestore(firebase, process.env.FIRESTORE_DATABASE_ID?.trim() || "(default)");
const mongo = new MongoClient(required("MONGODB_URI"));
await mongo.connect();
const db = mongo.db(process.env.MONGODB_DB?.trim() || "capital_gold");

for (const collectionName of Object.values(COLLECTIONS)) {
  try {
    const snapshot = await firestore.collection(collectionName).get();
    if (snapshot.empty) { console.log(`${collectionName}: no Firestore rows`); continue; }
    const operations = snapshot.docs.map((doc) => {
      const data = doc.data();
      const id = typeof data.id === "string" && data.id ? data.id : doc.id;
      return { replaceOne: { filter: { id }, replacement: { ...data, id }, upsert: true } };
    });
    await db.collection(collectionName).bulkWrite(operations, { ordered: false });
    console.log(`${collectionName}: migrated ${operations.length}`);
  } catch (error) {
    console.error(`${collectionName}: skipped/failed`, error);
  }
}
await mongo.close();
console.log("Migration completed. Run npm run mongo:setup next.");
