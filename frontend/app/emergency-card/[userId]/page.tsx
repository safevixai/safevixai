import { EmergencyCardClient, type EmergencyCardData } from './EmergencyCardClient';

interface PageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<EmergencyCardData>;
}

// Phase 0.8: Generate static params for common user IDs
// This enables static generation for emergency cards
export async function generateStaticParams() {
  // In production, these would be fetched from the database
  // For now, return empty array - cards are generated on-demand
  return [];
}

// Phase 0.8: Add metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { userId } = await params;
  return {
    title: `Emergency Card - SafeVixAI`,
    description: `Emergency contact information for user ${userId}`,
    robots: { index: false }, // Don't index emergency cards
  };
}

export default async function EmergencyCardPage({ params, searchParams }: PageProps) {
  const { userId } = await params;
  const initialData = await searchParams;

  return <EmergencyCardClient userId={userId} initialData={initialData} />;
}
