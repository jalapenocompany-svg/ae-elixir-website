import SiteHeader from "@/components/SiteHeader";

const eligibleReturns = [
    "Products damaged during shipping with photo evidence",
    "Defective products that do not meet purity standards",
    "Incorrect items received",
];

const notEligibleReturns = [
    "Reconstituted products",
    "Damage claims without photo evidence",
    "Products improperly stored after delivery",
    "Products without proof of purchase",
];


const sections = [
    {
        title: "Return Policy Overview",
        content: (
            <p>
                This Return Policy explains how AE Elixir reviews return, replacement,
                cancellation, and refund requests. Because AE Elixir products are sold
                for research use and may require specific handling and storage
                conditions, return eligibility may be limited.
            </p>
        ),
    },
    {
        title: "Research Product Handling",
        content: (
            <p>
                Products sold by AE Elixir are intended for research and laboratory use
                only. For quality, safety, and handling reasons, opened, used, altered,
                improperly stored, or temperature-compromised products are not eligible
                for return. Customers are responsible for reviewing product details,
                quantities, and shipping information before submitting an order.
            </p>
        ),
    },
    {
        title: "Eligible Return or Replacement Situations",
        content: (
            <>
                <p>
                    AE Elixir may review return, replacement, or refund requests for the
                    following situations:
                </p>

                <ul className="mt-3 list-disc space-y-2 pl-5">
                    <li>The wrong item was shipped.</li>
                    <li>An item was missing from the order.</li>
                    <li>The package arrived visibly damaged.</li>
                    <li>
                        The product received does not match the confirmed order details.
                    </li>
                </ul>

                <p className="mt-3">
                    All requests are subject to review and approval by AE Elixir.
                </p>
            </>
        ),
    },
    {
        title: "Non-Returnable Items",
        content: (
            <>
                <p>The following items are generally not eligible for return:</p>

                <ul className="mt-3 list-disc space-y-2 pl-5">
                    <li>Opened or used products.</li>
                    <li>Products with broken seals or altered packaging.</li>
                    <li>Products stored improperly after delivery.</li>
                    <li>Products damaged after delivery.</li>
                    <li>Products ordered by mistake after order confirmation.</li>
                    <li>
                        Products delayed, damaged, or compromised due to incorrect shipping
                        information provided by the customer.
                    </li>
                </ul>
            </>
        ),
    },
    {
        title: "Request Timeframe",
        content: (
            <p>
                Customers should contact AE Elixir as soon as possible after delivery if
                there is an issue with an order. To help us review the request,
                customers should provide the order number, customer name, photos if
                applicable, and a clear description of the issue.
            </p>
        ),
    },
    {
        title: "Return Authorization",
        content: (
            <p>
                Items should not be returned without prior approval from AE Elixir.
                Unauthorized returns may not be accepted or processed. If a return is
                approved, AE Elixir will provide instructions for the next steps.
            </p>
        ),
    },
    {
        title: "Refunds",
        content: (
            <p>
                Approved refunds may be issued to the original payment method or through
                another approved method, depending on the payment type and order
                circumstances. Refund processing times may vary depending on the payment
                provider, bank, or platform used. Shipping fees may be non-refundable
                unless the issue was caused by an AE Elixir fulfillment error.
            </p>
        ),
    },
    {
        title: "Replacements",
        content: (
            <p>
                If a replacement is approved, AE Elixir may replace the affected item
                with the same product or another agreed solution depending on product
                availability, order details, and the nature of the issue.
            </p>
        ),
    },
    {
        title: "Cancellations",
        content: (
            <p>
                Cancellation requests should be made as soon as possible after an order
                is placed. AE Elixir cannot guarantee cancellation once payment has been
                confirmed, the order has been processed, or the order has been shipped.
            </p>
        ),
    },
    {
        title: "Customer Responsibility",
        content: (
            <p>
                Customers are responsible for confirming product selection, quantity,
                shipping address, payment method, and all order details before
                submission. Customers are also responsible for retrieving packages
                promptly after delivery and storing products according to applicable
                product guidance.
            </p>
        ),
    },
    {
        title: "Policy Updates",
        content: (
            <p>
                AE Elixir may update this Return Policy at any time. Changes become
                effective when posted on this page. Continued use of the website or
                purchase of products after an update constitutes acceptance of the
                revised policy.
            </p>
        ),
    },
];

