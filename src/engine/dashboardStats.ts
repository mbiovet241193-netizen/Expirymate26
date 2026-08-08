// Shared dashboard/executive-summary statistics.
// Used by both the Dashboard (Dr. Deja's Smart Summary) and the Monthly
// Comprehensive Report's Executive Summary section, so both always agree.
import { BatchRepo, ProductRepo, NonConformingRepo, EmployeeRepo, HealthCertificateRepo, ReceivingRepo } from '../db/repositories';
import { computeBatchStatus } from './shelfLifeEngine';
import { computeCertificateStatus } from './certificateEngine';
import type { Batch } from '../types';

export interface DashboardStats {
  totalProducts: number;
  totalBatches: number;
  expired: number;
  within30: number;
  expiringSoon: number;
  afterHalf: number;
  beforeHalf: number;
  nonConforming: number;
  expiredCerts: number;
  expiringCerts: number;
  receivingToday: number;
}

export async function computeDashboardStats(): Promise<DashboardStats> {
  const [products, batches, nc, employees, certificates, receivingSessions] = await Promise.all([
    ProductRepo.all(),
    BatchRepo.all(),
    NonConformingRepo.all(),
    EmployeeRepo.all(),
    HealthCertificateRepo.all(),
    ReceivingRepo.all()
  ]);

  let expired = 0;
  let within30 = 0;
  let expiringSoon = 0;
  let afterHalf = 0;
  let beforeHalf = 0;

  batches.forEach((b: Batch) => {
    const { status } = computeBatchStatus(b.productionDate, b.expiryDate, b.halfLifeDate, b.shelfLifeValue, b.shelfLifeUnit);
    if (status === 'expired') expired++;
    else if (status === 'near_expiry') within30++;
    else if (status === 'expiring_soon') expiringSoon++;
    else if (status === 'after_half') afterHalf++;
    else beforeHalf++;
  });

  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const addedEmployeeIds = new Set(certificates.map((c) => c.employeeId).filter((id) => employeeById.has(id)));
  let expiredCerts = 0;
  let expiringCerts = 0;
  addedEmployeeIds.forEach((id) => {
    const emp = employeeById.get(id)!;
    if (!emp.healthCertExpiryDate) return;
    const { status } = computeCertificateStatus(emp.healthCertExpiryDate);
    if (status === 'expired') expiredCerts++;
    else if (status === 'near_expiry') expiringCerts++;
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const receivingToday = receivingSessions.filter((s) => s.receivingDate === todayStr).length;

  return {
    totalProducts: products.length,
    totalBatches: batches.length,
    expired,
    within30,
    expiringSoon,
    afterHalf,
    beforeHalf,
    nonConforming: nc.length,
    expiredCerts,
    expiringCerts,
    receivingToday
  };
}
