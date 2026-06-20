"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import SiteHeader from "@/components/SiteHeader";

type OrderItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  line_total?: number;
};

type Order = {
  id: string;
  created_at: string;
  seller_code: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_method: string;
  items: OrderItem[];
  total: number;
  order_status: string | null;
  payment_status: string | null;
  tracking_number: string | null;
};

function statusBadgeClass(status: string | null) {
  const value = status || "pending";

  if (value === "paid" || value === "delivered") {
    return "bg-green-100 text-green-700";
  }

  if (value === "shipped" || value === "processing") {
    return "bg-blue-100 text-blue-700";
  }

  if (value === "cancelled" || value === "refunded") {
    return "bg-red-100 text-red-700";
  }

  return "bg-yellow-100 text-yellow-700";
}

export default function LookupClient() {
  const [orderNumber, setOrderNumber] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleLookup() {
    if (!orderNumber || !emailOrPhone) {
      alert("Please enter order number and email or phone.");
      return;
    }

    setLoading(true);
    setOrder(null);
    setSearched(false);

    const cleanedOrder = orderNumber.replace("#", "").trim().toLowerCase();
    const cleanedContact = emailOrPhone.trim().toLowerCase();

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .or(`customer_email.ilike.${cleanedContact},customer_phone.ilike.${cleanedContact}`)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const matchedOrder =
      data?.find((item) =>
        item.id.toLowerCase().startsWith(cleanedOrder)
      ) || null;

    setOrder(matchedOrder);
    setSearched(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black">
    <SiteHeader />

      <main className="px-5 py-6">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-bold">Find Your Order</h2>
          <p className="mb-5 text-sm text-gray-500">
            Enter your order number and the email or phone used at checkout.
          </p>

          <div className="space-y-3">
            <input
              className="w-full rounded-xl border p-3"
              placeholder="Order Number, example: A1B2C3D4"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
            />

            <input
              className="w-full rounded-xl border p-3"
              placeholder="Email or Phone"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
            />

            <button
              onClick={handleLookup}
              disabled={loading}
              className="w-full rounded-full bg-[#A79B8E] py-3 font-semibold text-white shadow-sm transition-all hover:bg-[#978D82] active:scale-95"
            >
              {loading ? "Searching..." : "Search Order"}
            </button>
          </div>
        </div>

        {searched && !order && (
          <div className="rounded-2xl bg-white p-5 text-sm text-gray-500 shadow-sm">
            No order found. Please check the order number and contact info.
          </div>
        )}

        {order && (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500">Order Number</p>
                <h2 className="text-xl font-bold">
                  #{order.id.slice(0, 8).toUpperCase()}
                </h2>
                <p className="text-xs text-gray-500">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>

              <p className="font-bold">${Number(order.total).toFixed(2)}</p>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                  order.order_status
                )}`}
              >
                Order: {order.order_status || "pending"}
              </span>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(
                  order.payment_status
                )}`}
              >
                Payment: {order.payment_status || "pending"}
              </span>
            </div>

            <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
              <p>
                <b>Name:</b> {order.customer_name}
              </p>
              <p>
                <b>Seller:</b> {order.seller_code}
              </p>
              <p>
                <b>Payment Method:</b> {order.payment_method}
              </p>
              <p>
                <b>Tracking:</b> {order.tracking_number || "Not available yet"}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-3">
              <p className="mb-2 text-sm font-bold">Items</p>

              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between border-b py-2 text-sm last:border-b-0"
                >
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>${item.price * item.quantity}</span>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mt-4">
              <h3 className="font-semibold mb-2">Shipping</h3>

              <p>
                <span className="font-medium">📦 Tracking: </span>

                {order.tracking_number ? (
                  <a
                    href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    {order.tracking_number}
                  </a>
                ) : (
                  "N/A"
                )}
              </p>
            </div>


            
          </div>
        )}
      </main>
    </div>
  );
}