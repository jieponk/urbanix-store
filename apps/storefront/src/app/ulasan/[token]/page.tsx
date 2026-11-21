import ReviewForm from '@/components/ReviewForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Beri ulasan', robots: { index: false, follow: false } };

export default function ReviewPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const stars = Number(searchParams.bintang);
  return (
    <div className="bg-mist px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <ReviewForm token={decodeURIComponent(params.token)} initialStars={stars >= 1 && stars <= 5 ? stars : 0} />
      </div>
    </div>
  );
}
