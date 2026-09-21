import type { ActivityActionKey } from '../types';
import type { Lang } from '../i18n/translations';

const LABELS: Record<ActivityActionKey, { ar: string; en: string }> = {
  productAdded: { ar: 'تمت إضافة منتج جديد', en: 'A new product was added' },
  categoryAdded: { ar: 'تمت إضافة فئة جديدة', en: 'A new category was added' },
  batchAdded: { ar: 'تم تسجيل متابعة صلاحية', en: 'An expiry follow-up record was logged' },
  receivingLogged: { ar: 'تم تسجيل استلام', en: 'A receiving record was logged' },
  nonConformingLogged: { ar: 'تم تسجيل منتج غير مطابق', en: 'A non-conforming product was logged' },
  certificateLogged: { ar: 'تم تسجيل شهادة صحية', en: 'A health certificate was logged' },
  maintenancePlanUpdated: { ar: 'تم تحديث خطة الصيانة', en: 'The maintenance plan was updated' },
  maintenanceVisitLogged: { ar: 'تم تسجيل زيارة صيانة', en: 'A maintenance visit was logged' },
  maintenanceRequestLogged: { ar: 'تم تسجيل طلب صيانة', en: 'A maintenance request was logged' },
  shiftNoteAdded: { ar: 'تمت إضافة ملاحظة شفت', en: 'A shift note was added' },
  pestControlVisitLogged: { ar: 'تم تسجيل زيارة مكافحة', en: 'A pest control visit was logged' },
  trainingPlanUpdated: { ar: 'تم تحديث خطة التدريب', en: 'The training plan was updated' },
  trainingRecordLogged: { ar: 'تم تسجيل تدريب', en: 'A training record was logged' },
  hygieneViolationLogged: { ar: 'تم تسجيل مخالفة نظافة شخصية', en: 'A personal hygiene violation was logged' },
  deepCleaningPlanUpdated: { ar: 'تم تحديث خطة النظافة العميقة', en: 'The deep cleaning plan was updated' },
  deepCleaningExecutionLogged: { ar: 'تم تسجيل تنفيذ نظافة عميقة', en: 'A deep cleaning execution was logged' },
  documentAdded: { ar: 'تمت إضافة مستند', en: 'A document was added' },
  reportGenerated: { ar: 'تم إصدار تقرير', en: 'A report was generated' }
};

export function activityLabel(actionKey: ActivityActionKey, lang: Lang): string {
  return LABELS[actionKey][lang];
}
