import type { ReactNode } from 'react';
import FeatureIcon, { type FeatureIconName } from '@/components/FeatureIcon';
import { money, type Variation } from '@/lib/api';
import {
  parseDescription,
  splitKeyValue,
  warrantyFromName,
  type Block,
  type Section,
} from '@/lib/productDescription';

/**
 * Susunan tetap untuk semua produk:
 * Deskripsi -> Garansi -> Key Feature -> Spesifikasi -> Isi dalam paket
 * -> Varian tersedia -> Informasi lainnya.
 * Bagian yang datanya tidak ada otomatis disembunyikan.
 */

function Card({
  icon,
  title,
  caption,
  children,
}: {
  icon: FeatureIconName;
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
          <FeatureIcon name={icon} size={20} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-extrabold leading-tight text-slate-900 sm:text-lg">
            {title}
          </h2>
          {caption && (
            <p className="mt-0.5 text-xs text-slate-500">{caption}</p>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Items({
  items,
  keyValue = false,
}: {
  items: string[];
  keyValue?: boolean;
}) {
  const pairs = keyValue ? items.map(splitKeyValue) : [];
  const allPairs = keyValue && pairs.length > 0 && pairs.every(Boolean);

  if (allPairs) {
    return (
      <dl className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
        {pairs.map((pair, index) => (
          <div
            key={index}
            className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-3 py-2.5 text-sm odd:bg-slate-50/70"
          >
            <dt className="font-semibold text-slate-700">{pair!.key}</dt>
            <dd className="break-words text-slate-600">{pair!.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={index}
          className="flex gap-3 text-sm leading-6 text-slate-600"
        >
          <span
            aria-hidden="true"
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
          />
          <span className="min-w-0 break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Blocks({
  blocks,
  keyValue,
}: {
  blocks: Block[];
  keyValue?: boolean;
}) {
  return (
    <>
      {blocks.map((block, index) =>
        block.type === 'p' ? (
          <p
            key={index}
            className="break-words text-sm leading-7 text-slate-600"
          >
            {block.text}
          </p>
        ) : (
          <Items key={index} items={block.items} keyValue={keyValue} />
        )
      )}
    </>
  );
}

function SubTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 text-sm font-bold text-slate-800">{children}</h3>
  );
}

function Groups({
  sections,
  keyValue,
}: {
  sections: Section[];
  keyValue?: boolean;
}) {
  return (
    <>
      {sections.map((section, index) => (
        <div key={index}>
          {section.title && <SubTitle>{section.title}</SubTitle>}
          <div className="space-y-3">
            <Blocks blocks={section.blocks} keyValue={keyValue} />
          </div>
        </div>
      ))}
    </>
  );
}

function hasContent(sections: Section[]) {
  return sections.some((section) => section.blocks.length > 0);
}

export default function ProductInfoSections({
  name,
  description,
  variations = [],
}: {
  name: string;
  description?: string | null;
  variations?: Variation[];
}) {
  const parsed = parseDescription(description);

  const warrantySections = parsed.warranty;
  const showNameWarranty =
    warrantySections.length === 0 && warrantyFromName(name);
  const warrantyText = warrantySections
    .map((section) => `${section.title ?? ''}`)
    .join(' ');
  const warrantyIsOfficial = /resmi|official/i.test(warrantyText) || showNameWarranty;

  const variantNames = parsed.variants;
  const hasVariations = variations.length > 0;
  const hasDescription = parsed.description.length > 0;

  return (
    <div className="space-y-4">
      {/* 1. Deskripsi */}
      <Card icon="doc" title="Deskripsi Produk">
        {hasDescription ? (
          <Blocks blocks={parsed.description} />
        ) : (
          <p className="text-sm text-slate-500">
            Deskripsi produk belum tersedia.
          </p>
        )}
      </Card>

      {/* 2. Garansi */}
      {(warrantySections.length > 0 || showNameWarranty) && (
        <Card
          icon="shield"
          title={warrantyIsOfficial ? 'Garansi Resmi' : 'Garansi'}
          caption="Sesuai data supplier"
        >
          {showNameWarranty ? (
            <p className="text-sm leading-7 text-slate-600">
              Produk ini tercantum dengan Garansi Resmi pada judul produk.
              Rincian masa garansi mengikuti informasi dari supplier.
            </p>
          ) : (
            warrantySections.map((section, index) => (
              <div key={index} className="space-y-2">
                {section.title && (
                  <p className="text-sm font-bold text-slate-800">
                    {section.title}
                  </p>
                )}
                <Blocks blocks={section.blocks} />
              </div>
            ))
          )}
        </Card>
      )}

      {/* 3. Key feature */}
      {hasContent(parsed.features) && (
        <Card icon="bolt" title="Key Feature">
          <Groups sections={parsed.features} />
        </Card>
      )}

      {/* 4. Spesifikasi */}
      {hasContent(parsed.specs) && (
        <Card icon="list" title="Spesifikasi">
          <Groups sections={parsed.specs} keyValue />
        </Card>
      )}

      {/* 5. Isi dalam paket */}
      {hasContent(parsed.included) && (
        <Card icon="box" title="Isi dalam Paket">
          <Groups sections={parsed.included} />
        </Card>
      )}

      {/* 6. Varian tersedia */}
      {(hasVariations || variantNames.length > 0) && (
        <Card icon="tag" title="Varian Tersedia">
          {hasVariations ? (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
              {variations.map((variation) => (
                <li
                  key={variation.variation_id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold text-slate-800">
                      {variation.name || 'Varian standar'}
                    </p>
                    {variation.sku && (
                      <p className="text-xs text-slate-400">
                        SKU: {variation.sku}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-slate-900">
                      {money(variation.price)}
                    </p>
                    <p
                      className={`text-xs font-semibold ${
                        variation.stock > 0
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {variation.stock > 0
                        ? `Stok tercatat ${variation.stock}`
                        : 'Stok tercatat habis'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {variantNames.map((variant, index) => (
                <li
                  key={index}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700"
                >
                  {variant}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* 7. Informasi lainnya (bagian lain dari deskripsi asli) */}
      {hasContent(parsed.extras) && (
        <details className="group rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-extrabold text-slate-900 sm:text-lg">
            Informasi Lainnya
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
              className="shrink-0 transition-transform group-open:rotate-180"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <div className="mt-4 space-y-4">
            <Groups sections={parsed.extras} />
          </div>
        </details>
      )}
    </div>
  );
}
