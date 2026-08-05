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
import { GrnInvoiceModal } from '../components/GrnInvoiceModal';

export function GrnPage() {
  const [grns, setGrns] = useState([]);
  const [pos, setPos] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [challan, setChallan] = useState('');
  const [notes, setNotes] = useState('');
  const [grnItems, setGrnItems] = useState([]);
  const [submitError, setSubmitError] = useState('');
  const [invoiceGrnId, setInvoiceGrnId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [grnRes, poRes, whRes, ingRes] = await Promise.all([
        apiFetch('warehouse/grns'),
        apiFetch('warehouse/purchase-orders'),
        apiFetch('warehouse'),
        apiFetch('master/ingredients'),
      ]);
      setGrns(grnRes);
      const approvedPos = poRes.filter((p) => p.status === 'APPROVED');
      setPos(approvedPos);
      setWarehouses(whRes);
      setIngredients(ingRes);
      if (approvedPos.length > 0) setSelectedPoId(approvedPos[0].id);
      if (whRes.length > 0) setSelectedWarehouseId(whRes[0].id);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load GRN data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePoChange = (poId) => {
    setSelectedPoId(poId);
    const selectedPo = pos.find((p) => p.id === Number(poId));
    if (selectedPo?.items) {
      setGrnItems(
        selectedPo.items.map((item) => ({
          ingredientId: item.ingredientId,
          quantityReceived: item.quantity,
          quantityRejected: 0,
        }))
      );
    }
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...grnItems];
    updated[idx][field] = val;
    setGrnItems(updated);
  };

  const handleCreateGrn = async (e) => {
    e.preventDefault();
    setSubmitError('');
    try {
      const itemsPayload = grnItems.map((item) => ({
        ingredientId: Number(item.ingredientId),
        quantityReceived: Number(item.quantityReceived),
        quantityRejected: Number(item.quantityRejected || 0),
      }));

      await apiFetch('warehouse/grns', {
        method: 'POST',
        body: JSON.stringify({
          purchaseOrderId: Number(selectedPoId),
          warehouseId: Number(selectedWarehouseId),
          deliveryChallan: challan || null,
          notes: notes || null,
          items: itemsPayload,
        }),
      });

      setModalOpen(false);
      setChallan('');
      setNotes('');
      setGrnItems([]);
      fetchData();
    } catch (err) {
      setSubmitError(err.message || 'Failed to create GRN.');
    }
  };

  if (loading && grns.length === 0) return <Loader label="Loading Goods Receipt Notes..." />;
  if (error) return <ErrorState error={error} />;

  const columns = [
    { header: 'GRN Number', key: 'grnNumber' },
    { header: 'PO Number', key: 'purchaseOrder', render: (row) => row.purchaseOrder?.poNumber },
    { header: 'Warehouse', key: 'warehouse', render: (row) => row.purchaseOrder?.supplier?.companyName || 'N/A' },
    { header: 'Delivery Challan', key: 'deliveryChallan', render: (row) => row.deliveryChallan || '—' },
    { header: 'Received Date', key: 'receivedDate', render: (row) => new Date(row.receivedDate).toLocaleDateString() },
    { header: 'Received By', key: 'receivedBy', render: (row) => row.receivedBy?.name },
    { header: 'Notes', key: 'notes', render: (row) => row.notes || '—' },
    {
      header: 'Invoice',
      key: 'invoice',
      render: (row) =>
        row.status === 'COMPLETED' ? (
          <Button variant="ghost" size="sm" onClick={() => setInvoiceGrnId(row.id)}>
            View Invoice
          </Button>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Goods Receipt Notes (GRN)</h1>
          <p className="text-sm text-slate-500">Receive goods against approved Purchase Orders to increase warehouse stock.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} disabled={pos.length === 0}>
          Create GRN
        </Button>
      </div>

      <Card title="GRN History" eyebrow="Warehouse Receiving">
        <Table columns={columns} data={grns} emptyMessage="No GRN records found. Receive goods from an approved PO." />
      </Card>

      <Modal open={modalOpen} title="Create Goods Receipt Note" onClose={() => setModalOpen(false)} maxWidth="max-w-4xl">
        <form onSubmit={handleCreateGrn} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="Approved Purchase Order"
              value={selectedPoId}
              onChange={(e) => handlePoChange(e.target.value)}
              options={pos.map((p) => ({ label: `${p.poNumber} — Rs. ${p.totalAmount.toFixed(2)}`, value: p.id }))}
              required
            />
            <SelectField
              label="Receive Into Warehouse"
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextField label="Delivery Challan Number" value={challan} onChange={(e) => setChallan(e.target.value)} placeholder="CH-99212" />
            <TextField label="Receiving Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. All items received in good condition" />
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900">Received Items</h4>
            {grnItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">Select an approved PO to auto-populate items.</p>
            ) : (
              grnItems.map((item, idx) => {
                const ing = ingredients.find((i) => i.id === item.ingredientId);
                return (
                  <div key={idx} className="grid grid-cols-[2fr_1fr_1fr] gap-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Ingredient</label>
                      <p className="text-sm text-slate-800 font-medium">{ing?.name || `ID: ${item.ingredientId}`}</p>
                    </div>
                    <TextField
                      label="Qty Received"
                      type="number"
                      step="any"
                      value={item.quantityReceived}
                      onChange={(e) => handleItemChange(idx, 'quantityReceived', e.target.value)}
                      required
                    />
                    <TextField
                      label="Qty Rejected"
                      type="number"
                      step="any"
                      value={item.quantityRejected}
                      onChange={(e) => handleItemChange(idx, 'quantityRejected', e.target.value)}
                    />
                  </div>
                );
              })
            )}
          </div>

          {submitError ? <ErrorState error={submitError} /> : null}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={grnItems.length === 0}>Confirm Receipt</Button>
          </div>
        </form>
      </Modal>

      <GrnInvoiceModal
        open={invoiceGrnId !== null}
        onClose={() => setInvoiceGrnId(null)}
        grnId={invoiceGrnId}
      />
    </div>
  );
}
