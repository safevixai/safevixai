import { EmergencyCardClient, type EmergencyCardData } from './EmergencyCardClient';

interface PageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<EmergencyCardData>;
}

export default async function EmergencyCardPage({ params, searchParams }: PageProps) {
  const { userId } = await params;
  const initialData = await searchParams;

  return <EmergencyCardClient userId={userId} initialData={initialData} />;
}
