import Link from 'next/link';
import { findPublicImage } from '@/lib/assets';
import { siteConfig } from '@/lib/siteConfig';

export default function Footer() {
  const { contact, paymentMethods, motto, name } = siteConfig;
  const whatsappLink = contact.whatsappNumber
    ? `https://wa.me/${contact.whatsappNumber}`
    : null;

  const payments = paymentMethods.map((method) => ({
    ...method,
    src: findPublicImage('payments', method.logo),
  }));

  return (
    <footer className="border-t border-slate-800 bg-brand-dark text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <Link
            href="/"
            className="text-xl font-black tracking-wider text-white"
          >
            URBANIX<span className="text-brand-accent">.</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6">{motto}</p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Contact person
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="text-slate-300">{contact.person}</li>
            <li>
              WhatsApp:{' '}
              {whatsappLink ? (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-400 hover:underline"
                >
                  {contact.whatsappDisplay}
                </a>
              ) : (
                <span className="text-slate-300">
                  {contact.whatsappDisplay}
                </span>
              )}
            </li>
            <li>
              Email:{' '}
              <a
                href={`mailto:${contact.email}`}
                className="text-orange-400 hover:underline"
              >
                {contact.email}
              </a>
            </li>
            <li>Jam layanan: {contact.hours}</li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">
            Pembayaran tersedia
          </h3>
          <ul className="mt-3 flex flex-wrap items-center gap-2">
            {payments.map((method) => (
              <li key={method.name}>
                {method.src ? (
                  <span className="flex h-10 items-center gap-2 rounded-lg bg-white px-3">
                    <img
                      src={method.src}
                      alt={method.showName ? '' : method.name}
                      loading="lazy"
                      className="h-6 w-auto max-w-[84px] object-contain"
                    />
                    {method.showName && (
                      <span className="text-xs font-bold text-slate-800">
                        {method.name}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="flex h-10 items-center rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs font-semibold text-slate-200">
                    {method.name}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800 py-4 text-center text-xs">
        &copy; 2026 {name}. All rights reserved.
      </div>
    </footer>
  );
}
