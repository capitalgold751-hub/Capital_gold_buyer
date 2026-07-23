import { COLLECTIONS, countDocuments, pingFirestore } from "../db";
import { ensureBaseData } from "../db/bootstrap";

async function main() {
  const result = await pingFirestore();
  await ensureBaseData();
  const [users, rates, branches, leads, appointments] = await Promise.all([
    countDocuments(COLLECTIONS.users),
    countDocuments(COLLECTIONS.goldRates),
    countDocuments(COLLECTIONS.branches),
    countDocuments(COLLECTIONS.leads),
    countDocuments(COLLECTIONS.appointments),
  ]);
  console.log(JSON.stringify({ ...result, provider: "Cloud Firestore", collections: { users, rates, branches, leads, appointments } }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
