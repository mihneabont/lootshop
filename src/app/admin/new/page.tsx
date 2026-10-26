'use client';

import { RequireAdmin } from '@/components/guards';
import { Card, PageTitle } from '@/components/ui';

import { GiveawayForm } from '../giveaway-form';

export default function NewGiveawayPage() {
  return (
    <RequireAdmin>
      <PageTitle sub="Se salvează ca ciornă. Îl publici din pagina următoare.">Giveaway nou</PageTitle>
      <Card>
        <GiveawayForm />
      </Card>
    </RequireAdmin>
  );
}