export default function ReturnPolicyPage() {
    return (
        <div className="min-h-screen bg-[#F8F6F3] text-[#5F554C]">
            <SiteHeader />

            <main className="px-4 py-8 sm:px-6 sm:py-12">
                <div className="mx-auto w-full max-w-4xl">
                    <div className="mb-6 rounded-[28px] border border-[#E6E0D8] bg-[#A79B8E] px-6 py-10 text-center text-white shadow-sm sm:px-10">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                            <svg
                                className="h-7 w-7"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                            >
                                <path
                                    d="M7 7h9.5a4.5 4.5 0 0 1 0 9H8"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M7 7l3-3M7 7l3 3"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M8 20h8"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>

                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">
                            AE Elixir
                        </p>

                        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
                            Return Policy
                        </h1>

                        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/85">
                            Important information regarding return eligibility, replacements,
                            refunds, cancellations, and customer responsibilities.
                        </p>
                    </div>

                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <section className="rounded-[24px] border border-[#E6E0D8] bg-white p-5 shadow-sm sm:p-7">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                                    <svg
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M6 12.5 10 16l8-9"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>

                                <h2 className="text-lg font-bold text-[#5F554C]">
                                    Eligible for Return
                                </h2>
                            </div>

                            <div className="space-y-3">
                                {eligibleReturns.map((item) => (
                                    <div key={item} className="flex gap-3 text-sm leading-6 text-[#6F655C]">
                                        <svg
                                            className="mt-1 h-4 w-4 shrink-0 text-green-700"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            aria-hidden="true"
                                        >
                                            <path
                                                d="M6 12.5 10 16l8-9"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>

                                        <p>{item}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-[24px] border border-[#E6E0D8] bg-white p-5 shadow-sm sm:p-7">
                            <div className="mb-5 flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                                    <svg
                                        className="h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M7 7l10 10M17 7 7 17"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>

                                <h2 className="text-lg font-bold text-[#5F554C]">
                                    Not Eligible for Return
                                </h2>
                            </div>

                            <div className="space-y-3">
                                {notEligibleReturns.map((item) => (
                                    <div key={item} className="flex gap-3 text-sm leading-6 text-[#6F655C]">
                                        <svg
                                            className="mt-1 h-4 w-4 shrink-0 text-red-600"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            aria-hidden="true"
                                        >
                                            <path
                                                d="M7 7l10 10M17 7 7 17"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                            />
                                        </svg>

                                        <p>{item}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    <div className="space-y-4">
                        {sections.map((section) => (
                            <section
                                key={section.title}
                                className="rounded-[24px] border border-[#E6E0D8] bg-white p-5 shadow-sm sm:p-7"
                            >
                                <h2 className="mb-3 text-xl font-bold text-[#5F554C]">
                                    {section.title}
                                </h2>

                                <div className="text-sm leading-7 text-[#6F655C] sm:text-[15px]">
                                    {section.content}
                                </div>
                            </section>
                        ))}
                    </div>

                    <section className="mt-5 rounded-[24px] border border-[#D8D1C8] bg-[#F3EFEA] p-6 text-center shadow-sm">
                        <h2 className="text-xl font-bold text-[#5F554C]">Contact</h2>

                        <p className="mt-2 text-sm leading-6 text-[#6F655C]">
                            Questions concerning this Return Policy may be sent to:
                        </p>

                        <div className="mt-4 space-y-1 text-sm">
                            <p className="font-bold text-[#5F554C]">AE Elixir</p>

                            <p>
                                Support:{" "}
                                <a
                                    href="mailto:support@aeelixir.com"
                                    className="font-semibold text-[#8F8276] underline underline-offset-2"
                                >
                                    support@aeelixir.com
                                </a>
                            </p>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}