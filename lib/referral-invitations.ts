import "server-only";
import { Resend } from "resend";
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
  const from = process.env.ORDER_FROM_EMAIL || "AE Elixir <support@aeelixir.com>";
  const result = await new Resend(apiKey).emails.send({
    from,
    to: profile.data.email,
    subject: "Your AE Elixir Referrals Portal access",
    text: "Hello " + profile.data.display_name + ",\n\nAE Elixir has invited you to the Referrals Portal. Set your password here:\n"
      + destination.toString() + "\n\nYou can view your referral sales, earned credit, and discount codes after signing in.",
    html: `<!doctype html><html><body style="margin:0;background:#F8F9F8;font-family:Arial,sans-serif;color:#5F554C">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:white;border:1px solid #E6E0D8;border-radius:24px">
          <tr><td style="padding:32px;text-align:center">
            <img src="https://aeelixir.com/logo-icon.png" alt="AE Elixir" width="56" height="56" style="object-fit:contain">
            <h1 style="font-size:24px;margin:16px 0;color:#5F554C">Referrals Portal</h1>
            <p style="font-size:15px;line-height:24px;text-align:left">Hello ${safeName},</p>
            <p style="font-size:15px;line-height:24px;text-align:left">Your AE Elixir referral account is ready. Set your password to view your sales, credit balance, and discount codes.</p>
            <p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;padding:14px 24px;background:#5F554C;color:white;border-radius:28px;text-decoration:none;font-weight:bold">Set your password</a></p>
            <p style="font-size:12px;line-height:20px;color:#7F756B">This link is for your account. If it expires, ask AE Elixir to send a new password link.</p>
          </td></tr>
        </table>
      </td></tr></table>
    </body></html>`,
  });
  if (result.error) throw new Error("The invitation could not be sent. Check the Resend sender configuration and retry.");

  const updated = await db.from("referrer_profiles").update({ portal_invited_at: new Date().toISOString() })
    .eq("id", referrerId).eq("email", profile.data.email).eq("enabled", true).select("id").maybeSingle();
  if (updated.error || !updated.data) {
    throw new Error("The email was sent, but portal access could not be activated. Reload the referrer and resend.");
  }
  return { sent: true, email: profile.data.email };
}
