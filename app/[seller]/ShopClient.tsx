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
  show_protocol_button?: boolean;
  show_coa_button?: boolean;
  show_kit_button?: boolean;
  cost_per_unit?: number;
  cost_per_unit_at_sale?: number;
  profit_per_unit_at_sale?: number;
  total_cost_at_sale?: number;
  total_profit_at_sale?: number;
  prices: {
    zone1: number;
    zone2: number;
  };
  image: string;

  variants?: {
    label: string;
    product_code: string;
    cost_per_unit?: number;
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
    protocolImages?: {
      protocol: string;
      coa: string;
    };
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
  const [submittedPaymentMethod, setSubmittedPaymentMethod] =
    useState<PaymentMethod | null>(null);
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
            show_protocol_button: product.show_protocol_button !== false,
            show_coa_button: product.show_coa_button !== false,
            show_kit_button: product.show_kit_button !== false,
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
              cost_per_unit: Number(variant.cost_per_unit || 0),
              visible_when_out_of_stock: Boolean(
                variant.visible_when_out_of_stock
              ),
              protocolImages: {
                protocol: variant.protocol_image_url || "",
                coa: variant.coa_image_url || "",
              },
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


  async function refreshProductStockCounts() {
    const { data, error } = await supabase
      .from("product_variants")
      .select(
        "product_code, stock_quantity, low_stock_threshold, visible_when_out_of_stock"
      )
      .eq("active", true);

    if (error) {
      console.error("Could not refresh stock counts:", error);
      return;
    }

    const stockByCode = new Map(
      (data || []).map((variant: any) => [
        variant.product_code,
        {
          stock_quantity: Number(variant.stock_quantity || 0),
          low_stock_threshold: Number(variant.low_stock_threshold || 5),
          cost_per_unit: Number(variant.cost_per_unit || 0),
          visible_when_out_of_stock: Boolean(
            variant.visible_when_out_of_stock
          ),
        },
      ])
    );

    setProducts((currentProducts) =>
      currentProducts.map((product) => {
        const updatedVariants = product.variants?.map((variant) => {
          const updatedStock = stockByCode.get(variant.product_code);

          if (!updatedStock) {
            return variant;
          }

          return {
            ...variant,
            stock_quantity: updatedStock.stock_quantity,
            low_stock_threshold: updatedStock.low_stock_threshold,
            visible_when_out_of_stock:
              updatedStock.visible_when_out_of_stock,
          };
        });

        const firstVariant = updatedVariants?.[0];

        return {
          ...product,
          variants: updatedVariants,
          stock_quantity:
            firstVariant?.stock_quantity ?? product.stock_quantity,
          low_stock_threshold:
            firstVariant?.low_stock_threshold ??
            product.low_stock_threshold,
          visible_when_out_of_stock:
            firstVariant?.visible_when_out_of_stock ??
            product.visible_when_out_of_stock,
        };
      })
    );
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


    const orderItemsWithMargins = cart.map((item) => {
      const price = Number(item.price || 0);
      const quantity = Number(item.quantity || 0);
      const cost = Number(item.cost_per_unit || 0);
      const lineTotal = price * quantity;
      const profitPerUnit = price - cost;

      return {
        id: item.id,
        product_code: item.product_code,
        name: item.name,
        price,
        quantity,
        line_total: lineTotal,
        cost_per_unit_at_sale: cost,
        profit_per_unit_at_sale: profitPerUnit,
        total_cost_at_sale: cost * quantity,
        total_profit_at_sale: profitPerUnit * quantity,
      };
    });

    const orderPayload = {
      seller_code: validSellerCode || defaultSellerCode,
      customer_name: form.fullName,
      customer_address: form.address,
      customer_email: form.email,
      customer_phone: form.phone,
      payment_method: form.paymentMethod,
      items: orderItemsWithMargins,
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
      await refreshProductStockCounts();
    } catch (inventoryError) {
      alert(
        inventoryError instanceof Error
          ? inventoryError.message
          : "Order saved, but inventory could not be updated."
      );
    }

    const shortOrderNumber = data.id.slice(0, 8).toUpperCase();
    setOrderNumber(shortOrderNumber);
    setSubmittedPaymentMethod(selectedPaymentMethod || null);

    const itemsText = cart
      .map(
        (item) =>
          `${item.quantity}x ${item.name} - $${(
            item.price * item.quantity
          ).toFixed(2)}`
      )
      .join("%0A");

    const message = encodeURIComponent(
      `New AE Elixir Order

Order: #${shortOrderNumber}

Customer:
Name: ${form.fullName}
Phone: ${form.phone}
Email: ${form.email}
Address: ${form.address}

Payment: ${selectedPaymentMethod?.display_label || form.paymentMethod}

Items:
${cart
        .map(
          (item) =>
            `${item.quantity}x ${item.name} - $${(
              item.price * item.quantity
            ).toFixed(2)}`
        )
        .join("\n")}

Total: $${cartTotal.toFixed(2)}`
    );

    const isWhatsAppPayment =
      form.paymentMethod.toLowerCase() === "whatsapp" ||
      selectedPaymentMethod?.name?.toLowerCase() === "whatsapp" ||
      selectedPaymentMethod?.display_label?.toLowerCase() === "whatsapp";

    const orderWhatsAppUrl =
      isWhatsAppPayment && cleanWhatsApp
        ? `https://wa.me/${cleanWhatsApp}?text=${message}`
        : "";

    await fetch("/api/send-order-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: shortOrderNumber,
        customerName: form.fullName,
        customerEmail: form.email,
        paymentMethod: form.paymentMethod,
        paymentMethodLabel:
          selectedPaymentMethod?.display_label || form.paymentMethod,
        paymentAccountValue:
          selectedPaymentMethod?.account_value || "",
        paymentInstructions:
          selectedPaymentMethod?.instructions || "",
        whatsAppUrl: orderWhatsAppUrl,
        items: orderItemsWithMargins,
        total: cartTotal,
      }),
    });

    saveOrderLocally({
      id: data.id,
      orderNumber: shortOrderNumber,
      seller: validSellerCode || "AEELIXIR",
      total: cartTotal,
      paymentMethod: form.paymentMethod,
      createdAt: new Date().toISOString(),
      items: cart.map((item) => {
        const marginItem = orderItemsWithMargins.find(
          (orderItem) => orderItem.id === item.id
        );

        return {
          ...item,
          cost_per_unit_at_sale: marginItem?.cost_per_unit_at_sale ?? 0,
          profit_per_unit_at_sale: marginItem?.profit_per_unit_at_sale ?? 0,
          total_cost_at_sale: marginItem?.total_cost_at_sale ?? 0,
          total_profit_at_sale: marginItem?.total_profit_at_sale ?? 0,
        };
      }),
    });

    if (isWhatsAppPayment) {
      setWhatsAppUrl(orderWhatsAppUrl);
      setOrderNotice(
        orderWhatsAppUrl
          ? "Order saved. Tap below to open WhatsApp and send your order."
          : "Order saved, but WhatsApp contact is not configured."
      );
      resetCheckoutAfterSuccessfulOrder();
      setIsSubmitting(false);
      return;
    }

    setWhatsAppUrl("");
    setOrderNotice(
      "Order saved. Payment instructions will be sent to your email. If you do not see the message in your inbox, please check your junk or spam folder."
    );
    resetCheckoutAfterSuccessfulOrder();
    setIsSubmitting(false);
  }

  function resetCheckoutAfterSuccessfulOrder() {
    setCart([]);
    localStorage.removeItem("pepmistry_cart");

    setForm({
      fullName: "",
      address: "",
      email: "",
      phone: "",
      paymentMethod: "",
    });

    setAddressSuggestions([]);
    setCheckoutOpen(false);
    setCartOpen(false);
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
                              className={`h-8 ${sizePillWidth} no-ios-zoom-fix rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 shadow-sm outline-none`}
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
                    {/* Protocol / COA */}
                    {(product.show_protocol_button || product.show_coa_button) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProtocol({
                            ...product,
                            product_code:
                              activeVariant?.product_code || product.product_code,
                            image: activeVariant?.image || product.image,
                            name: activeVariant
                              ? `${product.name} ${activeVariant.label}`
                              : product.name,
                            protocolImages:
                              activeVariant?.protocolImages ||
                              product.protocolImages,
                          });

                          setProtocolTab(
                            product.show_protocol_button ? "protocol" : "coa"
                          );
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D8D1C8] bg-[#EEEAE4] text-[#A79B8E] shadow-sm transition-all hover:bg-[#E6E0D8] active:scale-95"
                        title={
                          product.show_protocol_button ? "Protocol" : "COA"
                        }
                      >
                        <svg
                          className="h-[20px] w-[20px]"
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
                    )}

                    {/* Kit */}
                    {product.show_kit_button && (
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
                            description:
                              activeVariant?.description || product.description,
                            kitItems:
                              activeVariant?.kitItems || product.kitItems,
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
                    )}

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
                          cost_per_unit:
                            activeVariant?.cost_per_unit ??
                            product.cost_per_unit ??
                            0,
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
          <div className="shrink-0 px-5 pb-4 pt-5">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="text-xl font-bold">Menu</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-2xl text-gray-500"
              >
                ×
              </button>
            </div>
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

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
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
          className={`absolute right-0 top-0 flex h-[100dvh] w-[90%] max-w-md flex-col overflow-hidden bg-white shadow-xl transition-transform duration-300 ease-out ${cartOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
          {/* Drawer Header */}
          <div className="shrink-0 px-5 pb-4 pt-5">
            <div className="flex items-center justify-between border-b border-[#E6E0D8] pb-4">
              <h2 className="text-2xl font-bold tracking-tight text-[#1F1A17]">
                {checkoutOpen ? "Checkout" : "Your Cart"}
              </h2>

              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none text-[#7F756B] transition-all hover:bg-[#F6F3EF] active:scale-95"
                aria-label="Close cart"
              >
                ×
              </button>
            </div>
          </div>

          {!checkoutOpen ? (
            <>
              {/* Cart Items */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                {cart.length === 0 ? (
                  <div className="rounded-[24px] border border-[#E6E0D8] bg-[#FBFAF8] p-5 text-center">
                    <p className="text-sm font-semibold text-[#6F655C]">
                      Your cart is empty.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[22px] border border-[#E6E0D8] bg-white p-3 shadow-sm"
                      >
                        <div className="flex gap-3">
                          <img
                            src={item.image}
                            className="h-16 w-16 shrink-0 rounded-xl border border-[#E6E0D8] bg-[#F8F5F1] object-contain"
                            alt={item.name}
                          />

                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 text-sm font-bold leading-5 text-[#1F1A17]">
                              {item.name}
                            </h3>

                            <p className="mt-1 text-sm font-semibold text-[#6F655C]">
                              ${item.price}
                            </p>

                            <div className="mt-3 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => changeQuantity(item.id, -1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D8D1C8] bg-white text-lg font-bold text-[#5F554C] shadow-sm transition-all active:scale-95"
                              >
                                -
                              </button>

                              <span className="min-w-5 text-center text-sm font-bold text-[#5F554C]">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() => changeQuantity(item.id, 1)}
                                disabled={
                                  item.quantity >=
                                  Number(item.stock_quantity ?? 0)
                                }
                                className={`flex h-8 w-8 items-center justify-center rounded-full border border-[#D8D1C8] bg-white text-lg font-bold text-[#5F554C] shadow-sm transition-all active:scale-95 ${item.quantity >=
                                  Number(item.stock_quantity ?? 0)
                                  ? "cursor-not-allowed opacity-40"
                                  : ""
                                  }`}
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="self-start rounded-full px-2 py-1 text-xs font-bold text-red-500 transition hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart Footer */}
              <div className="shrink-0 border-t border-[#E6E0D8] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-8px_20px_rgba(0,0,0,0.04)]">
                <div className="mb-4 flex items-center justify-between text-lg font-bold text-[#1F1A17]">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>

                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => setCheckoutOpen(true)}
                  className="w-full rounded-full bg-[#A79B8E] py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#978D82] active:scale-95 disabled:opacity-50"
                >
                  Checkout
                </button>
              </div>
            </>
          ) : (
            /* Checkout Content */
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2">
              <div className="space-y-4">
                <div className="rounded-[24px] border border-[#E6E0D8] bg-[#FBFAF8] p-4 shadow-sm">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#A79B8E]">
                    Customer Details
                  </p>

                  <div className="space-y-3">
                    <input
                      className="w-full rounded-2xl border border-[#D8D1C8] bg-white px-4 py-3 text-sm font-semibold text-[#5F554C] outline-none transition placeholder:text-[#B6ADA4] focus:border-[#A79B8E] focus:ring-2 focus:ring-[#A79B8E]/20"
                      placeholder="Full Name"
                      value={form.fullName}
                      onChange={(e) =>
                        setForm({ ...form, fullName: e.target.value })
                      }
                    />

                    <div className="relative">
                      <textarea
                        placeholder="Shipping Address"
                        className="min-h-[88px] w-full resize-none rounded-2xl border border-[#D8D1C8] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#5F554C] outline-none transition placeholder:text-[#B6ADA4] focus:border-[#A79B8E] focus:ring-2 focus:ring-[#A79B8E]/20"
                        value={form.address}
                        onChange={(e) =>
                          searchAddressSuggestions(e.target.value)
                        }
                      />

                      {addressSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-2xl border border-[#E6E0D8] bg-white shadow-lg">
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
                              className="w-full border-b border-[#F0ECE6] px-4 py-3 text-left text-sm leading-5 text-[#5F554C] last:border-b-0 hover:bg-[#F8F5F1]"
                            >
                              {suggestion.properties.formatted}
                            </button>
                          ))}
                        </div>
                      )}

                      {addressLoading && (
                        <p className="mt-1 text-xs text-[#9A9188]">
                          Searching addresses...
                        </p>
                      )}
                    </div>

                    <input
                      className="w-full rounded-2xl border border-[#D8D1C8] bg-white px-4 py-3 text-sm font-semibold text-[#5F554C] outline-none transition placeholder:text-[#B6ADA4] focus:border-[#A79B8E] focus:ring-2 focus:ring-[#A79B8E]/20"
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />

                    <input
                      className="w-full rounded-2xl border border-[#D8D1C8] bg-white px-4 py-3 text-sm font-semibold text-[#5F554C] outline-none transition placeholder:text-[#B6ADA4] focus:border-[#A79B8E] focus:ring-2 focus:ring-[#A79B8E]/20"
                      placeholder="Phone"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#E6E0D8] bg-white p-4 shadow-sm">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#A79B8E]">
                    Payment Method
                  </p>

                  <select
                    className={`w-full rounded-2xl border border-[#D8D1C8] bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-[#A79B8E] focus:ring-2 focus:ring-[#A79B8E]/20 ${form.paymentMethod
                      ? "text-[#5F554C]"
                      : "text-[#B6ADA4]"
                      }`}
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm({ ...form, paymentMethod: e.target.value })
                    }
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
                    <div className="mt-4 rounded-2xl border border-[#D8D1C8] bg-[#F8F5F1] p-4 text-sm text-[#6F655C] shadow-sm">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#A79B8E] shadow-sm">
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                          >
                            <rect
                              x="3"
                              y="5"
                              width="18"
                              height="14"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="1.7"
                            />
                            <path
                              d="M3 9h18"
                              stroke="currentColor"
                              strokeWidth="1.7"
                            />
                            <path
                              d="M7 15h4"
                              stroke="currentColor"
                              strokeWidth="1.7"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>

                        <p className="font-bold text-[#5F554C]">
                          {selectedPaymentMethod.display_label} Payment
                        </p>
                      </div>

                      {selectedPaymentMethod.account_value && (
                        <div className="mb-3 rounded-xl border border-[#E6E0D8] bg-white px-3 py-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#9A9188]">
                            Payment Info
                          </p>
                          <p className="mt-1 font-bold text-[#5F554C]">
                            {selectedPaymentMethod.account_value}
                          </p>
                        </div>
                      )}

                      <p className="leading-6 text-[#6F655C]">
                        {selectedPaymentMethod.instructions ||
                          "Complete your payment using the selected method and include your order number."}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleOrderSubmit}
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-[#A79B8E] py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#978D82] active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving Order..." : "Send Order"}
                </button>

                <button
                  type="button"
                  onClick={() => setCheckoutOpen(false)}
                  className="w-full rounded-full border border-[#D8D1C8] bg-white py-3 text-sm font-bold text-[#A79B8E] shadow-sm transition-all hover:bg-[#F3F0EC] active:scale-95"
                >
                  Back to Cart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>


      {orderNotice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-5 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-[28px] border border-[#E6E0D8] bg-white p-6 text-center shadow-2xl">
            <h2 className="mb-3 text-2xl font-bold text-[#5F554C]">
              Order Received
            </h2>

            {orderNumber && (
              <div className="mb-5 rounded-2xl border border-[#E6E0D8] bg-[#F6F3EF] p-4">
                <p className="text-xs font-medium tracking-wide text-[#7F756B]">
                  Order Number
                </p>
                <p className="text-lg font-bold tracking-wide text-[#5F554C]">
                  #{orderNumber}
                </p>
              </div>
            )}

            <p className="mb-5 text-sm leading-6 text-[#6F655C]">
              {orderNotice}
            </p>

            {submittedPaymentMethod && (
              <div className="mb-5 rounded-2xl border border-[#D8D1C8] bg-[#FBFAF8] p-5 text-sm text-[#6F655C] shadow-sm">
                <p className="mb-3 font-bold text-[#5F554C]">
                  {submittedPaymentMethod.display_label} Payment
                </p>

                {submittedPaymentMethod.account_value && (
                  <div className="mb-3 rounded-xl border border-[#E6E0D8] bg-white px-3 py-2 text-left">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#9A9188]">
                      Payment Info
                    </p>
                    <p className="mt-1 font-bold text-[#5F554C]">
                      {submittedPaymentMethod.account_value}
                    </p>
                  </div>
                )}

                <p className="leading-6">
                  {submittedPaymentMethod.instructions ||
                    "Complete your payment using the selected method."}
                </p>

                <p className="mt-3 leading-6">
                  Include your order number:
                </p>

                <p className="mt-1 font-bold tracking-wide text-[#5F554C]">
                  #{orderNumber}
                </p>
              </div>
            )}

            {whatsAppUrl && (
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 block w-full rounded-full bg-[#A79B8E] py-3 text-center text-sm font-bold text-white shadow-sm transition-all hover:bg-[#978D82] active:scale-95"
              >
                Send Order via WhatsApp
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setOrderNotice("");
                setOrderNumber("");
                setWhatsAppUrl("");
                setSubmittedPaymentMethod(null);
              }}
              className="w-full rounded-full border border-[#D8D1C8] bg-white py-3 text-sm font-bold text-[#A79B8E] shadow-sm transition-all hover:bg-[#F3F0EC] active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {selectedKit && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-5 backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-[28px] border border-[#E6E0D8] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between border-b border-[#E6E0D8] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#A79B8E]">
                  Kit Includes
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-wide text-[#5F554C]">
                  {selectedKit.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedKit(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-[#7F756B] transition-all hover:bg-[#F6F3EF] active:scale-95"
                aria-label="Close kit details"
              >
                ×
              </button>
            </div>

            <div className="mb-5 flex justify-center">
              <div className="rounded-3xl border border-[#E6E0D8] bg-[#F6F3EF] p-3 shadow-sm">
                <img
                  src={selectedKit.image}
                  alt={selectedKit.name}
                  className="h-36 w-36 rounded-2xl object-contain"
                />
              </div>
            </div>

            <div className="space-y-4">
              {/* Description Section */}
              <div className="rounded-3xl border border-[#D8D1C8] bg-[#FBFAF8] p-4 shadow-sm">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#A79B8E]">
                  Product Description
                </p>
                <p className="text-sm leading-6 text-[#6F655C]">
                  {selectedKit.description}
                </p>
              </div>

              {/* Kit Items Section */}
              <div className="rounded-3xl border border-[#D8D1C8] bg-[#FBFAF8] p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#A79B8E]">
                  Kit Includes
                </p>

                <div className="space-y-2 text-sm text-[#6F655C]">
                  {selectedKit.kitItems.map((item, index) => (
                    <div key={index} className="flex gap-2 leading-6">
                      <span className="min-w-5 font-bold text-[#A79B8E]">
                        {index + 1}.
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedKit(null)}
              className="mt-5 w-full rounded-full bg-[#A79B8E] py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#978D82] active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}


      {selectedProtocol && (
        <div className="fixed inset-0 z-[70] bg-white">
          {/* Protocol Header */}
          <div className="sticky top-0 z-10 border-b border-[#978D82] bg-[#A79B8E]">
            <div className="flex items-center justify-between px-5 py-3">
              <img
                src={logoUrl}
                alt={siteName}
                className="h-10 w-auto object-contain"
              />

              <button
                type="button"
                onClick={() => setSelectedProtocol(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-3xl font-light leading-none text-white transition-all hover:bg-white/10 active:scale-95"
                aria-label="Close protocol"
              >
                ×
              </button>
            </div>
          </div>

          {/* Protocol Body */}
          <div className="h-[calc(100vh-65px)] overflow-y-auto bg-[#F7F5F2] px-4 py-5 sm:px-6 sm:py-7">
            <div className="mx-auto w-full max-w-md overflow-hidden rounded-[28px] border border-[#E6E0D8] bg-white p-4 shadow-xl sm:max-w-3xl sm:p-6">
              {/* Protocol Title */}
              <div className="mb-5 text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-[#A79B8E]">
                  Protocol Details
                </p>
                <h2 className="mt-1 text-xl font-bold tracking-wide text-[#5F554C] sm:text-2xl">
                  {selectedProtocol.name} Protocol
                </h2>
              </div>

              {/* Tabs */}
              {selectedProtocol.show_protocol_button && (
                <div className="mb-5 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setProtocolTab("protocol")}
                    className={`rounded-full px-5 py-2 text-sm font-bold shadow-sm transition-all active:scale-95 ${protocolTab === "protocol"
                      ? "bg-[#A79B8E] text-white"
                      : "border border-[#D8D1C8] bg-[#EEEAE4] text-[#A79B8E] hover:bg-[#E6E0D8]"
                      }`}
                  >
                    Protocol
                  </button>

                  {selectedProtocol.show_coa_button && (
                    <button
                      type="button"
                      onClick={() => setProtocolTab("coa")}
                      className={`rounded-full px-5 py-2 text-sm font-bold shadow-sm transition-all active:scale-95 ${protocolTab === "coa"
                        ? "bg-[#A79B8E] text-white"
                        : "border border-[#D8D1C8] bg-[#EEEAE4] text-[#A79B8E] hover:bg-[#E6E0D8]"
                        }`}
                    >
                      COA
                    </button>
                  )}
                </div>
              )}

              {/* Image */}
              <div className="overflow-hidden rounded-[24px] border border-[#E6E0D8] bg-[#FBFAF8] p-2 shadow-sm sm:p-4">
                <img
                  src={selectedProtocol.protocolImages[protocolTab]}
                  alt={`${selectedProtocol.name} ${protocolTab}`}
                  className="mx-auto w-full rounded-[18px] object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}