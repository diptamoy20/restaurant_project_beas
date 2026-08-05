import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../../utils/api';
import { Card } from '../../components/ui/Card';
import { Loader } from '../../components/ui/Loader';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { TextField } from '../../components/ui/TextField';
import { SelectField } from '../../components/ui/SelectField';
import { GrnInvoiceModal } from '../../components/GrnInvoiceModal';

const GRN_STATUS_STYLES = {
  PENDING_RECEIPT: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-rose-100 text-rose-800',
};

const GRN_STATUS_LABELS = {
  PENDING_RECEIPT: 'Pending Receipt',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const SKELETON_CREABLE = ['SUPPLIER_CONFIRMED', 'RECEIVING'];

export function GrnPage() {
  const [grns, setGrns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [skeletonPos, setSkeletonPos] = useState([]);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receivingGrn, setReceivingGrn] = useState(null);
  const [receiveItems, setReceiveItems] = useState([]);
  const [receiveError, setReceiveError] = useState('');
  const [approving, setApproving] = useState(false);
  const [invoiceGrnId, setInvoiceGrnId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [grnRes, poRes] = await Promise.all([
        apiFetch('warehouse/grns'),
        apiFetch('warehouse/purchase-orders'),
      ]);
      setGrns(Array.isArray(grnRes) ? grnRes : []);
      const allPos = Array.isArray(poRes) ? poRes : poRes.items || [];
      setSkeletonPos(allPos.filter((p) => SKELETON_CREABLE.includes(p.status)));
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load GRN data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateModal = () => {
    setSelectedPoId(skeletonPos.length > 0 ? String(skeletonPos[0].id) : '');
    setCreateError('');
    setCreateModalOpen(true);
  };

  const handleCreateSkeleton = async () => {
    if (!selectedPoId) return;
    setCreateError('');
    setCreating(true);
    try {
      await apiFetch(`warehouse/purchase-orders/${selectedPoId}/create-grn`, {
        method: 'POST',
      });
      setCreateModalOpen(false);
      fetchData();
    } catch (err) {
      setCreateError(err.message || 'Failed to create GRN skeleton.');
    } finally {
      setCreating(false);
    }
  };

  const openReceiveModal = async (grn) => {
    try {
      const fullGrn = await apiFetch(`warehouse/grns/${grn.id}`);
      setReceivingGrn(fullGrn);
      setReceiveItems(
        (fullGrn.items || []).map((item) => ({
          id: item.id,
          ingredientId: item.ingredientId,
          ingredientName: item.ingredient?.name || `ID: ${item.ingredientId}`,
          ingredientSku: item.ingredient?.sku || '',
          quantityReceived: 0,
          quantityRejected: 0,
          damagedQuantity: 0,
          rejectionReason: '',
          damageReason: '',
          remarks: '',
        }))
      );
      setReceiveError('');
      setReceiveModalOpen(true);
    } catch (err) {
      alert(err.message || 'Failed to load GRN details.');
    }
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...receiveItems];
    updated[idx] = { ...updated[idx], [field]: Number(val) || 0 };
    setReceiveItems(updated);
  };

  const handleApproveGrn = async (e) => {
    e.preventDefault();
    if (!receivingGrn) return;
    setReceiveError('');
    setApproving(true);
    try {
      const itemsPayload = receiveItems.map((item) => ({
        ingredientId: item.ingredientId,
        quantityReceived: Number(item.quantityReceived),
        quantityRejected: Number(item.quantityRejected || 0),
        damagedQuantity: Number(item.damagedQuantity || 0),
        rejectionReason: item.rejectionReason || null,
        damageReason: item.damageReason || null,
        remarks: item.remarks || null,
      }));

      if (itemsPayload.every((i) => i.quantityReceived === 0)) {
        setReceiveError('At least one item must have a received quantity greater than 0.');
        setApproving(false);
        return;
      }

      await apiFetch(`warehouse/grns/${receivingGrn.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ items: itemsPayload }),
      });

      setReceiveModalOpen(false);
      setReceivingGrn(null);
      fetchData();
    } catch (err) {
      setReceiveError(err.message || 'Failed to approve GRN.');
    } finally {
      setApproving(false);
    }
  };

  const totalAccepted = receiveItems.reduce(
    (sum, item) => sum + (item.quantityReceived - (item.quantityRejected || 0) - (item.damagedQuantity || 0)),
    0
  );

  if (loading && grns.length === 0) return <Loader label="Loading Goods Receipt Notes..." />;
  if (error) return <ErrorState error={error} />;

  const grnColumns = [
    {
      header: 'GRN #',
      key: 'grnNumber',
      render: (row) => <span className="font-medium text-slate-900">{row.grnNumber}</span>,
    },
    {
      header: 'PO #',
      key: 'poNumber',
      render: (row) => row.purchaseOrder?.poNumber || '—',
    },
    {
      header: 'Supplier',
      key: 'supplier',
      render: (row) => row.purchaseOrder?.supplier?.companyName || '—',
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${GRN_STATUS_STYLES[row.status] || 'bg-slate-100 text-slate-700'}`}>
          {GRN_STATUS_LABELS[row.status] || row.status}
        </span>
      ),
    },
    {
      header: 'Items',
      key: 'items',
      render: (row) => (
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
          {row.items?.length || 0}
        </span>
      ),
    },
    {
      header: 'Invoice',
      key: 'invoiceNumber',
      render: (row) => row.status === 'COMPLETED' ? (
        <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => setInvoiceGrnId(row.id)}>
          View Invoice
        </Button>
      ) : '—',
    },
    {
      header: 'Received By',
      key: 'receivedBy',
      render: (row) => row.receivedBy?.name || '—',
    },
    {
      header: 'Date',
      key: 'receivedDate',
      render: (row) => <span className="text-xs text-slate-500">{new Date(row.receivedDate).toLocaleDateString()}</span>,
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex gap-1">
          {row.status === 'PENDING_RECEIPT' && (
            <Button className="px-2.5 py-1 text-xs" onClick={() => openReceiveModal(row)}>
              Receive
            </Button>
          )}
        </div>
      ),
    },
  ];

  const selectedPoItems = skeletonPos.find((p) => String(p.id) === selectedPoId)?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Goods Receipt Notes</h1>
          <p className="text-sm text-slate-500">
            Create GRN skeleton → Receive goods → Approve GRN → Inventory updates.
          </p>
        </div>
        <Button onClick={openCreateModal} disabled={skeletonPos.length === 0}>
          Create GRN
        </Button>
      </div>

      <Card>
        <Table columns={grnColumns} data={grns} emptyMessage="No GRN records found." />
      </Card>

      {/* ── Create GRN Skeleton Modal ── */}
      <Modal open={createModalOpen} title="Create GRN Skeleton" onClose={() => setCreateModalOpen(false)} maxWidth="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This creates a GRN with all PO items at <strong>qty=0</strong>. You will enter actual quantities in the Receive step.
          </p>
          <SelectField
            label="Purchase Order"
            value={selectedPoId}
            onChange={(e) => setSelectedPoId(e.target.value)}
            options={skeletonPos.map((p) => ({
              label: `${p.poNumber} — ${p.supplier?.companyName || '?'} — ${p.status}`,
              value: String(p.id),
            }))}
            required
          />

          {selectedPoId && selectedPoItems.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                    <th className="px-3 py-2">Ingredient</th>
                    <th className="px-3 py-2 text-right">Ordered Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPoItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2">
                        <span className="font-medium text-slate-800">{item.ingredient?.name || `ID: ${item.ingredientId}`}</span>
                        <span className="ml-1 text-xs text-slate-400">{item.ingredient?.sku || ''}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {createError ? <ErrorState error={createError} /> : null}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)} disabled={creating}>Cancel</Button>
            <Button onClick={handleCreateSkeleton} disabled={creating || !selectedPoId}>
              {creating ? 'Creating...' : 'Create Skeleton'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Receive / Approve GRN Modal ── */}
      <Modal open={receiveModalOpen} title={`Receive Goods — ${receivingGrn?.grnNumber || ''}`} onClose={() => setReceiveModalOpen(false)} maxWidth="max-w-4xl">
        <form onSubmit={handleApproveGrn} className="space-y-6">
          <p className="text-sm text-slate-600">
            Enter the actual quantities received. <strong>Accepted = Received − Rejected − Damaged</strong>. Inventory updates on approval.
          </p>

          <div className="space-y-3">
            {receiveItems.length === 0 ? (
              <p className="py-2 text-xs text-slate-500">No items found in this GRN.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500">
                          <th className="pb-2 pr-3 min-w-[120px]">Ingredient</th>
                          <th className="pb-2 pr-2 text-right">Received</th>
                          <th className="pb-2 pr-2 text-right">Rejected</th>
                          <th className="pb-2 pr-2 text-xs font-normal text-slate-400">Reason</th>
                          <th className="pb-2 pr-2 text-right">Damaged</th>
                          <th className="pb-2 pr-2 text-xs font-normal text-slate-400">Reason</th>
                          <th className="pb-2 pr-2 text-right font-bold">Accepted</th>
                          <th className="pb-2">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiveItems.map((item, idx) => {
                          const accepted = item.quantityReceived - (item.quantityRejected || 0) - (item.damagedQuantity || 0);
                          return (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="py-2 pr-3">
                                <span className="font-medium text-slate-800">{item.ingredientName}</span>
                                <span className="ml-1 text-xs text-slate-400">{item.ingredientSku}</span>
                              </td>
                              <td className="py-2 pr-2 text-right">
                                <input
                                  type="number" step="any" min="0"
                                  value={item.quantityReceived}
                                  onChange={(e) => handleItemChange(idx, 'quantityReceived', e.target.value)}
                                  className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm"
                                />
                              </td>
                              <td className="py-2 pr-2 text-right">
                                <input
                                  type="number" step="any" min="0"
                                  value={item.quantityRejected}
                                  onChange={(e) => handleItemChange(idx, 'quantityRejected', e.target.value)}
                                  className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm"
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  type="text"
                                  value={item.rejectionReason}
                                  onChange={(e) => {
                                    const updated = [...receiveItems];
                                    updated[idx] = { ...updated[idx], rejectionReason: e.target.value };
                                    setReceiveItems(updated);
                                  }}
                                  placeholder="Why?"
                                  className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                />
                              </td>
                              <td className="py-2 pr-2 text-right">
                                <input
                                  type="number" step="any" min="0"
                                  value={item.damagedQuantity}
                                  onChange={(e) => handleItemChange(idx, 'damagedQuantity', e.target.value)}
                                  className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm"
                                />
                              </td>
                              <td className="py-2 pr-2">
                                <input
                                  type="text"
                                  value={item.damageReason}
                                  onChange={(e) => {
                                    const updated = [...receiveItems];
                                    updated[idx] = { ...updated[idx], damageReason: e.target.value };
                                    setReceiveItems(updated);
                                  }}
                                  placeholder="Why?"
                                  className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                />
                              </td>
                              <td className="py-2 pr-2 text-right font-semibold text-slate-900">{accepted}</td>
                              <td className="py-2">
                                <input
                                  type="text"
                                  value={item.remarks}
                                  onChange={(e) => {
                                    const updated = [...receiveItems];
                                    updated[idx] = { ...updated[idx], remarks: e.target.value };
                                    setReceiveItems(updated);
                                  }}
                                  placeholder="e.g. Packaging damaged"
                                  className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="font-semibold text-slate-900">
                          <td className="pt-2 pr-3" colSpan={7}>Total Accepted Qty</td>
                          <td className="pt-2 text-right">{totalAccepted}</td>
                        </tr>
                      </tfoot>
                    </table>
                </div>
            )}
          </div>

          {receiveError ? <ErrorState error={receiveError} /> : null}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => setReceiveModalOpen(false)} disabled={approving}>Cancel</Button>
            <Button type="submit" disabled={approving || receiveItems.length === 0}>
              {approving ? 'Approving...' : 'Approve GRN'}
            </Button>
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
