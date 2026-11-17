import "server-only";
import { Resend } from "resend";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { adsDatabase } from "@/lib/ads-server";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

export async function sendReferrerInvitation(referrerId: string, origin: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Configure RESEND_API_KEY to send referral invitations.");
  const db = adsDatabase();
  const profile = await db.from("referrer_profiles").select("id, display_name, email, enabled, user_id")
    .eq("id", referrerId).maybeSingle();
  if (profile.error) throw new Error("Could not load this referrer.");
  if (!profile.data?.enabled) throw new Error("Enable this referrer before sending an invitation.");

  const destination = new URL("/referrer-portal", origin);
  if (!["http:", "https:"].includes(destination.protocol)) throw new Error("Use a valid website address.");
  let link = await db.auth.admin.generateLink({
    type: profile.data.user_id ? "recovery" : "invite",
    email: profile.data.email,
    options: { redirectTo: destination.toString() },
  });
  // Earlier self-registration may have created an Auth user before profile linking.
  if (link.error && !profile.data.user_id) {
    link = await db.auth.admin.generateLink({
      type: "recovery", email: profile.data.email, options: { redirectTo: destination.toString() },
    });
  }
  const properties = link.data?.properties;
  if (link.error || !properties?.hashed_token || !["invite", "recovery"].includes(properties.verification_type)) {
    throw new Error("Could not create the password link. Check Supabase Auth and retry.");
  }
  destination.searchParams.set("token_hash", properties.hashed_token);
  destination.searchParams.set("type", properties.verification_type);
  const safeLink = escapeHtml(destination.toString());
  const safeName = escapeHtml(profile.data.display_name);
  const heroContent = await readFile(join(process.cwd(), "public", "referral-portal.png")).catch(() => null);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://aeelixir.com").replace(/\/$/, "");
  const heroImage = heroContent ? "cid:referral-portal" : siteUrl + "/referral-portal.png";
  const from = process.env.ORDER_FROM_EMAIL || "AE Elixir <support@aeelixir.com>";
  const result = await new Resend(apiKey).emails.send({
    from,
    to: profile.data.email,
    subject: "Your AE Elixir Referrals Portal access",
    text: "Hello " + profile.data.display_name + ",\n\nAE Elixir has invited you to the Referrals Portal. Set your password here:\n"
      + destination.toString() + "\n\nYou can view your referral sales, earned credit, and discount codes after signing in.",
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:0;">
    <div style="margin:0;padding:24px 12px;background:#F6F3EF;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:580px;margin:0 auto;overflow:hidden;background:#ffffff;border:1px solid #E6E0D8;border-radius:24px;box-shadow:0 10px 30px rgba(95,85,76,0.08);">
        <div style="background:#ffffff;text-align:center;">
          <img src="${escapeHtml(heroImage)}" alt="AE Elixir Referrals Portal" width="580" style="display:block;width:100%;max-width:580px;height:auto;margin:0 auto;border:0;" />
        </div>
        <div style="padding:28px 24px;">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="margin:0;color:#5F554C;font-size:26px;line-height:1.25;">Referrals Portal</h1>
            <p style="margin:8px 0 0;color:#6F655C;font-size:14px;line-height:1.6;">Your AE Elixir account is ready</p>
          </div>
          <p style="margin:0 0 12px;color:#6F655C;font-size:14px;line-height:1.7;">Hello ${safeName},</p>
          <p style="margin:0;color:#6F655C;font-size:14px;line-height:1.7;">Set your password to access your personal referral dashboard, view sales and earned credit, and create discount codes.</p>
          <div style="background:#F6F3EF;border:1px solid #E6E0D8;border-radius:18px;padding:18px;margin-top:18px;">
            <p style="margin:0;color:#5F554C;font-size:14px;font-weight:bold;">Your portal access</p>
            <p style="margin:8px 0 0;color:#6F655C;font-size:14px;line-height:1.6;">Sign in using ${escapeHtml(profile.data.email)} after choosing your password.</p>
          </div>
          <div style="margin-top:26px;text-align:center;">
            <a href="${safeLink}" style="display:inline-block;min-width:190px;padding:14px 24px;color:#ffffff;background:#A79B8E;border-radius:999px;text-decoration:none;font-size:14px;font-weight:bold;">Set Your Password</a>
          </div>
          <p style="margin:20px 0 0;color:#6F655C;font-size:12px;line-height:1.6;text-align:center;">If this link expires, ask AE Elixir to send a new password link.</p>
          <p style="margin:24px 0 0;text-align:center;color:#6F655C;font-size:12px;line-height:1.6;">Need help? Contact us at <a href="mailto:support@aeelixir.com" style="color:#8F8276;font-weight:bold;text-decoration:none;">support@aeelixir.com</a></p>
        </div>
        <div style="padding:18px;text-align:center;color:#8F8276;background:#FBFAF8;border-top:1px solid #E6E0D8;font-size:11px;">© ${new Date().getFullYear()} AE Elixir. All rights reserved.</div>
      </div>
    </div>
  </body>
</html>`,
    attachments: heroContent ? [{ content: heroContent, filename: "referral-portal.png", contentId: "referral-portal" }] : undefined,
  });
  if (result.error) throw new Error("The invitation could not be sent. Check the Resend sender configuration and retry.");

  const updated = await db.from("referrer_profiles").update({ portal_invited_at: new Date().toISOString() })
    .eq("id", referrerId).eq("email", profile.data.email).eq("enabled", true).select("id").maybeSingle();
  if (updated.error || !updated.data) {
    throw new Error("The email was sent, but portal access could not be activated. Reload the referrer and resend.");
  }
  return { sent: true, email: profile.data.email };
}
