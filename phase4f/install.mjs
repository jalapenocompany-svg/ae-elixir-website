import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const patchDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(patchDir, "..");
const adminPath = path.join(root, "app", "master-admin", "MasterAdminClient.tsx");
const lookupPath = path.join(root, "app", "order-lookup", "LookupClient.tsx");
const componentPath = path.join(root, "components", "UnpaidOrderCountdown.tsx");

function replaceExactlyOnce(text, find, replace, description) {
  const count = text.split(find).length - 1;
  if (count !== 1) {
    throw new Error(`${description}: expected the original block exactly once; found ${count}. Nothing changed.`);
  }
  return text.replace(find, replace);
}

try {
  for (const f of [adminPath, lookupPath]) {
    if (!fs.existsSync(f)) throw new Error(`Missing ${f}. Extract phase4f/ inside the AE Elixir project root.`);
  }
  if (fs.existsSync(componentPath)) {
    throw new Error("components/UnpaidOrderCountdown.tsx already exists. Stop to avoid overwriting prior changes.");
  }

  let admin = fs.readFileSync(adminPath, "utf8");
  let lookup = fs.readFileSync(lookupPath, "utf8");
  const adminEol = admin.includes("\r\n") ? "\r\n" : "\n";
  const lookupEol = lookup.includes("\r\n") ? "\r\n" : "\n";
  // Normalize line endings for safe matching; restore original formatting when writing.
  admin = admin.replace(/\r\n/g, "\n");
  lookup = lookup.replace(/\r\n/g, "\n");
  if (admin.includes("UnpaidOrderCountdown") || lookup.includes("UnpaidOrderCountdown")) {
    throw new Error("Countdown already referenced in at least one file. Stop to avoid applying twice.");
  }

  admin = replaceExactlyOnce(
    admin,
    'import SiteHeader from "@/components/SiteHeader";',
    'import SiteHeader from "@/components/SiteHeader";\nimport UnpaidOrderCountdown from "@/components/UnpaidOrderCountdown";',
    "Admin import"
  );
  admin = replaceExactlyOnce(
    admin,
    'type Order = {\n  id: string;\n  created_at: string;',
    'type Order = {\n  id: string;\n  created_at: string;\n  payment_due_at: string | null;\n  payment_reminder_sent_at: string | null;',
    "Admin Order type"
  );
  admin = replaceExactlyOnce(
    admin,
    '                  <div className="mb-3 text-sm leading-6 text-[#6F655C]">',
    `                  <UnpaidOrderCountdown
                    createdAt={order.created_at}
                    dueAt={order.payment_due_at}
                    reminderSentAt={order.payment_reminder_sent_at}
                    paymentStatus={order.payment_status}
                    orderStatus={order.order_status}
                    compact
                  />

                  <div className="mb-3 text-sm leading-6 text-[#6F655C]">`,
    "Admin Orders card"
  );

  lookup = replaceExactlyOnce(
    lookup,
    'import SiteHeader from "@/components/SiteHeader";',
    'import SiteHeader from "@/components/SiteHeader";\nimport UnpaidOrderCountdown from "@/components/UnpaidOrderCountdown";',
    "Order Lookup import"
  );
  lookup = replaceExactlyOnce(
    lookup,
    'type Order = {\n  id: string;\n  created_at: string;',
    'type Order = {\n  id: string;\n  created_at: string;\n  payment_due_at: string | null;\n  payment_reminder_sent_at: string | null;',
    "Order Lookup Order type"
  );
  lookup = replaceExactlyOnce(
    lookup,
    '        <div className="mb-4 rounded-2xl border border-[#E6E0D8] bg-[#FBFAF8] p-4 text-sm leading-6 text-[#6F655C]">',
    `        <UnpaidOrderCountdown
          createdAt={order.created_at}
          dueAt={order.payment_due_at}
          reminderSentAt={order.payment_reminder_sent_at}
          paymentStatus={order.payment_status}
          orderStatus={order.order_status}
        />

        <div className="mb-4 rounded-2xl border border-[#E6E0D8] bg-[#FBFAF8] p-4 text-sm leading-6 text-[#6F655C]">`,
    "Order Lookup results"
  );

  // All validation/patching above happens in memory before any files are written.
  fs.mkdirSync(path.dirname(componentPath), { recursive: true });
  fs.copyFileSync(path.join(patchDir, "UnpaidOrderCountdown.tsx"), componentPath);
  fs.writeFileSync(adminPath, admin.replace(/\n/g, adminEol), "utf8");
  fs.writeFileSync(lookupPath, lookup.replace(/\n/g, lookupEol), "utf8");
  console.log("SUCCESS — Phase 4F countdown added to both pages.");
  console.log("Updated app/master-admin/MasterAdminClient.tsx");
  console.log("Updated app/order-lookup/LookupClient.tsx");
  console.log("Added components/UnpaidOrderCountdown.tsx");
  console.log("Automation switches were not changed.");
  console.log("Next: npm run build");
} catch (error) {
  console.error("PHASE 4F NOT APPLIED:", error.message);
  process.exitCode = 1;
}
