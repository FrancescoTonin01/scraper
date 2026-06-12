import SourceBadge from "./SourceBadge";
import { getMarketingEventProps } from "@/utils/marketing";

type CarListing = {
  source: "autoscout" | "subito";
  title: string;
  price: number | null;
  mileage?: number | null;
  year?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  city?: string | null;
  imageUrl?: string | null;
  originalUrl: string;
  dealScore?: number | null;
  priceRating?: "great" | "good" | "fair" | "high" | "unknown";
  estimatedMarketPrice?: number | null;
  priceDeltaPercent?: number | null;
  scoreConfidence?: "high" | "medium" | "low";
  scoreReasons?: string[];
};

function formatPrice(price: number | null): string {
  if (price === null) return "Prezzo N/D";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatMileage(km: number | null | undefined): string | null {
  if (km == null) return null;
  return `${new Intl.NumberFormat("it-IT").format(km)} km`;
}

function getPriceRatingLabel(rating: CarListing["priceRating"]): string | null {
  switch (rating) {
    case "great":
      return "Ottimo prezzo";
    case "good":
      return "Buon prezzo";
    case "fair":
      return "In linea";
    case "high":
      return "Caro";
    default:
      return null;
  }
}

function getPriceRatingClass(rating: CarListing["priceRating"]): string {
  switch (rating) {
    case "great":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "good":
      return "bg-green-50 text-green-700 border-green-200";
    case "fair":
      return "bg-slate-50 text-slate-600 border-slate-200";
    case "high":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

export default function CarCard({ listing }: { listing: CarListing }) {
  const accentClass = listing.source === "autoscout" ? "card-accent-autoscout" : "card-accent-subito";
  const priceRatingLabel = listing.scoreConfidence !== "low" ? getPriceRatingLabel(listing.priceRating) : null;

  function handleClick() {
    if (typeof window !== "undefined" && window.umami) {
      window.umami.track("listing-click", {
        source: listing.source,
        title: listing.title,
        price: listing.price ?? 0,
        ...getMarketingEventProps(),
      });
    }
  }

  return (
    <a
      href={listing.originalUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className={`group flex w-full min-w-0 max-w-full flex-col h-full bg-white rounded-xl sm:rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/80 hover:-translate-y-1 hover:border-slate-200 ${accentClass}`}
    >
      {/* Image */}
      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
        {listing.imageUrl ? (
          <img
            src={listing.imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        <div className="absolute top-2.5 left-2.5">
          <SourceBadge source={listing.source} />
        </div>
        {/* Price badge on image */}
        <div className="absolute bottom-2.5 right-2.5 left-2.5 flex justify-end">
          <span className="inline-flex max-w-full items-center truncate px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-sm text-base font-bold text-slate-900 shadow-sm">
            {formatPrice(listing.price)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 p-4 flex-1 flex flex-col space-y-2.5">
        <h3 className="font-semibold text-slate-900 line-clamp-1 text-sm leading-snug tracking-tight">
          {listing.title}
        </h3>

        {/* Info pills */}
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {listing.year && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-600 font-medium">
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {listing.year}
            </span>
          )}
          {listing.mileage != null && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-600 font-medium">
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {formatMileage(listing.mileage)}
            </span>
          )}
          {listing.fuel && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-600 font-medium">
              {listing.fuel}
            </span>
          )}
          {listing.transmission && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-xs text-slate-600 font-medium">
              {listing.transmission}
            </span>
          )}
        </div>

        {listing.city && (
          <p className="text-xs text-slate-400 flex items-center gap-1 pt-0.5 mt-auto">
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{listing.city}</span>
          </p>
        )}

        {priceRatingLabel && (
          <div className={`inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${getPriceRatingClass(listing.priceRating)}`}>
            {priceRatingLabel}
          </div>
        )}
      </div>
    </a>
  );
}
