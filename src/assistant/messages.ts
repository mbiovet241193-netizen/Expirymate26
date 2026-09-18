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

/**
 * Builds the "يا دكتور/ة [name]" (or "Dr. [name]") address term used to
 * personalize Dr. Deja's greetings. Falls back to a plain "دكتور/ة" / "Doctor"
 * title when no doctor name is set in Settings.
 */
function doctorAddress(lang: Lang, gender: DoctorGender, doctorName?: string): string {
  const name = doctorName?.trim();
  if (lang === 'ar') {
    const title = gender === 'female' ? 'دكتورة' : 'دكتور';
    return name ? `يا ${title} ${name}` : `يا ${title}`;
  }
  return name ? `Dr. ${name}` : 'Doctor';
}

const GREETING_OPENERS: Record<DayPeriod, { ar: string; en: string }> = {
  morning: { ar: 'صباح الخير', en: 'Good morning' },
  afternoon: { ar: 'مرحباً', en: 'Hello' },
  evening: { ar: 'مساء الخير', en: 'Good evening' }
};

const GREETING_BODIES: Record<DayPeriod, { ar: Record<DoctorGender, string>; en: string }> = {
  morning: {
    ar: { male: 'أتمنى لك يوم عمل موفق.', female: 'أتمنى لكِ يوم عمل موفق.' },
    en: 'Wishing you a productive day.'
  },
  afternoon: {
    ar: { male: 'إليك ملخص حالة الجودة اليوم.', female: 'إليكِ ملخص حالة الجودة اليوم.' },
    en: 'Here is today\u2019s quality status summary.'
  },
  evening: {
    ar: { male: 'قبل إنهاء يوم العمل، إليك أهم الملاحظات.', female: 'قبل إنهاء يوم العمل، إليكِ أهم الملاحظات.' },
    en: 'Before wrapping up, here are today\u2019s key notes.'
  }
};

const NOTIFICATION_BODIES: Record<DayPeriod, { ar: Record<DoctorGender, string>; en: string }> = {
  morning: {
    ar: { male: 'لديك اليوم بعض العناصر التي تحتاج إلى المراجعة.', female: 'لديكِ اليوم بعض العناصر التي تحتاج إلى المراجعة.' },
    en: 'A few items need your review today.'
  },
  afternoon: {
    ar: { male: 'إليك أحدث تنبيهات الجودة.', female: 'إليكِ أحدث تنبيهات الجودة.' },
    en: 'Here are the latest quality alerts.'
  },
  evening: {
    ar: { male: 'قبل إنهاء يوم العمل، يرجى مراجعة العناصر التالية.', female: 'قبل إنهاء يوم العمل، يرجى مراجعة العناصر التالية.' },
    en: 'Before ending the day, please review the following.'
  }
};

/** Builds Dr. Deja's welcome-card greeting, personalized with the doctor's name when available. */
export function drDejaGreeting(lang: Lang, gender: DoctorGender = 'male', doctorName?: string, date?: Date): string {
  const period = getDayPeriod(date);
  const opener = GREETING_OPENERS[period][lang];
  const address = doctorAddress(lang, gender, doctorName);
  const body = lang === 'ar' ? GREETING_BODIES[period].ar[gender] : GREETING_BODIES[period].en;
  const openerLine = lang === 'ar' ? `${opener} ${address}.` : `${opener}, ${address}.`;
  return `${openerLine}\n${body}`;
}

/** Builds the notification intro line, personalized with the doctor's name when available. */
export function drDejaNotificationIntro(lang: Lang, gender: DoctorGender = 'male', doctorName?: string, date?: Date): string {
  const period = getDayPeriod(date);
  const opener = GREETING_OPENERS[period][lang];
  const address = doctorAddress(lang, gender, doctorName);
  const body = lang === 'ar' ? NOTIFICATION_BODIES[period].ar[gender] : NOTIFICATION_BODIES[period].en;
  const openerLine = lang === 'ar' ? `${opener} ${address}.` : `${opener}, ${address}.`;
  return `${openerLine}\n${body}`;
}

export const DR_DEJA_INTRO = {
  ar: 'أنا الدكتورة ديجا.\nالمساعدة الذكية داخل QualityMate.\nسأساعدك اليوم في متابعة الصلاحيات والشهادات الصحية وتقارير الجودة.',
  en: 'I\u2019m Dr. Deja.\nThe smart assistant inside QualityMate.\nI\u2019ll help you track expiry dates, health certificates, and quality reports today.'
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
