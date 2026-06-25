"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import SiteHeader from "@/components/SiteHeader";

type OrderItem = {
  id: number;
  product_code?: string;
  name: string;
  price: number;
  quantity: number;
  line_total?: number;
};

type PaymentMethod = {
  id: string;
  name: string;
  display_label: string;
  enabled: boolean;
  account_value: string | null;
  instructions: string | null;
  theme_light: string | null;
  theme_border: string | null;
  theme_text: string | null;
  sort_order: number;
};

type Order = {
  id: string;
  created_at: string;
  seller_code: string;
  customer_name: string;
  customer_email: string;
  order_number: string;
  customer_phone: string;
  customer_address: string;
  payment_method: string;
  items: OrderItem[];
  total: number;
  order_status: string | null;
  payment_status: string | null;
  tracking_number: string | null;
  seller_paid: boolean | null;
  payout_date: string | null;
  payout_reference: string | null;
  inventory_restocked: boolean;
};

type SiteSettings = {
  id: string;
  site_name: string;
  logo_url: string | null;
  email_logo_url: string | null;
  contact_email: string | null;
  whatsapp_number: string | null;
  tiktok_url: string | null;
  footer_text: string | null;
  reseller_mode_enabled: boolean;
  show_reference_code: boolean;
  default_seller_code: string | null;
  primary_color: string | null;
};


type Seller = {
  seller_code: string;
  seller_name: string;
  commission_percent: number;
};

type InventoryItem = {
  id: string;
  product_code: string;
  product_name: string;
  product_spec: string | null;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string | null;
  active: boolean;
  visible_when_out_of_stock: boolean;
};


type ProductVariant = {
  id: string;
  product_id: string;
  product_code: string;
  label: string;
  image_url: string | null;
  price_zone1: number;
  price_zone2: number;
  stock_quantity: number;
  low_stock_threshold: number;
  active: boolean;
  visible_when_out_of_stock: boolean;
  theme_light: string | null;
  theme_border: string | null;
  theme_text: string | null;
  kit_description: string | null;
  kit_items: string[] | null;

  protocol_image_url: string | null;
  coa_image_url: string | null;
  sort_order: number;
  product_name?: string;
};

type TabName = "dashboard" | "orders" | "earnings" | "products" | "settings" | "payments";

const MASTER_PASSWORD = "admin123";




function statusBadgeClass(status: string | null) {
  const value = status || "pending";

  if (value === "paid" || value === "delivered") return "bg-green-100 text-green-700";
  if (value === "shipped" || value === "processing") return "bg-blue-100 text-blue-700";
  if (value === "cancelled" || value === "refunded") return "bg-red-100 text-red-700";

  return "bg-yellow-100 text-yellow-700";
}

function DashboardIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M21 8l-9-5-9 5 9 5 9-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 13v8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function EarningsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M12 2v20M17 7.5c0-2-2-3-5-3s-5 1-5 3 2 3 5 3 5 1 5 3-2 3-5 3-5-1-5-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function InventoryIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h16M6 7v13h12V7M9 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7V4h8v3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
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
      }
    });

    return months;
  }, [orders]);

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

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${topPadding + chartHeight
    } L ${leftPadding} ${topPadding + chartHeight} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="rounded-[24px] border border-[#E6E0D8] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#5F554C]">Last 5 Months Sales</h2>
      <p className="mb-5 text-sm text-[#6F655C]">
        Based on non-cancelled orders.
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
                  stroke="#E6E0D8"
                  strokeWidth="1"
                />
                <text x="8" y={y + 4} fontSize="11" fill="#7F756B">
                  ${Math.round(value)}
                </text>
              </g>
            );
          })}

          <path d={areaPath} fill="#F0ECE6" opacity="0.9" />
          <path
            d={linePath}
            fill="none"
            stroke="#A79B8E"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point) => (
            <g key={`${point.label}-${point.x}`}>
              <circle cx={point.x} cy={point.y} r="4.5" fill="#A79B8E" />
              <text x={point.x} y={height - 10} fontSize="11" fill="#7F756B" textAnchor="middle">
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function MasterAdminClient() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
  const savedAdminSession = sessionStorage.getItem(
    "ae_elixir_admin_logged_in"
  );

  if (savedAdminSession === "true") {
    setLoggedIn(true);
    loadData();
  }
}, []);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentDrafts, setPaymentDrafts] = useState<
    Record<string, Partial<PaymentMethod>>
  >({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderDrafts, setOrderDrafts] = useState<
    Record<string, Partial<Order>>
  >({});
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [expandedVariants, setExpandedVariants] = useState<
    Record<string, boolean>
  >({});
  const [adminProducts, setAdminProducts] = useState<any[]>([]);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, Partial<ProductVariant>>>({});
  const [showAddProduct, setShowAddProduct] = useState(false);

  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [siteSettingsDraft, setSiteSettingsDraft] = useState<Partial<SiteSettings>>({});

  const [newProduct, setNewProduct] = useState({
    name: "",
    slug: "",
    category: "",
    description: "",
  });

  const [showAddVariant, setShowAddVariant] = useState(false);

  const [newVariant, setNewVariant] = useState({
    product_id: "",
    product_code: "",
    label: "",
    price_zone1: 0,
    price_zone2: 0,
    stock_quantity: 0,
  });

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>("dashboard");

  async function loadData() {
    setLoading(true);

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (orderError) {
      alert(orderError.message);
      setLoading(false);
      return;
    }

    const { data: settingsData, error: settingsError } = await supabase
      .from("site_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError) {
      console.error("SETTINGS LOAD ERROR:", settingsError);
    } else {
      setSiteSettings(settingsData);
      setSiteSettingsDraft({});
    }

    const { data: paymentData, error: paymentError } = await supabase
      .from("payment_methods")
      .select("*")
      .order("sort_order", { ascending: true });

    if (paymentError) {
      console.error("PAYMENT METHODS LOAD ERROR:", paymentError);
    } else {
      setPaymentMethods(paymentData || []);
      setPaymentDrafts({});
    }

    const { data: sellerData, error: sellerError } = await supabase
      .from("sellers")
      .select("seller_code, seller_name, commission_percent");

    if (sellerError) {
      alert(sellerError.message);
      setLoading(false);
      return;
    }

    const { data: inventoryData, error: inventoryError } = await supabase
      .from("inventory")
      .select("*")
      .order("product_name", { ascending: true });

    if (inventoryError) {
      alert(inventoryError.message);
      setLoading(false);
      return;
    }

    const { data: variantData, error: variantError } = await supabase
      .from("product_variants")
      .select("*")
      .order("sort_order", { ascending: true });

    if (variantError) {
      alert(variantError.message);
      setLoading(false);
      return;
    }

    const { data: adminProductsData, error: adminProductsError } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });

    if (adminProductsError) {
      alert(adminProductsError.message);
      setLoading(false);
      return;
    }

    setOrders(orderData || []);
    setSellers(sellerData || []);
    setInventory(inventoryData || []);
    setAdminProducts(adminProductsData || []);
    setProductVariants(
      (variantData || []).map((variant: any) => ({
        ...variant,
        product_name: variant.product_code,
      }))
    );
    setLoading(false);
  }

