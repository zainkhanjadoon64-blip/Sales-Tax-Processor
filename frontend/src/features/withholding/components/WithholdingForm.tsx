import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { withholdingRecordCreateSchema, type WithholdingRecordCreateFormData } from '../validations/withholdingSchema';
import type { WithholdingRecord } from '../types/withholding';
import { MONTHS, WITHHOLDING_TYPES } from '../types/withholding';

interface WithholdingFormProps {
  onSubmit: (data: WithholdingRecordCreateFormData) => void;
  onCancel: () => void;
  clients: { id: string; client_name: string }[];
  editRecord?: WithholdingRecord | null;
  loading?: boolean;
}

export function WithholdingForm({ onSubmit, onCancel, clients, editRecord, loading }: WithholdingFormProps) {
  const [periodYear, setPeriodYear] = useState(String(new Date().getFullYear()));
  const [periodMonth, setPeriodMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<WithholdingRecordCreateFormData>({
    resolver: zodResolver(withholdingRecordCreateSchema),
    defaultValues: {
      client_id: '',
      section_type: '236H',
      period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      challan_number: null,
      amount: null,
      payment_date: null,
      remarks: null,
    },
  });

  // Sync period whenever year or month changes
  useEffect(() => {
    setValue('period', `${periodYear}-${periodMonth}`, { shouldValidate: true });
  }, [periodYear, periodMonth, setValue]);

  useEffect(() => {
    if (editRecord) {
      const parts = editRecord.period.split('-');
      if (parts.length === 2) {
        setPeriodYear(parts[0]);
        setPeriodMonth(parts[1]);
      }
      reset({
        client_id: editRecord.client_id,
        section_type: editRecord.section_type,
        period: editRecord.period,
        challan_number: editRecord.challan_number || null,
        amount: editRecord.amount,
        payment_date: editRecord.payment_date || null,
        remarks: editRecord.remarks || null,
      });
    }
  }, [editRecord, reset]);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Client</label>
        <select {...register('client_id')} className="input">
          <option value="">Select a client...</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.client_name}</option>)}
        </select>
        {errors.client_id && <p className="text-sm text-red-500 mt-1">{errors.client_id.message}</p>}
      </div>

      <div>
        <label className="label">Section Type</label>
        <select {...register('section_type')} className="input">
          {WITHHOLDING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {errors.section_type && <p className="text-sm text-red-500 mt-1">{errors.section_type.message}</p>}
      </div>

      <div>
        <label className="label">Period (Year-Month)</label>
        <div className="grid grid-cols-2 gap-4">
          <select
            value={periodYear}
            onChange={(e) => setPeriodYear(e.target.value)}
            className="input"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={periodMonth}
            onChange={(e) => setPeriodMonth(e.target.value)}
            className="input"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={String(m.value).padStart(2, '0')}>{m.label}</option>
            ))}
          </select>
        </div>
        {errors.period && <p className="text-sm text-red-500 mt-1">{errors.period.message}</p>}
      </div>

      <input type="hidden" {...register('period')} />

      <div>
        <label className="label">Challan Number</label>
        <input type="text" {...register('challan_number')} className="input" placeholder="Optional challan number..." />
        {errors.challan_number && <p className="text-sm text-red-500 mt-1">{errors.challan_number.message}</p>}
      </div>

      <div>
        <label className="label">Amount (PKR)</label>
        <input
          type="number"
          step="0.01"
          {...register('amount', {
            valueAsNumber: true,
            setValueAs: (v) => (v === '' || v === null || v === undefined) ? null : Number(v),
          })}
          className="input"
          placeholder="0.00"
        />
        {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>}
      </div>

      <div>
        <label className="label">Payment Date</label>
        <input type="date" {...register('payment_date')} className="input" />
      </div>

      <div>
        <label className="label">Remarks</label>
        <textarea {...register('remarks')} rows={3} className="input" placeholder="Optional remarks..." />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : editRecord ? 'Update Record' : 'Create Record'}
        </button>
      </div>
    </form>
  );
}