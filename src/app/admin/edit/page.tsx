'use client';

import { useSearchParams } from 'next/navigation';

import { RequireAdmin } from '@/components/guards';
import { Card, Empty, Loading, PageTitle } from '@/components/ui';
import { must, useData } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import type { Giveaway } from '@/lib/types';

import { GiveawayForm } from '../giveaway-form';

export default function EditGiveawayPage() {
  return (
    <RequireAdmin>
      <Edit />
    </RequireAdmin>
  );
}

function Edit() {
  const id = useSearchParams().get('id') ?? '';
  const { data, loading } = useData(
    async () => must(await supabase().from('giveaways').select('*').eq('id', id).maybeSingle()) as Giveaway | null,
    [id],
  );
  if (loading) return <Loading />;
  if (!data) return <Empty title="Giveaway inexistent" />;
  return (
    <>
      <PageTitle>Editează giveaway</PageTitle>
      <Card>
        <GiveawayForm giveaway={data} />
      </Card>
    </>
  );
}
