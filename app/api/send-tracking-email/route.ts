import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const {
      orderNumber,
      customerName,
      customerEmail,
      trackingNumber,
    } = await req.json();

    if (!customerEmail || !trackingNumber) {
      return Response.json(
        { error: "Missing customer email or tracking number" },
        { status: 400 }
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yourdomain.com";

    const trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f6f7f9;padding:24px;">
        <div style="max-width:560px;margin:0 auto;background:white;border-radius:22px;overflow:hidden;">
          <div style="padding:24px;text-align:center;border-bottom:1px solid #eee;">
            <img
              src="${siteUrl}/email-logo.png"
              width="56"
              style="margin-bottom:10px;border-radius:14px;display:block;margin-left:auto;margin-right:auto;"
            />
            <h1 style="margin:0;font-size:26px;">Order Shipped</h1>
            <p style="color:#666;margin:8px 0 0;">Your package is on the way</p>
          </div>

          <div style="padding:24px;">
            <h2 style="margin:0 0 8px;">Hi ${customerName || "there"},</h2>

            <p style="color:#555;line-height:1.5;margin:0 0 18px;">
              Your order has been updated with a tracking number.
            </p>

            <div style="background:#f3f4f6;border-radius:16px;padding:16px;margin-bottom:18px;">
              <p style="margin:0;color:#777;font-size:13px;">Order Number</p>
              <p style="margin:4px 0 0;font-size:22px;font-weight:bold;">#${orderNumber}</p>
            </div>

            <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:16px;margin-bottom:22px;">
              <p style="margin:0;color:#777;font-size:13px;">USPS Tracking</p>
              <p style="margin:6px 0 0;font-size:18px;font-weight:bold;">${trackingNumber}</p>
            </div>

            <div style="text-align:center;margin-top:24px;">
              <a
                href="${trackingUrl}"
                style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:bold;"
              >
                Track Package
              </a>
            </div>
          </div>

          <div style="padding:18px;text-align:center;color:#999;font-size:12px;border-top:1px solid #eee;">
            Thank you for your order.
          </div>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: process.env.ORDER_FROM_EMAIL || "Store <support@yourdomain.com>",
      to: [customerEmail],
      subject: `Tracking Added for Order #${orderNumber}`,
      html,
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json({ data });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}