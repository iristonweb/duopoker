import type { PaidSubscriptionTier } from '@duopoker/shared-types';
import { subscriptionCosmetics, subscriptionBannerImages, tierLabel } from '@duopoker/shared-types';
import { GlassPanel, SectionHeader } from '@duopoker/ui-kit';

const PAID_TIERS: PaidSubscriptionTier[] = [
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'DIAMOND',
  'BLACK'
];

const slotLabels = {
  deck: 'Рубашки карт',
  chip: 'Фишки',
  frame: 'Рамки аватара',
  title: 'Титулы'
} as const;

export function SubscriptionPerksMatrix({
  eyebrow = 'DP CLUB',
  title = 'Косметика по подпискам',
  description = 'Каждый уровень открывает уникальный набор оформления за столом.'
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <GlassPanel className="overflow-hidden p-0">
      <div className="border-b border-white/10 px-5 py-4 sm:px-6">
        <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-black/30">
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-muted">Подписка</th>
              {(['deck', 'chip', 'frame', 'title'] as const).map((slot) => (
                <th key={slot} className="px-3 py-3 text-center font-semibold uppercase tracking-wider text-muted">
                  {slotLabels[slot]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PAID_TIERS.map((tier) => {
              const t = tier.toLowerCase();
              const deck = subscriptionCosmetics.find((c) => c.id === `deck_${t}`);
              const chip = subscriptionCosmetics.find((c) => c.id === `chip_${t}`);
              const frame = subscriptionCosmetics.find((c) => c.id === `frame_${t}`);
              const titleItem = subscriptionCosmetics.find((c) => c.id === `title_${t}`);
              return (
                <tr key={tier} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={subscriptionBannerImages[tier]}
                        alt=""
                        className="h-8 w-14 rounded object-cover object-left"
                      />
                      <span className="font-semibold text-ivory">{tierLabel[tier]}</span>
                    </div>
                  </td>
                  {[deck, chip, frame, titleItem].map((item) => (
                    <td key={item?.id ?? tier} className="px-3 py-3 text-center">
                      {item ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          title={item.name}
                          className={
                            item.slot === 'deck'
                              ? 'mx-auto h-14 w-10 object-contain'
                              : item.slot === 'title'
                                ? 'mx-auto h-6 w-28 object-contain'
                                : 'mx-auto h-12 w-12 object-contain'
                          }
                        />
                      ) : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}
