import SiteHeader from "@/components/SiteHeader";

const sections = [
  {
    title: "General Disclaimer",
    content: (
      <p>
        The information provided on this website is for general informational
        purposes only. While AE Elixir strives to provide accurate and
        up-to-date information, we make no representations or warranties of any
        kind, express or implied, regarding the completeness, accuracy,
        reliability, suitability, or availability of the information, products,
        or services contained on this website.
      </p>
    ),
  },
  {
    title: "Product Use Disclaimer",
    content: (
      <>
        <p>All products sold by AE Elixir:</p>

        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            Are sold strictly for in-vitro research and laboratory use only.
          </li>
          <li>Are not intended for human or veterinary use.</li>
          <li>
            Are not intended for use as food additives, drugs, cosmetics, or
            household chemicals.
          </li>
          <li>
            Are not intended to diagnose, treat, cure, or prevent any disease.
          </li>
          <li>
            Should only be handled by qualified and appropriately trained
            professionals.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "No Medical Advice",
    content: (
      <p>
        Nothing on this website should be construed as medical advice. The
        content is not intended to replace professional medical advice,
        diagnosis, or treatment. Always seek the advice of a physician or other
        qualified health provider with questions regarding a medical condition.
      </p>
    ),
  },
  {
    title: "Research Information",
    content: (
      <p>
        Research information, scientific data, and study references provided on
        this website are presented for educational and informational purposes
        only. Such information does not constitute an endorsement of any
        particular use of our products. Researchers are responsible for
        verifying information and conducting their own due diligence before
        using any product.
      </p>
    ),
  },
  {
    title: "Buyer Responsibility",
    content: (
      <>
        <p>By purchasing products from AE Elixir, you represent that:</p>

        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>You are at least 21 years of age.</li>
          <li>
            You are purchasing products solely for legitimate research
            purposes.
          </li>
          <li>
            You will comply with all applicable laws and regulations concerning
            the purchase, possession, handling, and use of the products.
          </li>
          <li>
            You will not use the products in a manner inconsistent with their
            intended research use.
          </li>
          <li>
            You accept responsibility for proper storage, handling, and use.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "Product Quality Disclaimer",
    content: (
      <p>
        AE Elixir strives to provide high-quality research products supported,
        where applicable, by third-party testing. Results may vary depending on
        research conditions, storage, handling, equipment, methodology, and
        other factors outside our control. A Certificate of Analysis reflects
        the test results available at the time of analysis and does not
        guarantee a particular research outcome.
      </p>
    ),
  },
  {
    title: "Limitation of Liability",
    content: (
      <p>
        To the fullest extent permitted by law, AE Elixir, its owners,
        employees, contractors, and affiliates shall not be liable for any
        direct, indirect, incidental, special, consequential, exemplary, or
        punitive damages arising from the use of our products or information
        provided on this website. This includes loss of profits, data, research
        materials, or other intangible losses.
      </p>
    ),
  },
  {
    title: "Indemnification",
    content: (
      <p>
        You agree to indemnify, defend, and hold harmless AE Elixir, its owners,
        officers, directors, employees, agents, and affiliates from claims,
        damages, losses, liabilities, regulatory actions, and expenses,
        including reasonable attorneys&apos; fees, arising from your use,
        misuse, storage, handling, promotion, resale, or representation of our
        products; statements or claims made to third parties; violations of
        applicable law; or violations of this disclaimer or the website&apos;s
        terms. This obligation survives termination of your account or use of
        the website.
      </p>
    ),
  },
  {
    title: "External Links",
    content: (
      <p>
        This website may contain links to third-party websites. AE Elixir does
        not control those websites and is not responsible for their content,
        availability, security, or privacy practices. The inclusion of a link
        does not constitute an endorsement.
      </p>
    ),
  },
  {
    title: "Changes to This Disclaimer",
    content: (
      <p>
        AE Elixir may update this disclaimer at any time without prior notice.
        Changes become effective when posted on this page. Continued use of the
        website or purchase of products after an update constitutes acceptance
        of the revised disclaimer.
      </p>
    ),
  },
];

export default function LegalDisclaimerPage() {
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
                  d="M12 3 4.5 6v5.5c0 4.6 3 7.8 7.5 9.5 4.5-1.7 7.5-4.9 7.5-9.5V6L12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 8v5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="16.5" r="1" fill="currentColor" />
              </svg>
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">
              AE Elixir
            </p>

            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Legal Disclaimer
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/85">
              Important information regarding website content, product use,
              buyer responsibilities, and limitations.
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
              Questions concerning this disclaimer may be sent to:
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

          <p className="mt-5 text-center text-xs leading-5 text-[#9A9188]">
            This page is provided for general business use and should be
            reviewed by qualified legal counsel before launch.
          </p>
        </div>
      </main>
    </div>
  );
}