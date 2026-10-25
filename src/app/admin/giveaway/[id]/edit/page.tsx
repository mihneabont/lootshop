import { notFound } from 'next/navigation';

import { Card, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import type { Giveaway } from '@/lib/types';

import { GiveawayForm } from '../../../giveaway-form';

export default async function EditGiveawayPage({ params }: PageProps<'/admin/giveaway/[id]/edit'>) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('giveaways').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageTitle>Editează giveaway</PageTitle>
      <Card>
        <GiveawayForm giveaway={data as Giveaway} />
      </Card>
    </>
  );
}
