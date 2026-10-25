import { ActionForm } from '@/components/action-form';
import { SubmitButton } from '@/components/submit-button';
import { Field, TextArea } from '@/components/ui';
import { toLocalInput } from '@/lib/format';
import type { Giveaway } from '@/lib/types';

import { saveGiveaway } from './actions';

// Today's date in Romania at the given hour, as a datetime-local value.
function todayAt(hour: number) {
  return `${toLocalInput(new Date().toISOString()).slice(0, 10)}T${String(hour).padStart(2, '0')}:00`;
}

export function GiveawayForm({ giveaway }: { giveaway?: Giveaway }) {
  return (
    <ActionForm action={saveGiveaway} className="flex flex-col gap-4">
      {giveaway ? <input type="hidden" name="id" value={giveaway.id} /> : null}
      <Field label="Produs" name="title" required defaultValue={giveaway?.title} placeholder="Pokémon TCG: Pitch Black Elite Trainer Box" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Preț normal (lei)"
          name="retail_price_ron"
          inputMode="decimal"
          required
          defaultValue={giveaway?.retail_price_ron}
          placeholder="399"
        />
        <Field
          label="Preț în giveaway (lei)"
          name="giveaway_price_ron"
          inputMode="decimal"
          required
          defaultValue={giveaway?.giveaway_price_ron}
          placeholder="150"
        />
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
        hint="Click dreapta pe poza produsului de pe lootshop.ro → Copiază adresa imaginii."
      />
      <Field
        label="Link produs pe lootshop.ro"
        name="product_url"
        type="url"
        defaultValue={giveaway?.product_url ?? ''}
        placeholder="https://lootshop.ro/produs/…"
      />
      <Field
        label="ID produs WooCommerce (opțional)"
        name="wc_product_id"
        inputMode="numeric"
        defaultValue={giveaway?.wc_product_id ?? ''}
        hint="Dacă e completat, la extragere se creează automat un cupon unic pentru câștigător."
      />
      <TextArea label="Descriere" name="description" defaultValue={giveaway?.description ?? ''} />
      <SubmitButton pendingText="Se salvează…">{giveaway ? 'Salvează modificările' : 'Creează ciorna'}</SubmitButton>
    </ActionForm>
  );
}
