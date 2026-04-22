import SharedVideoDetails from '@/components/video/SharedVideoDetails';

interface MyVideoPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MyVideoPage({ params }: MyVideoPageProps) {
  const { id } = await params;

  return <SharedVideoDetails id={id} backUrl="/my-videos" />;
}