export type MasterSheetStatus = 'completed' | 'pending' | 'missing';

export interface MasterSheetMonth {
  month: number;
  label: string;
  period: string;
  status: MasterSheetStatus;
  record?: {
    id: string;
    section_type: string;
    period: string;
    challan_number: string | null;
    payment_date: string | null;
    remarks: string | null;
  };
}

export interface MasterSheetRow {
  clientId: string;
  clientName: string;
  months: MasterSheetMonth[];
}

export function buildMasterSheetData(
  clients: Array<{ id: string; client_name: string }>,
  records: Array<{
    client_id: string;
    section_type: string;
    period: string;
    challan_number: string | null;
    payment_date: string | null;
  }>,
  today: Date = new Date(),
): MasterSheetRow[] {
  const fiscalYearStart = today.getMonth() + 1 >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  const monthConfigs = [
    { month: 7, label: 'Jul', period: `${fiscalYearStart}-07` },
    { month: 8, label: 'Aug', period: `${fiscalYearStart}-08` },
    { month: 9, label: 'Sep', period: `${fiscalYearStart}-09` },
    { month: 10, label: 'Oct', period: `${fiscalYearStart}-10` },
    { month: 11, label: 'Nov', period: `${fiscalYearStart}-11` },
    { month: 12, label: 'Dec', period: `${fiscalYearStart}-12` },
    { month: 1, label: 'Jan', period: `${fiscalYearStart + 1}-01` },
    { month: 2, label: 'Feb', period: `${fiscalYearStart + 1}-02` },
    { month: 3, label: 'Mar', period: `${fiscalYearStart + 1}-03` },
    { month: 4, label: 'Apr', period: `${fiscalYearStart + 1}-04` },
    { month: 5, label: 'May', period: `${fiscalYearStart + 1}-05` },
    { month: 6, label: 'Jun', period: `${fiscalYearStart + 1}-06` },
  ];

  const monthlyRecords = records.reduce<Record<string, Array<{
    client_id: string;
    section_type: string;
    period: string;
    challan_number: string | null;
    payment_date: string | null;
  }>>>((acc, record) => {
    const key = record.client_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(record);
    return acc;
  }, {});

  return clients.map((client) => {
    const clientRecords = monthlyRecords[client.id] || [];

    const months: MasterSheetMonth[] = monthConfigs.map((monthInfo) => {
      const record = clientRecords.find((item) => item.period === monthInfo.period);
      const periodStart = new Date(`${monthInfo.period}-01`);
      const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const isPastMonth = periodStart < currentMonthStart;

      if (record) {
        return {
          month: monthInfo.month,
          label: '✓',
          period: monthInfo.period,
          status: 'completed' as MasterSheetStatus,
          record: {
            id: `${client.id}-${monthInfo.period}`,
            section_type: record.section_type,
            period: monthInfo.period,
            challan_number: record.challan_number,
            payment_date: record.payment_date,
            remarks: (record as { remarks?: string | null }).remarks ?? null,
          },
        };
      }

      if (isPastMonth) {
        return {
          month: monthInfo.month,
          label: 'Pending',
          period: monthInfo.period,
          status: 'pending' as MasterSheetStatus,
        };
      }

      return {
        month: monthInfo.month,
        label: '—',
        period: monthInfo.period,
        status: 'missing' as MasterSheetStatus,
      };
    });

    return {
      clientId: client.id,
      clientName: client.client_name,
      months,
    };
  });
}
