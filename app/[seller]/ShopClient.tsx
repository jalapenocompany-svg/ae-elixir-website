"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import SiteHeader from "@/components/SiteHeader";

type Product = {
  id: number;
  product_code: string;
  name: string;
  stock_quantity?: number;
  low_stock_threshold?: number;
  visible_when_out_of_stock?: boolean;
  prices: {
    zone1: number;
    zone2: number;
  };
  image: string;

  variants?: {
    label: string;
    product_code: string;
    image: string;
    prices: {
      zone1: number;
      zone2: number;
    };
    theme?: {
      light: string;
      border: string;
      text: string;
    };
    description?: string;
    kitItems?: string[];
    stock_quantity?: number;
    low_stock_threshold?: number;
    visible_when_out_of_stock?: boolean;
  }[];

  kitItems: string[];
  protocolImages: {
    protocol: string;
    coa: string;
  };


  description: string;
  theme: {
    light: string;
    border: string;
    text: string;
  };
};


type DbProductVariant = {
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
};

type DbProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  show_kit_button: boolean;
  show_protocol_button: boolean;
  show_coa_button: boolean;
  sort_order: number;
  product_variants: DbProductVariant[];
};


type SiteSettings = {
  site_name: string;
  logo_url: string | null;
  contact_email: string | null;
  whatsapp_number: string | null;
  tiktok_url: string | null;
  footer_text: string | null;
  show_reference_code: boolean;
  default_seller_code: string | null;
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

type CartItem = Product & {
  quantity: number;
  price: number;
};

type InventoryItem = {
  product_code: string;
  stock_quantity: number;
  low_stock_threshold: number;
  active: boolean;
  visible_when_out_of_stock: boolean;
};

type LocalOrder = {
  id: string;
  orderNumber: string;
  seller: string;
  total: number;
  paymentMethod: string;
  createdAt: string;
  items: CartItem[];
};

const fallbackProducts: Product[] = [


];




const STORE_REFERENCE_CODE = "AEELIXIR";

export default function ShopClient({ seller }: { seller?: string }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [selectedKit, setSelectedKit] = useState<Product | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<Product | null>(null);

  const [selectedVariants, setSelectedVariants] = useState<
    Record<number, number>
  >({});

  const [protocolTab, setProtocolTab] = useState<"protocol" | "coa">("protocol");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentOrdersOpen, setRecentOrdersOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<LocalOrder[]>([]);
  const [orderNotice, setOrderNotice] = useState("");
  const [whatsAppUrl, setWhatsAppUrl] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validSellerCode, setValidSellerCode] = useState("");
  const [showReferenceCode, setShowReferenceCode] = useState(false);
  const [priceZone, setPriceZone] = useState<"zone1" | "zone2">("zone1");
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);


  const [form, setForm] = useState({
    fullName: "",
    address: "",
    email: "",
    phone: "",
    paymentMethod: "",
  });




  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  useEffect(() => {
    const savedCart = localStorage.getItem("pepmistry_cart");

    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch {
        localStorage.removeItem("pepmistry_cart");
      }
    }
  }, []);


  useEffect(() => {
    localStorage.setItem("pepmistry_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    async function loadInitialData() {


      const { data: settingsData } = await supabase
        .from("site_settings")
        .select(
          "site_name, logo_url, contact_email, whatsapp_number, tiktok_url, footer_text, show_reference_code, default_seller_code"
        )
        .limit(1)
        .single();

      if (settingsData) {
        setSiteSettings(settingsData);
      }

      const { data: paymentData, error: paymentError } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true });

      if (paymentError) {
        console.error("PAYMENT METHODS ERROR:", paymentError);
      } else {
        setPaymentMethods(paymentData || []);
      }


      setValidSellerCode(STORE_REFERENCE_CODE);
      setShowReferenceCode(false);
      setPriceZone("zone1");

      const { data: inventoryData, error: inventoryError } = await supabase
        .from("inventory")
        .select(
          "product_code, stock_quantity, low_stock_threshold, active, visible_when_out_of_stock"
        );



      const { data: productRows, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (productError) {
        console.error("PRODUCT LOAD ERROR:", productError);
        setProductsLoading(false);
        return;
      }

      const { data: variantRows, error: variantError } = await supabase
        .from("product_variants")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });

      if (variantError) {
        console.error("VARIANT LOAD ERROR:", variantError);
        return;
      }

      console.log("PRODUCT ROWS:", productRows);
      console.log("VARIANT ROWS:", variantRows);

      const mappedProducts: Product[] = (productRows || [])
        .map((product: any, index: number) => {
          const activeVariants = (variantRows || [])
            .filter((variant: any) => variant.product_id === product.id)
            .sort((a: any, b: any) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

          const firstVariant = activeVariants[0];

          if (!firstVariant) return null;

          return {
            id: Number(product.sort_order || index + 1),
            product_code: firstVariant.product_code,
            name: product.name,
            prices: {
              zone1: Number(firstVariant.price_zone1 || 0),
              zone2: Number(firstVariant.price_zone2 || 0),
            },
            image: firstVariant.image_url || "/placeholder.png",

            variants: activeVariants.map((variant: any) => ({
              label: variant.label,
              product_code: variant.product_code,
              image: variant.image_url || "/placeholder.png",
              prices: {
                zone1: Number(variant.price_zone1 || 0),
                zone2: Number(variant.price_zone2 || 0),
              },
              theme: {
                light: variant.theme_light || "bg-gray-50",
                border: variant.theme_border || "border-gray-200",
                text: variant.theme_text || "text-gray-700",
              },
              description: variant.kit_description || product.description || "",
              kitItems: Array.isArray(variant.kit_items) ? variant.kit_items : [],
              stock_quantity: Number(variant.stock_quantity || 0),
              low_stock_threshold: Number(variant.low_stock_threshold || 5),
              visible_when_out_of_stock: Boolean(variant.visible_when_out_of_stock),
            })),

            protocolImages: {
              protocol: firstVariant.protocol_image_url || "",
              coa: firstVariant.coa_image_url || "",

            },

            description: firstVariant.kit_description || product.description || "",
            theme: {
              light: firstVariant.theme_light || "bg-gray-50",
              border: firstVariant.theme_border || "border-gray-200",
              text: firstVariant.theme_text || "text-gray-700",
            },
            kitItems: Array.isArray(firstVariant.kit_items)
              ? firstVariant.kit_items
              : [],
          };
        })
        .filter(Boolean) as Product[];

      console.log("MAPPED DB PRODUCTS:", mappedProducts);

      setProducts(mappedProducts);
      setProductsLoading(false);



      if (inventoryError) {
        console.error(inventoryError);
        return;
      }

      setInventory(inventoryData || []);
    }

    loadInitialData();
  }, []);

  function addToCart(product: Product & { price: number }) {
    const availableStock = Number(product.stock_quantity ?? 0);

    if (availableStock <= 0) {
      alert("This item is currently out of stock.");
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);

      if (existing) {
        if (existing.quantity >= availableStock) {
          alert(`Only ${availableStock} available in stock.`);
          return current;
        }

        return current.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, availableStock) }
            : item
        );
      }

      return [
        ...current,
        {
          ...product,
          stock_quantity: availableStock,
          quantity: 1,
        },
      ];
    });

    setCartOpen(true);
  }





  function changeQuantity(productId: number, amount: number) {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== productId) return item;

          const availableStock = Number(item.stock_quantity ?? 0);
          const nextQuantity = item.quantity + amount;

          if (nextQuantity > availableStock) {
            alert(`Only ${availableStock} available in stock.`);
            return item;
          }

          return {
            ...item,
            quantity: nextQuantity,
          };
        })
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId: number) {
    setCart((current) => current.filter((item) => item.id !== productId));
  }

  function saveOrderLocally(orderData: LocalOrder) {
    const existingOrders = JSON.parse(
      localStorage.getItem("pepmistry_recent_orders") || "[]"
    );

    localStorage.setItem(
      "pepmistry_recent_orders",
      JSON.stringify([orderData, ...existingOrders].slice(0, 10))
    );
  }

  function openRecentOrders() {
    const savedOrders = JSON.parse(
      localStorage.getItem("pepmistry_recent_orders") || "[]"
    );

    setRecentOrders(savedOrders);
    setMenuOpen(false);
    setRecentOrdersOpen(true);
  }


