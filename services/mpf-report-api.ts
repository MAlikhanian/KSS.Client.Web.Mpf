/**
 * KSS.Service.Report.MPF_ERP_Mabna — server-side helpers.
 *
 * Read-only customer Rial-statement report (صورت وضعیت ریالی) served live from the
 * MabnaERP database. Base URL from MPF_REPORT_API_BASE_URL (.env / ConfigMap / k8s).
 * Every data endpoint requires a JWT Bearer token.
 */

function getMpfBaseUrl(): string {
  const baseUrl = process.env.MPF_REPORT_API_BASE_URL;
  if (!baseUrl) {
    console.error('[MPF Report API] MPF_REPORT_API_BASE_URL is not set');
    throw new Error('MPF_REPORT_API_BASE_URL environment variable is required but not set.');
  }
  return baseUrl.replace(/\/+$/, '');
}

export type StatementFilter =
  | 0 // All
  | 1 // Open
  | 2 // NearDue
  | 3 // Overdue
  | 4 // Order
  | 5 // Settled
  | 6 // Receipts
  | 7 // Payments
  | 8 // DistReturn
  | 9; // SalesReturn

export interface StatementQuery {
  totMergedPersonId: number;
  scuCmpyDurId: number;
  totCostCenterId?: number | null;
  saleChannelId?: number | null;
  fromDateJalali?: number | null;
  toDateJalali?: number | null;
  filter: StatementFilter;
  nearDueDays?: number;
}

export interface StatementRow {
  source: string;
  docTypeName: string;
  serial: string;
  dateJalali: number;
  debit: number;
  credit: number;
  runningBalance: number;
  openRemain: number;
  documentNo: number | null;
  graceDays: number | null;
  dueDateJalali: number | null;
  lastStatus: string | null;
  visitorName: string | null;
  costCenterName: string | null;
  description: string | null;
}

export interface StatementTotals {
  totalDebit: number;
  totalCredit: number;
  balance: number;
  totalOpenRemain: number;
  rowCount: number;
}

export interface StatementResult {
  totMergedPersonId: number;
  customerCode: string | null;
  customerName: string | null;
  rows: StatementRow[];
  totals: StatementTotals;
}

export interface CustomerPick {
  id: number;
  code: string | null;
  name: string;
}

export interface CityPick {
  id: number;
  name: string;
  customerCount: number;
}

export interface CompanyPeriod {
  scuCmpyDurId: number;
  companyId: number;
  durationId: number;
  companyName: string;
  periodName: string;
}

export interface Lookup {
  id: number;
  name: string;
}

async function jsonGet<T>(token: string, path: string): Promise<T> {
  const r = await fetch(`${getMpfBaseUrl()}${path}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`MPF report GET ${path} failed: ${r.status}`);
  return r.json();
}

export async function getStatement(token: string, query: StatementQuery): Promise<StatementResult> {
  const r = await fetch(`${getMpfBaseUrl()}/Api/CustomerStatement/GetStatement`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`getStatement failed: ${r.status}`);
  return r.json();
}

export function searchCustomers(token: string, q: string, cityId?: number | null): Promise<CustomerPick[]> {
  const city = cityId != null ? `&cityId=${cityId}` : '';
  return jsonGet(token, `/Api/CustomerStatement/SearchCustomers?q=${encodeURIComponent(q)}${city}`);
}

export function getCities(token: string): Promise<CityPick[]> {
  return jsonGet(token, `/Api/CustomerStatement/Cities`);
}

export function getCompanyPeriods(token: string): Promise<CompanyPeriod[]> {
  return jsonGet(token, `/Api/CustomerStatement/CompanyPeriods`);
}

export function getCostCenters(token: string, scuCmpyDurId: number): Promise<Lookup[]> {
  return jsonGet(token, `/Api/CustomerStatement/CostCenters?scuCmpyDurId=${scuCmpyDurId}`);
}

export function getSaleChannels(token: string, scuCmpyDurId: number): Promise<Lookup[]> {
  return jsonGet(token, `/Api/CustomerStatement/SaleChannels?scuCmpyDurId=${scuCmpyDurId}`);
}
