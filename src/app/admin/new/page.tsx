import type { Metadata } from 'next';

import { Card, PageTitle } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';

import { GiveawayForm } from '../giveaway-form';

export const metadata: Metadata = { title: 'Giveaway nou' };

export default async function NewGiveawayPage() {
  await requireAdmin();
  return (
    <>
      <PageTitle sub="Se salvează ca ciornă. Îl publici din pagina următoare.">Giveaway nou</PageTitle>
      <Card>
        <GiveawayForm />
      </Card>
    </>
  );
}
