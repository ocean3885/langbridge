import SharedVideoDetails from '@/components/video/SharedVideoDetails';

interface LBVideoDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LBVideoDetailsPage({ params }: LBVideoDetailsPageProps) {
  const { id } = await params;

  return <SharedVideoDetails id={id} backUrl="/lb-videos" />;
}
