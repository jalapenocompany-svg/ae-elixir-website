import ShopClient from "./ShopClient";

export default async function SellerPage({
  params,
}: {
  params: Promise<{ seller: string }>;
}) {
  const { seller } = await params;

  return <ShopClient seller={seller} />;
}