async function handleLogin() {
  if (password !== MASTER_PASSWORD) {
    alert("Invalid password.");
    return;
  }

  sessionStorage.setItem(
    "ae_elixir_admin_logged_in",
    "true"
  );
  
  window.dispatchEvent(
  new Event("ae-admin-auth-change")
);

  setLoggedIn(true);

  
  setPassword("");
  await loadData();
}


  function updatePaymentDraft(
    paymentId: string,
    updates: Partial<PaymentMethod>
  ) {
    setPaymentDrafts((current) => ({
      ...current,
      [paymentId]: {
        ...current[paymentId],
        ...updates,
      },
    }));
  }

  async function savePaymentMethod(paymentId: string) {
    const updates = paymentDrafts[paymentId];

    if (!updates || Object.keys(updates).length === 0) return;

    const { error } = await supabase
      .from("payment_methods")
      .update(updates)
      .eq("id", paymentId);

    if (error) {
      alert(error.message);
      return;
    }

    setPaymentMethods((current) =>
      current.map((method) =>
        method.id === paymentId ? { ...method, ...updates } : method
      )
    );

    setPaymentDrafts((current) => {
      const copy = { ...current };
      delete copy[paymentId];
      return copy;
    });
  }

  async function restockInventoryForOrder(order: Order) {
    if (order.inventory_restocked) return;

    for (const item of order.items || []) {
      if (!item.product_code) continue;

      const { data, error } = await supabase
        .from("inventory")
        .select("stock_quantity")
        .eq("product_code", item.product_code)
        .single();

      if (error || !data) {
        throw new Error(`Inventory item not found: ${item.name}`);
      }

      const newStock = Number(data.stock_quantity || 0) + Number(item.quantity || 0);

      const { error: updateError } = await supabase
        .from("inventory")
        .update({ stock_quantity: newStock })
        .eq("product_code", item.product_code);

      if (updateError) {
        throw new Error(`Could not restock ${item.name}`);
      }
    }
  }

  function updateOrderDraft(
    orderId: string,
    updates: Partial<Order>
  ) {
    setOrderDrafts((current) => ({
      ...current,
      [orderId]: {
        ...current[orderId],
        ...updates,
      },
    }));
  }

  async function saveOrder(orderId: string) {
    const updates = orderDrafts[orderId];

    if (!updates || Object.keys(updates).length === 0) {
      return;
    }

    const order = orders.find((item) => item.id === orderId);

    await updateOrder(orderId, updates);

    const newTrackingNumber = updates.tracking_number;
    const oldTrackingNumber = order?.tracking_number;

if (
  newTrackingNumber &&
  newTrackingNumber !== oldTrackingNumber &&
  order?.customer_email
) {
  const displayOrderNumber = order.id
    .slice(0, 8)
    .toUpperCase();

  const trackingEmailResponse = await fetch(
    "/api/send-tracking-email",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderNumber: displayOrderNumber,
        customerName: order.customer_name || "",
        customerEmail: order.customer_email,
        trackingNumber: newTrackingNumber,
      }),
    }
  );

  const trackingEmailResult =
    await trackingEmailResponse.json();

  if (!trackingEmailResponse.ok) {
    console.error(
      "Tracking email failed:",
      trackingEmailResult
    );

    alert(
      trackingEmailResult?.error ||
        "Order saved, but the tracking email could not be sent."
    );
  } else {
    console.log(
      "Tracking email sent successfully:",
      trackingEmailResult
    );
  }
}

    setOrderDrafts((current) => {
      const copy = { ...current };
      delete copy[orderId];
      return copy;
    });
  }

  async function updateOrder(orderId: string, updates: Partial<Order>) {
    const currentOrder = orders.find((order) => order.id === orderId);

    if (updates.payout_date) {
      updates.seller_paid = true;
    }

    if (
      currentOrder &&
      updates.order_status === "cancelled" &&
      !currentOrder.inventory_restocked
    ) {
      try {
        await restockInventoryForOrder(currentOrder);
        updates.inventory_restocked = true;
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Could not restock inventory."
        );
        return;
      }
    }

    const { error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", orderId);

    if (error) {
      alert(error.message);
      return;
    }

    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order
      )
    );

    await loadData();
  }

  async function updateInventory(itemId: string, updates: Partial<InventoryItem>) {
    const { error } = await supabase
      .from("inventory")
      .update(updates)
      .eq("id", itemId);

    if (error) {
      console.error("SAVE PRODUCT VARIANT ERROR:", error);
      alert(error.message);
      return;
    }

    setInventory((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      )
    );
  }

  function updateSiteSettingsDraft(updates: Partial<SiteSettings>) {
    setSiteSettingsDraft((current) => ({
      ...current,
      ...updates,
    }));
  }

  async function saveSiteSettings() {
    if (!siteSettings) return;

    const { error } = await supabase
      .from("site_settings")
      .update(siteSettingsDraft)
      .eq("id", siteSettings.id);

    if (error) {
      alert(error.message);
      return;
    }

    setSiteSettings({
      ...siteSettings,
      ...siteSettingsDraft,
    });

    setSiteSettingsDraft({});
  }


  async function uploadVariantFile(
    variantId: string,
    file: File,
    bucket: "product-images" | "protocol-images" | "coa-images",
    field: "image_url" | "protocol_image_url" | "coa_image_url"
  ) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${variantId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        upsert: true,
      });

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

    updateVariantDraft(variantId, {
      [field]: data.publicUrl,
    } as Partial<ProductVariant>);
  }

  function updateVariantDraft(
    variantId: string,
    updates: Partial<ProductVariant>
  ) {
    setVariantDrafts((current) => ({
      ...current,
      [variantId]: {
        ...current[variantId],
        ...updates,
      },
    }));
  }

  async function updateProductButtonSetting(
    productId: string,
    field:
      | "show_protocol_button"
      | "show_coa_button"
      | "show_kit_button",
    value: boolean
  ) {
    const { error } = await supabase
      .from("products")
      .update({ [field]: value })
      .eq("id", productId);

    if (error) {
      alert(error.message);
      return;
    }

    setAdminProducts((current) =>
      current.map((product) =>
        product.id === productId
          ? {
            ...product,
            [field]: value,
          }
          : product
      )
    );
  }

  async function saveProductVariant(variantId: string) {
    const updates = variantDrafts[variantId];

    if (!updates || Object.keys(updates).length === 0) {
      return;
    }

    const { error } = await supabase
      .from("product_variants")
      .update(updates)
      .eq("id", variantId);

    if (error) {
      alert(error.message);
      return;
    }

    setProductVariants((current) =>
      current.map((variant) =>
        variant.id === variantId ? { ...variant, ...updates } : variant
      )
    );

    setVariantDrafts((current) => {
      const copy = { ...current };
      delete copy[variantId];
      return copy;
    });
  }

  async function createProduct() {
    if (!newProduct.name.trim()) {
      alert("Product name is required.");
      return;
    }

    const slug =
      newProduct.slug.trim() ||
      newProduct.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const nextSortOrder = productVariants.length + 1;

    const { error } = await supabase.from("products").insert({
      name: newProduct.name.trim(),
      slug,
      category: newProduct.category.trim(),
      description: newProduct.description.trim(),
      active: true,
      show_kit_button: true,
      show_protocol_button: true,
      show_coa_button: true,
      sort_order: nextSortOrder,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewProduct({
      name: "",
      slug: "",
      category: "",
      description: "",
    });

    setShowAddProduct(false);
    await loadData();
  }



  async function createVariant() {
    if (!newVariant.product_id) {
      alert("Select a product.");
      return;
    }

    if (!newVariant.product_code.trim()) {
      alert("Product code is required.");
      return;
    }

    if (!newVariant.label.trim()) {
      alert("Variant label is required.");
      return;
    }

    const { error } = await supabase.from("product_variants").insert({
      product_id: newVariant.product_id,
      product_code: newVariant.product_code.trim(),
      label: newVariant.label.trim(),
      image_url: "/placeholder.png",
      price_zone1: Number(newVariant.price_zone1 || 0),
      price_zone2: Number(newVariant.price_zone2 || 0),
      stock_quantity: Number(newVariant.stock_quantity || 0),
      low_stock_threshold: 5,
      active: true,
      visible_when_out_of_stock: true,
      theme_light: "bg-gray-50",
      theme_border: "border-gray-200",
      theme_text: "text-gray-700",
      kit_description: "",
      kit_items: [],
      protocol_image_url: "",
      coa_image_url: "",
      sort_order: productVariants.length + 1,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewVariant({
      product_id: "",
      product_code: "",
      label: "",
      price_zone1: 0,
      price_zone2: 0,
      stock_quantity: 0,
    });

    setShowAddVariant(false);
    await loadData();
  }


  function toggleVariantExpanded(variantId: string) {
    setExpandedVariants((current) => ({
      ...current,
      [variantId]: !current[variantId],
    }));
  }



  async function deactivateVariant(variantId: string) {
    const confirmArchive = confirm(
      "Hide this variant from the shop? You can reactivate it later."
    );

    if (!confirmArchive) return;

    const { error } = await supabase
      .from("product_variants")
      .update({ active: false })
      .eq("id", variantId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadData();
  }



  function cancelProductVariantDraft(variantId: string) {
    setVariantDrafts((current) => {
      const copy = { ...current };
      delete copy[variantId];
      return copy;
    });
  }


  function getSellerInfo(sellerCode: string) {
    return sellers.find((seller) => seller.seller_code === sellerCode);
  }

  const totalSales = orders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const unpaidSellerOrders = orders.filter((order) => !order.seller_paid);

  const pendingOrders = orders.filter(
    (order) => order.order_status === "pending" || !order.order_status
  );

  const paidOrders = orders.filter((order) => order.payment_status === "paid");

  const lowStockItems = productVariants.filter(
    (item) => item.stock_quantity > 0 && item.stock_quantity <= item.low_stock_threshold
  );

  const outOfStockItems = productVariants.filter((item) => item.stock_quantity <= 0);

  const sellerSummaries = sellers.map((seller) => {
    const sellerOrders = orders.filter(
      (order) => order.seller_code === seller.seller_code
    );

    const total_sales = sellerOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    const unpaidOrders = sellerOrders.filter((order) => !order.seller_paid);

    return {
      seller_code: seller.seller_code,
      seller_name: seller.seller_name,
      commission_percent: Number(seller.commission_percent || 0),
      total_sales,
      estimated_commission:
        total_sales * (Number(seller.commission_percent || 0) / 100),
      orders_count: sellerOrders.length,
      unpaid_orders_count: unpaidOrders.length,
    };
  });

  const tabs: { id: TabName; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
    { id: "orders", label: "Orders", icon: <OrdersIcon /> },
    { id: "earnings", label: "Earnings", icon: <EarningsIcon /> },
    { id: "products", label: "Products", icon: <InventoryIcon /> },
    { id: "settings", label: "Settings", icon: <DashboardIcon /> },
    { id: "payments", label: "Payments", icon: <DashboardIcon /> },
  ];

if (!loggedIn) {
  return (
    <div className="flex min-h-[calc(100dvh-220px)] items-center justify-center bg-gray-50 px-5 py-8 text-black">
      <div className="w-full max-w-sm rounded-[24px] border border-[#E6E0D8] bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col items-center text-center">
          <img
            src="/logo-icon.png"
            alt="AE Elixir"
            className="mb-3 h-16 w-16 object-contain"
          />

          <h1 className="text-2xl font-bold text-[#5F554C]">
            Master Admin
          </h1>

          <p className="mt-1 text-sm text-[#6F655C]">
            Enter master password to continue.
          </p>
        </div>

        <input
          type="password"
          placeholder="Master Password"
          className="mb-4 w-full rounded-xl border border-[#D8D1C8] bg-white p-3 text-black outline-none transition focus:border-[#A79B8E] focus:ring-2 focus:ring-[#A79B8E]/20"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleLogin();
            }
          }}
        />

        <button
          onClick={handleLogin}
          className="w-full rounded-full bg-[#A79B8E] py-3 font-semibold text-white shadow-sm transition-all hover:bg-[#978D82] active:scale-95"
        >
          Login
        </button>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-5 py-6">
        <div className="mb-5">
          <p className="text-xs text-gray-500">Master Portal</p>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        <div className="mb-6 border-b border-[#E6E0D8] pb-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-sm font-semibold shadow-sm transition-all active:scale-95 ${activeTab === tab.id
                  ? "border-[#A79B8E] bg-[#A79B8E] text-white"
                  : "border-[#D8D1C8] bg-white text-[#5F554C] hover:bg-[#F6F3EF] hover:text-[#A79B8E]"
                  }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
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
                <p className="text-xs text-gray-500">Low Stock</p>
                <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
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
                        <p className="font-bold">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-gray-500">
                          {order.customer_name}
                        </p>
                      </div>
                      <p className="font-bold">${Number(order.total).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "orders" && (
          <div className="space-y-4">
            {orders.map((order) => {
              const orderNumber = order.id.slice(0, 8).toUpperCase();

              return (
                <div key={order.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-bold">#{orderNumber}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </p>


                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(order.order_status)}`}>
                          Order: {order.order_status || "pending"}
                        </span>

                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(order.payment_status)}`}>
                          Payment: {order.payment_status || "pending"}
                        </span>


                      </div>
                    </div>

                    <p className="font-bold">${Number(order.total).toFixed(2)}</p>
                  </div>

                  <div className="mb-3 text-sm text-gray-600">
                    <p><b>Customer:</b> {order.customer_name}</p>
                    <p><b>Email:</b> {order.customer_email}</p>
                    <p><b>Phone:</b> {order.customer_phone}</p>
                    <p><b>Address:</b> {order.customer_address}</p>
                    <p><b>Payment Method:</b> {order.payment_method}</p>
                  </div>

                  <div className="mb-4 rounded-xl bg-gray-50 p-3">
                    {order.items?.map((item) => (
                      <p key={item.id} className="text-sm">
                        {item.quantity}x {item.name}
                      </p>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <select
                      className="w-full rounded-xl border p-3"
                      value={
                        orderDrafts[order.id]?.order_status ??
                        order.order_status ??
                        "pending"
                      }
                      onChange={(e) =>
                        updateOrderDraft(order.id, {
                          order_status: e.target.value
                        })
                      }
                    >
                      <option value="pending">Order Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                      className="w-full rounded-xl border p-3"
                      value={
                        orderDrafts[order.id]?.payment_status ??
                        order.payment_status ??
                        "pending"
                      }
                      onChange={(e) =>
                        updateOrderDraft(order.id, { payment_status: e.target.value })
                      }
                    >
                      <option value="pending">Payment Pending</option>
                      <option value="paid">Paid</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </select>

                    <input
                      className="w-full rounded-xl border p-3"
                      placeholder="Tracking Number"
                      value={
                        orderDrafts[order.id]?.tracking_number ??
                        order.tracking_number ??
                        ""
                      }
                      onChange={(e) =>
                        updateOrderDraft(order.id, {
                          tracking_number: e.target.value || null,
                        })
                      }
                    />







                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => saveOrder(order.id)}
                        disabled={!orderDrafts[order.id]}
                        className={`rounded-xl px-4 py-3 text-sm font-semibold ${orderDrafts[order.id]
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-gray-50 text-gray-400 border border-gray-200"
                          }`}
                      >
                        Save Order
                      </button>

                      <button
                        onClick={() =>
                          setOrderDrafts((current) => {
                            const copy = { ...current };
                            delete copy[order.id];
                            return copy;
                          })
                        }
                        disabled={!orderDrafts[order.id]}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "earnings" && (
          <div className="space-y-4">
            {sellerSummaries.length === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-gray-500 shadow-sm">
                No sellers / affiliates found.
              </div>
            ) : (
              sellerSummaries.map((summary) => (
                <div key={summary.seller_code} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-bold">{summary.seller_name}</p>
                      <p className="text-xs text-gray-500">Code: {summary.seller_code}</p>
                    </div>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">
                      {summary.commission_percent}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Orders</p>
                      <p className="font-bold">{summary.orders_count}</p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Unpaid</p>
                      <p className="font-bold">{summary.unpaid_orders_count}</p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Sales</p>
                      <p className="font-bold">${summary.total_sales.toFixed(2)}</p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Est. Payout</p>
                      <p className="font-bold">${summary.estimated_commission.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "products" && (
          <div className="space-y-4">
            <div className="rounded-[24px] border border-[#E6E0D8] bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#5F554C]">Products</h2>
                  <p className="mt-1 max-w-md text-sm leading-6 text-[#6F655C]">
                    Manage products, variants, prices, stock, images, protocols, and kit details.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <button
                    onClick={() => setShowAddProduct((value) => !value)}
                    className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#A79B8E] px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#978D82] active:scale-95 sm:min-w-[150px]"
                  >
                    <span className="text-xl leading-none">＋</span>
                    <span className="hidden sm:inline">Add Product</span>
                    <span className="sm:hidden">Product</span>
                  </button>

                  <button
                    onClick={() => setShowAddVariant((value) => !value)}
                    className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#A79B8E] px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#978D82] active:scale-95 sm:min-w-[150px]"
                  >
                    <span className="text-xl leading-none">＋</span>
                    <span className="hidden sm:inline">Add Variant</span>
                    <span className="sm:hidden">Variant</span>
                  </button>
                </div>
              </div>
            </div>





            {showAddProduct && (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-lg font-bold">Add Product</h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs text-gray-500">
                    Product Name
                    <input
                      type="text"
                      value={newProduct.name}
                      onChange={(e) =>
                        setNewProduct((current) => ({
                          ...current,
                          name: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border p-3 text-black"
                      placeholder="Retatrutide"
                    />
                  </label>

                  <label className="text-xs text-gray-500">
                    Slug
                    <input
                      type="text"
                      value={newProduct.slug}
                      onChange={(e) =>
                        setNewProduct((current) => ({
                          ...current,
                          slug: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border p-3 text-black"
                      placeholder="retatrutide"
                    />
                  </label>

                  <label className="text-xs text-gray-500">
                    Category
                    <input
                      type="text"
                      value={newProduct.category}
                      onChange={(e) =>
                        setNewProduct((current) => ({
                          ...current,
                          category: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border p-3 text-black"
                      placeholder="GLP / Weight Loss"
                    />
                  </label>

                  <label className="text-xs text-gray-500 sm:col-span-2">
                    Description
                    <textarea
                      value={newProduct.description}
                      onChange={(e) =>
                        setNewProduct((current) => ({
                          ...current,
                          description: e.target.value,
                        }))
                      }
                      className="mt-1 min-h-[90px] w-full rounded-xl border p-3 text-black"
                      placeholder="Short product description"
                    />
                  </label>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={createProduct}
                    className="flex h-11 w-36 items-center justify-center gap-2 rounded-2xl border border-green-200 bg-green-50 text-sm font-semibold text-green-700 transition-all active:scale-95"
                  >
                    Create
                  </button>

                  <button
                    onClick={() => setShowAddProduct(false)}
                    className="flex h-11 w-36 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>





            )}



            {showAddVariant && (
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-lg font-bold">Add Variant</h3>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs text-gray-500">
                    Product
                    <select
                      value={newVariant.product_id}
                      onChange={(e) =>
                        setNewVariant((current) => ({
                          ...current,
                          product_id: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border p-3 text-black"
                    >
                      <option value="">Select product</option>
                      {adminProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs text-gray-500">
                    Variant Label
                    <input
                      type="text"
                      value={newVariant.label}
                      onChange={(e) =>
                        setNewVariant((current) => ({
                          ...current,
                          label: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border p-3 text-black"
                      placeholder="10mg"
                    />
                  </label>

                  <label className="text-xs text-gray-500">
                    Product Code
                    <input
                      type="text"
                      value={newVariant.product_code}
                      onChange={(e) =>
                        setNewVariant((current) => ({
                          ...current,
                          product_code: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-xl border p-3 text-black"
                      placeholder="test-product-10mg"
                    />
                  </label>

                  <label className="text-xs text-gray-500">
                    Stock
                    <input
                      type="number"
                      value={newVariant.stock_quantity}
                      onChange={(e) =>
                        setNewVariant((current) => ({
                          ...current,
                          stock_quantity: Number(e.target.value || 0),
                        }))
                      }
                      className="mt-1 w-full rounded-xl border p-3 text-black"
                    />
                  </label>

                  <label className="text-xs text-gray-500">
                    Price Zone 1
                    <input
                      type="number"
                      value={newVariant.price_zone1}
                      onChange={(e) =>
                        setNewVariant((current) => ({
                          ...current,
                          price_zone1: Number(e.target.value || 0),
                        }))
                      }
                      className="mt-1 w-full rounded-xl border p-3 text-black"
                    />
                  </label>

                  <label className="text-xs text-gray-500">
                    Price Zone 2
                    <input
                      type="number"
                      value={newVariant.price_zone2}
                      onChange={(e) =>
                        setNewVariant((current) => ({
                          ...current,
                          price_zone2: Number(e.target.value || 0),
                        }))
                      }
                      className="mt-1 w-full rounded-xl border p-3 text-black"
                    />
                  </label>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={createVariant}
                    className="flex h-11 w-36 items-center justify-center gap-2 rounded-2xl border border-green-200 bg-green-50 text-sm font-semibold text-green-700 transition-all active:scale-95"
                  >
                    Create
                  </button>

                  <button
                    onClick={() => setShowAddVariant(false)}
                    className="flex h-11 w-36 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}


            {productVariants.length === 0 ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-gray-500 shadow-sm">
                No product variants found.
              </div>
            ) : (
              productVariants.map((variant) => {
                const draft = variantDrafts[variant.id] || {};

                const parentProduct = adminProducts.find(
                  (product) => product.id === variant.product_id
                );
                const currentStock = draft.stock_quantity ?? variant.stock_quantity;
                const currentLowStock =
                  draft.low_stock_threshold ?? variant.low_stock_threshold;
                const currentActive = draft.active ?? variant.active;
                const currentVisibleWhenOut =
                  draft.visible_when_out_of_stock ??
                  variant.visible_when_out_of_stock;

                const isOut = Number(currentStock) <= 0;
                const isLow =
                  Number(currentStock) > 0 &&
                  Number(currentStock) <= Number(currentLowStock);
                const hasChanges = Boolean(variantDrafts[variant.id]);

                return (
                  <div
                    key={variant.id}
                    className={`rounded-[24px] border border-[#E6E0D8] bg-white p-4 shadow-sm ${!variant.active ? "opacity-50" : ""
                      }`}
                  >
                    <div className="mb-4 grid grid-cols-[72px_1fr] gap-4 sm:grid-cols-[80px_1fr_auto_auto] sm:items-center">
                      {variant.image_url ? (
                        <img
                          src={variant.image_url}
                          className="h-[72px] w-[72px] rounded-2xl bg-[#F6F3EF] object-contain sm:h-20 sm:w-20"
                          alt={variant.product_name}
                        />
                      ) : (
                        <div className="h-[72px] w-[72px] rounded-2xl bg-[#F6F3EF] sm:h-20 sm:w-20" />
                      )}

                      <div className="min-w-0">
                        <p className="break-words text-base font-bold leading-tight text-[#1F1A17] sm:text-lg">
                          {variant.product_name} {variant.label}
                        </p>
                        <p className="mt-1 break-words text-xs leading-5 text-[#9A9188]">
                          {variant.product_code}
                        </p>
                      </div>

                      <div className="col-span-2 flex justify-start sm:col-span-1 sm:justify-center">
                        <span
                          className={`rounded-full px-4 py-1.5 text-xs font-bold shadow-sm ${isOut
                            ? "bg-red-100 text-red-700"
                            : isLow
                              ? "bg-[#F8E8D8] text-[#9A5A1E]"
                              : "bg-[#A79B8E] text-white"
                            }`}
                        >
                          {isOut ? "Out" : isLow ? "Low" : "In Stock"}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleVariantExpanded(variant.id)}
                        className="col-span-2 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-[#D8D1C8] bg-white px-4 text-sm font-bold text-[#5F554C] shadow-sm transition-all hover:bg-[#F6F3EF] active:scale-95 sm:col-span-1 sm:w-[132px]"
                      >
                        <span>{isOut ? "Out" : isLow ? "Low" : "In Stock"}</span>
                        <span className="text-[#A79B8E]">
                          {expandedVariants[variant.id] ? "▲" : "▼"}
                        </span>
                      </button>
                    </div>






                    {expandedVariants[variant.id] && (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <label className="text-xs text-gray-500">
                          Price Zone 1
                          <input
                            type="number"
                            className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-black outline-none focus:border-black"
                            value={draft.price_zone1 ?? variant.price_zone1}
                            onChange={(e) =>
                              updateVariantDraft(variant.id, {
                                price_zone1: Number(e.target.value || 0),
                              })
                            }
                          />
                        </label>

                        <label className="text-xs text-gray-500">
                          Price Zone 2
                          <input
                            type="number"
                            className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-black outline-none focus:border-black"
                            value={draft.price_zone2 ?? variant.price_zone2}
                            onChange={(e) =>
                              updateVariantDraft(variant.id, {
                                price_zone2: Number(e.target.value || 0),
                              })
                            }
                          />
                        </label>

                        <label className="text-xs text-gray-500">
                          Stock
                          <input
                            type="number"
                            className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-black outline-none focus:border-black"
                            value={draft.stock_quantity ?? variant.stock_quantity}
                            onChange={(e) =>
                              updateVariantDraft(variant.id, {
                                stock_quantity: Number(e.target.value || 0),
                              })
                            }
                          />
                        </label>

                        <label className="text-xs text-gray-500">
                          Low Stock Alert
                          <input
                            type="number"
                            className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-black outline-none focus:border-black"
                            value={
                              draft.low_stock_threshold ??
                              variant.low_stock_threshold
                            }
                            onChange={(e) =>
                              updateVariantDraft(variant.id, {
                                low_stock_threshold: Number(e.target.value || 0),
                              })
                            }
                          />
                        </label>


                        <div className="col-span-2 space-y-3">
                          <label className="text-xs text-gray-500">
                            Kit Description
                            <textarea
                              className="mt-1 min-h-[90px] w-full rounded-xl border p-3 text-sm text-black"
                              value={
                                variantDrafts[variant.id]?.kit_description ??
                                variant.kit_description ??
                                ""
                              }
                              onChange={(e) =>
                                updateVariantDraft(variant.id, {
                                  kit_description: e.target.value,
                                })
                              }
                              placeholder="Short description shown in the kit modal"
                            />
                          </label>

                          <label className="text-xs text-gray-500">
                            Kit Includes
                            <textarea
                              className="mt-1 min-h-[110px] w-full rounded-xl border p-3 text-sm text-black"
                              value={
                                Array.isArray(variantDrafts[variant.id]?.kit_items)
                                  ? (variantDrafts[variant.id]?.kit_items as string[]).join("\n")
                                  : Array.isArray(variant.kit_items)
                                    ? variant.kit_items.join("\n")
                                    : ""
                              }
                              onChange={(e) =>
                                updateVariantDraft(variant.id, {
                                  kit_items: e.target.value
                                    .split("\n")
                                    .map((item) => item.trim())
                                    .filter(Boolean),
                                })
                              }
                              placeholder={`1x Vial\n1x BAC Water\nAlcohol Pads\nSyringes\nFree Shipping`}
                            />
                          </label>

                          <label className="text-xs text-gray-500">
                            Protocol Image URL
                            <input
                              type="text"
                              className="mt-1 w-full rounded-xl border p-3 text-sm text-black"
                              value={
                                variantDrafts[variant.id]?.protocol_image_url ??
                                variant.protocol_image_url ??
                                ""
                              }
                              onChange={(e) =>
                                updateVariantDraft(variant.id, {
                                  protocol_image_url: e.target.value,
                                })
                              }
                              placeholder="Upload image or paste URL"
                            />
                          </label>

                          <label className="text-xs text-gray-500">
                            COA Image URL
                            <input
                              type="text"
                              className="mt-1 w-full rounded-xl border p-3 text-sm text-black"
                              value={
                                variantDrafts[variant.id]?.coa_image_url ??
                                variant.coa_image_url ??
                                ""
                              }
                              onChange={(e) =>
                                updateVariantDraft(variant.id, {
                                  coa_image_url: e.target.value,
                                })
                              }
                              placeholder="Upload image or paste URL"
                            />
                          </label>
                        </div>

                        {parentProduct && (
                          <div className="col-span-2 rounded-2xl border border-[#E6E0D8] bg-[#FBFAF8] p-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#7F756B]">
                              Product Card Buttons
                            </p>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <button
                                type="button"
                                onClick={() =>
                                  updateProductButtonSetting(
                                    parentProduct.id,
                                    "show_protocol_button",
                                    !(parentProduct.show_protocol_button !== false)
                                  )
                                }
                                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${parentProduct.show_protocol_button !== false
                                    ? "border-[#A79B8E] bg-[#A79B8E] text-white"
                                    : "border-[#D8D1C8] bg-white text-[#7F756B]"
                                  }`}
                              >
                                Protocol:{" "}
                                {parentProduct.show_protocol_button !== false
                                  ? "Shown"
                                  : "Hidden"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateProductButtonSetting(
                                    parentProduct.id,
                                    "show_coa_button",
                                    !(parentProduct.show_coa_button !== false)
                                  )
                                }
                                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${parentProduct.show_coa_button !== false
                                    ? "border-[#A79B8E] bg-[#A79B8E] text-white"
                                    : "border-[#D8D1C8] bg-white text-[#7F756B]"
                                  }`}
                              >
                                COA:{" "}
                                {parentProduct.show_coa_button !== false
                                  ? "Shown"
                                  : "Hidden"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateProductButtonSetting(
                                    parentProduct.id,
                                    "show_kit_button",
                                    !(parentProduct.show_kit_button !== false)
                                  )
                                }
                                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${parentProduct.show_kit_button !== false
                                    ? "border-[#A79B8E] bg-[#A79B8E] text-white"
                                    : "border-[#D8D1C8] bg-white text-[#7F756B]"
                                  }`}
                              >
                                Kit:{" "}
                                {parentProduct.show_kit_button !== false
                                  ? "Shown"
                                  : "Hidden"}
                              </button>
                            </div>

                            <p className="mt-3 text-xs leading-5 text-[#9A9188]">
                              These settings apply to every variant under this product.
                            </p>
                          </div>
                        )}

                        <div className="col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <label className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-700 shadow-sm transition active:scale-95">
                            Product Image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                uploadVariantFile(variant.id, file, "product-images", "image_url");
                              }}
                            />
                          </label>

                          <label className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-700 shadow-sm transition active:scale-95">
                            Protocol Image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                uploadVariantFile(
                                  variant.id,
                                  file,
                                  "protocol-images",
                                  "protocol_image_url"
                                );
                              }}
                            />
                          </label>

                          <label className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 text-sm font-semibold text-gray-700 shadow-sm transition active:scale-95">
                            COA Image
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                uploadVariantFile(variant.id, file, "coa-images", "coa_image_url");
                              }}
                            />
                          </label>
                        </div>



                        <div className="col-span-2 grid grid-cols-2 gap-3">
                          <button
                            onClick={() =>
                              updateVariantDraft(variant.id, {
                                active: !currentActive,
                              })
                            }
                            className={`flex items-center justify-center gap-2 rounded-full border py-2 text-sm font-semibold transition ${currentActive
                              ? "border-black bg-black text-white"
                              : "border-gray-300 bg-white text-gray-700"
                              }`}
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M5 13l4 4L19 7"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                            Active: {currentActive ? "Yes" : "No"}
                          </button>

                          <button
                            onClick={() =>
                              updateVariantDraft(variant.id, {
                                visible_when_out_of_stock:
                                  !currentVisibleWhenOut,
                              })
                            }
                            className={`flex items-center justify-center gap-2 rounded-full border py-2 text-sm font-semibold transition ${currentVisibleWhenOut
                              ? "border-black bg-black text-white"
                              : "border-gray-300 bg-white text-gray-700"
                              }`}
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none">
                                <path
                                  d="M4 12s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinejoin="round"
                                />
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="2"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                              </svg>
                            </span>
                            Show if Out: {currentVisibleWhenOut ? "Yes" : "No"}
                          </button>
                        </div>

                        <div className="col-span-2 mt-4 flex gap-3">
                          <button
                            onClick={() => saveProductVariant(variant.id)}
                            disabled={!variantDrafts[variant.id]}
                            className={`flex h-11 w-32 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-all duration-150 active:scale-95 ${variantDrafts[variant.id]
                              ? "border-green-200 bg-green-50 text-green-700 shadow-sm hover:bg-green-100"
                              : "border-gray-200 bg-gray-50 text-gray-400"
                              }`}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                              <path d="M17 21v-8H7v8" />
                              <path d="M7 3v5h8" />
                            </svg>
                            Save
                          </button>

                          <button
                            onClick={() =>
                              setVariantDrafts((current) => {
                                const copy = { ...current };
                                delete copy[variant.id];
                                return copy;
                              })
                            }
                            disabled={!variantDrafts[variant.id]}
                            className={`flex h-11 w-32 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-all duration-150 active:scale-95 ${variantDrafts[variant.id]
                              ? "border-red-200 bg-red-50 text-red-600 shadow-sm hover:bg-red-100"
                              : "border-gray-200 bg-gray-50 text-gray-400"
                              }`}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                            Cancel
                          </button>
                        </div>





                      </div>)}
                  </div>
                );
              })
            )}
          </div>
        )}


        {activeTab === "settings" && siteSettings && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold">Site Settings</h2>
              <p className="text-sm text-gray-500">
                Control branding, contact info, footer, and storefront behavior.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs text-gray-500">
                  Site Name
                  <input
                    className="mt-1 w-full rounded-xl border p-3 text-black"
                    value={siteSettingsDraft.site_name ?? siteSettings.site_name}
                    onChange={(e) =>
                      updateSiteSettingsDraft({ site_name: e.target.value })
                    }
                  />
                </label>

                <label className="text-xs text-gray-500">
                  Logo URL
                  <input
                    className="mt-1 w-full rounded-xl border p-3 text-black"
                    value={siteSettingsDraft.logo_url ?? siteSettings.logo_url ?? ""}
                    onChange={(e) =>
                      updateSiteSettingsDraft({ logo_url: e.target.value })
                    }
                  />
                </label>

                <label className="text-xs text-gray-500">
                  Email Logo URL
                  <input
                    className="mt-1 w-full rounded-xl border p-3 text-black"
                    value={
                      siteSettingsDraft.email_logo_url ??
                      siteSettings.email_logo_url ??
                      ""
                    }
                    onChange={(e) =>
                      updateSiteSettingsDraft({ email_logo_url: e.target.value })
                    }
                  />
                </label>

                <label className="text-xs text-gray-500">
                  Contact Email
                  <input
                    className="mt-1 w-full rounded-xl border p-3 text-black"
                    value={
                      siteSettingsDraft.contact_email ??
                      siteSettings.contact_email ??
                      ""
                    }
                    onChange={(e) =>
                      updateSiteSettingsDraft({ contact_email: e.target.value })
                    }
                  />
                </label>

                <label className="text-xs text-gray-500">
                  WhatsApp Number
                  <input
                    className="mt-1 w-full rounded-xl border p-3 text-black"
                    value={
                      siteSettingsDraft.whatsapp_number ??
                      siteSettings.whatsapp_number ??
                      ""
                    }
                    onChange={(e) =>
                      updateSiteSettingsDraft({ whatsapp_number: e.target.value })
                    }
                  />
                </label>

                <label className="text-xs text-gray-500">
                  TikTok URL
                  <input
                    className="mt-1 w-full rounded-xl border p-3 text-black"
                    value={siteSettingsDraft.tiktok_url ?? siteSettings.tiktok_url ?? ""}
                    onChange={(e) =>
                      updateSiteSettingsDraft({ tiktok_url: e.target.value })
                    }
                  />
                </label>

                <label className="text-xs text-gray-500 sm:col-span-2">
                  Footer Text
                  <input
                    className="mt-1 w-full rounded-xl border p-3 text-black"
                    value={
                      siteSettingsDraft.footer_text ?? siteSettings.footer_text ?? ""
                    }
                    onChange={(e) =>
                      updateSiteSettingsDraft({ footer_text: e.target.value })
                    }
                  />
                </label>

                <label className="text-xs text-gray-500">
                  Default Seller Code
                  <input
                    className="mt-1 w-full rounded-xl border p-3 text-black"
                    value={
                      siteSettingsDraft.default_seller_code ??
                      siteSettings.default_seller_code ??
                      ""
                    }
                    onChange={(e) =>
                      updateSiteSettingsDraft({
                        default_seller_code: e.target.value,
                      })
                    }
                  />
                </label>

                <label className="text-xs text-gray-500">
                  Primary Color
                  <input
                    className="mt-1 w-full rounded-xl border p-3 text-black"
                    value={
                      siteSettingsDraft.primary_color ??
                      siteSettings.primary_color ??
                      "#E53935"
                    }
                    onChange={(e) =>
                      updateSiteSettingsDraft({ primary_color: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={() =>
                    updateSiteSettingsDraft({
                      reseller_mode_enabled: !(
                        siteSettingsDraft.reseller_mode_enabled ??
                        siteSettings.reseller_mode_enabled
                      ),
                    })
                  }
                  className={`rounded-2xl border p-4 text-sm font-semibold ${siteSettingsDraft.reseller_mode_enabled ??
                    siteSettings.reseller_mode_enabled
                    ? "bg-black text-white"
                    : "bg-white text-gray-700"
                    }`}
                >
                  Reseller Mode:{" "}
                  {(siteSettingsDraft.reseller_mode_enabled ??
                    siteSettings.reseller_mode_enabled)
                    ? "On"
                    : "Off"}
                </button>

                <button
                  onClick={() =>
                    updateSiteSettingsDraft({
                      show_reference_code: !(
                        siteSettingsDraft.show_reference_code ??
                        siteSettings.show_reference_code
                      ),
                    })
                  }
                  className={`rounded-2xl border p-4 text-sm font-semibold ${siteSettingsDraft.show_reference_code ??
                    siteSettings.show_reference_code
                    ? "bg-black text-white"
                    : "bg-white text-gray-700"
                    }`}
                >
                  Show Reference Code:{" "}
                  {(siteSettingsDraft.show_reference_code ??
                    siteSettings.show_reference_code)
                    ? "On"
                    : "Off"}
                </button>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={saveSiteSettings}
                  disabled={Object.keys(siteSettingsDraft).length === 0}
                  className={`h-11 rounded-2xl px-5 text-sm font-semibold ${Object.keys(siteSettingsDraft).length > 0
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-gray-50 text-gray-400 border border-gray-200"
                    }`}
                >
                  Save Settings
                </button>

                <button
                  onClick={() => setSiteSettingsDraft({})}
                  disabled={Object.keys(siteSettingsDraft).length === 0}
                  className="h-11 rounded-2xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="text-lg font-bold">Payment Methods</h2>
              <p className="text-sm text-gray-500">
                Enable payment options and customize customer payment instructions.
              </p>
            </div>

            {paymentMethods.map((method) => {
              const draft = paymentDrafts[method.id] || {};
              const enabled = draft.enabled ?? method.enabled;

              return (
                <div key={method.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{method.display_label}</p>
                      <p className="text-xs text-gray-400">{method.name}</p>
                    </div>

                    <button
                      onClick={() =>
                        updatePaymentDraft(method.id, {
                          enabled: !enabled,
                        })
                      }
                      className={`rounded-2xl border px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${enabled
                        ? "border-black bg-black text-white"
                        : "border-gray-200 bg-white text-gray-500"
                        }`}
                    >
                      {enabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-xs text-gray-500">
                      Display Label
                      <input
                        className="mt-1 w-full rounded-xl border p-3 text-black"
                        value={draft.display_label ?? method.display_label}
                        onChange={(e) =>
                          updatePaymentDraft(method.id, {
                            display_label: e.target.value,
                          })
                        }
                      />
                    </label>

                    <label className="text-xs text-gray-500">
                      Account / Payment Info
                      <input
                        className="mt-1 w-full rounded-xl border p-3 text-black"
                        value={draft.account_value ?? method.account_value ?? ""}
                        onChange={(e) =>
                          updatePaymentDraft(method.id, {
                            account_value: e.target.value,
                          })
                        }
                        placeholder="@username, phone number, email, etc."
                      />
                    </label>

                    <label className="text-xs text-gray-500 sm:col-span-2">
                      Customer Instructions
                      <textarea
                        className="mt-1 min-h-[100px] w-full rounded-xl border p-3 text-black"
                        value={draft.instructions ?? method.instructions ?? ""}
                        onChange={(e) =>
                          updatePaymentDraft(method.id, {
                            instructions: e.target.value,
                          })
                        }
                        placeholder="Tell customers how to complete this payment."
                      />
                    </label>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => savePaymentMethod(method.id)}
                      disabled={!paymentDrafts[method.id]}
                      className={`flex h-11 w-32 items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition-all active:scale-95 ${paymentDrafts[method.id]
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-50 text-gray-400"
                        }`}
                    >
                      Save
                    </button>

                    <button
                      onClick={() =>
                        setPaymentDrafts((current) => {
                          const copy = { ...current };
                          delete copy[method.id];
                          return copy;
                        })
                      }
                      disabled={!paymentDrafts[method.id]}
                      className={`flex h-11 w-32 items-center justify-center rounded-2xl border text-sm font-semibold transition-all active:scale-95 ${paymentDrafts[method.id]
                        ? "border-red-200 bg-red-50 text-red-600"
                        : "border-gray-200 bg-gray-50 text-gray-400"
                        }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}



      </main>
    </div>
  );
}