async function deductInventory() {
  for (const item of cart) {
    const { data, error } = await supabase
      .from("product_variants")
      .select("stock_quantity")
      .eq("product_code", item.product_code)
      .single();

    if (error || !data) {
      throw new Error(`Product variant not found: ${item.name}`);
    }

    const currentStock = Number(data.stock_quantity || 0);

    if (item.quantity > currentStock) {
      throw new Error(
        `Only ${currentStock} available for ${item.name}. Please update your cart.`
      );
    }

    const newStock = currentStock - item.quantity;

    const { error: updateError } = await supabase
      .from("product_variants")
      .update({ stock_quantity: newStock })
      .eq("product_code", item.product_code);

    if (updateError) {
      throw new Error(`Could not update stock for ${item.name}`);
    }
  }
}

  async function searchAddressSuggestions(value: string) {
    setForm({ ...form, address: value });

    if (value.length < 4) {
      setAddressSuggestions([]);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_KEY;

    if (!apiKey) return;

    setAddressLoading(true);

    try {
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          value
        )}&filter=countrycode:us&limit=5&apiKey=${apiKey}`
      );

      const data = await response.json();
      setAddressSuggestions(data.features || []);
    } catch (error) {
      console.error(error);
      setAddressSuggestions([]);
    } finally {
      setAddressLoading(false);
    }
  }

  async function handleOrderSubmit() {
    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    if (!form.fullName || !form.address || !form.email || !form.phone || !form.paymentMethod) {
      alert("Please complete all checkout fields and select a payment method.");
      return;
    }

    setIsSubmitting(true);

    const orderPayload = {
      seller_code: validSellerCode || defaultSellerCode,
      customer_name: form.fullName,
      customer_address: form.address,
      customer_email: form.email,
      customer_phone: form.phone,
      payment_method: form.paymentMethod,
      items: cart.map((item) => ({
        id: item.id,
        product_code: item.product_code,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        line_total: item.price * item.quantity,
      })),
      total: cartTotal,
    };

    const { data, error } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select("id")
      .single();

    if (error) {
      console.error(error);
      alert(error.message);
      setIsSubmitting(false);
      return;
    }


    try {
      await deductInventory();
    } catch (inventoryError) {
      alert(
        inventoryError instanceof Error
          ? inventoryError.message
          : "Order saved, but inventory could not be updated."
      );
    }

    const shortOrderNumber = data.id.slice(0, 8).toUpperCase();
    setOrderNumber(shortOrderNumber);

    await fetch("/api/send-order-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: shortOrderNumber,
        customerName: form.fullName,
        customerEmail: form.email,
        paymentMethod: form.paymentMethod,
        items: cart,
        total: cartTotal,
      }),
    });

    saveOrderLocally({
      id: data.id,
      orderNumber: shortOrderNumber,
      seller: validSellerCode || "dx1984",
      total: cartTotal,
      paymentMethod: form.paymentMethod,
      createdAt: new Date().toISOString(),
      items: cart,
    });

    const itemsText = cart
      .map(
        (item) =>
          `${item.quantity}x ${item.name} - $${item.price * item.quantity}`
      )
      .join("%0A");

    const message = `New Pepmistry Order%0A%0AOrder: #${shortOrderNumber}%0AReference Code: ${(validSellerCode || "dx1984").toUpperCase()}%0A%0ACustomer:%0AName: ${form.fullName}%0APhone: ${form.phone}%0AEmail: ${form.email}%0AAddress: ${form.address}%0A%0APayment: ${form.paymentMethod}%0A%0AItems:%0A${itemsText}%0A%0ATotal: $${cartTotal.toFixed(
      2
    )}`;

    if (form.paymentMethod === "WhatsApp") {
      setWhatsAppUrl(
        cleanWhatsApp ? `https://wa.me/${cleanWhatsApp}?text=${message}` : ""
      );
      setOrderNotice(
        "Order saved. Tap below to open WhatsApp and send your order."
      );
      setIsSubmitting(false);
      return;
    }

    setWhatsAppUrl("");
    setOrderNotice(
      "Order saved. Payment instructions will be sent to your email."
    );
    setIsSubmitting(false);
  }

  function resetAfterOrder() {
    setCart([]);
    localStorage.removeItem("pepmistry_cart");
    setCheckoutOpen(false);
    setCartOpen(false);
    setOrderNotice("");
    setWhatsAppUrl("");
    setOrderNumber("");
  }

  const defaultSellerCode = siteSettings?.default_seller_code || "";
  const cleanWhatsApp = (siteSettings?.whatsapp_number || "").replace(/\D/g, "");
  const logoUrl = siteSettings?.logo_url || "/logo.png";
  const siteName = siteSettings?.site_name || "Peptide Shop";

  const selectedPaymentMethod = paymentMethods.find(
    (method) => method.name === form.paymentMethod
  );

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <SiteHeader

        showCart={true}
        cartCount={cartCount}
        onCartClick={() => setCartOpen(true)}
      />

      <main className="px-5 py-6">
        {showReferenceCode && siteSettings?.show_reference_code !== false && (
          <div className="mb-6 text-sm text-gray-500">
            Reference Code:{" "}
            <span className="font-semibold text-black">
              {validSellerCode.toUpperCase()}
            </span>
          </div>
        )}

        {productsLoading && (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-[330px] animate-pulse rounded-3xl bg-white shadow-sm"
              >
                <div className="h-44 rounded-t-3xl bg-gray-100" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-2/3 rounded bg-gray-100" />
                  <div className="h-8 w-24 rounded-xl bg-gray-100" />
                  <div className="h-4 w-20 rounded bg-gray-100" />
                  <div className="h-10 rounded-full bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        )}


        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => {
            const selectedVariantIndex =
              selectedVariants[product.id] ??
              (product.product_code === "reta-15mg" ? 1 : 0);

            const activeVariant = product.variants?.[selectedVariantIndex];

            const displayImage = activeVariant?.image || product.image;

            const displayPrice =
              activeVariant?.prices?.[priceZone] || product.prices[priceZone];

            const displayCode = activeVariant?.product_code || product.product_code;

            const selectedVariantStock =
              activeVariant?.stock_quantity ?? product.stock_quantity ?? 0;

            const selectedVariantLowThreshold =
              activeVariant?.low_stock_threshold ?? product.low_stock_threshold ?? 5;

            const selectedVariantVisibleWhenOutOfStock =
              activeVariant?.visible_when_out_of_stock ??
              product.visible_when_out_of_stock ??
              true;

            const stock = selectedVariantStock;
            const lowThreshold = selectedVariantLowThreshold;
            const isOutOfStock = stock <= 0;
            const isLowStock = stock > 0 && stock <= lowThreshold;

            if (isOutOfStock && !selectedVariantVisibleWhenOutOfStock) {
              return null;
            }




            return (
              <div
                key={product.id}
                className="overflow-hidden rounded-3xl bg-white shadow-sm"
              >
                {/* Product Image */}
                <div className="aspect-square bg-gray-100">
                  <img
                    src={displayImage}
                    alt={displayImage}
                    className="cursor-pointer transition duration-200 hover:scale-[1.03] active:scale-[0.98]"
                    onClick={() =>
                      setSelectedKit({
                        ...product,
                        image: activeVariant?.image || displayImage,
                        product_code: activeVariant?.product_code || displayCode,
                        prices: {
                          zone1: displayPrice,
                          zone2: displayPrice,
                        },
                        name: activeVariant
                          ? `${product.name} ${activeVariant.label}`
                          : product.name,
                        theme: activeVariant?.theme || product.theme,
                        description: activeVariant?.description || product.description,
                        kitItems: activeVariant?.kitItems || product.kitItems,
                      })
                    }
                  />
                </div>



                {/* Product Info */}
                <div className="p-4">
                  <div className="mb-3">
                    {/* Name + Price */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-gray-800">
                        {product.name.split(" ")[0]}
                      </h3>

                      <p className="text-sm font-semibold text-gray-900">
                        ${displayPrice}
                      </p>
                    </div>
                    {/* MG / Spec */}
                    <div className="mt-2 h-8 -ml-1">
                      {product.variants ? (
                        (() => {
                          const selectedLabel =
                            product.variants[selectedVariantIndex]?.label || "";

                          const sizePillWidth =
                            selectedLabel.length >= 5 ? "w-[98px]" : "w-[82px]";

                          return (
                            <select
                              value={selectedVariantIndex}
                              onChange={(e) =>
                                setSelectedVariants((prev) => ({
                                  ...prev,
                                  [product.id]: Number(e.target.value),
                                }))
                              }
                              className={`h-8 ${sizePillWidth} rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 shadow-sm outline-none`}
                            >
                              {product.variants.map((variant, index) => (
                                <option key={variant.product_code} value={index}>
                                  {variant.label}
                                </option>
                              ))}
                            </select>
                          );
                        })()
                      ) : (
                        (() => {
                          const productSpec = product.name
                            .replace(product.name.split(" ")[0], "")
                            .trim();

                          const sizePillWidth =
                            productSpec.length >= 5 ? "w-[98px]" : "w-[82px]";

                          return (
                            <div
                              className={`flex h-8 ${sizePillWidth} items-center rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 shadow-sm`}
                            >
                              {productSpec}
                            </div>
                          );
                        })()
                      )}
                    </div>



                    <div className="mt-3 text-xs font-semibold">
                      {isOutOfStock ? (
                        <span className="text-red-600">Out of stock</span>
                      ) : isLowStock ? (
                        <span className="text-orange-500">Stock: {stock}</span>
                      ) : (
                        <span className="mt-2 text-sm font-semibold text-[#6F655C]">Stock: {stock}</span>
                      )}
                    </div>

                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Protocol */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProtocol(product);
                        setProtocolTab("protocol");
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D8D1C8] bg-[#EEEAE4] text-[#A79B8E] shadow-sm transition-all hover:bg-[#E6E0D8] active:scale-95"
                      title="Protocol"
                    >
                      <svg
                        className="h-[19px] w-[19px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M7 3.75h7.25L18 7.5v12.75H7V3.75Z"
                          stroke="currentColor"
                          strokeWidth="1.55"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M14.25 3.75V7.5H18"
                          stroke="currentColor"
                          strokeWidth="1.55"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M9.5 11h6"
                          stroke="currentColor"
                          strokeWidth="1.55"
                          strokeLinecap="round"
                        />
                        <path
                          d="M9.5 14h6"
                          stroke="currentColor"
                          strokeWidth="1.55"
                          strokeLinecap="round"
                        />
                        <path
                          d="M9.5 17h3.75"
                          stroke="currentColor"
                          strokeWidth="1.55"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>

                    {/* Kit */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedKit({
                          ...product,
                          image: activeVariant?.image || displayImage,
                          product_code: activeVariant?.product_code || displayCode,
                          prices: {
                            zone1: displayPrice,
                            zone2: displayPrice,
                          },
                          name: activeVariant
                            ? `${product.name} ${activeVariant.label}`
                            : product.name,
                          theme: activeVariant?.theme || product.theme,
                          description: activeVariant?.description || product.description,
                          kitItems: activeVariant?.kitItems || product.kitItems,
                        })
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D8D1C8] bg-[#EEEAE4] text-[#A79B8E] shadow-sm transition-all hover:bg-[#E6E0D8] active:scale-95"
                      title="Kit"
                    >
                      <svg
                        className="h-[20px] w-[20px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M12 3.75 19 7.75v8.5l-7 4-7-4v-8.5l7-4Z"
                          stroke="currentColor"
                          strokeWidth="1.55"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M5.35 8 12 11.85 18.65 8"
                          stroke="currentColor"
                          strokeWidth="1.55"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M12 11.85v8.1"
                          stroke="currentColor"
                          strokeWidth="1.55"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>

                    {/* Add to Cart */}
                    <button
                      onClick={() =>
                        addToCart({
                          ...product,
                          id: product.variants
                            ? Number(`${product.id}${selectedVariantIndex}`)
                            : product.id,
                          product_code: displayCode,
                          image: displayImage,
                          price: displayPrice,
                          stock_quantity: stock,
                          name: product.variants
                            ? `${product.name} ${activeVariant?.label ?? ""}`
                            : product.name,
                        })
                      }
                      disabled={isOutOfStock}
                      className={`flex h-10 flex-1 items-center justify-center gap-3 rounded-full border px-3 text-sm font-bold shadow-sm transition-all active:scale-95 ${isOutOfStock
                        ? "border-gray-300 bg-gray-100 text-gray-400"
                        : "border-[#D8D1C8] bg-[#EEEAE4] text-[#A79B8E] hover:bg-[#E6E0D8]"
                        }`}
                    >
                      <svg
                        className="h-[20px] w-[20px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M6 6h15l-2 8H8L6 6Z"
                          stroke="currentColor"
                          strokeWidth="1.55"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M6 6 5 3H2"
                          stroke="currentColor"
                          strokeWidth="1.55"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="9"
                          cy="20"
                          r="1.35"
                          fill="currentColor"
                        />
                        <circle
                          cx="18"
                          cy="20"
                          r="1.35"
                          fill="currentColor"
                        />
                      </svg>

                      <span className="text-base leading-none">+</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/30"
          />

          className={`absolute right-0 top-0 h-full w-[85%] max-w-md bg-white transition-transform duration-300 ease-out ${cartOpen ? "translate-x-0" : "translate-x-full"
            }`}
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-xl font-bold">Menu</h2>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-2xl text-gray-500"
            >
              ×
            </button>
          </div>

          <div className="py-4 space-y-3">
            <button
              onClick={() => setMenuOpen(false)}
              className="w-full text-left rounded-xl border p-4 font-semibold"
            >
              Products
            </button>

            <button
              onClick={() => {
                alert("Protocols section coming soon.");
                setMenuOpen(false);
              }}
              className="w-full text-left rounded-xl border p-4 font-semibold"
            >
              Protocols
            </button>

            <button
              onClick={() => {
                window.location.href = "/order-lookup";
              }}
              className="w-full text-left rounded-xl border p-4 font-semibold"
            >
              Order Lookup
            </button>




            <button
              onClick={() => {
                alert("Seller Admin coming next.");
                setMenuOpen(false);
              }}
              className="w-full text-left rounded-xl border p-4 font-semibold"
            >
              Admin
            </button>
          </div>
        </div>

      )}

      {recentOrdersOpen && (
        <div className="fixed inset-0 z-50">
          <div
            onClick={() => setRecentOrdersOpen(false)}
            className="absolute inset-0 bg-black/30"
          />

          <div className="absolute right-0 top-0 h-full w-[90%] max-w-sm bg-white shadow-xl p-5 flex flex-col">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-xl font-bold">Recent Orders</h2>
              <button
                onClick={() => setRecentOrdersOpen(false)}
                className="text-2xl text-gray-500"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {recentOrders.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No recent orders saved on this device yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl border bg-gray-50 p-4"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <p className="font-bold">#{order.orderNumber}</p>
                        <p className="text-sm font-semibold">
                          ${order.total.toFixed(2)}
                        </p>
                      </div>

                      <p className="text-xs text-gray-500">
                        Seller: {order.seller}
                      </p>
                      <p className="text-xs text-gray-500">
                        Payment: {order.paymentMethod}
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>

                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <p key={item.id} className="text-sm">
                            {item.quantity}x {item.name}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setRecentOrdersOpen(false)}
              className="w-full rounded-full bg-black py-3 font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}


      <div
        className={`fixed inset-0 z-50 transition ${cartOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${cartOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={() => setCartOpen(false)}
        />

        <div
          className={`absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col bg-white p-5 shadow-xl transition-transform duration-300 ease-out ${cartOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-xl font-bold">
              {checkoutOpen ? "Checkout" : "Your Cart"}
            </h2>
            <button
              onClick={() => setCartOpen(false)}
              className="text-2xl text-gray-500"
            >
              ×
            </button>
          </div>

          {!checkoutOpen ? (
            <>
              <div className="flex-1 overflow-y-auto py-4">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    Your cart is empty.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-3 border-b pb-4">
                        <img
                          src={item.image}
                          className="h-16 w-16 object-contain rounded-lg bg-gray-50"
                        />

                        <div className="flex-1">
                          <h3 className="font-semibold text-sm">
                            {item.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            ${item.price}
                          </p>

                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => changeQuantity(item.id, -1)}
                              className="h-7 w-7 rounded-full border"
                            >
                              -
                            </button>
                            <span className="text-sm">{item.quantity}</span>
                            <button
                              onClick={() => changeQuantity(item.id, 1)}
                              disabled={item.quantity >= Number(item.stock_quantity ?? 0)}
                              className={`h-7 w-7 rounded-full border ${item.quantity >= Number(item.stock_quantity ?? 0)
                                  ? "cursor-not-allowed opacity-40"
                                  : ""
                                }`}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-sm text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between font-bold mb-4">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>

                <button
                  disabled={cart.length === 0}
                  onClick={() => setCheckoutOpen(true)}
                    className="w-full rounded-full bg-[#A79B8E] py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#978D82] active:scale-95 disabled:opacity-50"
                >
                  Checkout
                </button>
              </div>
            </>
          ) : (
            <div className="py-4 space-y-3">
              <input
                className="w-full border rounded-xl p-3"
                placeholder="Full Name"
                onChange={(e) =>
                  setForm({ ...form, fullName: e.target.value })
                }
              />
              <div className="relative">
                <textarea
                  placeholder="Shipping Address"
                  className="w-full rounded-xl border p-3"
                  value={form.address}
                  onChange={(e) => searchAddressSuggestions(e.target.value)}
                />

                {addressSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-2xl border bg-white shadow-lg">
                    {addressSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.properties.place_id}
                        type="button"
                        onClick={() => {
                          setForm({
                            ...form,
                            address: suggestion.properties.formatted,
                          });
                          setAddressSuggestions([]);
                        }}
                        className="w-full border-b px-4 py-3 text-left text-sm last:border-b-0 hover:bg-gray-50"
                      >
                        {suggestion.properties.formatted}
                      </button>
                    ))}
                  </div>
                )}

                {addressLoading && (
                  <p className="mt-1 text-xs text-gray-400">Searching addresses...</p>
                )}
              </div>
              <input
                className="w-full border rounded-xl p-3"
                placeholder="Email"
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
              />
              <input
                className="w-full border rounded-xl p-3"
                placeholder="Phone"
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
              />

              <select
                className={`w-full rounded-xl border p-3 ${form.paymentMethod ? "text-black" : "text-gray-400"
                  }`}
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              >
                <option value="" disabled>
                  Select Payment
                </option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.name}>
                    {method.display_label}
                  </option>
                ))}
              </select>



              {selectedPaymentMethod && (
                <div
                  className={`mt-3 rounded-2xl border p-4 text-sm ${selectedPaymentMethod.theme_light || "bg-gray-50"
                    } ${selectedPaymentMethod.theme_border || "border-gray-200"} ${selectedPaymentMethod.theme_text || "text-gray-700"
                    }`}
                >
                  <p className="mb-1 font-bold">
                    {selectedPaymentMethod.display_label} Payment
                  </p>

                  {selectedPaymentMethod.account_value && (
                    <p className="mb-2">
                      <span className="font-semibold">Payment Info: </span>
                      {selectedPaymentMethod.account_value}
                    </p>
                  )}

                  <p className="leading-relaxed">
                    {selectedPaymentMethod.instructions ||
                      "Complete your payment using the selected method and include your order number."}
                  </p>
                </div>
              )}




              <button
                onClick={handleOrderSubmit}
                disabled={isSubmitting}
                className="w-full rounded-full bg-[#A79B8E] py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#978D82] active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Saving Order..." : "Send Order"}
              </button>

              <button
                onClick={() => setCheckoutOpen(false)}
                className="w-full rounded-full border border-[#D8D1C8] bg-white py-3 text-sm font-bold text-[#A79B8E] shadow-sm transition-all hover:bg-[#F3F0EC] active:scale-95"
              >
                Back to Cart
              </button>
            </div>
          )}

        </div>


      </div>
      {orderNotice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <h2 className="mb-3 text-xl font-bold">Order Received</h2>

            {orderNumber && (
              <div className="mb-4 rounded-xl bg-gray-100 p-3">
                <p className="text-xs text-gray-500">Order Number</p>
                <p className="text-lg font-bold tracking-wide">
                  #{orderNumber}
                </p>
              </div>
            )}

            <p className="mb-5 text-sm text-gray-600">{orderNotice}</p>


            {selectedPaymentMethod && (
              <div
                className={`mb-4 rounded-2xl border p-4 text-sm ${selectedPaymentMethod.theme_light || "bg-gray-50"
                  } ${selectedPaymentMethod.theme_border || "border-gray-200"} ${selectedPaymentMethod.theme_text || "text-gray-700"
                  }`}
              >
                <p className="mb-2 font-bold">
                  {selectedPaymentMethod.display_label} Payment
                </p>

                {selectedPaymentMethod.account_value && (
                  <p>
                    Send payment to:{" "}
                    <span className="font-bold">
                      {selectedPaymentMethod.account_value}
                    </span>
                  </p>
                )}

                <p className="mt-3">
                  {selectedPaymentMethod.instructions ||
                    "Complete your payment using the selected method."}
                </p>

                <p className="mt-3">Include your order number:</p>
                <p className="mt-1 font-bold">#{orderNumber}</p>
              </div>
            )}

            {whatsAppUrl ? (
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={resetAfterOrder}
                className="block w-full rounded-full bg-green-600 py-3 font-semibold text-white"
              >
                Open WhatsApp
              </a>
            ) : (
              <button
                onClick={resetAfterOrder}
                className="w-full rounded-full bg-black py-3 font-semibold text-white"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {selectedKit && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-5">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <div>
                <p className="text-xs font-semibold text-blue-600">Kit Includes</p>
                <h2 className="text-xl font-bold">{selectedKit.name}</h2>
              </div>

              <button
                onClick={() => setSelectedKit(null)}
                className="text-2xl text-gray-500"
              >
                ×
              </button>
            </div>

            <div className="mb-5 flex justify-center">
              <img
                src={selectedKit.image}
                alt={selectedKit.name}
                className="h-36 rounded-2xl object-contain"
              />
            </div>

            <div className="space-y-4">
              {/* Description Section */}
              <div
                className={`rounded-3xl border p-4 ${selectedKit.theme.light} ${selectedKit.theme.border}`}
              >
                <p className={`mb-2 text-xs font-bold uppercase tracking-wide ${selectedKit.theme.text}`}>
                  Peptide Description
                </p>
                <p className="text-sm leading-relaxed text-gray-700">
                  {selectedKit.description}
                </p>
              </div>

              {/* Kit Items Section */}
              <div
                className={`rounded-3xl border p-4 ${selectedKit.theme.light} ${selectedKit.theme.border}`}
              >
                <p className={`mb-3 text-xs font-bold uppercase tracking-wide ${selectedKit.theme.text}`}>
                  Kit Includes
                </p>

                <div className="space-y-2 text-sm text-gray-700">
                  {selectedKit.kitItems.map((item, index) => (
                    <div key={index} className="flex gap-2">
                      <span className={`font-bold ${selectedKit.theme.text}`}>
                        {index + 1}.
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedKit(null)}
              className="mt-5 w-full rounded-full bg-black py-3 font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}


      {selectedProtocol && (
        <div className="fixed inset-0 z-[70] bg-white">
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <img src={logoUrl} className="h-10 w-10 object-contain" />
                <div>
                  <h1 className="text-xl font-bold">{siteName}</h1>
                  <p className="text-xs text-gray-500">
                    {selectedProtocol.name} Protocol
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProtocol(null)}
                className="text-3xl text-gray-500"
              >
                ×
              </button>
            </div>
          </div>

          <div className="h-[calc(100vh-73px)] overflow-y-auto bg-gray-50 px-4 py-5">
            <div className="mx-auto max-w-md overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="px-4 pt-4">
                {/* Tabs */}
                <div className="mb-4 flex gap-2">
                  <button
                    onClick={() => setProtocolTab("protocol")}
                    className={`rounded-full px-4 py-1 text-sm font-medium ${protocolTab === "protocol"
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600"
                      }`}
                  >
                    Protocol
                  </button>

                  <button
                    onClick={() => setProtocolTab("coa")}
                    className={`rounded-full px-4 py-1 text-sm font-medium ${protocolTab === "coa"
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600"
                      }`}
                  >
                    📑 COA
                  </button>
                </div>

                {/* Image */}
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                  <img
                    src={selectedProtocol.protocolImages[protocolTab]}
                    alt="Protocol"
                    className="w-full object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}