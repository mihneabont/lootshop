import type { Metadata } from 'next';

import { PageTitle } from '@/components/ui';
import { company } from '@/lib/company';

export const metadata: Metadata = { title: 'Politica de confidențialitate' };

// Template privacy policy. Have a lawyer review it before launch.
export default function PrivacyPage() {
  return (
    <article className="flex max-w-3xl flex-col gap-4 leading-relaxed [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc">
      <PageTitle>Politica de confidențialitate</PageTitle>

      <h2>Cine prelucrează datele</h2>
      <p>
        {company.name}, CUI {company.cui}, {company.address}. Contact pentru protecția datelor: {company.email}.
      </p>

      <h2>Ce date colectăm</h2>
      <ul>
        <li>Numele și adresa de email (sau datele primite de la Google ori Facebook la autentificare).</li>
        <li>Înscrierile la giveaway-uri și mesajele schimbate cu noi.</li>
        <li>Datele tehnice necesare notificărilor push, dacă le activezi.</li>
      </ul>

      <h2>De ce</h2>
      <ul>
        <li>Pentru a organiza giveaway-urile și a-ți anunța câștigul (executarea regulamentului).</li>
        <li>Pentru a-ți trimite notificări despre giveaway-uri noi (consimțământ, îl poți retrage oricând din Cont).</li>
        <li>Pentru obligații legale, de exemplu fiscale, în cazul câștigătorilor.</li>
      </ul>

      <h2>Cui le transmitem</h2>
      <p>
        Furnizorilor care ne ajută să rulăm serviciul: găzduire și bază de date (Supabase, Vercel), email (Resend) și
        serviciile de notificări ale browserului. Nu vindem datele tale.
      </p>

      <h2>Cât timp le păstrăm</h2>
      <p>Cât timp ai cont. Datele câștigătorilor se păstrează cât cer obligațiile fiscale.</p>

      <h2>Drepturile tale</h2>
      <p>
        Ai dreptul de acces, rectificare, ștergere, restricționare, portabilitate și opoziție, precum și dreptul de a depune
        plângere la ANSPDCP. Îți poți șterge contul oricând din pagina Cont.
      </p>
    </article>
  );
}
