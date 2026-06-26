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

<main className="px-4 py-6 sm:px-6 sm:py-8">
  <div className="mx-auto w-full max-w-3xl">
    {/* Order Lookup Hero Image */}
    <div className="mb-6 overflow-hidden rounded-[24px] border border-[#E6E0D8] bg-white shadow-sm">
      <img
        src="/order-lookup.png"
        alt="AE Elixir Order Lookup"
        className="block h-auto w-full object-contain"
      />
    </div>

    {/* Lookup Form */}
    <div className="mb-6 rounded-[24px] border border-[#E6E0D8] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-[#A79B8E]">
          Order Status
        </p>

        <h2 className="mt-1 text-xl font-bold text-[#5F554C] sm:text-2xl">
          Find Your Order
        </h2>

        <p className="mt-2 text-sm leading-6 text-[#6F655C]">
          Enter your order number and the email or phone used at checkout.
        </p>
      </div>

      <div className="space-y-3">
        <input
          className="w-full rounded-xl border border-[#D8D1C8] bg-white p-3 text-[#5F554C] outline-none transition focus:border-[#A79B8E] focus:ring-2 focus:ring-[#A79B8E]/20"
          placeholder="Order Number, example: A1B2C3D4"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
        />

        <input
          className="w-full rounded-xl border border-[#D8D1C8] bg-white p-3 text-[#5F554C] outline-none transition focus:border-[#A79B8E] focus:ring-2 focus:ring-[#A79B8E]/20"
          placeholder="Email or Phone"
          value={emailOrPhone}
          onChange={(e) => setEmailOrPhone(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleLookup();
            }
          }}
        />

        <button
          type="button"
          onClick={handleLookup}
          disabled={loading}
          className="w-full rounded-full bg-[#A79B8E] py-3 font-semibold text-white shadow-sm transition-all hover:bg-[#978D82] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Searching..." : "Search Order"}
        </button>
      </div>
    </div>

    {/* No Order Found */}
    {searched && !order && (
      <div className="rounded-[24px] border border-[#E6E0D8] bg-white p-5 text-center text-sm leading-6 text-[#6F655C] shadow-sm">
        No order found. Please check the order number and contact information.
      </div>
    )}

    {/* Order Results */}
    {order && (
      <div className="rounded-[24px] border border-[#E6E0D8] bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#8F8276]">
              Order Number
            </p>

            <h2 className="mt-1 text-xl font-bold tracking-wide text-[#5F554C]">
              #{order.id.slice(0, 8).toUpperCase()}
            </h2>

            <p className="mt-1 text-xs text-[#8F8276]">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <p className="text-lg font-bold text-[#5F554C]">
            ${Number(order.total).toFixed(2)}
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
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

        <div className="mb-4 rounded-2xl border border-[#E6E0D8] bg-[#FBFAF8] p-4 text-sm leading-6 text-[#6F655C]">
          <p>
            <span className="font-semibold text-[#5F554C]">Name:</span>{" "}
            {order.customer_name}
          </p>

          <p>
            <span className="font-semibold text-[#5F554C]">
              Payment Method:
            </span>{" "}
            {order.payment_method}
          </p>

          <p>
            <span className="font-semibold text-[#5F554C]">Tracking:</span>{" "}
            {order.tracking_number || "Not available yet"}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E6E0D8] bg-[#FBFAF8] p-4">
          <p className="mb-2 text-sm font-bold text-[#5F554C]">
            Items
          </p>

          {order.items?.map((item) => (
            <div
              key={item.id}
              className="flex justify-between gap-4 border-b border-[#E6E0D8] py-2 text-sm text-[#6F655C] last:border-b-0"
            >
              <span>
                {item.quantity}× {item.name}
              </span>

              <span className="font-semibold text-[#5F554C]">
                ${(Number(item.price) * Number(item.quantity)).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-[#E6E0D8] bg-[#FBFAF8] p-4">
          <h3 className="mb-2 font-semibold text-[#5F554C]">
            Shipping
          </h3>

          <p className="text-sm text-[#6F655C]">
            <span className="font-medium text-[#5F554C]">
              Tracking:
            </span>{" "}

            {order.tracking_number ? (
              <a
                href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(
                  order.tracking_number
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#A79B8E] underline decoration-[#A79B8E]/40 underline-offset-2"
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
  </div>
</main>
    </div>
  );
}