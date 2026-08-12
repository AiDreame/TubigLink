import {
  MAINTENANCE_INTERVAL_MS,
  runScheduledMaintenance,
} from "@/lib/maintenance";

// In-process scheduler for lazy state convergence (audit I3, owner-approved fix):
//   - 24h delivery auto-confirm fallback (delivery.ts)
//   - 24h dispute auto-escalation (disputes.ts)
// register() runs once when the Next.js server boots (next start / next dev).
// It is skipped during `next build` (NEXT_PHASE === "phase-production-build")
// so builds never start timers or touch the DB.

let maintenanceInFlight = false;

async function maintenanceTick() {
  if (maintenanceInFlight) return; // a slow run never overlaps the next tick
  maintenanceInFlight = true;
  try {
    const result = await runScheduledMaintenance();
    console.log(
      `[maintenance] tick: autoConfirmed=${result.autoConfirmed} escalated=${result.escalated} (next in ${MAINTENANCE_INTERVAL_MS / 60000}m)`
    );
  } catch (err) {
    // Never crash the server — log and carry on.
    console.error("[maintenance] tick failed:", err);
  } finally {
    maintenanceInFlight = false;
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  console.log(`[maintenance] scheduler started (${MAINTENANCE_INTERVAL_MS / 60000}m interval)`);
  setInterval(() => {
    void maintenanceTick();
  }, MAINTENANCE_INTERVAL_MS);
}
