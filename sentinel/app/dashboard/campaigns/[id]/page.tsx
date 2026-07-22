import { CampaignDetails } from './CampaignDetails';

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CampaignDetails id={id} />;
}
