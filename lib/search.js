// User search — Firestore doesn't do full-text search natively, so this
// uses a classic prefix-range trick on a lowercased name field:
// "displayNameLower" >= query AND < query + "\uf8ff" matches anything
// that *starts with* the typed text. Good enough for an MVP; if you need
// mid-string or fuzzy search later, that's an Algolia/Typesense job.
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

export async function searchUsers(rawText, max = 20) {
  const text = rawText.trim().toLowerCase();
  if (!text) return [];

  const q = query(
    collection(db, "users"),
    orderBy("displayNameLower"),
    where("displayNameLower", ">=", text),
    where("displayNameLower", "<=", text + "\uf8ff"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
