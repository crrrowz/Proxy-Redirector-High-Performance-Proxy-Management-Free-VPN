import React, { useState } from 'react';
import { Check, ExternalLink, ShieldCheck, Download, FileText, CheckCircle2 } from 'lucide-react';
import { Plan, InvoiceItem } from '../../types';

interface BillingViewProps {
  plans: Plan[];
  onUpgradePlan: (planId: string) => void;
  lang: 'ar' | 'en';
  t: Record<string, string>;
}

export const BillingView: React.FC<BillingViewProps> = ({
  plans,
  onUpgradePlan,
  lang,
  t
}) => {
  const [invoices] = useState<InvoiceItem[]>([
    {
      id: 'inv_10482',
      invoiceNumber: 'INV-2026-09-001',
      date: '2026-09-01',
      amount: 12.00,
      status: 'PAID',
      planName: 'Pro Tier (Monthly)'
    },
    {
      id: 'inv_10321',
      invoiceNumber: 'INV-2026-08-001',
      date: '2026-08-01',
      amount: 12.00,
      status: 'PAID',
      planName: 'Pro Tier (Monthly)'
    },
    {
      id: 'inv_10190',
      invoiceNumber: 'INV-2026-07-001',
      date: '2026-07-01',
      amount: 12.00,
      status: 'PAID',
      planName: 'Pro Tier (Monthly)'
    }
  ]);

  const handleDownloadInvoice = (inv: InvoiceItem) => {
    const content = `===========================================
TAX INVOICE / RECEIPT
Invoice Number: ${inv.invoiceNumber}
Date: ${inv.date}
Service: ${inv.planName}
Amount Paid: $${inv.amount.toFixed(2)} USD
Status: ${inv.status}
Payment Processor: Stripe Payments UK Ltd.
===========================================`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoiceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <h2 style={{ fontSize: '26px', fontWeight: 800 }}>{t.pricingTitle}</h2>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            marginTop: '6px'
          }}
        >
          {lang === 'ar'
            ? 'ترقية فورية مع فوترة دقيقة بالباندويث ومخزون IPs مخصص وبوابة دفع مشفرة عبر Stripe'
            : 'Instant upgrades with dedicated bandwidth quotas, static IPs, and encrypted Stripe billing'}
        </p>
      </div>

      <div className="pricing-matrix">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`plan-item ${plan.name === 'Pro' ? 'highlight' : ''}`}
          >
            <div className="plan-item-title">{plan.name} Tier</div>
            <div className="plan-item-price">
              ${(plan.priceMonthly / 100).toFixed(0)} <span>/ month</span>
            </div>
            <ul className="plan-item-features">
              <li className="plan-item-feature">
                <Check size={14} color="var(--accent-emerald)" />{' '}
                {plan.bandwidthLimitGb} GB Monthly Quota
              </li>
              <li className="plan-item-feature">
                <Check size={14} color="var(--accent-emerald)" /> {plan.maxDevices}{' '}
                Simultaneous Devices
              </li>
              <li className="plan-item-feature">
                <Check size={14} color="var(--accent-emerald)" />{' '}
                {plan.hasDedicatedIps ? 'Dedicated Static IPs' : 'Shared Pool'}
              </li>
              <li className="plan-item-feature">
                <Check size={14} color="var(--accent-emerald)" /> DNS AdBlocker Included
              </li>
            </ul>
            <button
              className={`btn ${
                plan.name === 'Pro' ? 'btn-primary' : 'btn-outline'
              }`}
              onClick={() => onUpgradePlan(plan.id)}
            >
              {plan.priceMonthly === 0 ? 'Current Tier' : `Select ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      {/* Invoices History Table */}
      <div className="panel" style={{ marginTop: '36px' }}>
        <div className="panel-header">
          <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} color="var(--accent-primary)" />
            {lang === 'ar' ? 'سجل الفواتير والإيصالات الضريبية' : 'Billing History & Tax Receipts'}
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Billing Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="font-mono" style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                  <td>{inv.date}</td>
                  <td>{inv.planName}</td>
                  <td className="font-mono" style={{ fontWeight: 700 }}>${inv.amount.toFixed(2)}</td>
                  <td>
                    <span className="badge badge-emerald">
                      <CheckCircle2 size={12} /> {inv.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDownloadInvoice(inv)}
                      title="Download Tax Receipt"
                    >
                      <Download size={12} /> {lang === 'ar' ? 'تحميل' : 'Download'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="panel"
        style={{
          marginTop: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <div className="panel-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="var(--accent-emerald)" />
              {lang === 'ar' ? 'بوابة إدارة الاشتراكات والفواتير (Stripe Customer Portal)' : 'Stripe Customer Billing Portal'}
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {lang === 'ar' ? 'قم بتحديث وسيلة الدفع أو ربط البطاقات الائتمانية عبر Stripe' : 'Manage payment methods, view invoices, or update billing addresses'}
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => window.open('https://billing.stripe.com/p/login', '_blank')}
          >
            <ExternalLink size={13} /> {lang === 'ar' ? 'فتح بوابة Stripe' : 'Launch Customer Portal'}
          </button>
        </div>
      </div>
    </div>
  );
};
