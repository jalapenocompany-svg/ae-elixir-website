import SiteHeader from "@/components/SiteHeader";

const researchApplications = [
  {
    title: "Cell Culture Studies",
    description:
      "Investigate cellular responses and biological mechanisms in controlled laboratory environments.",
    icon: (
      <path
        d="M9 3h6M10 3v5l-5 8.2A3.1 3.1 0 0 0 7.7 21h8.6a3.1 3.1 0 0 0 2.7-4.8L14 8V3M8.5 14h7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Protein Analysis",
    description:
      "Study protein interactions, binding characteristics, purity, and structural properties.",
    icon: (
      <>
        <rect
          x="5"
          y="12"
          width="3"
          height="7"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <rect
          x="10.5"
          y="8"
          width="3"
          height="11"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <rect
          x="16"
          y="4"
          width="3"
          height="15"
          rx="1"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </>
    ),
  },
  {
    title: "Receptor Studies",
    description:
      "Examine receptor binding, signaling pathways, and molecular research mechanisms.",
    icon: (
      <path
        d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Biochemical Assays",
    description:
      "Conduct analytical testing and laboratory assays using controlled research methodologies.",
    icon: (
      <>
        <rect
          x="6"
          y="5"
          width="12"
          height="15"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M9 5V3h6v2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </>
    ),
  },
];

const standards = [
  {
    value: "99%+",
    title: "Purity Verified",
    description: "Testing information available where applicable.",
  },
  {
    value: "3rd",
    title: "Party Tested",
    description: "Independent laboratory analysis where provided.",
  },
  {
    value: "CoA",
    title: "Included",
    description: "Certificate of Analysis available by product or batch.",
  },
];

export default function ResearchUseOnlyPage() {
  return (
    <div className="min-h-screen bg-white text-[#5F554C]">
      <SiteHeader />

      <main className="px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto w-full max-w-4xl">
          <section className="rounded-[28px] border border-[#D8D1C8] bg-[#F3EFEA] p-6 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#A79B8E] shadow-sm">
              <svg
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M9 3h6M10 3v5l-5 8.2A3.1 3.1 0 0 0 7.7 21h8.6a3.1 3.1 0 0 0 2.7-4.8L14 8V3M8.5 14h7"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1 className="mt-5 text-2xl font-bold text-[#5F554C] sm:text-3xl">
              For Research and Laboratory Use Only
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#6F655C]">
              Products offered by AE Elixir are intended strictly for in-vitro
              research, laboratory experimentation, analytical testing, and
              educational purposes. They are not intended for human or
              veterinary use.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {[
                "Not for Human Use",
                "Not for Veterinary Use",
                "Not for Food Use",
              ].map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-[#D8D1C8] bg-white px-4 py-2 text-xs font-semibold text-[#6F655C]"
                >
                  <span className="text-red-400">×</span>
                  {label}
                </span>
              ))}
            </div>
          </section>

          <section className="py-10">
            <div className="mb-7 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A79B8E]">
                Laboratory Applications
              </p>

              <h2 className="mt-2 text-2xl font-bold text-[#5F554C] sm:text-3xl">
                Intended Research Applications
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {researchApplications.map((application) => (
                <article
                  key={application.title}
                  className="rounded-[22px] border border-[#E6E0D8] bg-[#FBFAF8] p-5 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#A79B8E] shadow-sm">
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      {application.icon}
                    </svg>
                  </div>

                  <h3 className="mt-4 font-bold text-[#5F554C]">
                    {application.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-[#6F655C]">
                    {application.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#D8D1C8] bg-[#F1ECE6] p-6 text-center shadow-sm sm:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A79B8E]">
              Product Standards
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#5F554C] sm:text-3xl">
              Research-Grade Quality Standards
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#6F655C]">
              Available testing and documentation are provided to support
              reliable and transparent laboratory research.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {standards.map((standard) => (
                <div
                  key={standard.title}
                  className="rounded-[20px] border border-[#E6E0D8] bg-white p-5 shadow-sm"
                >
                  <p className="text-2xl font-bold text-[#A79B8E]">
                    {standard.value}
                  </p>

                  <p className="mt-2 font-bold text-[#5F554C]">
                    {standard.title}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#7F756B]">
                    {standard.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-[24px] border border-[#E6E0D8] bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#5F554C]">
              Responsible Handling
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#6F655C]">
              Products should be received, stored, handled, and used only by
              qualified individuals who understand appropriate laboratory
              procedures, applicable regulations, and product-specific safety
              requirements. Buyers are solely responsible for determining
              whether a product is appropriate and lawful for their intended
              research.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}