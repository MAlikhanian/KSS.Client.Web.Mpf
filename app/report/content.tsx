'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DatePickerComponent } from '@/components/ui/date-picker';
import DateObject from 'react-date-object';
import persian from 'react-date-object/calendars/persian';
import gregorian from 'react-date-object/calendars/gregorian';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/useTranslation';
import type {
  CityPick,
  CompanyPeriod,
  CustomerPick,
  Lookup,
  StatementFilter,
  StatementResult,
} from '@/services/mpf-report-api';

// Teal hue — the MPF/report page family (distinct from the amber/sky families).
const GLASS_WRAPPER =
  'space-y-5 lg:space-y-7.5 ' +
  '[&_div.rounded-xl.bg-card]:bg-teal-50/25! ' +
  '[&_div.rounded-xl.bg-card]:border-teal-100! ' +
  'dark:[&_div.rounded-xl.bg-card]:bg-teal-950/25! ' +
  'dark:[&_div.rounded-xl.bg-card]:border-teal-900! ' +
  '[&_div.rounded-xl.bg-card]:shadow-lg ' +
  '[&_div.rounded-xl.bg-card]:shadow-black/5';

function formatJalali(v: number | null | undefined): string {
  if (!v || v < 10000000) return '—';
  const y = Math.floor(v / 10000);
  const m = Math.floor((v / 100) % 100);
  const d = v % 100;
  return `${y}/${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
}

function formatAmount(v: number): string {
  return (v ?? 0).toLocaleString('fa-IR');
}

// DatePickerComponent emits a Gregorian 'YYYY-MM-DD' string; the API wants a Jalali yyyymmdd int.
function gregToJalaliInt(g: string): number | null {
  if (!g) return null;
  try {
    const p = new DateObject({ calendar: gregorian, date: g }).convert(persian);
    return p.year * 10000 + p.month.number * 100 + p.day;
  } catch {
    return null;
  }
}

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function CustomerStatementContent() {
  const { t } = useTranslation('mpf-report');

  const [customer, setCustomer] = useState<CustomerPick | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);

  const [cityId, setCityId] = useState<number | null>(null);
  const [cityOpen, setCityOpen] = useState(false);

  const [periodId, setPeriodId] = useState<number | null>(null);
  const [costCenterId, setCostCenterId] = useState<number | null>(null);
  const [channelId, setChannelId] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [filter, setFilter] = useState<StatementFilter>(0);

  // Lookups
  const { data: periods = [] } = useQuery<CompanyPeriod[]>({
    queryKey: ['mpf-report', 'periods'],
    queryFn: async () => {
      const r = await apiFetch('/api/mpf/report/periods');
      if (!r.ok) throw new Error('periods');
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: cities = [] } = useQuery<CityPick[]>({
    queryKey: ['mpf-report', 'cities'],
    queryFn: async () => {
      const r = await apiFetch('/api/mpf/report/cities');
      if (!r.ok) throw new Error('cities');
      return r.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: customers = [], isFetching: customersLoading } = useQuery<CustomerPick[]>({
    queryKey: ['mpf-report', 'customers', cityId, debouncedSearch],
    queryFn: async () => {
      const cityParam = cityId != null ? `&cityId=${cityId}` : '';
      const r = await apiFetch(`/api/mpf/report/customers?q=${encodeURIComponent(debouncedSearch)}${cityParam}`);
      if (!r.ok) throw new Error('customers');
      return r.json();
    },
    enabled: pickerOpen,
    staleTime: 60 * 1000,
  });

  const { data: costCenters = [] } = useQuery<Lookup[]>({
    queryKey: ['mpf-report', 'cost-centers', periodId],
    queryFn: async () => {
      const r = await apiFetch(`/api/mpf/report/cost-centers?scuCmpyDurId=${periodId}`);
      if (!r.ok) throw new Error('cost-centers');
      return r.json();
    },
    enabled: periodId != null,
    staleTime: 5 * 60 * 1000,
  });

  const { data: channels = [] } = useQuery<Lookup[]>({
    queryKey: ['mpf-report', 'channels', periodId],
    queryFn: async () => {
      const r = await apiFetch(`/api/mpf/report/channels?scuCmpyDurId=${periodId}`);
      if (!r.ok) throw new Error('channels');
      return r.json();
    },
    enabled: periodId != null,
    staleTime: 5 * 60 * 1000,
  });

  const canQuery = customer != null && periodId != null;

  const { data: statement, isFetching, isError } = useQuery<StatementResult>({
    queryKey: [
      'mpf-report',
      'statement',
      customer?.id,
      periodId,
      costCenterId,
      channelId,
      fromDate,
      toDate,
      filter,
    ],
    queryFn: async () => {
      const body = {
        totMergedPersonId: customer!.id,
        scuCmpyDurId: periodId!,
        totCostCenterId: costCenterId,
        saleChannelId: channelId,
        fromDateJalali: gregToJalaliInt(fromDate),
        toDateJalali: gregToJalaliInt(toDate),
        filter,
      };
      const r = await apiFetch('/api/mpf/report/statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message ?? 'statement');
      }
      return r.json();
    },
    enabled: canQuery,
    placeholderData: keepPreviousData,
  });

  const filterButtons: { v: StatementFilter; key: string; def: string }[] = useMemo(
    () => [
      { v: 0, key: 'filterAll', def: 'All' },
      { v: 1, key: 'filterOpen', def: 'Open invoices' },
      { v: 2, key: 'filterNearDue', def: 'Near due' },
      { v: 3, key: 'filterOverdue', def: 'Overdue' },
      { v: 5, key: 'filterSettled', def: 'Settled' },
      { v: 6, key: 'filterReceipts', def: 'Receipts' },
      { v: 7, key: 'filterPayments', def: 'Payments' },
    ],
    [],
  );

  const rows = statement?.rows ?? [];
  const totals = statement?.totals;

  return (
    <div className="space-y-5 lg:space-y-7.5">
      {/* Title card (teal) */}
      <Card className="bg-teal-50/25! border-teal-100! dark:bg-teal-950/25! dark:border-teal-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('pageTitle', { defaultValue: 'Customer Rial Statement' })} />
              <ToolbarDescription>
                {t('pageDesc', {
                  defaultValue: 'Live customer account statement (invoices, receipts, balance, open items) from MabnaERP.',
                })}
              </ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </CardContent>
      </Card>

      <div className={GLASS_WRAPPER}>
        {/* Filters */}
        <Card>
          <CardContent className="py-5 flex flex-wrap items-end gap-4">
            {/* City filter */}
            <div className="space-y-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">{t('city', { defaultValue: 'City' })}</Label>
              <Popover open={cityOpen} onOpenChange={setCityOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={cityOpen} className="w-full justify-between">
                    {cityId != null
                      ? cities.find((c) => c.id === cityId)?.name ?? '—'
                      : t('allCities', { defaultValue: 'All cities' })}
                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t('searchCity', { defaultValue: 'Search city…' })} />
                    <CommandList>
                      <CommandEmpty>{t('noCities', { defaultValue: 'No cities found.' })}</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value={t('allCities', { defaultValue: 'All cities' })}
                          onSelect={() => {
                            setCityId(null);
                            setCustomer(null);
                            setCityOpen(false);
                          }}
                        >
                          <Check className={cn('me-2 h-4 w-4', cityId == null ? 'opacity-100' : 'opacity-0')} />
                          <span className="flex-1">{t('allCities', { defaultValue: 'All cities' })}</span>
                        </CommandItem>
                        {cities.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            onSelect={() => {
                              setCityId(c.id);
                              setCustomer(null);
                              setCityOpen(false);
                            }}
                          >
                            <Check className={cn('me-2 h-4 w-4', cityId === c.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="flex-1">{c.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {c.customerCount.toLocaleString('fa-IR')}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Customer picker */}
            <div className="space-y-1 flex-1 min-w-[260px] max-w-md">
              <Label className="text-xs text-muted-foreground">
                {t('customer', { defaultValue: 'Customer' })}
              </Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={pickerOpen} className="w-full justify-between">
                    {customer
                      ? `${customer.name}${customer.code ? ` (${customer.code})` : ''}`
                      : t('selectCustomer', { defaultValue: 'Select a customer…' })}
                    <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      value={search}
                      onValueChange={setSearch}
                      placeholder={t('searchCustomer', { defaultValue: 'Search name or code…' })}
                    />
                    <CommandList>
                      {customersLoading && (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          {t('loading', { defaultValue: 'Loading…' })}
                        </div>
                      )}
                      {!customersLoading && (
                        <CommandEmpty>{t('noCustomers', { defaultValue: 'No customers found.' })}</CommandEmpty>
                      )}
                      <CommandGroup>
                        {customers.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={String(c.id)}
                            onSelect={() => {
                              setCustomer(c);
                              setPickerOpen(false);
                            }}
                          >
                            <Check className={cn('me-2 h-4 w-4', customer?.id === c.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="flex-1">{c.name}</span>
                            {c.code && <span className="text-xs text-muted-foreground font-mono">{c.code}</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Period selector */}
            <div className="space-y-1 min-w-[220px]">
              <Label className="text-xs text-muted-foreground">
                {t('period', { defaultValue: 'Company / period' })}
              </Label>
              <Select value={periodId != null ? String(periodId) : ''} onValueChange={(v) => setPeriodId(Number(v))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectPeriod', { defaultValue: 'Select a period…' })} />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p.scuCmpyDurId} value={String(p.scuCmpyDurId)}>
                      {p.companyName} — {p.periodName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cost center */}
            <div className="space-y-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">
                {t('costCenter', { defaultValue: 'Cost center' })}
              </Label>
              <Select
                value={costCenterId != null ? String(costCenterId) : 'all'}
                onValueChange={(v) => setCostCenterId(v === 'all' ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('all', { defaultValue: 'All' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all', { defaultValue: 'All' })}</SelectItem>
                  {costCenters.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Channel */}
            <div className="space-y-1 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">
                {t('channel', { defaultValue: 'Sales channel' })}
              </Label>
              <Select
                value={channelId != null ? String(channelId) : 'all'}
                onValueChange={(v) => setChannelId(v === 'all' ? null : Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('all', { defaultValue: 'All' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all', { defaultValue: 'All' })}</SelectItem>
                  {channels.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date range — Persian (Jalali) calendar picker; stores Gregorian YYYY-MM-DD, sent to API as Jalali int */}
            <div className="space-y-1 w-[160px]">
              <Label className="text-xs text-muted-foreground">{t('fromDate', { defaultValue: 'From (Jalali)' })}</Label>
              <DatePickerComponent value={fromDate} onChange={setFromDate} />
            </div>
            <div className="space-y-1 w-[160px]">
              <Label className="text-xs text-muted-foreground">{t('toDate', { defaultValue: 'To (Jalali)' })}</Label>
              <DatePickerComponent value={toDate} onChange={setToDate} />
            </div>
          </CardContent>
        </Card>

        {/* Filter buttons */}
        <Card>
          <CardContent className="py-3 flex flex-wrap gap-2">
            {filterButtons.map((b) => (
              <Button
                key={b.v}
                size="sm"
                variant={filter === b.v ? 'primary' : 'outline'}
                onClick={() => setFilter(b.v)}
              >
                {t(b.key, { defaultValue: b.def })}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardContent className="py-5">
            {!canQuery && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t('pickToStart', { defaultValue: 'Select a customer and a period to view the statement.' })}
              </p>
            )}
            {canQuery && isError && (
              <p role="alert" className="py-10 text-center text-sm text-rose-800 dark:text-rose-300">
                {t('errorLoading', { defaultValue: 'Failed to load the statement.' })}
              </p>
            )}
            {canQuery && !isError && (
              <>
                {/* Totals */}
                {totals && (
                  <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
                    <Badge variant="secondary" appearance="light">
                      {t('rowCount', { defaultValue: 'Rows' })}: {totals.rowCount.toLocaleString('fa-IR')}
                    </Badge>
                    <Badge variant="secondary" appearance="light">
                      {t('totalDebit', { defaultValue: 'Debit' })}: {formatAmount(totals.totalDebit)}
                    </Badge>
                    <Badge variant="secondary" appearance="light">
                      {t('totalCredit', { defaultValue: 'Credit' })}: {formatAmount(totals.totalCredit)}
                    </Badge>
                    <Badge variant="primary" appearance="light">
                      {t('balance', { defaultValue: 'Balance' })}: {formatAmount(totals.balance)}
                    </Badge>
                    <Badge variant="warning" appearance="light">
                      {t('openRemain', { defaultValue: 'Open remaining' })}: {formatAmount(totals.totalOpenRemain)}
                    </Badge>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('colDocType', { defaultValue: 'Doc type' })}</TableHead>
                        <TableHead>{t('colSerial', { defaultValue: 'Serial' })}</TableHead>
                        <TableHead>{t('colDate', { defaultValue: 'Date' })}</TableHead>
                        <TableHead className="text-end">{t('colDebit', { defaultValue: 'Debit' })}</TableHead>
                        <TableHead className="text-end">{t('colCredit', { defaultValue: 'Credit' })}</TableHead>
                        <TableHead className="text-end">{t('colBalance', { defaultValue: 'Balance' })}</TableHead>
                        <TableHead className="text-end">{t('colOpenRemain', { defaultValue: 'Open remain' })}</TableHead>
                        <TableHead>{t('colDue', { defaultValue: 'Due date' })}</TableHead>
                        <TableHead>{t('colStatus', { defaultValue: 'Status' })}</TableHead>
                        <TableHead>{t('colVisitor', { defaultValue: 'Collector/visitor' })}</TableHead>
                        <TableHead>{t('colCostCenter', { defaultValue: 'Center' })}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 && !isFetching && (
                        <TableRow>
                          <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                            {t('noRows', { defaultValue: 'No records match the current filters.' })}
                          </TableCell>
                        </TableRow>
                      )}
                      {rows.map((r, i) => (
                        <TableRow key={`${r.source}-${r.serial}-${i}`}>
                          <TableCell>{r.docTypeName}</TableCell>
                          <TableCell className="font-mono">{r.serial}</TableCell>
                          <TableCell className="tabular-nums">{formatJalali(r.dateJalali)}</TableCell>
                          <TableCell className="text-end tabular-nums">{r.debit ? formatAmount(r.debit) : '—'}</TableCell>
                          <TableCell className="text-end tabular-nums">{r.credit ? formatAmount(r.credit) : '—'}</TableCell>
                          <TableCell className="text-end tabular-nums font-medium">{formatAmount(r.runningBalance)}</TableCell>
                          <TableCell className="text-end tabular-nums">{r.openRemain ? formatAmount(r.openRemain) : '—'}</TableCell>
                          <TableCell className="tabular-nums">{formatJalali(r.dueDateJalali)}</TableCell>
                          <TableCell>{r.lastStatus ?? '—'}</TableCell>
                          <TableCell>{r.visitorName?.trim() || '—'}</TableCell>
                          <TableCell>{r.costCenterName ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
