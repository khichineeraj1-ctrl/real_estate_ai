import type { Metadata } from 'next';
import Link from 'next/link';
import { register } from '@/app/admin/actions';
import { AdminForm } from '@/components/admin/Form';
import { Field } from '@/components/admin/fields';
import { Faq } from '@/components/Faq';
import { BRAND } from '@/lib/seo';

const title = 'Post Your Property for Sale — Free for Owners, Agents and Builders';
const description = `List your flat, villa, builder floor or plot for sale on ${BRAND}. Create an account, add the details and photos, and reach buyers in Gurgaon, Bengaluru, Mumbai and Pune.`;
export const metadata: Metadata = { title, description, alternates: { canonical: '/post-property' }, openGraph: { title, description, url: '/post-property' } };

export default function PostProperty() {
  return (
    <>
      <h1>Post your property for sale</h1>
      <p className="lead">Owners, agents and builders can list flats, villas, builder floors and plots. Buyers find them by asking, by voice or text, and on our city and locality pages.</p>
      <ol className="bullets">
        <li>Create your account below.</li>
        <li>Add the details of your property and up to 12 photos.</li>
        <li>Our team checks each listing before it goes live, so buyers see accurate homes.</li>
      </ol>

      <section className="section">
        <h2>Create your account</h2>
        <AdminForm action={register} submit="Create account and post a property" pendingLabel="Creating…">
          <Field label="Your name" name="name" autoComplete="name" maxLength={80} />
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" hint="10 to 13 digits. Shown only to our team for now." />
          <Field label="Email" name="email" type="email" autoComplete="email" />
          <Field label="Password" name="password" type="password" autoComplete="new-password" hint="At least 10 characters." />
        </AdminForm>
        <p>Already have an account? <Link href="/admin/login">Sign in</Link> to manage your listings.</p>
      </section>

      <Faq title="Posting a property: common questions" faqs={[
        { q: `Who can post a property on ${BRAND}?`, a: 'Property owners, agents and builders selling a home or plot in the cities we cover: Gurgaon, Bengaluru, Mumbai and Pune.' },
        { q: 'How long before my listing appears?', a: 'Each listing is checked by our team before it is published. If something needs changing, you will see the reason next to the listing when you sign in.' },
        { q: 'Can I edit my listing after it is live?', a: 'Yes. Edits and new photos are checked again before they appear, and the page address of your listing stays the same.' },
      ]} />
    </>
  );
}
