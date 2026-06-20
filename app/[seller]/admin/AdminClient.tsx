"use client";

import { useEffect, useMemo, useState } from "react";
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
  seller_paid: boolean | null;
  payout_date: string | null;
payout_reference: string | null;
};

type SellerData = {
  seller_name: string;
  password: string;
  commission_percent: number;
};

type TabName = "dashboard" | "orders" | "earnings";

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

function DashboardIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 8l-9-5-9 5 9 5 9-5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M3 8v8l9 5 9-5V8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 13v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EarningsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2v20M17 7.5c0-2-2-3-5-3s-5 1-5 3 2 3 5 3 5 1 5 3-2 3-5 3-5-1-5-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SalesChart({ orders }: { orders: Order[] }) {
  const chartData = useMemo(() => {
    const now = new Date();

    const months = Array.from({ length: 5 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);

      return {
        label: date.toLocaleString("en-US", { month: "short" }),
        month: date.getMonth(),
        year: date.getFullYear(),
        total: 0,
      };
    });

    orders.forEach((order) => {
      const status = String(order.order_status || "").toLowerCase();
      if (status.includes("cancel")) return;

      const amount = Number(order.total || 0);
      if (!amount) return;

      const orderDate = new Date(order.created_at);

      const match = months.find(
        (month) =>
          month.month === orderDate.getMonth() &&
          month.year === orderDate.getFullYear()
      );

      if (match) {
        match.total += amount;
      } else {
        // fallback: if date matching fails, still count the sale in latest month
        months[months.length - 1].total += amount;
      }
    });

    return months;
  }, [orders]);

  const chartTotal = chartData.reduce((sum, item) => sum + item.total, 0);
  const maxValue = Math.max(...chartData.map((item) => item.total), 100);

  const width = 600;
  const height = 230;
  const leftPadding = 46;
  const rightPadding = 20;
  const topPadding = 20;
  const bottomPadding = 35;
  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = height - topPadding - bottomPadding;

  const points = chartData.map((item, index) => {
    const x = leftPadding + (chartWidth / (chartData.length - 1 || 1)) * index;
    const y = topPadding + chartHeight - (item.total / maxValue) * chartHeight;

    return { x, y, ...item };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    topPadding + chartHeight
  } L ${leftPadding} ${topPadding + chartHeight} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Last 5 Months Sales</h2>
      <p className="mb-5 text-sm text-gray-500">
        Based on non-cancelled seller orders.
      </p>



      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
          {gridLines.map((line) => {
            const y = topPadding + chartHeight - line * chartHeight;
            const value = maxValue * line;

            return (
              <g key={line}>
                <line
                  x1={leftPadding}
                  y1={y}
                  x2={width - rightPadding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text x="8" y={y + 4} fontSize="11" fill="#64748b">
                  ${Math.round(value)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="#dbeafe" opacity="0.75" />

          <path
            d={linePath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point) => (
            <g key={`${point.label}-${point.x}`}>
              <circle cx={point.x} cy={point.y} r="4" fill="#3b82f6" />
              <text
                x={point.x}
                y={height - 10}
                fontSize="11"
                fill="#64748b"
                textAnchor="middle"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}


function PayoutChart({
  orders,
  commissionPercent,
}: {
  orders: Order[];
  commissionPercent: number;
}) {
  const chartData = useMemo(() => {
    const now = new Date();

    const months = Array.from({ length: 5 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);

      return {
        label: date.toLocaleString("en-US", { month: "short" }),
        month: date.getMonth(),
        year: date.getFullYear(),
        total: 0,
      };
    });

    orders.forEach((order) => {
      const status = String(order.order_status || "").toLowerCase();
      if (status.includes("cancel")) return;

      const payoutAmount =
        Number(order.total || 0) * (Number(commissionPercent || 0) / 100);

      if (!payoutAmount) return;

      const orderDate = new Date(order.created_at);

      const match = months.find(
        (month) =>
          month.month === orderDate.getMonth() &&
          month.year === orderDate.getFullYear()
      );

      if (match) {
        match.total += payoutAmount;
      }
    });

    return months;
  }, [orders, commissionPercent]);

  const maxValue = Math.max(...chartData.map((item) => item.total), 100);

  const width = 600;
  const height = 230;
  const leftPadding = 46;
  const rightPadding = 20;
  const topPadding = 20;
  const bottomPadding = 35;
  const chartWidth = width - leftPadding - rightPadding;
  const chartHeight = height - topPadding - bottomPadding;

  const points = chartData.map((item, index) => {
    const x = leftPadding + (chartWidth / (chartData.length - 1 || 1)) * index;
    const y = topPadding + chartHeight - (item.total / maxValue) * chartHeight;

    return { x, y, ...item };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    topPadding + chartHeight
  } L ${leftPadding} ${topPadding + chartHeight} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">Last 5 Months Payout</h2>
      <p className="mb-5 text-sm text-gray-500">
        Based on seller commission from non-cancelled orders.
      </p>

      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
          {gridLines.map((line) => {
            const y = topPadding + chartHeight - line * chartHeight;
            const value = maxValue * line;

            return (
              <g key={line}>
                <line
                  x1={leftPadding}
                  y1={y}
                  x2={width - rightPadding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text x="8" y={y + 4} fontSize="11" fill="#64748b">
                  ${Math.round(value)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="#dcfce7" opacity="0.75" />

          <path
            d={linePath}
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point) => (
            <g key={`${point.label}-${point.x}`}>
              <circle cx={point.x} cy={point.y} r="4" fill="#22c55e" />
              <text
                x={point.x}
                y={height - 10}
                fontSize="11"
                fill="#64748b"
                textAnchor="middle"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}



export default function AdminClient({ seller }: { seller: string }) {
  const normalizedSeller = seller.toLowerCase();

  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [sellerName, setSellerName] = useState("");
  const [commissionPercent, setCommissionPercent] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>("dashboard");

  useEffect(() => {
  const savedLogin = localStorage.getItem(
    `pepmistry_seller_login_${normalizedSeller}`
  );

  if (savedLogin === "true") {
    setLoggedIn(true);
    loadSellerData();
    loadSellerOrders();
  }
}, []);

  async function loadSellerOrders() {
    setLoading(true);

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("seller_code", normalizedSeller)
      .order("created_at", { ascending: false });

    if (orderError) {
      alert(orderError.message);
      setLoading(false);
      return;
    }

    setOrders(orderData || []);
    setLoading(false);
  }

  async function loadSellerData() {
  const { data } = await supabase
    .from("sellers")
    .select("seller_name, commission_percent")
    .eq("seller_code", normalizedSeller)
    .single();

  if (data) {
    setSellerName(data.seller_name);
    setCommissionPercent(Number(data.commission_percent || 0));
  }
}

  async function handleLogin() {
    setLoading(true);

    const { data: sellerData, error: sellerError } = await supabase
      .from("sellers")
      .select("seller_name, password, commission_percent")
      .eq("seller_code", seller.toLowerCase())

      .single();

    if (sellerError || !sellerData) {
      alert("Seller not found.");
      setLoading(false);
      return;
    }

    const typedSeller = sellerData as SellerData;

    if (typedSeller.password !== password) {
      alert("Invalid password.");
      setLoading(false);
      return;
    }

        setLoggedIn(true);

        localStorage.setItem(
        `pepmistry_seller_login_${normalizedSeller}`,
        "true"
        );

        await loadSellerData();       // ✅ add this
        await loadSellerOrders();
  }

  const totalSales = orders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const estimatedCommission = totalSales * (commissionPercent / 100);

  const unpaidOrders = orders.filter((order) => !order.seller_paid);

  const unpaidSales = unpaidOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const pendingPayout = unpaidSales * (commissionPercent / 100);

  const pendingOrders = orders.filter(
    (order) => order.order_status === "pending" || !order.order_status
  );

  const paidOrders = orders.filter((order) => order.payment_status === "paid");

const tabs = [
  { id: "dashboard" as TabName, label: "Dashboard", icon: <DashboardIcon /> },
  { id: "orders" as TabName, label: "Orders", icon: <OrdersIcon /> },
  { id: "earnings" as TabName, label: "Earnings", icon: <EarningsIcon /> },
];

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 px-5 py-8 text-black">
        <div className="mx-auto max-w-sm rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <img src="/logo.png" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-2xl font-bold">Seller Admin</h1>
              <p className="text-sm text-gray-500">
                Seller:{" "}
                <span className="font-semibold text-black">
                  {normalizedSeller}
                </span>
              </p>
            </div>
          </div>

          <input
            type="password"
            placeholder="Password"
            className="mb-4 w-full rounded-xl border p-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-full bg-black py-3 font-semibold text-white disabled:bg-gray-400"
          >
            {loading ? "Checking..." : "Login"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <SiteHeader seller={normalizedSeller} />

      <main className="px-5 py-6">
        <div className="mb-4 text-sm text-gray-500">
        <span>Seller Portal</span>
        <span className="mx-2 text-gray-300">|</span>
        <span className="font-semibold text-black">
            {sellerName || seller.toUpperCase()}
        </span>
        </div>

        <div className="mb-6 border-b border-gray-200 pb-4">
          <div className="grid grid-cols-3 gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-gray-200 text-black"
                    : "bg-white text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === "dashboard" && (
          <div className="space-y-5">
            <SalesChart orders={orders} />

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Total Sales</p>
                <p className="text-2xl font-bold">${totalSales.toFixed(2)}</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Pending Orders</p>
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Paid Orders</p>
                <p className="text-2xl font-bold">{paidOrders.length}</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Commission</p>
                <p className="text-2xl font-bold">{commissionPercent}%</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Pending Payout</p>
                <p className="text-2xl font-bold">
                  ${pendingPayout.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-bold">Recent Orders</h2>

              {orders.length === 0 ? (
                <p className="text-sm text-gray-500">No orders yet.</p>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex justify-between border-b pb-3 text-sm last:border-b-0"
                    >
                      <div>
                        <p className="font-bold">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.customer_name}
                        </p>
                      </div>
                      <p className="font-bold">
                        ${Number(order.total).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-gray-500 shadow-sm">
                No orders found.
              </div>
            ) : (
              orders.map((order) => {
                const payoutAmount =
                Number(order.total || 0) * (commissionPercent / 100);
                const orderNumber = order.id.slice(0, 8).toUpperCase();

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="font-bold">#{orderNumber}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleString()}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
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

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              order.seller_paid
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            Seller Paid: {order.seller_paid ? "Yes" : "No"}
                          </span>
                        </div>
                      </div>

                      <p className="font-bold">
                        ${Number(order.total).toFixed(2)}
                      </p>
                    </div>

                    <div className="mb-3 text-sm text-gray-600">
                      <p>
                        <b>Customer:</b> {order.customer_name}
                      </p>
                      <p>
                        <b>Email:</b> {order.customer_email}
                      </p>
                      <p>
                        <b>Phone:</b> {order.customer_phone}
                      </p>
                      <p>
                        <b>Payment:</b> {order.payment_method}
                      </p>
                    </div>

                    <div className="mb-3 rounded-xl bg-gray-50 p-3">
                      {order.items?.map((item) => (
                        <p key={item.id} className="text-sm">
                          {item.quantity}x {item.name}
                        </p>
                      ))}
                    </div>

                <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="rounded-full bg-gray-100 px-3 py-2 text-center">
                    {order.tracking_number ? (
                        <span className="font-medium">
                        Tracking:{" "}
                        <a
                            href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                        >
                            {order.tracking_number}
                        </a>
                        </span>
                    ) : (
                    <span className="font-medium">Tracking: N/A</span>
                    )}
                </div>

  <div className="flex items-center justify-center gap-2 rounded-full bg-gray-100 px-3 py-2 font-medium">
    <span>Payout: ${payoutAmount.toFixed(2)}</span>

    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${
        order.seller_paid
          ? "bg-green-100 text-green-700"
          : "bg-yellow-100 text-yellow-700"
      }`}
    >
      {order.seller_paid ? "Paid" : "Pending"}
    </span>
  </div>
</div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === "earnings" && (
          <div className="space-y-4">
            <PayoutChart orders={orders} commissionPercent={commissionPercent} />
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-lg font-bold">Earnings Summary</h2>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Total Sales</p>
                  <p className="font-bold">${totalSales.toFixed(2)}</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Commission</p>
                  <p className="font-bold">{commissionPercent}%</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Estimated Total</p>
                  <p className="font-bold">
                    ${estimatedCommission.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Pending Payout</p>
                  <p className="font-bold">${pendingPayout.toFixed(2)}</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Unpaid Orders</p>
                  <p className="font-bold">{unpaidOrders.length}</p>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Seller Code</p>
                  <p className="font-bold">{normalizedSeller}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-lg font-bold">Payout Status</h2>
              <p className="text-sm text-gray-600">
                Orders marked as <b>Seller Paid: Yes</b> are excluded from
                pending payout.
              </p>
            </div>


            <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-lg font-bold mb-3">Payout History</h3>

            <div className="space-y-2">
                {orders
                .filter((o) => o.payout_date)
                .sort(
                    (a, b) =>
                    new Date(b.payout_date!).getTime() -
                    new Date(a.payout_date!).getTime()
                )
                .map((order) => {
                    const payoutAmount =
                    Number(order.total || 0) *
                    (commissionPercent / 100);

                    return (
                    <div
                        key={order.id}
                        className="flex justify-between items-center rounded-lg bg-gray-50 px-3 py-2 text-sm"
                    >
                        <div>
                        <div className="font-medium">
                            ${payoutAmount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                            {new Date(order.payout_date!).toLocaleString()}
                        </div>
                        </div>

                        <div className="text-right">
                        <div className="text-xs text-gray-600">
                            {order.payout_reference || "No Ref"}
                        </div>

                        <span className="rounded-full bg-green-100 text-green-700 px-2 py-1 text-xs font-semibold">
                            Paid
                        </span>
                        </div>
                    </div>
                    );
                })}

                {orders.filter((o) => o.payout_date).length === 0 && (
                <div className="text-sm text-gray-500">
                    No payouts yet.
                </div>
                )}
            </div>
            </div>



          </div>
        )}
      </main>
    </div>
  );
}
