"use client";

export default function RoomRequests({ requests, onAccept, onReject }) {
  if (!requests?.length) return null;
  return (
    <div className="fixed left-3 right-3 top-16 z-40 space-y-2">
      {requests.map((r) => (
        <div key={r.id} className="rounded-2xl bg-panel/95 p-3 shadow-2xl ring-1 ring-white/10 backdrop-blur">
          <p className="text-sm font-semibold text-ink">{r.fromName || "User"} wants Seat {Number(r.seatIndex) + 1}</p>
          <p className="mt-1 text-[11px] text-mist">Accept the request to let this user take the seat.</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => onAccept(r)} className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-white">Accept</button>
            <button onClick={() => onReject(r)} className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-ink">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
