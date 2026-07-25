// Dr. Deja assistant messages - kept in one place so future messages can be
// added with a single new entry, without touching any other part of the app.
//
// Dr. Deja herself is always a female persona (feminine grammar in her own
// speech). Separately, `doctorGender` controls the grammatical form used when
// she addresses the human quality doctor (e.g. "لك" vs "لكِ") - it is purely
// a wording preference and never affects any stored data or reports.
import type { Lang } from '../i18n/translations';

export type DayPeriod = 'morning' | 'afternoon' | 'evening';
export type DoctorGender = 'male' | 'female';

export function getDayPeriod(date: Date = new Date()): DayPeriod {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const GREETINGS: Record<DayPeriod, { ar: Record<DoctorGender, string>; en: string }> = {
  morning: {
    ar: {
      male: 'صباح الخير.\nأتمنى لك يوم عمل موفق.',
      female: 'صباح الخير.\nأتمنى لكِ يوم عمل موفق.'
    },
    en: 'Good morning.\nWishing you a productive day.'
  },
  afternoon: {
    ar: {
      male: 'مرحباً.\nإليك ملخص حالة الجودة اليوم.',
      female: 'مرحباً.\nإليكِ ملخص حالة الجودة اليوم.'
    },
    en: 'Hello.\nHere is today\u2019s quality status summary.'
  },
  evening: {
    ar: {
      male: 'مساء الخير.\nقبل إنهاء يوم العمل، إليك أهم الملاحظات.',
      female: 'مساء الخير.\nقبل إنهاء يوم العمل، إليكِ أهم الملاحظات.'
    },
    en: 'Good evening.\nBefore wrapping up, here are today\u2019s key notes.'
  }
};

const NOTIFICATION_INTROS: Record<DayPeriod, { ar: Record<DoctorGender, string>; en: string }> = {
  morning: {
    ar: {
      male: 'صباح الخير.\nلديك اليوم بعض العناصر التي تحتاج إلى المراجعة.',
      female: 'صباح الخير.\nلديكِ اليوم بعض العناصر التي تحتاج إلى المراجعة.'
    },
    en: 'Good morning.\nA few items need your review today.'
  },
  afternoon: {
    ar: {
      male: 'مرحباً.\nإليك أحدث تنبيهات الجودة.',
      female: 'مرحباً.\nإليكِ أحدث تنبيهات الجودة.'
    },
    en: 'Hello.\nHere are the latest quality alerts.'
  },
  evening: {
    ar: {
      male: 'مساء الخير.\nقبل إنهاء يوم العمل، يرجى مراجعة العناصر التالية.',
      female: 'مساء الخير.\nقبل إنهاء يوم العمل، يرجى مراجعة العناصر التالية.'
    },
    en: 'Good evening.\nBefore ending the day, please review the following.'
  }
};

export function drDejaGreeting(lang: Lang, gender: DoctorGender = 'male', date?: Date): string {
  const g = GREETINGS[getDayPeriod(date)];
  return lang === 'ar' ? g.ar[gender] : g.en;
}

export function drDejaNotificationIntro(lang: Lang, gender: DoctorGender = 'male', date?: Date): string {
  const g = NOTIFICATION_INTROS[getDayPeriod(date)];
  return lang === 'ar' ? g.ar[gender] : g.en;
}

export const DR_DEJA_INTRO = {
  ar: 'أنا الدكتورة ديجا.\nالمساعدة الذكية داخل ExpiryMate.\nسأساعدك اليوم في متابعة الصلاحيات والشهادات الصحية وتقارير الجودة.',
  en: 'I\u2019m Dr. Deja.\nThe smart assistant inside ExpiryMate.\nI\u2019ll help you track expiry dates, health certificates, and quality reports today.'
};

export const DR_DEJA_ALL_CLEAR: { ar: Record<DoctorGender, string>; en: string } = {
  ar: {
    male: 'ممتاز.\nلا توجد أي تنبيهات اليوم.\nأتمنى لك يوم عمل موفق.',
    female: 'ممتاز.\nلا توجد أي تنبيهات اليوم.\nأتمنى لكِ يوم عمل موفق.'
  },
  en: 'Excellent.\nNo alerts today.\nWishing you a great workday.'
};

export const DR_DEJA_SIGNATURE = '\u2014 Dr. Deja';

/** Builds a grouped notification body line for a given count + category, in the requested language. */
export function notificationLine(
  category: 'expiredProducts' | 'expiringProducts' | 'halfLifeProducts' | 'expiredCertificates' | 'expiringCertificates',
  count: number,
  lang: Lang
): string {
  const lines: Record<typeof category, { ar: (n: number) => string; en: (n: number) => string }> = {
    expiredProducts: {
      ar: (n: number) => `يوجد ${n} منتجات منتهية الصلاحية تحتاج إلى مراجعة.`,
      en: (n: number) => `${n} product(s) have expired and need review.`
    },
    expiringProducts: {
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
