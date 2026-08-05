import React, { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { getApiBaseUrl } from '../config/env';

const STATUS_COLORS = {
  DRAFT: '#64748b',
  SUBMITTED: '#64748b',
  PENDING_APPROVAL: '#d97706',
  APPROVED: '#2563eb',
  SENT: '#4f46e5',
  SUPPLIER_CONFIRMED: '#7c3aed',
  GRN_CREATED: '#0d9488',
  RECEIVING: '#ea580c',
  RECEIVED: '#059669',
  CLOSED: '#64748b',
  CANCELLED: '#e11d48',
  REJECTED: '#e11d48',
  EXPIRED: '#dc2626',
};

const STATUS_LABELS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  SENT: 'Sent',
  SUPPLIER_CONFIRMED: 'Supplier Confirmed',
  GRN_CREATED: 'GRN Created',
  RECEIVING: 'Receiving',
  RECEIVED: 'Received',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
};

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(v) {
  return `Rs. ${Number(v || 0).toFixed(2)}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function PoDocumentModal({ open, onClose, poId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const docRef = useRef(null);

  const fetchDocument = async () => {
    if (!poId || !open) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/warehouse/purchase-orders/${poId}/document`, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('erp_auth') || '{}').token}` },
      });
      if (!res.ok) throw new Error('Failed to load document');
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open && poId) fetchDocument();
  }, [open, poId]);

  const captureDataUrl = useCallback(async () => {
    if (!docRef.current) return null;
    return toPng(docRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    });
  }, []);

  const dataUrlToCanvas = (dataUrl) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c);
      };
      img.onerror = () => reject(new Error('Failed to load captured image'));
      img.src = dataUrl;
    });

  const handleDownloadPdf = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const dataUrl = await captureDataUrl();
      if (!dataUrl) return;

      const canvas = await dataUrlToCanvas(dataUrl);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      const imgRatio = canvas.height / canvas.width;
      const totalImgH = pdfW * imgRatio;

      if (totalImgH <= pdfH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, totalImgH);
      } else {
        const pageCanvasH = (pdfH / totalImgH) * canvas.height;
        let yOffset = 0;
        let page = 0;

        while (yOffset < canvas.height) {
          if (page > 0) pdf.addPage();
          const sliceH = Math.min(pageCanvasH, canvas.height - yOffset);

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceH;
          pageCanvas.getContext('2d').drawImage(canvas, 0, yOffset, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

          const sliceData = pageCanvas.toDataURL('image/png');
          const sliceImgH = (sliceH / canvas.height) * totalImgH;
          pdf.addImage(sliceData, 'PNG', 0, 0, pdfW, sliceImgH);

          yOffset += sliceH;
          page++;
        }
      }

      pdf.save(`${data.po.poNumber}.pdf`);
    } catch (err) {
      alert(`Failed to generate PDF: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const dataUrl = await captureDataUrl();
      if (!dataUrl) return;
      const link = document.createElement('a');
      link.download = `${data.po.poNumber}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert(`Failed to generate PNG: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const { company, po, supplier, items, totals, createdBy, approvedBy } = data;
      const statusColor = STATUS_COLORS[po.status] || '#64748b';
      const statusLabel = STATUS_LABELS[po.status] || po.status;

      const itemRows = items.map((item, idx) => `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:8px 12px;color:#94a3b8;">${idx + 1}</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:11px;color:#475569;">${escapeHtml(item.sku)}</td>
          <td style="padding:8px 12px;"><span style="font-weight:500;color:#0f172a;">${escapeHtml(item.name)}</span> ${item.brand !== '—' ? `<span style="font-size:11px;color:#94a3b8;">${escapeHtml(item.brand)}</span>` : ''}</td>
          <td style="padding:8px 12px;color:#475569;">${escapeHtml(item.unit)}</td>
          <td style="padding:8px 12px;text-align:right;font-weight:500;color:#0f172a;">${item.quantity}</td>
          <td style="padding:8px 12px;text-align:right;color:#334155;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding:8px 12px;text-align:right;color:#64748b;">${item.taxRate > 0 ? item.taxRate + '%' : '—'}</td>
          <td style="padding:8px 12px;text-align:right;font-weight:600;color:#0f172a;">${formatCurrency(item.lineTotal)}</td>
        </tr>
      `).join('');

      const approvedRow = approvedBy ? `<tr><td style="padding:4px 0;color:#64748b;">Approved By</td><td style="padding:4px 0;color:#0f172a;">${escapeHtml(approvedBy.name)}</td></tr>` : '';
      const gstRow = company.gstNumber ? `<tr><td style="padding:4px 0;color:#64748b;">GSTIN</td><td style="padding:4px 0;color:#0f172a;font-size:12px;font-weight:500;">${escapeHtml(company.gstNumber)}</td></tr>` : '';
      const supplierGstRow = supplier.gstNumber ? `<tr><td style="padding:4px 0;color:#64748b;">GSTIN</td><td style="padding:4px 0;color:#0f172a;">${escapeHtml(supplier.gstNumber)}</td></tr>` : '';
      const notesSection = po.notes ? `<div style="margin-top:32px;border:1px solid #e2e8f0;border-radius:8px;padding:16px;background:#f8fafc;"><h3 style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Notes</h3><p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(po.notes)}</p></div>` : '';
      const taxRow = totals.totalTax > 0 ? `<tr><td style="padding:6px 0;color:#64748b;">Tax</td><td style="padding:6px 0;text-align:right;font-weight:500;color:#0f172a;">${formatCurrency(totals.totalTax)}</td></tr>` : '';

      const html = `<!DOCTYPE html>
<html>
<head>
<title>${escapeHtml(po.poNumber)}</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; line-height: 1.5; padding: 15mm; }
</style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div style="width:48px;height:48px;border-radius:12px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;">B</div>
      <h2 style="margin-top:8px;font-size:18px;font-weight:700;color:#0f172a;">${escapeHtml(company.name)}</h2>
      <p style="margin-top:4px;font-size:13px;color:#475569;line-height:1.5;">${escapeHtml(company.address)}</p>
      <p style="font-size:13px;color:#475569;">${escapeHtml(company.phone)}</p>
      <p style="font-size:13px;color:#475569;">${escapeHtml(company.email)}</p>
      ${gstRow}
    </div>
    <div style="text-align:right;">
      <h1 style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#0f172a;">PURCHASE ORDER</h1>
      <p style="margin-top:4px;font-family:monospace;font-size:14px;font-weight:600;color:#334155;">${escapeHtml(po.poNumber)}</p>
      <div style="margin-top:8px;display:inline-block;padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:700;color:#fff;background:${statusColor};">${statusLabel}</div>
    </div>
  </div>

  <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;" />

  <div style="display:flex;gap:32px;">
    <div style="flex:1;">
      <h3 style="margin-bottom:12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Purchase Order Details</h3>
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr><td style="padding:4px 0;color:#64748b;">PO Number</td><td style="padding:4px 0;font-weight:600;color:#0f172a;">${escapeHtml(po.poNumber)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">PO Date</td><td style="padding:4px 0;color:#0f172a;">${formatDate(po.poDate)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Valid Until</td><td style="padding:4px 0;color:#0f172a;">${formatDate(po.validUntil)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Purpose</td><td style="padding:4px 0;color:#0f172a;">${escapeHtml(po.purpose || '—')}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Priority</td><td style="padding:4px 0;font-weight:600;color:#0f172a;">${escapeHtml(po.priority || 'MEDIUM')}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Expected Delivery</td><td style="padding:4px 0;color:#0f172a;">${formatDate(po.expectedDeliveryDate)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Payment Terms</td><td style="padding:4px 0;color:#0f172a;">${escapeHtml(po.paymentTerms) || '—'}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Created By</td><td style="padding:4px 0;color:#0f172a;">${escapeHtml(createdBy?.name) || '—'}</td></tr>
        ${approvedRow}
      </table>
    </div>
    <div style="flex:1;">
      <h3 style="margin-bottom:12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Supplier Information</h3>
      <table style="width:100%;font-size:13px;border-collapse:collapse;">
        <tr><td style="padding:4px 0;color:#64748b;">Company</td><td style="padding:4px 0;font-weight:600;color:#0f172a;">${escapeHtml(supplier.companyName)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Code</td><td style="padding:4px 0;color:#0f172a;">${escapeHtml(supplier.supplierCode)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Contact</td><td style="padding:4px 0;color:#0f172a;">${escapeHtml(supplier.contactPerson)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Phone</td><td style="padding:4px 0;color:#0f172a;">${escapeHtml(supplier.mobile)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Email</td><td style="padding:4px 0;color:#0f172a;">${escapeHtml(supplier.email)}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;">Address</td><td style="padding:4px 0;color:#0f172a;">${escapeHtml(supplier.address)}</td></tr>
        ${supplierGstRow}
      </table>
    </div>
  </div>

  <div style="margin-top:32px;">
    <h3 style="margin-bottom:12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Order Items</h3>
    <table style="width:100%;font-size:13px;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="border-bottom:2px solid #e2e8f0;background:#f8fafc;">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">#</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">SKU</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Item</th>
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Unit</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Unit Price</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Tax %</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>

  <div style="margin-top:24px;display:flex;justify-content:flex-end;">
    <table style="width:280px;font-size:13px;border-collapse:collapse;">
      <tr><td style="padding:6px 0;color:#64748b;">Subtotal</td><td style="padding:6px 0;text-align:right;font-weight:500;color:#0f172a;">${formatCurrency(totals.subtotal)}</td></tr>
      ${taxRow}
      <tr style="border-top:2px solid #0f172a;">
        <td style="padding:8px 0;font-size:14px;font-weight:700;color:#0f172a;">Grand Total</td>
        <td style="padding:8px 0;text-align:right;font-size:16px;font-weight:800;color:#0f172a;">${formatCurrency(totals.grandTotal)}</td>
      </tr>
    </table>
  </div>

  ${notesSection}

  <div style="margin-top:40px;display:flex;gap:64px;">
    <div style="flex:1;">
      <div style="margin-bottom:32px;border-bottom:1px solid #cbd5e1;"></div>
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Authorized By</p>
      <p style="margin-top:4px;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(createdBy?.name) || '—'}</p>
      <p style="font-size:12px;color:#64748b;">${escapeHtml(company.name)}</p>
    </div>
    <div style="flex:1;">
      <div style="margin-bottom:32px;border-bottom:1px solid #cbd5e1;"></div>
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Supplier Signature &amp; Date</p>
      <p style="margin-top:4px;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(supplier.companyName)}</p>
      <p style="font-size:12px;color:#64748b;">Date: _______________</p>
    </div>
  </div>
</body>
</html>`;

      const printWindow = window.open('', '_blank');
      if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
        alert('Popup blocked. Please allow popups for this site and try again.');
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } catch (err) {
      alert(`Failed to print: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleClose = () => {
    setData(null);
    setError(null);
    onClose();
  };

  if (loading) {
    return (
      <Modal open={open} onClose={handleClose} maxWidth="max-w-5xl" scrollOverlay noTitle containerClass="p-3">
        <div className="flex items-center justify-center py-20">
          <Loader label="Loading document..." />
        </div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal open={open} onClose={handleClose} maxWidth="max-w-5xl" scrollOverlay noTitle containerClass="p-3">
        <div className="py-20 text-center text-sm text-rose-600">{error}</div>
      </Modal>
    );
  }

  if (!data) return null;

  const { company, po, supplier, items, totals, createdBy, approvedBy } = data;
  const statusColor = STATUS_COLORS[po.status] || '#64748b';

  return (
    <Modal open={open} onClose={handleClose} maxWidth="max-w-5xl" scrollOverlay noTitle containerClass="p-3">
      <div className="relative">
        {exporting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80">
            <Loader label="Generating..." />
          </div>
        )}

        <div ref={docRef} className="rounded-2xl border border-slate-200 bg-white p-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-lg font-bold text-white">B</div>
              <h2 className="mt-2 text-xl font-bold text-slate-950">{company.name}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{company.address}</p>
              <p className="text-sm text-slate-600">{company.phone}</p>
              <p className="text-sm text-slate-600">{company.email}</p>
              {company.gstNumber && <p className="mt-1 text-xs font-medium text-slate-500">GSTIN: {company.gstNumber}</p>}
            </div>
            <div className="text-left sm:text-right">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">PURCHASE ORDER</h1>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-700">{po.poNumber}</p>
              <div className="mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: statusColor }}>
                {STATUS_LABELS[po.status] || po.status}
              </div>
            </div>
          </div>

          <div className="my-6 border-t border-slate-200" />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Purchase Order Details</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="py-1 pr-4 text-slate-500">PO Number</td><td className="py-1 font-semibold text-slate-900">{po.poNumber}</td></tr>
                  <tr><td className="py-1 pr-4 text-slate-500">PO Date</td><td className="py-1 text-slate-900">{formatDate(po.poDate)}</td></tr>
                  <tr><td className="py-1 pr-4 text-slate-500">Valid Until</td><td className="py-1 text-slate-900">{formatDate(po.validUntil)}</td></tr>
                  <tr><td className="py-1 pr-4 text-slate-500">Purpose</td><td className="py-1 text-slate-900">{po.purpose || '—'}</td></tr>
                  <tr><td className="py-1 pr-4 text-slate-500">Priority</td><td className="py-1">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      po.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                      po.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      po.priority === 'LOW' ? 'bg-slate-100 text-slate-600' :
                      'bg-blue-100 text-blue-800'
                    }`}>{po.priority || 'MEDIUM'}</span>
                  </td></tr>
                  <tr><td className="py-1 pr-4 text-slate-500">Expected Delivery</td><td className="py-1 text-slate-900">{formatDate(po.expectedDeliveryDate)}</td></tr>
                  <tr><td className="py-1 pr-4 text-slate-500">Payment Terms</td><td className="py-1 text-slate-900">{po.paymentTerms || '—'}</td></tr>
                  <tr><td className="py-1 pr-4 text-slate-500">Created By</td><td className="py-1 text-slate-900">{createdBy?.name || '—'}</td></tr>
                  {approvedBy && <tr><td className="py-1 pr-4 text-slate-500">Approved By</td><td className="py-1 text-slate-900">{approvedBy.name}</td></tr>}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Supplier Information</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="py-1 pr-4 text-slate-500">Company</td><td className="py-1 font-semibold text-slate-900">{supplier.companyName}</td></tr>
                  <tr><td className="py-1 pr-4 text-slate-500">Code</td><td className="py-1 text-slate-900">{supplier.supplierCode}</td></tr>
                  <tr><td className="py-1 pr-4 text-slate-500">Contact</td><td className="py-1 text-slate-900">{supplier.contactPerson}</td></tr>
                  <tr><td className="py-1 pr-4 text-slate-500">Phone</td><td className="py-1 text-slate-900">{supplier.mobile}</td></tr>
                  <tr><td className="py-1 pr-4 text-slate-500">Email</td><td className="py-1 text-slate-900">{supplier.email}</td></tr>
                  <tr><td className="py-1 pr-4 text-slate-500">Address</td><td className="py-1 text-slate-900">{supplier.address}</td></tr>
                  {supplier.gstNumber && <tr><td className="py-1 pr-4 text-slate-500">GSTIN</td><td className="py-1 text-slate-900">{supplier.gstNumber}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Order Items</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">#</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Item</th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Unit</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Unit Price</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Tax %</th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-600">{item.sku}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{item.name}</span>
                        <span className="ml-1 text-xs text-slate-400">{item.brand !== '—' ? item.brand : ''}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{item.taxRate > 0 ? `${item.taxRate}%` : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <table className="w-72 text-sm">
              <tbody>
                <tr>
                  <td className="py-1.5 pr-4 text-right text-slate-500">Subtotal</td>
                  <td className="py-1.5 text-right font-medium text-slate-900">{formatCurrency(totals.subtotal)}</td>
                </tr>
                {totals.totalTax > 0 && (
                  <tr>
                    <td className="py-1.5 pr-4 text-right text-slate-500">Tax</td>
                    <td className="py-1.5 text-right font-medium text-slate-900">{formatCurrency(totals.totalTax)}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-slate-900">
                  <td className="py-2 pr-4 text-right text-sm font-bold text-slate-950">Grand Total</td>
                  <td className="py-2 text-right text-lg font-extrabold text-slate-950">{formatCurrency(totals.grandTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {po.notes && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Notes</h3>
              <p className="text-sm leading-relaxed text-slate-700">{po.notes}</p>
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-16 sm:grid-cols-2">
            <div>
              <div className="mb-8 border-b border-slate-300" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Authorized By</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{createdBy?.name || '—'}</p>
              <p className="text-xs text-slate-500">{company.name}</p>
            </div>
            <div>
              <div className="mb-8 border-b border-slate-300" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Supplier Signature & Date</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{supplier.companyName}</p>
              <p className="text-xs text-slate-500">Date: _______________</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-3">
          <Button variant="secondary" onClick={handleDownloadPng} disabled={exporting}>
            Download PNG
          </Button>
          <Button variant="secondary" onClick={handleDownloadPdf} disabled={exporting}>
            Download PDF
          </Button>
          <Button variant="secondary" onClick={handlePrint} disabled={exporting}>
            Print
          </Button>
          <Button onClick={handleClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
