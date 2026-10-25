import type { Metadata } from 'next';

import { PageTitle } from '@/components/ui';
import { company } from '@/lib/company';

export const metadata: Metadata = { title: 'Regulament oficial' };

// Template for the official campaign rules (OG 99/2000). Have a lawyer
// review it before launch.
export default function RulesPage() {
  return (
    <article className="flex max-w-3xl flex-col gap-4 leading-relaxed [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc">
      <PageTitle sub="Campania promoțională „Giveaway zilnic Loot Shop”">Regulament oficial</PageTitle>

      <h2>1. Organizatorul</h2>
      <p>
        Campania este organizată de {company.name}, CUI {company.cui}, {company.regCom}, cu sediul în {company.address}{' '}
        („Organizatorul”), operatorul magazinului online lootshop.ro.
      </p>

      <h2>2. Durata și locul campaniei</h2>
      <p>
        Campania se desfășoară online, pe acest site, în România. Fiecare giveaway are o perioadă de înscriere afișată pe
        pagina lui (data și ora de început și de sfârșit, ora României).
      </p>

      <h2>3. Participare gratuită</h2>
      <ul>
        <li>Participarea este gratuită și nu este condiționată de nicio achiziție sau plată.</li>
        <li>Pot participa persoanele fizice cu vârsta de minimum 18 ani, cu domiciliul sau reședința în România.</li>
        <li>Fiecare persoană poate avea un singur cont și se poate înscrie o singură dată la fiecare giveaway.</li>
        <li>Angajații Organizatorului și rudele lor de gradul I nu pot participa.</li>
      </ul>

      <h2>4. Premiul</h2>
      <p>
        Premiul fiecărui giveaway este dreptul de a cumpăra produsul indicat, o singură dată, la prețul promoțional afișat
        pe pagina giveaway-ului, de pe lootshop.ro. Premiul nu se poate transfera și nu se acordă contravaloarea lui în
        bani. Valoarea premiului este diferența dintre prețul de listă și prețul promoțional afișate.
      </p>

      <h2>5. Desemnarea câștigătorului</h2>
      <p>
        După închiderea înscrierilor, câștigătorul este ales aleatoriu, prin tragere la sorți electronică, dintre toți
        participanții înscriși valid. Fiecare tragere este înregistrată (număr de participanți, valoare aleatorie, data și
        ora). Numele câștigătorului se afișează pe site sub forma prenume și inițiala numelui.
      </p>

      <h2>6. Anunțarea și revendicarea premiului</h2>
      <p>
        Câștigătorul este anunțat prin email, în secțiunea Mesaje a contului și prin notificare (dacă le-a activat).
        Organizatorul îl contactează pentru a-i comunica modul de cumpărare. Dacă câștigătorul nu răspunde sau refuză
        premiul, Organizatorul poate desemna un alt câștigător prin aceeași metodă.
      </p>

      <h2>7. Descalificare</h2>
      <p>
        Organizatorul poate descalifica participanții care folosesc mai multe conturi, date false, mijloace automate sau
        orice metodă care afectează caracterul corect al campaniei.
      </p>

      <h2>8. Taxe</h2>
      <p>
        Organizatorul reține și virează impozitul datorat pentru premiile a căror valoare depășește pragul neimpozabil
        prevăzut de Codul fiscal.
      </p>

      <h2>9. Date personale</h2>
      <p>
        Datele participanților sunt prelucrate conform <a href="/privacy" className="underline">politicii de
        confidențialitate</a> și Regulamentului (UE) 2016/679.
      </p>

      <h2>10. Litigii și contact</h2>
      <p>
        Eventualele neînțelegeri se rezolvă pe cale amiabilă sau, în lipsa unui acord, de instanțele competente din România.
        Contact: {company.email}. Regulamentul este disponibil gratuit oricărei persoane pe această pagină.
      </p>
    </article>
  );
}
