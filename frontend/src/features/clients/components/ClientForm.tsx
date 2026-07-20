import { useForm, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import type { Client, ClientCreate, ClientUpdate } from '../types/client';
import {
  clientCreateSchema,
  clientUpdateSchema,
  sanitizeClientPayload,
  formatCNIC,
  formatNTN,
  formatSTRN,
  formatContactNumber,
  type ClientCreateFormData,
  type ClientUpdateFormData,
} from '../validations/clientSchema';
import {
  AlertTriangle,
  X,
  User,
  FileText,
  Phone,
  Building2,
  DollarSign,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

type FormTab = 'general' | 'tax' | 'contact' | 'business' | 'sales-tax' | 'withholding';

const FORM_TABS: { id: FormTab; label: string; icon: typeof User }[] = [
  { id: 'general', label: 'General', icon: User },
  { id: 'tax', label: 'Tax IDs', icon: FileText },
  { id: 'contact', label: 'Contact', icon: Phone },
  { id: 'business', label: 'Business', icon: Building2 },
  { id: 'sales-tax', label: 'Sales Tax', icon: FileText },
  { id: 'withholding', label: 'Withholding', icon: DollarSign },
];

const CLIENT_TYPE_OPTIONS = ['Individual', 'Company', 'AOP'] as const;

const BUSINESS_TYPES_BY_CLIENT_TYPE: Record<string, string[]> = {
  Individual: [
    'Salaried Individual',
    'Business Individual (Sole Proprietor)',
    'Property Individual',
    'Capital Gain Individual',
    'Mixed Income Individual',
  ],
  Company: ['Company'],
  AOP: ['AOP', 'Distributor AOP'],
};

const REGISTRATION_FIELDS = [
  { field: 'sales_tax_registered' as const, label: 'Sales Tax' },
  { field: 'withholding_registered' as const, label: 'Withholding' },
  { field: 'kpra_registered' as const, label: 'KPRA' },
];

function collectErrorMessages(errs: FieldErrors): string[] {
  return Object.values(errs).flatMap((error) => {
    if (!error) return [];
    if ('message' in error && error.message) return [String(error.message)];
    return collectErrorMessages(error as FieldErrors);
  });
}

interface ClientFormProps {
  client?: Client | null;
  onSubmit: (data: ClientCreate | ClientUpdate) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  formErrors?: Record<string, string>;
}

export function ClientForm({ client, onSubmit, onClose, isLoading = false, formErrors = {} }: ClientFormProps) {
  const isEditing = !!client;
  const schema = isEditing ? clientUpdateSchema : clientCreateSchema;
  type FormData = ClientCreateFormData | ClientUpdateFormData;
  const [activeTab, setActiveTab] = useState<FormTab>('general');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_name: '',
      business_name: '',
      cnic: '',
      ntn: '',
      strn: '',
      contact_number: '',
      email: '',
      address: '',
      client_password: '',
      sales_tax_registered: false,
      withholding_registered: false,
      kpra_registered: false,
      is_active: true,
      notes: '',
      contact_person: '',
      contact_person_designation: '',
      contact_person_phone: '',
      contact_person_email: '',
      secondary_phone: '',
      city: '',
      province: '',
      business_type: '',
      client_type: '',
      registration_date: '',
      tax_period: '',
      fbr_office: '',
      sales_tax_material_status: 'NIL',
      withholding_236_applied: false,
      withholding_236_prepared_by_us: false,
      withholding_153_applicable: false,
      withholding_153_prepared_by_us: false,
      withholding_filing_frequency: '',
    },
  });

  const isActive = watch('is_active');
  const salesTaxRegistered = watch('sales_tax_registered');
  const withholdingRegistered = watch('withholding_registered');
  const clientType = watch('client_type');
  const businessType = watch('business_type');

  const businessTypeOptions = clientType ? BUSINESS_TYPES_BY_CLIENT_TYPE[clientType] || [] : [];
  const isCompanyType = clientType === 'Company';

  useEffect(() => {
    if (!salesTaxRegistered) {
      setValue('sales_tax_material_status', 'NIL', { shouldDirty: true, shouldValidate: true });
    }
  }, [salesTaxRegistered, setValue]);

  useEffect(() => {
    if (!withholdingRegistered) {
      setValue('withholding_236_applied', false, { shouldDirty: true, shouldValidate: true });
      setValue('withholding_236_prepared_by_us', false, { shouldDirty: true, shouldValidate: true });
      setValue('withholding_153_applicable', false, { shouldDirty: true, shouldValidate: true });
      setValue('withholding_153_prepared_by_us', false, { shouldDirty: true, shouldValidate: true });
    }
  }, [withholdingRegistered, setValue]);

  useEffect(() => {
    if (!clientType) {
      setValue('business_type', '');
      return;
    }
    if (clientType === 'Company') {
      setValue('business_type', 'Company', { shouldDirty: true });
      return;
    }
    const options = BUSINESS_TYPES_BY_CLIENT_TYPE[clientType] || [];
    if (businessType && !options.includes(businessType)) {
      setValue('business_type', '');
    }
  }, [clientType, businessType, setValue]);

  useEffect(() => {
    if (client) {
      reset({
        client_name: client.client_name,
        business_name: client.business_name || '',
        cnic: client.cnic || '',
        ntn: client.ntn || '',
        strn: client.strn || '',
        contact_number: client.contact_number || '',
        email: client.email || '',
        address: client.address || '',
        client_password: '',
        sales_tax_registered: client.sales_tax_registered,
        withholding_registered: client.withholding_registered,
        kpra_registered: client.kpra_registered ?? false,
        is_active: client.is_active ?? true,
        notes: client.notes || '',
        contact_person: client.contact_person || '',
        contact_person_designation: client.contact_person_designation || '',
        contact_person_phone: client.contact_person_phone || '',
        contact_person_email: client.contact_person_email || '',
        secondary_phone: client.secondary_phone || '',
        city: client.city || '',
        province: client.province || '',
        business_type: client.business_type || '',
        client_type: client.client_type || '',
        registration_date: client.registration_date || '',
        tax_period: client.tax_period || '',
        fbr_office: client.fbr_office || '',
        sales_tax_material_status: client.sales_tax_material_status ?? 'NIL',
        withholding_236_applied: client.withholding_236_applied ?? false,
        withholding_236_prepared_by_us: client.withholding_236_prepared_by_us ?? false,
        withholding_153_applicable: client.withholding_153_applicable ?? false,
        withholding_153_prepared_by_us: client.withholding_153_prepared_by_us ?? false,
        withholding_filing_frequency: client.withholding_filing_frequency || '',
      });
    } else {
      reset({
        client_name: '',
        business_name: '',
        cnic: '',
        ntn: '',
        strn: '',
        contact_number: '',
        email: '',
        address: '',
        client_password: '',
        sales_tax_registered: false,
        withholding_registered: false,
        kpra_registered: false,
        is_active: true,
        notes: '',
        contact_person: '',
        contact_person_designation: '',
        contact_person_phone: '',
        contact_person_email: '',
        secondary_phone: '',
        city: '',
        province: '',
        business_type: '',
        client_type: '',
        registration_date: '',
        tax_period: '',
        fbr_office: '',
        sales_tax_material_status: 'NIL',
        withholding_236_applied: false,
        withholding_236_prepared_by_us: false,
        withholding_153_applicable: false,
        withholding_153_prepared_by_us: false,
        withholding_filing_frequency: '',
      });
    }
    setActiveTab('general');
  }, [client, reset]);

  const handleFormSubmit = async (data: FormData) => {
    const sanitized = sanitizeClientPayload(data as Record<string, unknown>);
    await onSubmit(sanitized as ClientCreate | ClientUpdate);
  };

  const handleInvalid = () => {
    const firstErrorField = document.querySelector('[class*="border-red-400"]');
    firstErrorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const validationErrors = collectErrorMessages(errors);
  const ntnRegister = register('ntn');
  const cnicRegister = register('cnic');
  const strnRegister = register('strn');
  const contactRegister = register('contact_number');
  const contactPersonPhoneRegister = register('contact_person_phone');
  const secondaryPhoneRegister = register('secondary_phone');

  const fieldClass = (hasError?: boolean) =>
    `w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
      hasError ? 'border-red-400' : 'border-slate-200 hover:border-slate-300'
    }`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

        <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-primary-900 px-6 py-5 text-white shrink-0">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary-400 via-transparent to-transparent" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-primary-200/80 mb-1">
                  {isEditing ? 'Update record' : 'New client'}
                </p>
                <h2 className="text-xl font-semibold tracking-tight">
                  {isEditing ? 'Edit Client' : 'Add New Client'}
                </h2>
                <p className="text-sm text-slate-300 mt-1 max-w-md">
                  {isEditing
                    ? 'Update client details and tax registration information.'
                    : 'Enter client details to start tracking compliance.'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative mt-5 flex flex-wrap gap-2">
              {FORM_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActiveTab = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActiveTab
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit, handleInvalid)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {(validationErrors.length > 0 || Object.keys(formErrors).length > 0) && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Please fix the following:</p>
                      <ul className="mt-2 list-disc list-inside text-sm text-red-700 space-y-1">
                        {validationErrors.map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                        {Object.entries(formErrors).map(([field, msg]) => (
                          <li key={field}>{msg}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="client_name" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Client Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="client_name"
                        type="text"
                        {...register('client_name')}
                        className={fieldClass(!!errors.client_name)}
                        placeholder="e.g. ABC Traders"
                      />
                      {errors.client_name?.message && (
                        <p className="mt-1 text-xs text-red-600">{String(errors.client_name.message)}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="business_name" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Business Name
                      </label>
                      <input id="business_name" type="text" {...register('business_name')} className={fieldClass()} placeholder="Registered business name" />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Registrations &amp; Status
                    </p>
                    <div className="max-h-52 overflow-y-auto pr-1 space-y-3">
                      {REGISTRATION_FIELDS.map(({ field, label }) => {
                        const registered = watch(field);
                        return (
                          <div key={field}>
                            <label htmlFor={field} className="block text-sm font-medium text-slate-700 mb-1.5">
                              {label}
                            </label>
                            <select
                              id={field}
                              value={registered ? 'registered' : 'not_registered'}
                              onChange={(e) =>
                                setValue(field, e.target.value === 'registered', { shouldDirty: true, shouldValidate: true })
                              }
                              className={fieldClass()}
                            >
                              <option value="not_registered">Not Registered</option>
                              <option value="registered">Registered</option>
                            </select>
                          </div>
                        );
                      })}
                      <div>
                        <label htmlFor="is_active" className="block text-sm font-medium text-slate-700 mb-1.5">
                          Status
                        </label>
                        <select
                          id="is_active"
                          value={isActive ? 'active' : 'inactive'}
                          onChange={(e) =>
                            setValue('is_active', e.target.value === 'active', { shouldDirty: true, shouldValidate: true })
                          }
                          className={fieldClass()}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      You can register a client for multiple taxes, e.g. Sales Tax, Withholding, and KPRA together.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                    <textarea id="notes" rows={3} {...register('notes')} className={`${fieldClass()} resize-none`} placeholder="Internal notes..." />
                  </div>
                </div>
              )}

              {activeTab === 'tax' && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">Pakistani tax IDs. Leave blank if not available.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="ntn" className="block text-sm font-medium text-slate-700 mb-1.5">NTN</label>
                      <input
                        id="ntn"
                        type="text"
                        {...ntnRegister}
                        onChange={(e) => setValue('ntn', formatNTN(e.target.value), { shouldValidate: true })}
                        className={fieldClass(!!errors.ntn || !!formErrors.ntn)}
                        placeholder="1234567-1"
                        maxLength={9}
                      />
                      {(errors.ntn?.message || formErrors.ntn) && (
                        <p className="mt-1 text-xs text-red-600">{String(errors.ntn?.message || formErrors.ntn)}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="cnic" className="block text-sm font-medium text-slate-700 mb-1.5">CNIC</label>
                      <input
                        id="cnic"
                        type="text"
                        {...cnicRegister}
                        onChange={(e) => setValue('cnic', formatCNIC(e.target.value), { shouldValidate: true })}
                        className={fieldClass(!!errors.cnic || !!formErrors.cnic)}
                        placeholder="12345-6789012-3"
                        maxLength={15}
                      />
                      {(errors.cnic?.message || formErrors.cnic) && (
                        <p className="mt-1 text-xs text-red-600">{String(errors.cnic?.message || formErrors.cnic)}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="strn" className="block text-sm font-medium text-slate-700 mb-1.5">STRN</label>
                      <input
                        id="strn"
                        type="text"
                        {...strnRegister}
                        onChange={(e) => {
                          const formatted = formatSTRN(e.target.value);
                          setValue('strn', formatted, { shouldValidate: true });
                          if (formatted.replace(/\D/g, '').length >= 12) {
                            setValue('sales_tax_registered', true, { shouldDirty: true });
                          }
                        }}
                        className={fieldClass(!!errors.strn || !!formErrors.strn)}
                        placeholder="12-34-567890-12"
                        maxLength={17}
                      />
                      {(errors.strn?.message || formErrors.strn) && (
                        <p className="mt-1 text-xs text-red-600">{String(errors.strn?.message || formErrors.strn)}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="registration_date" className="block text-sm font-medium text-slate-700 mb-1.5">Registration Date</label>
                      <input id="registration_date" type="date" {...register('registration_date')} className={fieldClass()} />
                    </div>
                    <div>
                      <label htmlFor="tax_period" className="block text-sm font-medium text-slate-700 mb-1.5">Tax Period</label>
                      <select id="tax_period" {...register('tax_period')} className={fieldClass()}>
                        <option value="">Select period</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Half Yearly">Half Yearly</option>
                        <option value="Annual">Annual</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="fbr_office" className="block text-sm font-medium text-slate-700 mb-1.5">FBR Office</label>
                      <input id="fbr_office" type="text" {...register('fbr_office')} className={fieldClass()} placeholder="RTO Lahore" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="client_password" className="block text-sm font-medium text-slate-700 mb-1.5">
                      Portal Password <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="client_password"
                      type="password"
                      {...register('client_password')}
                      className={fieldClass(!!errors.client_password)}
                      placeholder={isEditing ? 'Leave blank to keep current' : 'Min. 6 characters'}
                    />
                    {errors.client_password?.message && (
                      <p className="mt-1 text-xs text-red-600">{String(errors.client_password.message)}</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'contact' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact_number" className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                      <input
                        id="contact_number"
                        type="text"
                        {...contactRegister}
                        onChange={(e) => setValue('contact_number', formatContactNumber(e.target.value), { shouldValidate: true })}
                        className={fieldClass(!!errors.contact_number)}
                        placeholder="+92 300 1234567"
                      />
                      {errors.contact_number?.message && (
                        <p className="mt-1 text-xs text-red-600">{String(errors.contact_number.message)}</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                      <input id="email" type="email" {...register('email')} className={fieldClass(!!errors.email)} placeholder="client@example.com" />
                      {errors.email?.message && (
                        <p className="mt-1 text-xs text-red-600">{String(errors.email.message)}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                    <textarea id="address" rows={3} {...register('address')} className={`${fieldClass()} resize-none`} placeholder="Full address" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact_person" className="block text-sm font-medium text-slate-700 mb-1.5">Contact Person</label>
                      <input id="contact_person" type="text" {...register('contact_person')} className={fieldClass()} placeholder="Name" />
                    </div>
                    <div>
                      <label htmlFor="contact_person_designation" className="block text-sm font-medium text-slate-700 mb-1.5">Designation</label>
                      <input id="contact_person_designation" type="text" {...register('contact_person_designation')} className={fieldClass()} placeholder="Manager" />
                    </div>
                    <div>
                      <label htmlFor="contact_person_phone" className="block text-sm font-medium text-slate-700 mb-1.5">Person Phone</label>
                      <input
                        id="contact_person_phone"
                        type="text"
                        {...contactPersonPhoneRegister}
                        onChange={(e) => setValue('contact_person_phone', formatContactNumber(e.target.value), { shouldValidate: true })}
                        className={fieldClass(!!errors.contact_person_phone)}
                        placeholder="+92 300 1234567"
                      />
                    </div>
                    <div>
                      <label htmlFor="contact_person_email" className="block text-sm font-medium text-slate-700 mb-1.5">Person Email</label>
                      <input id="contact_person_email" type="email" {...register('contact_person_email')} className={fieldClass(!!errors.contact_person_email)} placeholder="contact@example.com" />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="secondary_phone" className="block text-sm font-medium text-slate-700 mb-1.5">Secondary Phone</label>
                      <input
                        id="secondary_phone"
                        type="text"
                        {...secondaryPhoneRegister}
                        onChange={(e) => setValue('secondary_phone', formatContactNumber(e.target.value), { shouldValidate: true })}
                        className={fieldClass(!!errors.secondary_phone)}
                        placeholder="Alternative number"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'business' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="client_type" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Client Type
                      </label>
                      <select
                        id="client_type"
                        {...register('client_type')}
                        className={fieldClass()}
                      >
                        <option value="">Select type</option>
                        {CLIENT_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="business_type" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Business Type
                      </label>
                      <select
                        id="business_type"
                        {...register('business_type')}
                        className={fieldClass()}
                        disabled={!clientType || isCompanyType}
                      >
                        <option value="">
                          {clientType ? 'Select business type' : 'Select client type first'}
                        </option>
                        {businessTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      {isCompanyType && (
                        <p className="mt-1 text-xs text-slate-500">Auto-selected for Company clients.</p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                      <input id="city" type="text" {...register('city')} className={fieldClass()} placeholder="Lahore" />
                    </div>
                    <div>
                      <label htmlFor="province" className="block text-sm font-medium text-slate-700 mb-1.5">Province</label>
                      <select id="province" {...register('province')} className={fieldClass()}>
                        <option value="">Select province</option>
                        <option value="Punjab">Punjab</option>
                        <option value="Sindh">Sindh</option>
                        <option value="KPK">KPK</option>
                        <option value="Balochistan">Balochistan</option>
                        <option value="Gilgit Baltistan">Gilgit Baltistan</option>
                        <option value="AJK">AJK</option>
                        <option value="Islamabad">Islamabad</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sales-tax' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Sales Tax Registration
                    </p>
                    <div>
                      <label htmlFor="sales_tax_registered" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Sales Tax
                      </label>
                      <select
                        id="sales_tax_registered"
                        value={watch('sales_tax_registered') ? 'registered' : 'not_registered'}
                        onChange={(e) =>
                          setValue('sales_tax_registered', e.target.value === 'registered', { shouldDirty: true, shouldValidate: true })
                        }
                        className={fieldClass()}
                      >
                        <option value="not_registered">Not Registered</option>
                        <option value="registered">Registered</option>
                      </select>
                    </div>
                    {watch('sales_tax_registered') && (
                      <div>
                        <label htmlFor="sales_tax_material_status" className="block text-sm font-medium text-slate-700 mb-1.5">
                          Sales Tax Material / Nil
                        </label>
                        <select
                          id="sales_tax_material_status"
                          value={watch('sales_tax_material_status')}
                          onChange={(e) =>
                            setValue('sales_tax_material_status', e.target.value as 'MATERIAL' | 'NIL', {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                          }
                          className={fieldClass()}
                        >
                          <option value="MATERIAL">Material</option>
                          <option value="NIL">Nil</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={watch('kpra_registered')}
                          onChange={(e) => setValue('kpra_registered', e.target.checked, { shouldDirty: true, shouldValidate: true })}
                          className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        KPRA Registered
                      </label>
                      <p className="text-xs text-slate-500 mt-1">
                        Check if client is registered with Khyber Pakhtunkhwa Revenue Authority
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">
                      If registered, Sales Tax features and records will be enabled for this client.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'withholding' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Withholding Registration
                    </p>
                    <div>
                      <label htmlFor="withholding_registered" className="block text-sm font-medium text-slate-700 mb-1.5">
                        Withholding
                      </label>
                      <select
                        id="withholding_registered"
                        value={watch('withholding_registered') ? 'registered' : 'not_registered'}
                        onChange={(e) =>
                          setValue('withholding_registered', e.target.value === 'registered', { shouldDirty: true, shouldValidate: true })
                        }
                        className={fieldClass()}
                      >
                        <option value="not_registered">Not Registered</option>
                        <option value="registered">Registered</option>
                      </select>
                    </div>
                    {watch('withholding_registered') && (
                      <div className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={watch('withholding_236_applied')}
                              onChange={(e) => setValue('withholding_236_applied', e.target.checked, { shouldDirty: true, shouldValidate: true })}
                              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            Withholding 236 applied
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={watch('withholding_236_prepared_by_us')}
                              onChange={(e) => setValue('withholding_236_prepared_by_us', e.target.checked, { shouldDirty: true, shouldValidate: true })}
                              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            236 prepared by us
                          </label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={watch('withholding_153_applicable')}
                              onChange={(e) => setValue('withholding_153_applicable', e.target.checked, { shouldDirty: true, shouldValidate: true })}
                              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            Withholding 153 applicable
                          </label>
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={watch('withholding_153_prepared_by_us')}
                              onChange={(e) => setValue('withholding_153_prepared_by_us', e.target.checked, { shouldDirty: true, shouldValidate: true })}
                              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                            />
                            153 prepared by us
                          </label>
                        </div>
                        <div>
                          <label htmlFor="withholding_filing_frequency" className="block text-sm font-medium text-slate-700 mb-1.5">
                            Withholding Statement Filed
                          </label>
                          <select
                            id="withholding_filing_frequency"
                            value={watch('withholding_filing_frequency') || ''}
                            onChange={(e) =>
                              setValue('withholding_filing_frequency', e.target.value, { shouldDirty: true, shouldValidate: true })
                            }
                            className={fieldClass()}
                          >
                            <option value="">Select frequency</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                          </select>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-slate-500">
                      If registered, withholding registration details are shown above.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 hidden sm:block">
                Fields marked with <span className="text-red-500">*</span> are required
              </p>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary inline-flex items-center gap-2 min-w-[140px] justify-center" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {isEditing ? 'Update Client' : 'Create Client'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
