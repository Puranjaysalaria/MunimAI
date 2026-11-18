import { Customer, Shop, Transaction } from '../types/schema';
import { formatINR } from './utils';

/**
 * Exports Ledger transactions to standard Excel-compatible CSV with UTF-8 BOM
 */
export function exportLedgerToCSV(
  transactions: Transaction[],
  customers: Customer[],
  shopName: string
): void {
  const customerMap = new Map<string, Customer>();
  customers.forEach((c) => customerMap.set(c.id, c));

  const headers = [
    'Date & Time',
    'Customer Name',
    'Phone',
    'Transaction Type',
    'Amount (INR)',
    'Items Sold',
    'Voice Confirmed',
    'Proof Audio',
  ];

  const rows = transactions.map((tx) => {
    const cust = tx.customer_id ? customerMap.get(tx.customer_id) : undefined;
    const dateStr = new Date(tx.created_at).toLocaleString('en-IN');
    const custName = cust ? cust.name : (tx.type === 'sale' ? 'Cash Sale' : 'Expense');
    const custPhone = cust?.phone || '';
    const typeLabel =
      tx.type === 'credit'
        ? 'Udhaar (Credit)'
        : tx.type === 'payment'
        ? 'Payment Received'
        : tx.type === 'sale'
        ? 'Cash Sale'
        : 'Expense';

    const itemsStr = tx.items
      ? tx.items.map((it) => `${it.name} (${it.quantity} ${it.unit || ''})`).join('; ')
      : '';

    return [
      `"${dateStr}"`,
      `"${custName}"`,
      `"${custPhone}"`,
      `"${typeLabel}"`,
      tx.amount,
      `"${itemsStr}"`,
      tx.confirmed_by_voice ? 'YES' : 'NO',
      tx.proof_clip_path ? 'YES' : 'NO',
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Hindi text opens without garbled characters in Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateTag = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${shopName.replace(/\s+/g, '_')}_Ledger_${dateTag}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and triggers printable Customer Bahi-Khata ledger statement
 */
export function printCustomerStatement(
  customer: Customer,
  transactions: Transaction[],
  shop: Shop
): void {
  const customerTxs = transactions.filter((t) => t.customer_id === customer.id);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const todayStr = new Date().toLocaleDateString('hi-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const txRowsHtml = customerTxs
    .map(
      (tx) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px;">${new Date(tx.created_at).toLocaleDateString('hi-IN')}</td>
        <td style="padding: 8px;">${tx.type === 'credit' ? 'उधार' : 'जमा (भुगतान)'}</td>
        <td style="padding: 8px;">${tx.items?.map((it) => `${it.name} (${it.quantity})`).join(', ') || '-'}</td>
        <td style="padding: 8px; text-align: right; font-weight: bold; color: ${tx.type === 'credit' ? '#D64545' : '#1E9E5A'};">
          ${tx.type === 'credit' ? '+' : '-'}${formatINR(tx.amount)}
        </td>
      </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>बही-खाता रसीद - ${customer.name}</title>
        <style>
          body { font-family: sans-serif; padding: 24px; color: #1f2937; max-width: 600px; margin: auto; }
          .header { text-align: center; border-bottom: 2px solid #0B6E4F; padding-bottom: 12px; margin-bottom: 16px; }
          .shop-title { font-size: 24px; font-weight: 900; color: #0B6E4F; margin: 0; }
          .meta { font-size: 13px; color: #6b7280; margin-top: 4px; }
          .customer-box { background: #FAF7F2; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; margin-bottom: 16px; display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
          th { background: #0B6E4F; color: white; padding: 8px; text-align: left; }
          .total-box { margin-top: 20px; text-align: right; border-top: 2px solid #0B6E4F; padding-top: 12px; }
          .total-amount { font-size: 26px; font-weight: 900; color: #D64545; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="shop-title">${shop.name}</h1>
          <div class="meta">फोन: ${shop.owner_phone} • तारीख: ${todayStr}</div>
        </div>

        <div class="customer-box">
          <div>
            <strong>ग्राहक: ${customer.name}</strong><br />
            <small>${customer.address_note || 'पता दर्ज नहीं है'}</small>
          </div>
          <div>
            <small>फोन: ${customer.phone || '-'}</small>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>तारीख</th>
              <th>विवरण</th>
              <th>सामान</th>
              <th style="text-align: right;">रकम</th>
            </tr>
          </thead>
          <tbody>
            ${txRowsHtml}
          </tbody>
        </table>

        <div class="total-box">
          <span style="font-size: 14px; font-weight: bold;">कुल बकाया उधार:</span>
          <div class="total-amount">${formatINR(customer.balance_owed)}</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
