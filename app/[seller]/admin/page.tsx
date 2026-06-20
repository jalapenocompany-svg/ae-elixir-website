import AdminClient from "./AdminClient";

export default async function SellerAdminPage({
  params,
}: {
  params: Promise<{ seller: string }>;
}) {
  const { seller } = await params;

  return <AdminClient seller={seller} />;
}