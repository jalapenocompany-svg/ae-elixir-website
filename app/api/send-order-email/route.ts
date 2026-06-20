import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailItem = {
  name: string;
  price: number;
  quantity: number;
};

function getPaymentInstructions(paymentMethod: string, orderNumber: string) {
  if (paymentMethod === "Zelle") {
    return `
      <div style="background:#f3e8ff;border:2px solid #7c3aed;border-radius:16px;padding:16px;">
        <h3 style="margin:0 0 8px;color:#6d28d9;">Zelle Payment</h3>
        <p style="margin:6px 0;color:#444;">Send payment via Zelle:</p>

        <p style="margin:6px 0;"><strong>📱 856-613-6874</strong></p>

        <p style="margin:10px 0 0;color:#444;">
          Include your order number in the memo:
        </p>

        <p style="margin:6px 0;font-weight:bold;">#${orderNumber}</p>
      </div>
    `;
  }

  if (paymentMethod === "Venmo") {
    return `
      <div style="background:#e0f2fe;border:2px solid #0284c7;border-radius:16px;padding:16px;">
        <h3 style="margin:0 0 8px;color:#0369a1;">Venmo Payment</h3>

        <p style="margin:6px 0;color:#444;">
          Send payment to:
        </p>

        <p style="margin:6px 0;font-weight:bold;">@pepmistry</p>

        <p style="margin:10px 0 0;color:#444;">
          Include your order number in the note:
        </p>

        <p style="margin:6px 0;font-weight:bold;">#${orderNumber}</p>
      </div>
    `;
  }

  // WhatsApp fallback
  return `
    <div style="background:#dcfce7;border:2px solid #16a34a;border-radius:16px;padding:16px;">
      <h3 style="margin:0 0 8px;color:#15803d;">WhatsApp Payment</h3>

      <p style="margin:6px 0;color:#444;">
        To complete your order, please contact us on WhatsApp.
      </p>

      <p style="margin:6px 0;font-weight:bold;">
        📱 Message us with your order number:
      </p>

      <p style="margin:6px 0;font-weight:bold;">#${orderNumber}</p>

      <p style="margin:10px 0 0;color:#444;">
        You may also request to pay via:
      </p>

      <ul style="margin:6px 0;padding-left:18px;color:#444;">
        <li>Zelle</li>
        <li>Venmo</li>
      </ul>
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pepmistry.com";
    const trackingUrl = `${siteUrl}/order-lookup?order=${orderNumber}&email=${encodeURIComponent(
    customerEmail
    )}`;

    const paymentHtml = getPaymentInstructions(paymentMethod, orderNumber);

    const itemsHtml = (items as EmailItem[])
      .map(
        (item) => `
          <tr>
            <td style="padding:12px;border-bottom:1px solid #eee;">${item.quantity}x ${item.name}</td>
            <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">$${(
              item.price * item.quantity
            ).toFixed(2)}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f6f7f9;padding:24px;">
        <div style="max-width:560px;margin:0 auto;background:white;border-radius:22px;overflow:hidden;">
          <div style="padding:24px;text-align:center;border-bottom:1px solid #eee;">
            <img
            src="https://pepmistry.com/email-logo.png"
            width="56"
            style="margin-bottom:10px;border-radius:14px;display:block;margin-left:auto;margin-right:auto;"
            />
            <h1 style="margin:0;font-size:26px;">Pepmistry</h1>
            <p style="color:#666;margin:8px 0 0;">Order Confirmation</p>
          </div>

          <div style="padding:24px;">
            <h2 style="margin:0 0 8px;">Thank you, ${customerName}</h2>
            <p style="color:#555;margin:0 0 18px;">
              Your order has been received.
            </p>

            <div style="background:#f3f4f6;border-radius:16px;padding:16px;margin-bottom:20px;">
              <p style="margin:0;color:#777;font-size:13px;">Order Number</p>
              <p style="margin:4px 0 0;font-size:22px;font-weight:bold;">#${orderNumber}</p>
            </div>

            <h3 style="margin:0 0 10px;">Kits Ordered</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:18px;">
              ${itemsHtml}
              <tr>
                <td style="padding:14px;font-weight:bold;">Total</td>
                <td style="padding:14px;text-align:right;font-weight:bold;">$${Number(total).toFixed(2)}</td>
              </tr>
            </table>

              ${paymentHtml}

            <div style="text-align:center;margin-top:24px;">
                <a
                    href="${trackingUrl}"
                    style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:bold;"
                >
                    Track Your Order
                </a>
            </div>
          </div>

          <div style="padding:18px;text-align:center;color:#999;font-size:12px;border-top:1px solid #eee;">
            © 2026 ❤️ Pepmistry. All rights reserved.
          </div>
        </div>
      </div>
    `;
const { data, error } = await resend.emails.send({
  from: process.env.ORDER_FROM_EMAIL || "Pepmistry <support@pepmistry.com>",
  to: [customerEmail],
  subject: `Pepmistry Order Confirmation #${orderNumber}`,
  html,
});

if (error) {
  return Response.json({ error }, { status: 500 });
}

const adminEmail = process.env.ADMIN_ORDER_EMAIL;

if (adminEmail) {
  await resend.emails.send({
    from: process.env.ORDER_FROM_EMAIL || "Pepmistry <support@pepmistry.com>",
    to: [adminEmail],
    subject: `New Pepmistry Order #${orderNumber} - $${Number(total).toFixed(2)}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f6f7f9;padding:24px;">
        <div style="max-width:560px;margin:0 auto;background:white;border-radius:20px;padding:24px;">
          <h1 style="margin:0 0 8px;">New Order Received</h1>
          <p style="margin:0 0 18px;color:#555;">Order #${orderNumber}</p>

          <div style="background:#f3f4f6;border-radius:14px;padding:14px;margin-bottom:16px;">
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
            <p><strong>Payment:</strong> ${paymentMethod}</p>
            <p><strong>Total:</strong> $${Number(total).toFixed(2)}</p>
          </div>

          <h3>Kits Ordered</h3>
          <table style="width:100%;border-collapse:collapse;">
            ${itemsHtml}
          </table>

          <div style="text-align:center;margin-top:24px;">
            <a
              href="${process.env.NEXT_PUBLIC_SITE_URL || "https://www.pepmistry.com"}/master-admin"
              style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:14px 24px;border-radius:999px;font-weight:bold;"
            >
              Open Master Admin
            </a>
          </div>
        </div>
      </div>
    `,
  });
}

return Response.json({ data });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json({ data });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}