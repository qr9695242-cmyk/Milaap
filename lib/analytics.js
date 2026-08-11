// Analytics Dashboard — admin-only snapshot of app-wide numbers.
// Uses getCountFromServer for counts (billed as 1 read regardless of
// collection size) and a small getDocs for revenue, which does need to
// scan approved recharge requests — fine at MVP scale, but worth moving
// to a scheduled Cloud Function that maintains a running total once the
// recharge history gets large.
import {
  collection,
  query,
  where,
  getCountFromServer,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

export async function getAnalyticsSnapshot() {
  const usersCol = collection(db, "users");
  const roomsCol = collection(db, "rooms");
  const rechargesCol = collection(db, "rechargeRequests");
  const familiesCol = collection(db, "families");
  const reportsCol = collection(db, "reports");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalUsersSnap,
    newUsersTodaySnap,
    liveRoomsSnap,
    pendingRechargesSnap,
    approvedRechargesSnap,
    familiesSnap,
    pendingReportsSnap,
  ] = await Promise.all([
    getCountFromServer(usersCol),
    getCountFromServer(query(usersCol, where("createdAt", ">=", todayStart))),
    getCountFromServer(query(roomsCol, where("status", "==", "live"))),
    getCountFromServer(query(rechargesCol, where("status", "==", "pending"))),
    getDocs(query(rechargesCol, where("status", "==", "approved"))),
    getCountFromServer(familiesCol),
    getCountFromServer(query(reportsCol, where("status", "==", "pending"))),
  ]);

  const totalRevenueRs = approvedRechargesSnap.docs.reduce(
    (sum, d) => sum + (d.data().priceRs || 0),
    0
  );

  return {
    totalUsers: totalUsersSnap.data().count,
    newUsersToday: newUsersTodaySnap.data().count,
    liveRoomsNow: liveRoomsSnap.data().count,
    pendingRecharges: pendingRechargesSnap.data().count,
    totalRevenueRs,
    approvedRechargeCount: approvedRechargesSnap.size,
    totalFamilies: familiesSnap.data().count,
    pendingReports: pendingReportsSnap.data().count,
  };
}
