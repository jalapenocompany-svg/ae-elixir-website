import SiteHeader from "@/components/SiteHeader";

const sections = [
  {
    title: "Shipping Overview",
    content: (
      <p>
        AE Elixir ships orders to eligible locations within the United States.
        Shipping options, estimated delivery times, and shipping costs may vary
        depending on the selected carrier, destination, package size, and order
        details. Shipping charges, when applicable, will be displayed during
        checkout before the order is submitted.
      </p>
    ),
  },
  {
    title: "Order Processing Time",
    content: (
      <p>
        Orders are generally reviewed and processed after payment has been
        confirmed. Processing times may vary depending on order volume, product
        availability, payment confirmation, weather conditions, carrier delays,
        holidays, or other operational factors. Processing time is separate from
        carrier transit time.
      </p>
    ),
  },
  {
    title: "Shipping Methods",
    content: (
      <>
        <p>AE Elixir may offer shipping options such as:</p>

        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>USPS standard shipping for lower-cost delivery.</li>
          <li>UPS or other expedited options for faster delivery.</li>
          <li>
            Additional carrier options may be added or removed at AE Elixir’s
            discretion.
          </li>
        </ul>

        <p className="mt-3">
          Delivery estimates are provided for convenience only and are not
          guaranteed unless expressly stated.
        </p>
      </>
    ),
  },
  {
    title: "Shipping Costs",
    content: (
      <p>
        Shipping costs are paid by the customer unless otherwise stated.
        Shipping fees may be based on the selected carrier, selected service
        level, order size, or flat-rate shipping options configured by AE
        Elixir. Any applicable shipping charges will be included in the final
        order total before submission.
      </p>
    ),
  },
  {
    title: "Tracking Information",
    content: (
      <p>
        When tracking information is available, AE Elixir may provide a tracking
        number by email or through the order lookup page. Tracking updates are
        controlled by the shipping carrier. AE Elixir is not responsible for
        carrier website delays, tracking scan delays, or carrier system errors.
      </p>
    ),
  },
  {
    title: "Incorrect or Incomplete Address",
    content: (
      <p>
        Customers are responsible for providing a complete and accurate shipping
        address at checkout. AE Elixir is not responsible for delays, failed
        delivery, returned packages, or lost shipments caused by incorrect,
        incomplete, or undeliverable addresses submitted by the customer.
        Additional shipping charges may apply if an order must be reshipped.
      </p>
    ),
  },
  {
    title: "Lost, Delayed, or Damaged Packages",
    content: (
      <p>
        Once a package is transferred to the shipping carrier, delivery timing
        and handling are subject to the carrier’s process. If a package is lost,
        delayed, or damaged in transit, the customer should contact AE Elixir
        promptly so the issue can be reviewed. Resolution may depend on the
        carrier’s investigation, insurance availability, package status, and the
        details of the order.
      </p>
    ),
  },
  {
    title: "Temperature-Sensitive Handling",
    content: (
      <p>
        Certain research products may be sensitive to storage or temperature
        conditions. Customers are responsible for retrieving packages promptly
        after delivery and storing products according to the provided product
        guidance. AE Elixir is not responsible for product issues caused by
        packages left unattended, exposed to extreme temperatures, or stored
        improperly after delivery.
      </p>
    ),
  },
  {
    title: "Shipping Restrictions",
    content: (
      <p>
        AE Elixir reserves the right to refuse, cancel, or restrict orders where
        shipping is unavailable, prohibited, or impractical. Customers are
        responsible for ensuring that products can be lawfully purchased,
        received, possessed, and used in their location.
      </p>
    ),
  },
  {
    title: "Policy Updates",
    content: (
      <p>
        AE Elixir may update this Shipping Policy at any time. Changes become
        effective when posted on this page. Continued use of the website or
        purchase of products after an update constitutes acceptance of the
        revised policy.
      </p>
    ),
  },
];

export default function ShippingPolicyPage() {
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
                  d="M4 8h10v8H4V8Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 11h3l3 3v2h-6v-5Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <circle cx="7" cy="18" r="1.5" stroke="currentColor" strokeWidth="1.7" />
                <circle cx="17" cy="18" r="1.5" stroke="currentColor" strokeWidth="1.7" />
              </svg>
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">
              AE Elixir
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Shipping Policy
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/85">
              Important information regarding order processing, shipping
              methods, delivery estimates, tracking, and carrier-related issues.
            </p>
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
              Questions concerning this Shipping Policy may be sent to:
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