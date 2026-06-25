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

type EmailItem = {
  name: string;
  price: number;
  quantity: number;
};

function getPaymentInstructions(
  paymentMethod: string,
  orderNumber: string
) {
  const zelleAccount =
    process.env.ZELLE_ACCOUNT || "Contact support@aeelixir.com";

  const venmoAccount =
    process.env.VENMO_ACCOUNT || "Contact support@aeelixir.com";

  if (paymentMethod.toLowerCase() === "zelle") {
    return `
      <div style="
        background:${SOFT_BACKGROUND};
        border:1px solid ${BORDER_COLOR};
        border-radius:18px;
        padding:18px;
        margin-top:18px;
      ">
        <h3 style="
          margin:0 0 10px;
          color:${DARK_TEXT};
          font-size:17px;
        ">
          Zelle Payment
        </h3>

        <p style="margin:6px 0;color:${BODY_TEXT};">
          Send payment via Zelle to:
        </p>

        <p style="
          margin:8px 0;
          color:${DARK_TEXT};
          font-weight:bold;
          font-size:16px;
        ">
          ${zelleAccount}
        </p>

        <p style="margin:12px 0 0;color:${BODY_TEXT};">
          Include your order number in the memo:
        </p>

        <p style="
          margin:6px 0 0;
          color:${DARK_TEXT};
          font-weight:bold;
          font-size:16px;
        ">
          #${orderNumber}
        </p>
      </div>
    `;
  }

  if (paymentMethod.toLowerCase() === "venmo") {
    return `
      <div style="
        background:${SOFT_BACKGROUND};
        border:1px solid ${BORDER_COLOR};
        border-radius:18px;
        padding:18px;
        margin-top:18px;
      ">
        <h3 style="
          margin:0 0 10px;
          color:${DARK_TEXT};
          font-size:17px;
        ">
          Venmo Payment
        </h3>

        <p style="margin:6px 0;color:${BODY_TEXT};">
          Send payment to:
        </p>

        <p style="
          margin:8px 0;
          color:${DARK_TEXT};
          font-weight:bold;
          font-size:16px;
        ">
          ${venmoAccount}
        </p>

        <p style="margin:12px 0 0;color:${BODY_TEXT};">
          Include your order number in the payment note:
        </p>

        <p style="
          margin:6px 0 0;
          color:${DARK_TEXT};
          font-weight:bold;
          font-size:16px;
        ">
          #${orderNumber}
        </p>
      </div>
    `;
  }

  return `
    <div style="
      background:${SOFT_BACKGROUND};
      border:1px solid ${BORDER_COLOR};
      border-radius:18px;
      padding:18px;
      margin-top:18px;
    ">
      <h3 style="
        margin:0 0 10px;
        color:${DARK_TEXT};
        font-size:17px;
      ">
        Payment Instructions
      </h3>

      <p style="margin:6px 0;color:${BODY_TEXT};line-height:1.6;">
        Please contact us to complete payment for your order.
      </p>

      <p style="
        margin:10px 0 0;
        color:${DARK_TEXT};
        font-weight:bold;
      ">
        ${SUPPORT_EMAIL}
      </p>

      <p style="margin:12px 0 0;color:${BODY_TEXT};">
        Include your order number:
      </p>

      <p style="
        margin:6px 0 0;
        color:${DARK_TEXT};
        font-weight:bold;
        font-size:16px;
      ">
        #${orderNumber}
      </p>
    </div>
  `;
}

