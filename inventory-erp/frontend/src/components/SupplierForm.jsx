import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { TextField } from './ui/TextField';
import { SelectField } from './ui/SelectField';
import { ErrorState } from './ui/ErrorState';

export function SupplierForm({ open, editingSupplier, onSuccess, onClose }) {
  const [code, setCode] = useState('');
  const [company, setCompany] = useState('');
  const [contact, setContact] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gst, setGst] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [creditLimit, setCreditLimit] = useState(100000);
  const [poPrefix, setPoPrefix] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (open) {
      if (editingSupplier) {
        setCode(editingSupplier.supplierCode || '');
        setCompany(editingSupplier.companyName || '');
        setContact(editingSupplier.contactPerson || '');
        setMobile(editingSupplier.mobile || '');
        setEmail(editingSupplier.email || '');
        setGst(editingSupplier.gstNumber || '');
        setAddress(editingSupplier.address || '');
        setPaymentTerms(editingSupplier.paymentTerms || 'Net 30');
        setCreditLimit(editingSupplier.creditLimit ?? 100000);
        setPoPrefix(editingSupplier.poPrefix || '');
      } else {
        resetForm();
      }
      setSubmitError('');
    }
  }, [open, editingSupplier]);

  const resetForm = () => {
    setCode(''); setCompany(''); setContact(''); setMobile('');
    setEmail(''); setGst(''); setAddress(''); setPaymentTerms('Net 30');
    setCreditLimit(100000); setPoPrefix('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      const payload = {
        supplierCode: code,
        companyName: company,
        contactPerson: contact,
        mobile,
        email,
        gstNumber: gst || null,
        address,
        paymentTerms,
        creditLimit: Number(creditLimit),
        poPrefix: poPrefix || null,
      };

      let saved;
      if (editingSupplier) {
        saved = await apiFetch(`suppliers/${editingSupplier.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        saved = await apiFetch('suppliers', {
          method: 'POST',
          body: JSON.stringify({ ...payload, isActive: true }),
        });
      }

      onSuccess(saved);
      resetForm();
    } catch (err) {
      setSubmitError(err.message || 'Failed to save supplier.');
    }
  };

  return (
    <Modal
      open={open}
      title={editingSupplier ? 'Edit Supplier' : 'Register New Supplier'}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Supplier Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUP-001" required disabled={!!editingSupplier} />
          <TextField label="Company Name" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Metro Wholesalers Ltd" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Contact Person" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Rajesh Kumar" required />
          <TextField label="Mobile Number" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+919876543210" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sales@metro.com" required />
          <TextField label="GSTIN Number" value={gst} onChange={(e) => setGst(e.target.value.toUpperCase())} placeholder="GST12345678" />
        </div>
        <TextField label="Full Physical Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12, Industrial Area, Phase-I, Bangalore" required />
        <div className="grid grid-cols-3 gap-4">
          <SelectField
            label="Payment Terms"
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            options={[
              { label: 'Net 30 Days', value: 'Net 30' },
              { label: 'Net 15 Days', value: 'Net 15' },
              { label: 'Cash On Delivery', value: 'COD' },
              { label: 'Advance Payment', value: 'Advance' },
            ]}
            required
          />
          <TextField label="Credit Limit" type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} required />
          <TextField label="PO Number Prefix" value={poPrefix} onChange={(e) => setPoPrefix(e.target.value.toUpperCase())} placeholder="MET-PO" />
        </div>

        <blockquote className="rounded-xl border-l-4 border-amber-500 bg-amber-50 p-3 text-xs text-amber-700">
          <strong>Rule:</strong> If "PO Number Prefix" is left empty, the supplier is automatically set to <strong>Inactive</strong>.
        </blockquote>

        {submitError ? <ErrorState error={submitError} /> : null}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{editingSupplier ? 'Save Changes' : 'Register Supplier'}</Button>
        </div>
      </form>
    </Modal>
  );
}
