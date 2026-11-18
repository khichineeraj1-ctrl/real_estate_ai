import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { SignupForm } from '@/components/auth/AuthForms';
import { Faq } from '@/components/Faq';
import { BRAND, pageMeta } from '@/lib/seo';

const title = 'Post Property for Sale Free — Owners, Agents & Builders';
const description = `List your flat, villa, builder floor or plot for sale on ${BRAND}, free. Add details and photos and reach buyers in Gurgaon, Bengaluru, Mumbai and Pune.`;
export const metadata: Metadata = pageMeta({ title, description, path: '/post-property' });

export default function PostProperty() {
  return (
    <>
      <AuthShell
        standalone={false}
        title="Post your property for sale"
        lead="Owners, agents and builders can list flats, villas, builder floors and plots. Buyers find them by asking, by voice or text, and on our city and locality pages."
        kicker="Three steps to your first buyer"
        points={[
          { icon: '1', title: 'Create your account', text: 'Takes about a minute.' },
          { icon: '2', title: 'Add your property', text: 'Details and up to 12 photos.' },
          { icon: '3', title: 'We check, then it goes live', text: 'Get verified and your homes are shown to buyers first.' },
        ]}
      >
        <SignupForm />
      </AuthShell>

      <Faq title="Posting a property: common questions" faqs={[
        { q: `Who can post a property on ${BRAND}?`, a: 'Property owners, agents and builders selling a home or plot in the cities we cover: Gurgaon, Bengaluru, Mumbai and Pune.' },
        { q: 'How long before my listing appears?', a: 'Each listing is checked by our team before it is published. If something needs changing, you will see the reason next to the listing when you sign in.' },
        { q: 'Can I edit my listing after it is live?', a: 'Yes. Edits and new photos are checked again before they appear, and the page address of your listing stays the same.' },
        { q: 'What does getting verified mean?', a: 'You tell us who you are and upload documents such as an identity proof and, for agents, a RERA certificate. Our team checks them, and buyers then see you as a verified seller, with your homes shown first.' },
      ]} />
    </>
  );
}
