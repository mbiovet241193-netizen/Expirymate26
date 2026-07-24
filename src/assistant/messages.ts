// Dr. Deja assistant messages - kept in one place so future messages can be
// added with a single new entry, without touching any other part of the app.
import type { Lang } from '../i18n/translations';

export type DayPeriod = 'morning' | 'afternoon' | 'evening';

export function getDayPeriod(date: Date = new Date()): DayPeriod {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const GREETINGS: Record<DayPeriod, { ar: string; en: string }> = {
  morning: {
    ar: 'صباح الخير.\nأتمنى لك يوم عمل موفق.',
    en: 'Good morning.\nWishing you a productive day.'
  },
  afternoon: {
    ar: 'مرحباً.\nإليك ملخص حالة الجودة اليوم.',
    en: 'Hello.\nHere is today\u2019s quality status summary.'
  },
  evening: {
    ar: 'مساء الخير.\nقبل إنهاء يوم العمل، إليك أهم الملاحظات.',
    en: 'Good evening.\nBefore wrapping up, here are today\u2019s key notes.'
  }
};

const NOTIFICATION_INTROS: Record<DayPeriod, { ar: string; en: string }> = {
  morning: {
    ar: 'صباح الخير.\nلديك اليوم بعض العناصر التي تحتاج إلى المراجعة.',
    en: 'Good morning.\nA few items need your review today.'
  },
  afternoon: {
    ar: 'مرحباً.\nإليك أحدث تنبيهات الجودة.',
    en: 'Hello.\nHere are the latest quality alerts.'
  },
  evening: {
    ar: 'مساء الخير.\nقبل إنهاء يوم العمل، يرجى مراجعة العناصر التالية.',
    en: 'Good evening.\nBefore ending the day, please review the following.'
  }
};

export function drDejaGreeting(lang: Lang, date?: Date): string {
  return GREETINGS[getDayPeriod(date)][lang];
}

export const DR_DEJA_INTRO = {
  ar: 'أنا الدكتورة ديجا.\nالمساعد الذكي داخل ExpiryMate.\nسأساعدك اليوم في متابعة الصلاحيات والشهادات الصحية وتقارير الجودة.',
  en: 'I\u2019m Dr. Deja.\nThe smart assistant inside ExpiryMate.\nI\u2019ll help you track expiry dates, health certificates, and quality reports today.'
};

export const DR_DEJA_ALL_CLEAR = {
  ar: 'ممتاز.\nلا توجد أي تنبيهات اليوم.\nأتمنى لك يوم عمل موفق.',
  en: 'Excellent.\nNo alerts today.\nWishing you a great workday.'
};

export const DR_DEJA_SIGNATURE = '\u2014 Dr. Deja';

/**
 * Builds a grouped notification body line for a given count + category, in the requested language.
 * For 'expiringProducts', pass `shortRule = true` when the batches being reported are short
 * shelf-life (<= 3 months) products, to use the "Expiring Soon" wording instead of "Within 30 Days".
 */
export function notificationLine(
  category: 'expiredProducts' | 'expiringProducts' | 'halfLifeProducts' | 'expiredCertificates' | 'expiringCertificates',
  count: number,
  lang: Lang,
  shortRule: boolean = false
): string {
  const lines: Record<typeof category, { ar: (n: number) => string; en: (n: number) => string }> = {
    expiredProducts: {
      ar: (n: number) => `يوجد ${n} منتجات منتهية الصلاحية تحتاج إلى مراجعة.`,
      en: (n: number) => `${n} product(s) have expired and need review.`
    },
    expiringProducts: shortRule
      ? {
          ar: (n: number) => `يوجد ${n} منتجات ستنتهي قريباً.`,
          en: (n: number) => `${n} product(s) are expiring soon.`
        }
      : {
          ar: (n: number) => `يوجد ${n} منتجات ستنتهي خلال 30 يوماً.`,
          en: (n: number) => `${n} product(s) will expire within 30 days.`
        },
    halfLifeProducts: {
      ar: (n: number) => `يوجد ${n} منتجات تجاوزت نصف الصلاحية.`,
      en: (n: number) => `${n} product(s) have passed half shelf life.`
    },
    expiredCertificates: {
      ar: (n: number) => `توجد ${n} شهادات صحية منتهية.`,
      en: (n: number) => `${n} health certificate(s) have expired.`
    },
    expiringCertificates: {
      ar: (n: number) => `توجد ${n} شهادات صحية ستنتهيان قريباً.`,
      en: (n: number) => `${n} health certificate(s) will expire soon.`
    }
  };
  return lines[category][lang](count);
}

export const DAILY_REMINDER_LINE = {
  ar: 'تذكير: يرجى مراجعة تواريخ الصلاحية اليوم.',
  en: 'Reminder: please review expiry dates today.'
};