export async function POST(req: Request) {
  try {
    const {
      orderNumber,
      customerName,
      customerEmail,
      paymentMethod,
      items,
      total,
    } = await req.json();

    if (
      !orderNumber ||
      !customerName ||
      !customerEmail ||
      !paymentMethod ||
      !Array.isArray(items)
    ) {
      return Response.json(
        { error: "Missing required order information." },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://ae-elixir-website.vercel.app";

    
const heroImage = `${siteUrl}/order-received.png`;
const logoUrl = `${siteUrl}/email-logo.png`;

    const trackingUrl = `${siteUrl}/order-lookup?order=${encodeURIComponent(
      orderNumber
    )}&email=${encodeURIComponent(customerEmail)}`;

    const adminUrl = `${siteUrl}/master-admin`;

    const fromEmail =
      process.env.ORDER_FROM_EMAIL ||
      `${BRAND_NAME} <support@aeelixir.com>`;

    const paymentHtml = getPaymentInstructions(
      paymentMethod,
      orderNumber
    );

    const itemsHtml = (items as EmailItem[])
      .map(
        (item) => `
          <tr>
            <td style="
              padding:13px 8px;
              border-bottom:1px solid ${BORDER_COLOR};
              color:${BODY_TEXT};
              font-size:14px;
            ">
              ${item.quantity} × ${item.name}
            </td>

            <td style="
              padding:13px 8px;
              border-bottom:1px solid ${BORDER_COLOR};
              text-align:right;
              color:${DARK_TEXT};
              font-weight:bold;
              font-size:14px;
              white-space:nowrap;
            ">
              $${(Number(item.price) * Number(item.quantity)).toFixed(2)}
            </td>
          </tr>
        `
      )
      .join("");

    const customerHtml = `
      <div style="
        margin:0;
        padding:24px 12px;
        background:${SOFT_BACKGROUND};
        font-family:Arial,Helvetica,sans-serif;
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
    src="${heroImage}"
    alt="${BRAND_NAME} order received"
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

          <div style="padding:28px 24px;">
            <div style="text-align:center;margin-bottom:24px;">
              <h1 style="
                margin:0;
                color:${DARK_TEXT};
                font-size:26px;
                line-height:1.25;
              ">
                Order Received
              </h1>

              <p style="
                margin:8px 0 0;
                color:${BODY_TEXT};
                font-size:14px;
                line-height:1.6;
              ">
                Thank you, ${customerName}. Your order has been received.
              </p>
            </div>

            <div style="
              margin-bottom:24px;
              padding:18px;
              text-align:center;
              background:${SOFT_BACKGROUND};
              border:1px solid ${BORDER_COLOR};
              border-radius:18px;
            ">
              <p style="
                margin:0;
                color:#8F8276;
                font-size:12px;
                letter-spacing:0.5px;
                text-transform:uppercase;
              ">
                Order Number
              </p>

              <p style="
                margin:6px 0 0;
                color:${DARK_TEXT};
                font-size:22px;
                font-weight:bold;
                letter-spacing:0.5px;
              ">
                #${orderNumber}
              </p>
            </div>

            <h2 style="
              margin:0 0 10px;
              color:${DARK_TEXT};
              font-size:17px;
            ">
              Order Summary
            </h2>

            <table style="
              width:100%;
              margin-bottom:18px;
              border-collapse:collapse;
            ">
              ${itemsHtml}

              <tr>
                <td style="
                  padding:16px 8px 8px;
                  color:${DARK_TEXT};
                  font-size:16px;
                  font-weight:bold;
                ">
                  Total
                </td>

                <td style="
                  padding:16px 8px 8px;
                  text-align:right;
                  color:${DARK_TEXT};
                  font-size:18px;
                  font-weight:bold;
                ">
                  $${Number(total).toFixed(2)}
                </td>
              </tr>
            </table>

            ${paymentHtml}

            <div style="margin-top:26px;text-align:center;">
              <a
                href="${trackingUrl}"
                style="
                  display:inline-block;
                  min-width:190px;
                  padding:14px 24px;
                  color:#ffffff;
                  background:${BRAND_COLOR};
                  border-radius:999px;
                  text-decoration:none;
                  font-size:14px;
                  font-weight:bold;
                "
              >
                View Your Order
              </a>
            </div>

            <p style="
              margin:24px 0 0;
              text-align:center;
              color:${BODY_TEXT};
              font-size:12px;
              line-height:1.6;
            ">
              Need help? Contact us at
              <a
                href="mailto:${SUPPORT_EMAIL}"
                style="color:${BRAND_COLOR_DARK};font-weight:bold;text-decoration:none;"
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
          ">
            © 2026 ${BRAND_NAME}. All rights reserved.
          </div>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [customerEmail],
      replyTo: SUPPORT_EMAIL,
      subject: `${BRAND_NAME} Order Confirmation #${orderNumber}`,
      html: customerHtml,
    });

    if (error) {
      console.error("Customer email error:", error);

      return Response.json(
        { error },
        { status: 500 }
      );
    }

    const adminEmail = process.env.ADMIN_ORDER_EMAIL;

    if (adminEmail) {
      const adminHtml = `
        <div style="
          margin:0;
          padding:24px 12px;
          background:${SOFT_BACKGROUND};
          font-family:Arial,Helvetica,sans-serif;
        ">
          <div style="
            max-width:580px;
            margin:0 auto;
            overflow:hidden;
            background:#ffffff;
            border:1px solid ${BORDER_COLOR};
            border-radius:24px;
          ">
            <div style="
              padding:24px;
              text-align:center;
              background:${BRAND_COLOR};
            ">
              <img
                src="${logoUrl}"
                alt="${BRAND_NAME}"
                width="180"
                style="
                  display:block;
                  width:180px;
                  max-width:80%;
                  height:auto;
                  margin:0 auto;
                "
              />
            </div>

            <div style="padding:26px 24px;">
              <h1 style="
                margin:0 0 6px;
                color:${DARK_TEXT};
                font-size:24px;
              ">
                New Order Received
              </h1>

              <p style="
                margin:0 0 20px;
                color:${BODY_TEXT};
              ">
                Order #${orderNumber}
              </p>

              <div style="
                padding:16px;
                margin-bottom:20px;
                background:${SOFT_BACKGROUND};
                border:1px solid ${BORDER_COLOR};
                border-radius:16px;
              ">
                <p style="margin:5px 0;color:${BODY_TEXT};">
                  <strong style="color:${DARK_TEXT};">Customer:</strong>
                  ${customerName}
                </p>

                <p style="margin:5px 0;color:${BODY_TEXT};">
                  <strong style="color:${DARK_TEXT};">Email:</strong>
                  ${customerEmail}
                </p>

                <p style="margin:5px 0;color:${BODY_TEXT};">
                  <strong style="color:${DARK_TEXT};">Payment:</strong>
                  ${paymentMethod}
                </p>

                <p style="margin:5px 0;color:${BODY_TEXT};">
                  <strong style="color:${DARK_TEXT};">Total:</strong>
                  $${Number(total).toFixed(2)}
                </p>
              </div>

              <h2 style="
                margin:0 0 10px;
                color:${DARK_TEXT};
                font-size:17px;
              ">
                Items Ordered
              </h2>

              <table style="
                width:100%;
                border-collapse:collapse;
              ">
                ${itemsHtml}
              </table>

              <div style="margin-top:26px;text-align:center;">
                <a
                  href="${adminUrl}"
                  style="
                    display:inline-block;
                    padding:14px 24px;
                    color:#ffffff;
                    background:${BRAND_COLOR};
                    border-radius:999px;
                    text-decoration:none;
                    font-size:14px;
                    font-weight:bold;
                  "
                >
                  Open Master Admin
                </a>
              </div>
            </div>
          </div>
        </div>
      `;

      const { error: adminEmailError } =
        await resend.emails.send({
          from: fromEmail,
          to: [adminEmail],
          replyTo: SUPPORT_EMAIL,
          subject: `New ${BRAND_NAME} Order #${orderNumber} — $${Number(
            total
          ).toFixed(2)}`,
          html: adminHtml,
        });

      if (adminEmailError) {
        console.error("Admin email error:", adminEmailError);
      }
    }

    return Response.json({ data });
  } catch (error) {
    console.error("Order email route error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send order email.",
      },
      { status: 500 }
    );
  }
}