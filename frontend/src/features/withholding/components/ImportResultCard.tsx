import React from 'react';
import type { ImportChallanResponse, ImportStatementResponse } from '../types/withholding';

interface ChallanResultProps {
  result: ImportChallanResponse;
  onReset: () => void;
}

interface StatementResultProps {
  result: ImportStatementResponse;
  onReset: () => void;
}

export const ImportResultCard: React.FC<ChallanResultProps | StatementResultProps> = ({ result, onReset }) => {
  const isChallan = 'client' in result && !('rows_processed' in result);

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-green-800">
            {isChallan ? 'Challan Imported Successfully' : 'Statement Imported Successfully'}
          </h4>

          {isChallan ? (
            <ChallanDetails result={result as ImportChallanResponse} />
          ) : (
            <StatementDetails result={result as ImportStatementResponse} />
          )}

          <button
            onClick={onReset}
            className="mt-3 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
          >
            Import Another
          </button>
        </div>
      </div>
    </div>
  );
};

const ChallanDetails: React.FC<{ result: ImportChallanResponse }> = ({ result }) => (
  <div className="mt-2 space-y-1 text-sm text-green-700">
    <p>
      <span className="font-medium">Client:</span>{' '}
      {result.client.client_name}
      {result.client.created && (
        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
          New client created
        </span>
      )}
    </p>
    {result.records.map((rec, idx) => (
      <div key={idx} className="ml-4 border-l-2 border-green-200 pl-3 mt-1">
        <p><span className="font-medium">Section:</span> {rec.section_type}</p>
        <p><span className="font-medium">Period:</span> {rec.period}</p>
        <p><span className="font-medium">Amount:</span> {rec.amount.toLocaleString()}</p>
        {rec.payment_section && <p><span className="font-medium">Payment Section:</span> {rec.payment_section}</p>}
        {rec.payment_section_code && <p><span className="font-medium">Section Code:</span> {rec.payment_section_code}</p>}
        {rec.payment_description && <p><span className="font-medium">Description:</span> {rec.payment_description}</p>}
        <p><span className="font-medium">Record ID:</span> {rec.id}</p>
      </div>
    ))}
    <p className="text-xs text-green-500 mt-1">Saved: {result.file.file_name}</p>
    {result.warnings?.length > 0 && (
      <div className="mt-2">
        <p className="font-medium text-amber-600">Warnings:</p>
        <ul className="list-disc list-inside text-amber-600 text-xs">
          {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </div>
    )}
  </div>
);

const StatementDetails: React.FC<{ result: ImportStatementResponse }> = ({ result }) => (
  <div className="mt-2 space-y-1 text-sm text-green-700">
    <p><span className="font-medium">Rows processed:</span> {result.rows_processed}</p>
    {result.rows_failed > 0 && (
      <p className="text-red-600"><span className="font-medium">Rows failed:</span> {result.rows_failed}</p>
    )}
    <p><span className="font-medium">Clients:</span></p>
    <ul className="list-disc list-inside ml-2">
      {result.clients.map((c, i) => (
        <li key={i}>
          {c.client_name}
          {c.created && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
              New
            </span>
          )}
        </li>
      ))}
    </ul>
    <p><span className="font-medium">Records created:</span> {result.records?.length ?? 0}</p>
    {result.errors?.length > 0 && (
      <div className="mt-2">
        <p className="font-medium text-red-600">Errors:</p>
        <ul className="list-disc list-inside text-red-600 text-xs">
          {result.errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </div>
    )}
    {result.warnings?.length > 0 && (
      <div className="mt-2">
        <p className="font-medium text-amber-600">Warnings:</p>
        <ul className="list-disc list-inside text-amber-600 text-xs">
          {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </div>
    )}
  </div>
);