import React, { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Loader } from './ui/Loader';
import { getApiBaseUrl } from '../config/env';

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

export function GrnInvoiceModal({ open, onClose, grnId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const docRef = useRef(null);

  const fetchInvoice = async () => {
    if (!grnId || !open) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBaseUrl()}/warehouse/grns/${grnId}/invoice`, {
        headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('erp_auth') || '{}').token}` },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || 'Failed to load invoice');
      }
      setData(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open && grnId) fetchInvoice();
  }, [open, grnId]);

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

      pdf.save(`Invoice-${data.invoice.invoiceNumber || data.invoice.grnNumber}.pdf`);
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
      link.download = `Invoice-${data.invoice.invoiceNumber || data.invoice.grnNumber}.png`;
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
      const { company, invoice, supplier, warehouse, items, totals, receivedBy, approvedBy } = data;

      const itemRows = items.map((item, idx) => `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:6px 8px;color:#94a3b8;font-size:11px;">${idx + 1}</td>
          <td style="padding:6px 8px;font-family:monospace;font-size:11px;color:#475569;">${escapeHtml(item.sku)}</td>
          <td style="padding:6px 8px;"><span style="font-weight:500;font-size:12px;color:#0f172a;">${escapeHtml(item.name)}</span></td>
          <td style="padding:6px 8px;font-size:11px;color:#475569;">${escapeHtml(item.unit)}</td>
          <td style="padding:6px 8px;text-align:right;font-size:11px;color:#0f172a;">${item.orderedQuantity}</td>
          <td style="padding:6px 8px;text-align:right;font-size:11px;color:#0f172a;">${item.quantityReceived}</td>
          <td style="padding:6px 8px;text-align:right;font-size:11px;color:#059669;">${item.acceptedQuantity}</td>
          <td style="padding:6px 8px;text-align:right;font-size:11px;color:#e11d48;">${item.quantityRejected}</td>
          <td style="padding:6px 8px;font-size:10px;color:#e11d48;max-width:80px;">${escapeHtml(item.rejectionReason || '')}</td>
          <td style="padding:6px 8px;text-align:right;font-size:11px;color:#e11d48;">${item.damagedQuantity}</td>
          <td style="padding:6px 8px;font-size:10px;color:#e11d48;max-width:80px;">${escapeHtml(item.damageReason || '')}</td>
          <td style="padding:6px 8px;text-align:right;font-size:11px;color:#334155;">${formatCurrency(item.unitPrice)}</td>
          <td style="padding:6px 8px;text-align:right;font-weight:600;font-size:11px;color:#0f172a;">${formatCurrency(item.lineTotal)}</td>
          <td style="padding:6px 8px;font-size:10px;color:#64748b;max-width:80px;">${escapeHtml(item.remarks || '')}</td>
        </tr>
      `).join('');

      const html = `<!DOCTYPE html>
<html>
<head>
<title>Invoice ${escapeHtml(invoice.invoiceNumber || invoice.grnNumber)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; line-height: 1.5; padding: 12mm; font-size: 12px; }
  table { border-collapse: collapse; }
  th { font-size: 10px; }
  td { font-size: 11px; }
</style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <div style="width:40px;height:40px;border-radius:10px;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;">B</div>
      <h2 style="margin-top:6px;font-size:16px;font-weight:700;color:#0f172a;">${escapeHtml(company.name)}</h2>
      <p style="font-size:11px;color:#475569;">${escapeHtml(company.address)}</p>
      <p style="font-size:11px;color:#475569;">${escapeHtml(company.phone)} | ${escapeHtml(company.email)}</p>
      ${company.gstNumber ? `<p style="font-size:11px;color:#475569;">GSTIN: ${escapeHtml(company.gstNumber)}</p>` : ''}
    </div>
    <div style="text-align:right;">
      <h1 style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#0f172a;">GOODS RECEIPT INVOICE</h1>
      <p style="margin-top:4px;font-family:monospace;font-size:13px;font-weight:600;color:#334155;">${escapeHtml(invoice.invoiceNumber)}</p>
      <p style="margin-top:2px;font-size:11px;color:#64748b;">GRN: ${escapeHtml(invoice.grnNumber)} | PO: ${escapeHtml(invoice.poNumber)}</p>
    </div>
  </div>

  <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0;" />

  <div style="display:flex;gap:24px;">
    <div style="flex:1;">
      <h3 style="margin-bottom:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Supplier</h3>
      <p style="font-size:12px;font-weight:600;color:#0f172a;">${escapeHtml(supplier.companyName)}</p>
      <p style="font-size:11px;color:#475569;">${escapeHtml(supplier.address)}</p>
      <p style="font-size:11px;color:#475569;">${escapeHtml(supplier.mobile)} | ${escapeHtml(supplier.email)}</p>
      ${supplier.gstNumber ? `<p style="font-size:11px;color:#475569;">GSTIN: ${escapeHtml(supplier.gstNumber)}</p>` : ''}
    </div>
    <div style="flex:1;">
      <h3 style="margin-bottom:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Warehouse</h3>
      <p style="font-size:12px;font-weight:600;color:#0f172a;">${escapeHtml(warehouse.name)}</p>
      <p style="font-size:11px;color:#475569;">${escapeHtml(warehouse.address)}</p>
      <p style="font-size:11px;color:#475569;">${escapeHtml(warehouse.phone)} | ${escapeHtml(warehouse.email)}</p>
    </div>
    <div style="flex:1;text-align:right;">
      <table style="width:100%;font-size:11px;">
        <tr><td style="padding:2px 0;color:#64748b;">Invoice Date</td><td style="padding:2px 0;font-weight:600;color:#0f172a;">${formatDate(invoice.invoiceDate)}</td></tr>
        <tr><td style="padding:2px 0;color:#64748b;">Approved Date</td><td style="padding:2px 0;color:#0f172a;">${formatDate(invoice.approvedAt)}</td></tr>
        <tr><td style="padding:2px 0;color:#64748b;">Received By</td><td style="padding:2px 0;color:#0f172a;">${escapeHtml(receivedBy?.name) || '—'}</td></tr>
        <tr><td style="padding:2px 0;color:#64748b;">Approved By</td><td style="padding:2px 0;color:#0f172a;">${escapeHtml(approvedBy?.name) || '—'}</td></tr>
      </table>
    </div>
  </div>

  <div style="margin-top:20px;">
    <h3 style="margin-bottom:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Received Materials</h3>
    <table style="width:100%;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
      <thead>
        <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
          <th style="padding:6px 8px;text-align:left;color:#64748b;">#</th>
          <th style="padding:6px 8px;text-align:left;color:#64748b;">SKU</th>
          <th style="padding:6px 8px;text-align:left;color:#64748b;">Item</th>
          <th style="padding:6px 8px;text-align:left;color:#64748b;">Unit</th>
          <th style="padding:6px 8px;text-align:right;color:#64748b;">Ordered</th>
          <th style="padding:6px 8px;text-align:right;color:#64748b;">Received</th>
          <th style="padding:6px 8px;text-align:right;color:#059669;">Accepted</th>
          <th style="padding:6px 8px;text-align:right;color:#e11d48;">Rejected</th>
          <th style="padding:6px 8px;text-align:left;color:#e11d48;">Reject Reason</th>
          <th style="padding:6px 8px;text-align:right;color:#e11d48;">Damaged</th>
          <th style="padding:6px 8px;text-align:left;color:#e11d48;">Damage Reason</th>
          <th style="padding:6px 8px;text-align:right;color:#64748b;">Unit Price</th>
          <th style="padding:6px 8px;text-align:right;color:#64748b;">Amount</th>
          <th style="padding:6px 8px;text-align:left;color:#64748b;">Remarks</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
  </div>

  <div style="margin-top:16px;display:flex;justify-content:flex-end;">
    <table style="width:320px;font-size:12px;">
      <tr><td style="padding:3px 0;color:#64748b;">Total Items</td><td style="padding:3px 0;text-align:right;color:#0f172a;">${totals.totalItems}</td></tr>
      <tr><td style="padding:3px 0;color:#64748b;">Total Ordered</td><td style="padding:3px 0;text-align:right;color:#0f172a;">${totals.totalOrdered}</td></tr>
      <tr><td style="padding:3px 0;color:#64748b;">Total Received</td><td style="padding:3px 0;text-align:right;color:#0f172a;">${totals.totalReceived}</td></tr>
      <tr><td style="padding:3px 0;color:#059669;">Total Accepted</td><td style="padding:3px 0;text-align:right;font-weight:600;color:#059669;">${totals.totalAccepted}</td></tr>
      <tr><td style="padding:3px 0;color:#e11d48;">Total Rejected</td><td style="padding:3px 0;text-align:right;color:#e11d48;">${totals.totalRejected}</td></tr>
      <tr><td style="padding:3px 0;color:#e11d48;">Total Damaged</td><td style="padding:3px 0;text-align:right;color:#e11d48;">${totals.totalDamaged}</td></tr>
      <tr style="border-top:2px solid #0f172a;">
        <td style="padding:6px 0;font-size:13px;font-weight:700;color:#0f172a;">Total Amount</td>
        <td style="padding:6px 0;text-align:right;font-size:15px;font-weight:800;color:#0f172a;">${formatCurrency(totals.totalAmount)}</td>
      </tr>
    </table>
  </div>

  ${invoice.notes ? `<div style="margin-top:16px;border:1px solid #e2e8f0;border-radius:6px;padding:12px;background:#f8fafc;"><h3 style="margin:0 0 4px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Inspection Notes</h3><p style="margin:0;font-size:12px;color:#334155;">${escapeHtml(invoice.notes)}</p></div>` : ''}

  <div style="margin-top:24px;display:flex;gap:48px;">
    <div style="flex:1;">
      <div style="margin-bottom:24px;border-bottom:1px solid #cbd5e1;"></div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Approved By</p>
      <p style="margin-top:4px;font-size:12px;font-weight:600;color:#0f172a;">${escapeHtml(approvedBy?.name) || '—'}</p>
      <p style="font-size:11px;color:#64748b;">${escapeHtml(company.name)}</p>
    </div>
    <div style="flex:1;">
      <div style="margin-bottom:24px;border-bottom:1px solid #cbd5e1;"></div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Supplier Acknowledgment</p>
      <p style="margin-top:4px;font-size:12px;font-weight:600;color:#0f172a;">${escapeHtml(supplier.companyName)}</p>
      <p style="font-size:11px;color:#64748b;">Date: _______________</p>
    </div>
  </div>

  <div style="margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8;">
    This document is system generated after successful Goods Receipt approval.
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
      <Modal open={open} onClose={handleClose} maxWidth="max-w-6xl" scrollOverlay noTitle containerClass="p-3">
        <div className="flex items-center justify-center py-20">
          <Loader label="Loading invoice..." />
        </div>
      </Modal>
    );
  }

  if (error) {
    return (
      <Modal open={open} onClose={handleClose} maxWidth="max-w-6xl" scrollOverlay noTitle containerClass="p-3">
        <div className="py-20 text-center text-sm text-rose-600">{error}</div>
      </Modal>
    );
  }

  if (!data) return null;

  const { company, invoice, supplier, warehouse, items, totals, receivedBy, approvedBy } = data;

  return (
    <Modal open={open} onClose={handleClose} maxWidth="max-w-6xl" scrollOverlay noTitle containerClass="p-3">
      <div className="relative">
        {exporting && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80">
            <Loader label="Generating..." />
          </div>
        )}

        <div ref={docRef} className="rounded-2xl border border-slate-200 bg-white p-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          {/* Header */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-base font-bold text-white">B</div>
              <h2 className="mt-1 text-lg font-bold text-slate-950">{company.name}</h2>
              <p className="text-xs leading-relaxed text-slate-600">{company.address}</p>
              <p className="text-xs text-slate-600">{company.phone} | {company.email}</p>
              {company.gstNumber && <p className="mt-1 text-xs font-medium text-slate-500">GSTIN: {company.gstNumber}</p>}
            </div>
            <div className="text-left sm:text-right">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-950">GOODS RECEIPT INVOICE</h1>
              <p className="mt-1 font-mono text-sm font-semibold text-slate-700">{invoice.invoiceNumber}</p>
              <p className="text-xs text-slate-500">GRN: {invoice.grnNumber} | PO: {invoice.poNumber}</p>
            </div>
          </div>

          <div className="my-4 border-t border-slate-200" />

          {/* Supplier / Warehouse / Details */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier</h3>
              <p className="text-sm font-semibold text-slate-900">{supplier.companyName}</p>
              <p className="text-xs text-slate-600">{supplier.address}</p>
              <p className="text-xs text-slate-600">{supplier.mobile} | {supplier.email}</p>
              {supplier.gstNumber && <p className="text-xs text-slate-500">GSTIN: {supplier.gstNumber}</p>}
            </div>
            <div>
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Warehouse</h3>
              <p className="text-sm font-semibold text-slate-900">{warehouse.name}</p>
              <p className="text-xs text-slate-600">{warehouse.address}</p>
              <p className="text-xs text-slate-600">{warehouse.phone} | {warehouse.email}</p>
            </div>
            <div className="text-left sm:text-right">
              <table className="ml-auto w-full max-w-[220px] text-xs">
                <tbody>
                  <tr><td className="py-0.5 pr-2 text-slate-500">Invoice Date</td><td className="py-0.5 font-semibold text-slate-900">{formatDate(invoice.invoiceDate)}</td></tr>
                  <tr><td className="py-0.5 pr-2 text-slate-500">Approved Date</td><td className="py-0.5 text-slate-900">{formatDate(invoice.approvedAt)}</td></tr>
                  <tr><td className="py-0.5 pr-2 text-slate-500">Received By</td><td className="py-0.5 text-slate-900">{receivedBy?.name || '—'}</td></tr>
                  <tr><td className="py-0.5 pr-2 text-slate-500">Approved By</td><td className="py-0.5 text-slate-900">{approvedBy?.name || '—'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Materials Table */}
          <div className="mt-5">
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Received Materials</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-2.5 py-2 text-left font-semibold text-slate-500">#</th>
                    <th className="px-2.5 py-2 text-left font-semibold text-slate-500">SKU</th>
                    <th className="px-2.5 py-2 text-left font-semibold text-slate-500">Item</th>
                    <th className="px-2.5 py-2 text-left font-semibold text-slate-500">Unit</th>
                    <th className="px-2.5 py-2 text-right font-semibold text-slate-500">Ordered</th>
                    <th className="px-2.5 py-2 text-right font-semibold text-slate-500">Received</th>
                    <th className="px-2.5 py-2 text-right font-semibold text-emerald-600">Accepted</th>
                    <th className="px-2.5 py-2 text-right font-semibold text-rose-500">Rejected</th>
                    <th className="px-2.5 py-2 text-left font-semibold text-rose-500">Reject Reason</th>
                    <th className="px-2.5 py-2 text-right font-semibold text-rose-500">Damaged</th>
                    <th className="px-2.5 py-2 text-left font-semibold text-rose-500">Damage Reason</th>
                    <th className="px-2.5 py-2 text-right font-semibold text-slate-500">Unit Price</th>
                    <th className="px-2.5 py-2 text-right font-semibold text-slate-500">Amount</th>
                    <th className="px-2.5 py-2 text-left font-semibold text-slate-500">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0">
                      <td className="px-2.5 py-2 text-slate-400">{idx + 1}</td>
                      <td className="px-2.5 py-2 font-mono text-[11px] text-slate-600">{item.sku}</td>
                      <td className="px-2.5 py-2 font-medium text-slate-900">{item.name}</td>
                      <td className="px-2.5 py-2 text-slate-600">{item.unit}</td>
                      <td className="px-2.5 py-2 text-right text-slate-800">{item.orderedQuantity}</td>
                      <td className="px-2.5 py-2 text-right text-slate-800">{item.quantityReceived}</td>
                      <td className="px-2.5 py-2 text-right font-semibold text-emerald-700">{item.acceptedQuantity}</td>
                      <td className="px-2.5 py-2 text-right text-rose-600">{item.quantityRejected}</td>
                      <td className="px-2.5 py-2 max-w-[80px] text-[10px] text-rose-500">{item.rejectionReason || ''}</td>
                      <td className="px-2.5 py-2 text-right text-rose-600">{item.damagedQuantity}</td>
                      <td className="px-2.5 py-2 max-w-[80px] text-[10px] text-rose-500">{item.damageReason || ''}</td>
                      <td className="px-2.5 py-2 text-right text-slate-700">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-2.5 py-2 text-right font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</td>
                      <td className="px-2.5 py-2 max-w-[100px] text-[10px] text-slate-500">{item.remarks || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-5 flex justify-end">
            <table className="w-72 text-xs">
              <tbody>
                <tr><td className="py-1 pr-3 text-right text-slate-500">Total Items</td><td className="py-1 text-right font-medium text-slate-900">{totals.totalItems}</td></tr>
                <tr><td className="py-1 pr-3 text-right text-slate-500">Total Ordered</td><td className="py-1 text-right text-slate-900">{totals.totalOrdered}</td></tr>
                <tr><td className="py-1 pr-3 text-right text-slate-500">Total Received</td><td className="py-1 text-right text-slate-900">{totals.totalReceived}</td></tr>
                <tr><td className="py-1 pr-3 text-right font-medium text-emerald-600">Total Accepted</td><td className="py-1 text-right font-semibold text-emerald-700">{totals.totalAccepted}</td></tr>
                <tr><td className="py-1 pr-3 text-right text-rose-500">Total Rejected</td><td className="py-1 text-right text-rose-600">{totals.totalRejected}</td></tr>
                <tr><td className="py-1 pr-3 text-right text-rose-500">Total Damaged</td><td className="py-1 text-right text-rose-600">{totals.totalDamaged}</td></tr>
                <tr className="border-t-2 border-slate-900">
                  <td className="py-2 pr-3 text-right text-sm font-bold text-slate-950">Total Amount</td>
                  <td className="py-2 text-right text-base font-extrabold text-slate-950">{formatCurrency(totals.totalAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Inspection Notes */}
          {invoice.notes && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <h3 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Inspection Notes</h3>
              <p className="text-xs leading-relaxed text-slate-700">{invoice.notes}</p>
            </div>
          )}

          {/* Signature Area */}
          <div className="mt-6 grid grid-cols-1 gap-12 sm:grid-cols-2">
            <div>
              <div className="mb-6 border-b border-slate-300" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approved By</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{approvedBy?.name || '—'}</p>
              <p className="text-xs text-slate-500">{company.name}</p>
            </div>
            <div>
              <div className="mb-6 border-b border-slate-300" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier Acknowledgment</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{supplier.companyName}</p>
              <p className="text-xs text-slate-500">Date: _______________</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
            This document is system generated after successful Goods Receipt approval.
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