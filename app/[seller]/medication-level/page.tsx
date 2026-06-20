import MedicationLevelClient from "./MedicationLevelClient";

export default function MedicationLevelPage({
  params,
}: {
  params: { seller: string };
}) {
  return <MedicationLevelClient seller={params.seller} />;
}