import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(new URL("../app/api/send-order-email/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const promoSource = await readFile(new URL("../lib/promotions.ts", import.meta.url), "utf8");
const promoContext = { exports: {}, process: { env: {} } };
vm.runInNewContext(ts.transpileModule(promoSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, promoContext);
const sent = [];
const context = { exports: {}, Response, console, process: { env: {
  RESEND_API_KEY: "re_test", ADMIN_ORDER_EMAIL: "admin@example.test", NEXT_PUBLIC_SITE_URL: "https://store.example.test",
} }, require(name) {
  if (name === "@/lib/promotions") return promoContext.exports;
  if (name === "@/lib/ads-server") return { adsDatabase() { throw new Error("Unexpected database call in email fixture"); } };
  assert.equal(name, "resend");
  return { Resend: class { emails = { send: async (message) => { sent.push(message); return { data: { id: "test-email" }, error: null }; } }; } };
} };
vm.runInNewContext(compiled, context);
const base = { orderNumber: "A1B2C3D4", customerName: "Test Customer", customerEmail: "customer@example.test",
  paymentMethod: "zelle", paymentMethodLabel: "Zelle", paymentAccountValue: "test@example.test", paymentInstructions: "Include your order number.",
  items: [{ name: "Test item", price: 50, quantity: 2 }], subtotal: 100, shippingPrice: 10, shippingMethodLabel: "Standard", total: 110 };
async function send(extra) {
  sent.length = 0;
  return context.exports.POST(new Request("https://store.example.test/api/send-order-email", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...base, ...extra }),
  }));
}
test("ordinary customer and admin emails retain totals and payment instructions", async () => {
  const result = await send({});
  assert.equal(result.status, 200);
  assert.equal(sent.length, 2);
  assert.match(sent[0].html, /\$110.00/);
  assert.match(sent[0].html, /Include your order number/);
  assert.doesNotMatch(sent[0].html, /Discount \(/);
});
test("customer and admin HTML and text include merchandise discount and unchanged shipping", async () => {
  assert.equal((await send({ promoCode: "HOLIDAY10", discountAmount: 10, total: 100 })).status, 200);
  for (const email of sent) {
    assert.match(email.html, /HOLIDAY10/);
    assert.match(email.text, /Discount \(HOLIDAY10\): -\$10.00/);
    assert.match(email.text, /\$100.00/);
    assert.match(email.text, /Standard.*\$10.00/);
  }
});
test("admin resend still suppresses the duplicate admin notification", async () => {
  assert.equal((await send({ promoCode: "HOLIDAY10", discountAmount: 10, total: 100, suppressAdminEmail: true })).status, 200);
  assert.equal(sent.length, 1);
});
test("invalid promotion totals and code markup cannot reach the email provider", async () => {
  for (const payload of [{ promoCode: "<script>", discountAmount: 10, total: 100 },
    { promoCode: "HOLIDAY10", discountAmount: 1000, total: 100 }, { promoCode: "HOLIDAY10", discountAmount: 10, total: 5 }]) {
    assert.equal((await send(payload)).status, 400);
    assert.equal(sent.length, 0);
  }
});

test("free shipping is listed separately and charged at zero", async () => {
  assert.equal((await send({ promoCode: "SHIPFREE", shippingDiscountAmount: 10, total: 100 })).status, 200);
  for (const email of sent) {
    assert.match(email.html, /Free shipping \(SHIPFREE\)/);
    assert.match(email.text, /Free shipping \(SHIPFREE\): -\$10.00/);
    assert.match(email.text, /Total: \$100.00/);
  }
  assert.equal((await send({ promoCode: "SHIPFREE", shippingDiscountAmount: 15, total: 95 })).status, 400);
  assert.equal(sent.length, 0);
});

test("combined benefits appear separately in customer/admin emails and reconcile to total", async () => {
  assert.equal((await send({ promoCode: "COMBO20", discountAmount: 20, shippingDiscountAmount: 10, total: 80 })).status, 200);
  assert.equal(sent.length, 2);
  for (const email of sent) {
    assert.match(email.text, /Discount \(COMBO20\): -\$20.00/);
    assert.match(email.text, /Free shipping \(COMBO20\): -\$10.00/);
    assert.match(email.text, /Total: \$80.00/);
  }
  assert.match(sent[0].html, /Discount \(COMBO20\)<\/td>/);
  assert.match(sent[0].html, /Free shipping \(COMBO20\)<\/td>/);
  assert.equal((await send({ promoCode: "COMBO20", discountAmount: 20, shippingDiscountAmount: 15, total: 75 })).status, 400);
  assert.equal(sent.length, 0);
  assert.equal((await send({ promoCode: "COMBO20", discountAmount: 20, shippingDiscountAmount: 10, total: "NaN" })).status, 400);
});
