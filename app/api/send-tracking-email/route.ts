import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const BRAND_NAME = "AE Elixir";
const BRAND_COLOR = "#A79B8E";
const BRAND_COLOR_DARK = "#8F8276";
const DARK_TEXT = "#5F554C";
const BODY_TEXT = "#6F655C";
const SOFT_BACKGROUND = "#F6F3EF";
const BORDER_COLOR = "#E6E0D8";
const SUPPORT_EMAIL = "support@aeelixir.com";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(req: Request) {
  try {
    const {
      orderNumber,
      customerName,
      customerEmail,
      trackingNumber,
    } = await req.json();

    if (!orderNumber || !customerEmail || !trackingNumber) {
      return Response.json(
        {
          error:
            "Missing order number, customer email, or tracking number.",
        },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://ae-elixir-website.vercel.app";

    const shippedImageUrl = `${siteUrl}/email-shipped.png`;

    const trackingUrl =
      `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(
        trackingNumber
      )}`;

    const safeOrderNumber = escapeHtml(orderNumber);
    const safeCustomerName = escapeHtml(customerName || "there");
    const safeTrackingNumber = escapeHtml(trackingNumber);

    const fromEmail =
      process.env.ORDER_FROM_EMAIL ||
      `${BRAND_NAME} <support@aeelixir.com>`;

    const html = `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Order Shipped</title>
        </head>

        <body style="
          margin:0;
          padding:0;
          background:${SOFT_BACKGROUND};
          font-family:Arial,Helvetica,sans-serif;
        ">
          <div style="
            width:100%;
            padding:24px 12px;
            background:${SOFT_BACKGROUND};
            box-sizing:border-box;
          ">
            <div style="
              max-width:580px;
              margin:0 auto;
              overflow:hidden;
              background:#ffffff;
              border:1px solid ${BORDER_COLOR};
              border-radius:24px;
              box-shadow:0 10px 30px rgba(95,85,76,0.08);
            ">
              <div style="
                background:#ffffff;
                text-align:center;
              ">
                <img
                  src="${shippedImageUrl}"
                  alt="${BRAND_NAME} order shipped"
                  width="580"
                  style="
                    display:block;
                    width:100%;
                    max-width:580px;
                    height:auto;
                    margin:0 auto;
                    border:0;
                  "
                />
              </div>

              <div style="padding:28px 24px 30px;">
                <div style="text-align:center;margin-bottom:24px;">
                  <h1 style="
                    margin:0;
                    color:${DARK_TEXT};
                    font-size:26px;
                    line-height:1.25;
                    font-weight:700;
                  ">
                    Your Order Is On the Way
                  </h1>

                  <p style="
                    margin:10px 0 0;
                    color:${BODY_TEXT};
                    font-size:14px;
                    line-height:1.7;
                  ">
                    Hi ${safeCustomerName}, your AE Elixir order has shipped.
                  </p>
                </div>

                <div style="
                  margin-bottom:16px;
                  padding:18px;
                  text-align:center;
                  background:${SOFT_BACKGROUND};
                  border:1px solid ${BORDER_COLOR};
                  border-radius:18px;
                ">
                  <p style="
                    margin:0;
                    color:${BRAND_COLOR_DARK};
                    font-size:12px;
                    font-weight:600;
                    letter-spacing:0.6px;
                    text-transform:uppercase;
                  ">
                    Order Number
                  </p>

                  <p style="
                    margin:6px 0 0;
                    color:${DARK_TEXT};
                    font-size:21px;
                    font-weight:700;
                    letter-spacing:0.4px;
                  ">
                    #${safeOrderNumber}
                  </p>
                </div>

                <div style="
                  margin-bottom:22px;
                  padding:18px;
                  text-align:center;
                  background:#FBFAF8;
                  border:1px solid ${BORDER_COLOR};
                  border-radius:18px;
                ">
                  <p style="
                    margin:0;
                    color:${BRAND_COLOR_DARK};
                    font-size:12px;
                    font-weight:600;
                    letter-spacing:0.6px;
                    text-transform:uppercase;
                  ">
                    USPS Tracking Number
                  </p>

                  <p style="
                    margin:8px 0 0;
                    color:${DARK_TEXT};
                    font-size:18px;
                    font-weight:700;
                    line-height:1.4;
                    word-break:break-all;
                  ">
                    ${safeTrackingNumber}
                  </p>
                </div>

                <p style="
                  margin:0 0 22px;
                  color:${BODY_TEXT};
                  font-size:14px;
                  line-height:1.7;
                  text-align:center;
                ">
                  Tracking updates may take several hours to appear after the
                  shipping label is created.
                </p>

                <div style="text-align:center;">
                  <a
                    href="${trackingUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="
                      display:inline-block;
                      min-width:190px;
                      padding:14px 26px;
                      color:#ffffff;
                      background:${BRAND_COLOR};
                      border-radius:999px;
                      text-decoration:none;
                      font-size:14px;
                      font-weight:700;
                      box-shadow:0 5px 14px rgba(167,155,142,0.28);
                    "
                  >
                    Track Package
                  </a>
                </div>

                <p style="
                  margin:26px 0 0;
                  text-align:center;
                  color:${BODY_TEXT};
                  font-size:12px;
                  line-height:1.7;
                ">
                  Need help with your order?
                  <br />
                  Email us at
                  <a
                    href="mailto:${SUPPORT_EMAIL}"
                    style="
                      color:${BRAND_COLOR_DARK};
                      font-weight:700;
                      text-decoration:none;
                    "
                  >
                    ${SUPPORT_EMAIL}
                  </a>
                </p>
              </div>

              <div style="
                padding:18px;
                text-align:center;
                color:#8F8276;
                background:#FBFAF8;
                border-top:1px solid ${BORDER_COLOR};
                font-size:11px;
                line-height:1.6;
              ">
                © 2026 ${BRAND_NAME}. All rights reserved.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [customerEmail],
      replyTo: SUPPORT_EMAIL,
      subject: `${BRAND_NAME} Order #${orderNumber} Has Shipped`,
      html,
    });

    if (error) {
      console.error("Shipped email error:", error);

      return Response.json(
        { error },
        { status: 500 }
      );
    }

    return Response.json({ data });
  } catch (error) {
    console.error("Shipped email route error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send shipped email.",
      },
      { status: 500 }
    );
  }
}