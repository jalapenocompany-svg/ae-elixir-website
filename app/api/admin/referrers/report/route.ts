import { hasAdminSession, sameAdminOrigin } from "@/lib/admin-session";
import { adsDatabase, adsReply } from "@/lib/ads-server";
import { REFERRALS_ENABLED } from "@/lib/referral-settings";
import { parseReportQuery, reportCsv, type DetailedReport, type ReportView } from "@/lib/referral-report";

export async function GET(request: Request) {
  if (!REFERRALS_ENABLED) return adsReply({ error: "Referrals are disabled." }, 404);
  if (!hasAdminSession(request)) return adsReply({ error: "Admin session expired. Sign out and sign in again." }, 401);
  if (!sameAdminOrigin(request)) return adsReply({ error: "Use the same site to view reports." }, 403);
  let filters: ReturnType<typeof parseReportQuery>;
  try { filters = parseReportQuery(new URL(request.url).searchParams); }
  catch (error) { return adsReply({ error: error instanceof Error ? error.message : "Invalid filters." }, 400); }
  try {
    const { data, error } = await adsDatabase().rpc("referral_detailed_report", filters);
    if (error) {
      if (error.code === "P0001") return adsReply({ error: error.message }, 400);
      if (error.code === "PGRST202" || error.code === "42883")
        return adsReply({ error: "The detailed report needs SQL migration 010. Existing referral features are still available." }, 503);
      throw error;
    }
    const report = data as DetailedReport;
    if (filters.p_export) return new Response(reportCsv(report.rows, filters.p_view as ReportView), { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="referral-' + filters.p_view + '-report.csv"',
      "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    } });
    return adsReply(report);
  } catch { return adsReply({ error: "Could not load the referral report. Please try again." }, 500); }
}
