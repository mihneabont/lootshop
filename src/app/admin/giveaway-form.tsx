'use client';

import { useRouter } from 'next/navigation';

import { Button, Field, Notice, TextArea } from '@/components/ui';
import { fromLocalInput, toLocalInput } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Giveaway } from '@/lib/types';
import { useAction } from '@/lib/use-action';

// Today's date in Romania at the given hour, as a datetime-local value.
function todayAt(hour: number) {
  return `${toLocalInput(new Date().toISOString()).slice(0, 10)}T${String(hour).padStart(2, '0')}:00`;
}

export function GiveawayForm({ giveaway }: { giveaway?: Giveaway }) {
  const router = useRouter();
  const save = useAction();

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    save.run(async () => {
      const num = (k: string) => Number(String(form.get(k) ?? '').replace(',', '.'));
      const text = (k: string) => String(form.get(k) ?? '').trim() || null;
      const values = {
        title: String(form.get('title') ?? '').trim(),
        description: String(form.get('description') ?? '').trim(),
        image_url: text('image_url'),
        product_url: text('product_url'),
        wc_product_id: text('wc_product_id') ? Number(text('wc_product_id')) : null,
        retail_price_ron: num('retail_price_ron'),
        giveaway_price_ron: num('giveaway_price_ron'),
        opens_at: fromLocalInput(String(form.get('opens_at'))),
        closes_at: fromLocalInput(String(form.get('closes_at'))),
      };
      if (!values.title) throw new Error('Titlul este obligatoriu.');
      if (!(values.retail_price_ron > values.giveaway_price_ron)) {
        throw new Error('Prețul din giveaway trebuie să fie mai mic decât prețul normal.');
      }
      if (values.closes_at <= values.opens_at) throw new Error('Închiderea trebuie să fie după deschidere.');

      const table = supabase().from('giveaways');
      const { data, error } = giveaway
        ? await table.update(values).eq('id', giveaway.id).select('id').single()
        : await table.insert(values).select('id').single();
      if (error) throw error;
      router.push(`/admin/giveaway?id=${data.id}`);
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Produs" name="title" required defaultValue={giveaway?.title} placeholder="Pokémon TCG: Pitch Black Elite Trainer Box" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Preț normal (lei)" name="retail_price_ron" inputMode="decimal" required defaultValue={giveaway?.retail_price_ron} placeholder="399" />
        <Field label="Preț în giveaway (lei)" name="giveaway_price_ron" inputMode="decimal" required defaultValue={giveaway?.giveaway_price_ron} placeholder="150" />
        <Field
          label="Înscrierile se deschid"
          name="opens_at"
          type="datetime-local"
          required
          defaultValue={giveaway ? toLocalInput(giveaway.opens_at) : todayAt(10)}
        />
        <Field
          label="Înscrierile se închid"
          name="closes_at"
          type="datetime-local"
          required
          defaultValue={giveaway ? toLocalInput(giveaway.closes_at) : todayAt(22)}
        />
      </div>
      <Field
        label="Link imagine produs"
        name="image_url"
        type="url"
        defaultValue={giveaway?.image_url ?? ''}
        placeholder="https://lootshop.ro/wp-content/uploads/…"
        hint="Click dreapta (sau apasă lung) pe poza produsului de pe lootshop.ro → Copiază adresa imaginii."
      />
      <Field label="Link produs pe lootshop.ro" name="product_url" type="url" defaultValue={giveaway?.product_url ?? ''} placeholder="https://lootshop.ro/produs/…" />
      <Field
        label="ID produs WooCommerce (opțional)"
        name="wc_product_id"
        inputMode="numeric"
        defaultValue={giveaway?.wc_product_id ?? ''}
        hint="Dacă e completat, la extragere se creează automat un cupon unic pentru câștigător."
      />
      <TextArea label="Descriere" name="description" defaultValue={giveaway?.description ?? ''} />
      {save.error ? <Notice tone="error">{save.error}</Notice> : null}
      <Button type="submit" disabled={save.busy}>
        {save.busy ? 'Se salvează…' : giveaway ? 'Salvează modificările' : 'Creează ciorna'}
      </Button>
    </form>
  );
}
