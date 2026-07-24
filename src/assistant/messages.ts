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

// Opening word for each part of the day, before the Quality Doctor's name (if any) is appended.
const GREETING_OPENERS: Record<DayPeriod, { ar: string; en: string }> = {
  morning: { ar: 'صباح الخير', en: 'Good morning' },
  afternoon: { ar: 'مرحباً', en: 'Hello' },
  evening: { ar: 'مساء الخير', en: 'Good evening' }
};

// Second line used on the Dashboard welcome card (kept separate from the notification intro,
// which stays a single short line so notifications remain non-intrusive).
const GREETING_OUTROS: Record<DayPeriod, { ar: string; en: string }> = {
  morning: { ar: 'أتمنى لك يوم عمل موفق.', en: 'Wishing you a productive day.' },
  afternoon: { ar: 'إليك ملخص حالة الجودة اليوم.', en: 'Here is today\u2019s quality status summary.' },
  evening: { ar: 'قبل إنهاء يوم العمل، إليك أهم الملاحظات.', en: 'Before wrapping up, here are today\u2019s key notes.' }
};

/** True if the stored Quality Doctor name already carries a title prefix ("د." or "Dr."). */
function hasDoctorTitlePrefix(name: string): boolean {
  const n = name.trim();
  return n.startsWith('د.') || /^dr\.?\s/i.test(n) || /^dr\./i.test(n);
}

/**
 * Builds the "...<name>" suffix appended to a greeting opener, honoring the stored
 * Quality Doctor name exactly as-is when it already starts with "د." / "Dr.",
 * and inserting a natural "يا" connector in Arabic otherwise. Returns '' when no
 * name is set, so callers fall back to the existing generic greeting untouched.
 */
function greetingNameSuffix(doctorName: string | undefined | null, lang: Lang): string {
  const name = (doctorName ?? '').trim();
  if (!name) return '';
  if (hasDoctorTitlePrefix(name)) return ` ${name}`;
  return lang === 'ar' ? ` يا ${name}` : `, ${name}`;
}

/**
 * Full two-line greeting shown on the Dashboard welcome card. Personalizes with the
 * Quality Doctor name when available (reusing the existing "Quality Doctor Name"
 * setting); otherwise this is identical to the previous generic greeting.
 */
export function drDejaGreeting(lang: Lang, doctorName?: string | null, date?: Date): string {
  const period = getDayPeriod(date);
  const opener = `${GREETING_OPENERS[period][lang]}${greetingNameSuffix(doctorName, lang)}.`;
  return `${opener}\n${GREETING_OUTROS[period][lang]}`;
}

/**
 * Short single-line greeting used to open local notifications (daily summary,
 * expiry alerts, reminders). Personalized with the Quality Doctor name when
 * available; otherwise identical to the previous generic notification intro.
 */
export function drDejaNotificationIntro(lang: Lang, doctorName?: string | null, date?: Date): string {
  const period = getDayPeriod(date);
  return `${GREETING_OPENERS[period][lang]}${greetingNameSuffix(doctorName, lang)}.`;
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
