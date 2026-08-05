import React, { useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { TextField } from '../components/ui/TextField';
import { SelectField } from '../components/ui/SelectField';
import { PoDocumentModal } from '../components/PoDocumentModal';
import { SupplierForm } from '../components/SupplierForm';
import { useSelector } from 'react-redux';

const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-800',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  SENT: 'bg-indigo-100 text-indigo-800',
  SUPPLIER_CONFIRMED: 'bg-purple-100 text-purple-800',
  GRN_CREATED: 'bg-teal-100 text-teal-800',
  RECEIVING: 'bg-orange-100 text-orange-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-slate-200 text-slate-600',
  CANCELLED: 'bg-rose-100 text-rose-800',
  REJECTED: 'bg-rose-100 text-rose-800',
  EXPIRED: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  DRAFT: 'Draft',
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

export function PurchaseOrdersPage() {
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentUser = useSelector((state) => state.auth.user);
  const userRole = currentUser?.role || 'STORE_MANAGER';

  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [purpose, setPurpose] = useState('REPLENISHMENT');
  const [priority, setPriority] = useState('MEDIUM');
  const [poItems, setPoItems] = useState([{ ingredientId: '', quantity: 1, unitPrice: 0 }]);
  const [submitError, setSubmitError] = useState('');
  const [docPoId, setDocPoId] = useState(null);
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      apiFetch('warehouse/purchase-orders/check-expiry', { method: 'POST' }).catch(() => {});
      const [poRes, supRes, ingRes] = await Promise.all([
        apiFetch('warehouse/purchase-orders'),
        apiFetch('suppliers'),
        apiFetch('master/ingredients'),
      ]);
      setPos(Array.isArray(poRes) ? poRes : poRes.items || []);
      const activeSups = (Array.isArray(supRes) ? supRes : supRes.items || []).filter((s) => s.isActive);
      setSuppliers(activeSups);
      setIngredients(Array.isArray(ingRes) ? ingRes : ingRes.items || []);

      if (activeSups.length > 0) setSupplierId(String(activeSups[0].id));
      if (ingRes.length > 0) {
        setPoItems([{ ingredientId: String(ingRes[0].id), quantity: 10, unitPrice: 50 }]);
      }
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load procurement data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSupplierFormSuccess = (saved) => {
    setSupplierFormOpen(false);
    fetchData();
    setSupplierId(String(saved.id));
  };

  const handleSupplierChange = async (sId) => {
    setSupplierId(sId);
    try {
      const prices = await apiFetch(`suppliers/${sId}/pricing`);
      const priceArr = Array.isArray(prices) ? prices : [];
      if (priceArr.length > 0) {
        setPoItems(priceArr.map((p) => ({
          ingredientId: String(p.ingredientId),
          quantity: 10,
          unitPrice: p.price,
        })));
      }
    } catch (e) { console.error(e); }
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...poItems];
    updated[idx][field] = val;
    setPoItems(updated);
  };

  const addItemRow = () => {
    const defaultIngId = ingredients[0]?.id || '';
    setPoItems([...poItems, { ingredientId: String(defaultIngId), quantity: 10, unitPrice: 50 }]);
  };

  const removeItemRow = (idx) => {
    if (poItems.length === 1) return;
    setPoItems(poItems.filter((_, i) => i !== idx));
  };

  const handleCreatePo = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      await apiFetch('warehouse/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: Number(supplierId),
          notes: notes || null,
          validUntil: validUntil || null,
          purpose,
          priority,
          items: poItems.map((item) => ({
            ingredientId: Number(item.ingredientId),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        }),
      });
      setModalOpen(false);
      setNotes('');
      setValidUntil('');
      setPurpose('REPLENISHMENT');
      setPriority('MEDIUM');
      fetchData();
    } catch (err) {
      setSubmitError(err.message || 'Failed to create Purchase Order.');
    }
  };

  const action = async (id, endpoint, method = 'POST', confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return;
    try {
      await apiFetch(`warehouse/purchase-orders/${id}/${endpoint}`, { method });
      fetchData();
    } catch (err) {
      alert(err.message || 'Action failed.');
    }
  };

  if (loading && pos.length === 0) return <Loader label="Loading procurement registry..." />;
  if (error) return <ErrorState error={error} />;

  const isManager = ['SUPER_ADMIN', 'INVENTORY_MANAGER', 'PROCUREMENT_MANAGER'].includes(userRole);

  const columns = [
    { header: 'PO Number', key: 'poNumber', render: (row) => <span className="font-medium text-slate-900">{row.poNumber}</span> },
    { header: 'Supplier', key: 'supplier', render: (row) => row.supplier?.companyName || '—' },
    { header: 'Purpose', key: 'purpose', render: (row) => row.purpose || '—' },
    { header: 'Priority', key: 'priority', render: (row) => (
      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${
        row.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
        row.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
        row.priority === 'LOW' ? 'bg-slate-100 text-slate-600' :
        'bg-blue-100 text-blue-800'
      }`}>{row.priority || 'MEDIUM'}</span>
    )},
    { header: 'Total', key: 'totalAmount', render: (row) => `Rs. ${Number(row.totalAmount || 0).toFixed(2)}` },
    { header: 'Valid Until', key: 'validUntil', render: (row) => row.validUntil ? new Date(row.validUntil).toLocaleDateString() : '—' },
    { header: 'Status', key: 'status', render: (row) => (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[row.status] || ''}`}>
        {STATUS_LABELS[row.status] || row.status}
      </span>
    )},
    { header: 'Creator', key: 'createdBy', render: (row) => row.createdBy?.name || '—' },
    { header: 'Actions', key: 'actions', render: (row) => (
      <div className="flex flex-wrap gap-1.5">
        <Button variant="ghost" className="py-1 px-2.5 text-xs" onClick={() => setDocPoId(row.id)}>
          View PO
        </Button>
        {/* DRAFT: Submit, Edit, Cancel */}
        {row.status === 'DRAFT' && (
          <>
            <Button variant="secondary" className="py-1 px-2.5 text-xs" onClick={() => action(row.id, 'submit', 'POST', 'Submit this PO for approval?')}>
              Submit
            </Button>
            <Button variant="danger" className="py-1 px-2.5 text-xs" onClick={() => action(row.id, 'cancel', 'POST', 'Cancel this DRAFT PO?')}>
              Cancel
            </Button>
          </>
        )}
        {/* PENDING_APPROVAL: Approve, Reject (managers only) */}
        {row.status === 'PENDING_APPROVAL' && isManager && (
          <>
            <Button className="py-1 px-2.5 text-xs" onClick={() => action(row.id, 'approve', 'POST', 'Approve this PO?')}>
              Approve
            </Button>
            <Button variant="danger" className="py-1 px-2.5 text-xs" onClick={() => action(row.id, 'reject', 'POST', 'Reject this PO?')}>
              Reject
            </Button>
          </>
        )}
        {/* APPROVED: Send to Supplier */}
        {row.status === 'APPROVED' && (
          <Button className="py-1 px-2.5 text-xs" onClick={() => action(row.id, 'send', 'POST', 'Send this PO to the supplier?')}>
            Send to Supplier
          </Button>
        )}
        {/* SENT: Supplier Confirm, Supplier Decline */}
        {row.status === 'SENT' && (
          <>
            <Button className="py-1 px-2.5 text-xs" onClick={() => action(row.id, 'supplier-confirm', 'POST', 'Supplier confirms this PO?')}>
              Supplier Confirm
            </Button>
            <Button variant="danger" className="py-1 px-2.5 text-xs" onClick={() => action(row.id, 'supplier-decline', 'POST', 'Supplier declines this PO?')}>
              Supplier Decline
            </Button>
          </>
        )}
        {/* SUPPLIER_CONFIRMED: Create GRN */}
        {row.status === 'SUPPLIER_CONFIRMED' && (
          <Button className="py-1 px-2.5 text-xs" onClick={() => action(row.id, 'create-grn', 'POST', 'Create GRN for this PO?')}>
            Create GRN
          </Button>
        )}
        {/* RECEIVING: Receive Goods */}
        {row.status === 'RECEIVING' && (
          <Button className="py-1 px-2.5 text-xs" onClick={() => action(row.id, 'receive', 'POST', 'Receive additional goods?')}>
            Receive Goods
          </Button>
        )}
        {/* RECEIVED: Close PO */}
        {row.status === 'RECEIVED' && (
          <Button className="py-1 px-2.5 text-xs" onClick={() => action(row.id, 'close', 'POST', 'Close this PO? All items have been received.')}>
            Close PO
          </Button>
        )}
        {/* CLOSED, CANCELLED, REJECTED: View Only */}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders (PO)</h1>
          <p className="text-sm text-slate-500">Create, review, and approve purchase agreements before receiving warehouse stock.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>Create Purchase Order</Button>
      </div>

      <Card title="Purchase Orders List" eyebrow="Procurement Cycle">
        <Table columns={columns} data={pos} emptyMessage="No Purchase Orders found. Create one to begin procurement." />
      </Card>

      <Modal open={modalOpen} title="Draft New Purchase Order" onClose={() => setModalOpen(false)} maxWidth="max-w-4xl">
        <form onSubmit={handleCreatePo} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <SelectField
                  label="Select Active Supplier"
                  value={supplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  options={suppliers.map((s) => ({ label: `${s.companyName} (${s.supplierCode})`, value: String(s.id) }))}
                  required
                />
              </div>
              <Button variant="secondary" onClick={() => setSupplierFormOpen(true)} className="mb-0.5 whitespace-nowrap flex-shrink-0" type="button">
                + Add New Supplier
              </Button>
            </div>
            <TextField
              label="Delivery & Purchase Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Standard delivery within 3 days"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField
                label="Valid Until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
              <SelectField
                label="Purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                options={[
                  { label: 'Replenishment', value: 'REPLENISHMENT' },
                  { label: 'New Product', value: 'NEW_PRODUCT' },
                  { label: 'Emergency', value: 'EMERGENCY' },
                  { label: 'Bulk Order', value: 'BULK_ORDER' },
                  { label: 'Seasonal', value: 'SEASONAL' },
                  { label: 'Other', value: 'OTHER' },
                ]}
              />
              <SelectField
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={[
                  { label: 'Low', value: 'LOW' },
                  { label: 'Medium', value: 'MEDIUM' },
                  { label: 'High', value: 'HIGH' },
                  { label: 'Urgent', value: 'URGENT' },
                ]}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-slate-900">Order items list</h4>
              <Button variant="secondary" className="py-1 px-3 text-xs" onClick={addItemRow} type="button">
                + Add Item Line
              </Button>
            </div>

            {poItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1.5fr_1fr_1fr_auto] gap-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                <SelectField
                  label="Select Ingredient"
                  value={item.ingredientId}
                  onChange={(e) => handleItemChange(idx, 'ingredientId', e.target.value)}
                  options={ingredients.map((ing) => ({ label: `${ing.name} (${ing.sku})`, value: String(ing.id) }))}
                  required
                />
                <TextField
                  label="Qty Required"
                  type="number"
                  step="any"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                  required
                />
                <TextField
                  label="Unit Price"
                  type="number"
                  step="any"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                  required
                />
                <Button variant="danger" className="py-2.5 px-3 mb-0.5" onClick={() => removeItemRow(idx)} disabled={poItems.length === 1} type="button">
                  X
                </Button>
              </div>
            ))}
          </div>

          {submitError ? <ErrorState error={submitError} /> : null}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)} type="button">Cancel</Button>
            <Button type="submit">Draft Purchase Order</Button>
          </div>
        </form>
      </Modal>

      <PoDocumentModal
        open={docPoId !== null}
        onClose={() => setDocPoId(null)}
        poId={docPoId}
      />

      <SupplierForm
        open={supplierFormOpen}
        onSuccess={handleSupplierFormSuccess}
        onClose={() => setSupplierFormOpen(false)}
      />
    </div>
  );
}
