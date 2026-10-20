// backend/src/routes/integrations.js
// Status ng mga koneksyon (HR3 training sync). Para sa Settings > Integrations.
import { Router } from "express";
import { q } from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ROLE_GROUPS } from "../utils/roles.js";
import { safeError } from "../utils/errorResponse.js";
import { trainingTableReady, getTrainingSyncStatus } from "../services/hr3Training.js";

const router = Router();
router.use(requireAuth);

// GET /api/integrations/status
router.get("/status", requireRole(...ROLE_GROUPS.ADMIN_AND_HR), async (req, res) => {
  try {
    const tableReady = await trainingTableReady();

    let sessions = { total: 0, upcoming: 0, last_synced_at: null };
    if (tableReady) {
      const rows = await q(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE date >= CURRENT_DATE) AS upcoming,
           MAX(synced_at) AS last_synced_at
         FROM hr3_training_sessions`
      );
      sessions = {
        total: Number(rows[0]?.total ?? 0),
        upcoming: Number(rows[0]?.upcoming ?? 0),
        last_synced_at: rows[0]?.last_synced_at ?? null,
      };
    }

    return res.json({
      hr3_training: {
        configured: Boolean(process.env.HR3_OUTBOUND_API_KEY),
        table_ready: tableReady,
        sessions,
        ...getTrainingSyncStatus(),
      },
      hr3_inbound: {
        // Ang HR3 ang tumatawag sa /api/hr3/* gamit ang HR3_API_KEY
        configured: Boolean(process.env.HR3_API_KEY),
      },
    });
  } catch (err) {
    return safeError(res, err, "Failed to fetch integration status.");
  }
});

export default router;