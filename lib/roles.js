// Super Admin Roles & Permissions.
//
// ADMIN_EMAILS (lib/config.js) stays as the seed "superadmin" list — the
// people who can never be locked out, hardcoded at deploy time. On top of
// that, any user doc can now carry a `role` field ("moderator" | "admin")
// that a superadmin grants from the Admin Panel. This is additive: nothing
// that already checked ADMIN_EMAILS breaks, it just gains two more tiers.
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { ADMIN_EMAILS } from "./config";

export const ROLES = {
  USER: "user",
  MODERATOR: "moderator", // can review reports, no financial access
  ADMIN: "admin", // can approve recharges, force-end rooms, see analytics
  SUPERADMIN: "superadmin", // can also grant/revoke moderator & admin roles
};

const RANK = { user: 0, moderator: 1, admin: 2, superadmin: 3 };

/** The role that actually applies, combining the hardcoded seed list + Firestore role field. */
export function effectiveRole(firebaseUser, profile) {
  if (firebaseUser?.email && ADMIN_EMAILS.includes(firebaseUser.email)) {
    return ROLES.SUPERADMIN;
  }
  return profile?.role || ROLES.USER;
}

export function hasAtLeastRole(role, minRole) {
  return (RANK[role] ?? 0) >= (RANK[minRole] ?? 0);
}

/** Superadmin-only: change another user's role. Firestore rules double-check this server-side. */
export async function setUserRole(targetUid, role) {
  if (!Object.values(ROLES).includes(role) || role === ROLES.SUPERADMIN) {
    throw new Error("Invalid role");
  }
  await updateDoc(doc(db, "users", targetUid), { role });
}
