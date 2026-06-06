import type { PaidSubscriptionTier } from '@duopoker/shared-types';
import {
  PAID_SUBSCRIPTION_TIERS,
  catalogPreviewUrl,
  subscriptionCosmetics,
  tierLabel,
  type CosmeticDefinition
} from '@duopoker/shared-types';

const SLOTS = ['deck', 'chip', 'frame', 'title'] as const;

function CosmeticPreview({
  item,
  labels
}: {
  item: CosmeticDefinition;
  labels: Record<(typeof SLOTS)[number], string>;
}) {
  const src = catalogPreviewUrl(item.id) ?? item.imageUrl;
  return (
    <div className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-black/30 p-2.5 text-center">
      <span className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-gold/70">
        {labels[item.slot as (typeof SLOTS)[number]]}
      </span>
      <div
        className={
          item.slot === 'deck'
            ? 'flex h-[4.5rem] w-full items-center justify-center'
            : 'flex h-[3.75rem] w-full items-center justify-center'
        }
        style={
          item.slot !== 'deck'
            ? {
                backgroundImage:
                  'radial-gradient(ellipse at center, rgba(13,61,40,0.85) 0%, rgba(3,5,8,0.95) 100%), url(/assets/table-felt.png)',
                backgroundSize: 'cover, 64px 64px'
              }
            : undefined
        }
      >
        <img
          src={src}
          alt=""
          className={
            item.slot === 'deck'
              ? 'h-full w-auto max-w-full rounded-sm object-contain object-center'
              : item.slot === 'title'
                ? 'max-h-[2.75rem] w-auto max-w-full object-contain'
                : 'h-[3.25rem] w-[3.25rem] object-contain object-center [background:transparent]'
          }
          loading="lazy"
          decoding="async"
        />
      </div>
      <p className="mt-2 line-clamp-1 text-[11px] font-semibold text-zinc-100">{item.name}</p>
    </div>
  );
}

export function SubscriptionCosmeticBundle({
  tier,
  labels
}: {
  tier: PaidSubscriptionTier;
  labels: Record<(typeof SLOTS)[number], string>;
}) {
  const tierIndex = PAID_SUBSCRIPTION_TIERS.indexOf(tier);
  const includedPaidTiers = PAID_SUBSCRIPTION_TIERS.slice(0, tierIndex + 1);
  const freeItems = subscriptionCosmetics.filter((c) => c.requiredTier === 'FREE');

  return (
    <div className="space-y-5">
      {freeItems.length ? (
        <section>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">FREE</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {freeItems.map((item) => (
              <CosmeticPreview key={item.id} item={item} labels={labels} />
            ))}
          </div>
        </section>
      ) : null}
      {includedPaidTiers.map((paidTier) => {
        const key = paidTier.toLowerCase();
        const items = SLOTS.map((slot) =>
          subscriptionCosmetics.find((c) => c.id === `${slot}_${key}`)
        ).filter((c): c is CosmeticDefinition => Boolean(c));
        return (
          <section key={paidTier}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold/80">
              {tierLabel[paidTier]}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {items.map((item) => (
                <CosmeticPreview key={item.id} item={item} labels={labels} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
