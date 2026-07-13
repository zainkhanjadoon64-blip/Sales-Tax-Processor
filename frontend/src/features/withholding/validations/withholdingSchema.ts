import { z } from 'zod';

export const withholdingRecordCreateSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  section_type: z.enum(['236H', '153', '165'], { required_error: 'Section type is required' }).optional(),
  period: z.string().min(1, 'Period is required').regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format').optional(),
  challan_number: z.string().max(100).optional().nullable(),
  amount: z.number().min(0, 'Amount must be positive').optional().nullable(),
  payment_date: z.string().optional().nullable(),
  remarks: z.string().max(1000, 'Remarks too long').optional().nullable(),
  tax_year: z.number().int().min(2000).max(2100).optional(),
  tax_month: z.number().int().min(1).max(12).optional(),
  status: z.enum(['Submitted', 'Pending', 'Not Submitted', 'Overdue']).optional(),
  submission_date: z.string().optional().nullable(),
}).superRefine((value, ctx) => {
  const hasCurrentShape = Boolean(value.section_type && value.period);
  const hasLegacyShape = Boolean(value.tax_year !== undefined && value.tax_month !== undefined);

  if (!hasCurrentShape && !hasLegacyShape) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['section_type'],
      message: 'Either a current withholding payload or a legacy tax payload is required.',
    });
  }
});

export const withholdingRecordUpdateSchema = z.object({
  section_type: z.enum(['236H', '153', '165']).optional(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format').optional(),
  challan_number: z.string().max(100).optional().nullable(),
  amount: z.number().min(0).optional().nullable(),
  payment_date: z.string().optional().nullable(),
  remarks: z.string().max(1000, 'Remarks too long').optional().nullable(),
});

export type WithholdingRecordCreateFormData = z.infer<typeof withholdingRecordCreateSchema>;
export type WithholdingRecordUpdateFormData = z.infer<typeof withholdingRecordUpdateSchema>;