import { useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Loader } from "../components/ui/Loader";
import { Modal } from "../components/ui/Modal";
import { SelectField } from "../components/ui/SelectField";
import { Table } from "../components/ui/Table";
import { TextField } from "../components/ui/TextField";
import { canAccess } from "../routes/accessControl";
import { useGetAllRestaurantsQuery } from "../services/restaurantApi";
import {
  downloadTableQr,
  useCloseTableSessionMutation,
  useCreateTableMutation,
  useDeleteTableMutation,
  useGenerateTableQrMutation,
  useListTableSessionsQuery,
  useListTablesQuery,
  useRegenerateTableQrMutation,
  useUpdateTableMutation,
} from "../services/tableApi";
import { formatDateTime } from "../utils/date";
import { TABLES_PAGE_MAX_LIMIT } from "../constants/pagination";

const emptyForm = {
  restaurantId: "",
  tableNumber: "",
  capacity: "4",
  isActive: true,
};

export function TablesPage() {
  const permissions = useSelector((state) => state.auth.permissions);
  const [filters, setFilters] = useState({ restaurantId: "" });
  const [modalOpen, setModalOpen] = useState(false);
  const [viewTable, setViewTable] = useState(null);
  const [qrPreviewTable, setQrPreviewTable] = useState(null);
  const [editingTable, setEditingTable] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const query = useMemo(
    () => ({
      restaurantId: filters.restaurantId || undefined,
      limit: TABLES_PAGE_MAX_LIMIT,
    }),
    [filters],
  );

  const { data, isLoading, isFetching, error } = useListTablesQuery(query, {
    pollingInterval: 10000,
  });
  const { data: restaurants = [] } = useGetAllRestaurantsQuery();
  const { data: sessionsData } = useListTableSessionsQuery(
    {
      status: "ACTIVE",
      restaurantId: filters.restaurantId || undefined,
      limit: TABLES_PAGE_MAX_LIMIT,
    },
    { pollingInterval: 10000 },
  );
  const [createTable, createState] = useCreateTableMutation();
  const [updateTable, updateState] = useUpdateTableMutation();
  const [deleteTable, deleteState] = useDeleteTableMutation();
  const [generateQr, generateState] = useGenerateTableQrMutation();
  const [regenerateQr, regenerateState] = useRegenerateTableQrMutation();
  const [closeSession, closeSessionState] = useCloseTableSessionMutation();

  const tables = data?.items ?? [];
  const activeSessions = sessionsData?.items ?? [];
  const canCreate = canAccess(permissions, "tables", "create");
  const canEdit = canAccess(permissions, "tables", "edit");
  const canDelete = canAccess(permissions, "tables", "delete");
  const canGenerateQr = canAccess(permissions, "tables", "generate_qr");

  const restaurantOptions = useMemo(
    () => [
      { value: "", label: "All restaurants" },
      ...restaurants.map((restaurant) => ({
        value: String(restaurant.id),
        label: restaurant.name,
      })),
    ],
    [restaurants],
  );

  const openCreateModal = () => {
    setEditingTable(null);
    setForm({
      ...emptyForm,
      restaurantId: filters.restaurantId || "",
    });
    setFormErrors({});
    setActionError("");
    setSuccessMessage("");
    setModalOpen(true);
  };

  const openEditModal = (table) => {
    setEditingTable(table);
    setForm({
      restaurantId: String(table.restaurantId),
      tableNumber: table.tableNumber,
      capacity: String(table.capacity),
      isActive: table.isActive,
    });
    setFormErrors({});
    setActionError("");
    setSuccessMessage("");
    setModalOpen(true);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!editingTable && !form.restaurantId) {
      nextErrors.restaurantId = "Restaurant is required";
    }

    if (!form.tableNumber.trim()) {
      nextErrors.tableNumber = "Table number is required";
    }

    if (!form.capacity || Number(form.capacity) < 1) {
      nextErrors.capacity = "Capacity must be at least 1";
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (editingTable) {
        await updateTable({
          id: editingTable.id,
          tableNumber: form.tableNumber.trim(),
          capacity: Number(form.capacity),
          isActive: form.isActive,
        }).unwrap();
        setSuccessMessage("Table updated successfully.");
      } else {
        await createTable({
          restaurantId: Number(form.restaurantId),
          tableNumber: form.tableNumber.trim(),
          capacity: Number(form.capacity),
        }).unwrap();
        setSuccessMessage("Table created successfully.");
      }

      setActionError("");
      setModalOpen(false);
    } catch (submitError) {
      setActionError(submitError?.data?.message || submitError?.message || "Save failed");
    }
  };

  const handleDelete = async (table) => {
    if (!window.confirm(`Delete ${table.tableNumber} at ${table.restaurantName}?`)) {
      return;
    }

    try {
      await deleteTable(table.id).unwrap();
      setSuccessMessage(`${table.tableNumber} deleted successfully.`);
      setActionError("");
    } catch (deleteError) {
      setActionError(deleteError?.data?.message || deleteError?.message || "Delete failed");
    }
  };

  const handleGenerateQr = async (table, regenerate = false) => {
    try {
      const mutation = regenerate ? regenerateQr : generateQr;
      const updated = await mutation(table.id).unwrap();
      setQrPreviewTable(updated);
      setSuccessMessage(
        regenerate ? "QR code regenerated successfully." : updated.hasQr ? "QR code ready." : "QR code generated successfully.",
      );
      setActionError("");
    } catch (qrError) {
      setActionError(qrError?.data?.message || qrError?.message || "QR generation failed");
    }
  };

  const handleDownloadQr = async (tableId, format) => {
    try {
      await downloadTableQr(tableId, format);
      setSuccessMessage(`QR code downloaded as ${format.toUpperCase()}.`);
      setActionError("");
    } catch (downloadError) {
      setActionError(downloadError.message || "QR download failed");
    }
  };

  const handleCloseSession = async (table) => {
    const session = activeSessions.find((item) => item.tableId === table.id);
    if (!session) {
      return;
    }

    if (!window.confirm(`Close active session for ${table.tableNumber}?`)) {
      return;
    }

    try {
      await closeSession(session.id).unwrap();
      setSuccessMessage(`Session closed for ${table.tableNumber}.`);
      setActionError("");
    } catch (closeError) {
      setActionError(closeError?.data?.message || closeError?.message || "Failed to close session");
    }
  };

  const mutationLoading =
    createState.isLoading ||
    updateState.isLoading ||
    deleteState.isLoading ||
    generateState.isLoading ||
    regenerateState.isLoading ||
    closeSessionState.isLoading;

  return (
    <div className="space-y-6">
      <Card title="Table Management">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-64 flex-1">
            <SelectField
              label="Restaurant"
              options={restaurantOptions}
              value={filters.restaurantId}
              onChange={(event) =>
                setFilters((current) => ({ ...current, restaurantId: event.target.value }))
              }
            />
          </div>
          {canCreate ? (
            <Button onClick={openCreateModal}>Create Table</Button>
          ) : null}
        </div>

        {successMessage ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}
        {actionError ? <ErrorState message={actionError} /> : null}
        {isLoading ? <Loader label="Loading tables..." /> : null}
        {error ? (
          <ErrorState message={error?.data?.message || error?.error || "Tables could not be loaded."} />
        ) : null}
        {isFetching && !isLoading ? <Loader label="Refreshing table data..." /> : null}

        <Table
          columns={[
            { key: "restaurantName", header: "Restaurant", render: (row) => row.restaurantName },
            { key: "tableNumber", header: "Table Number", render: (row) => row.tableNumber },
            { key: "capacity", header: "Capacity", render: (row) => row.capacity },
            {
              key: "isActive",
              header: "Status",
              render: (row) => (row.isActive === false ? "Inactive" : "Active"),
            },
            {
              key: "qrStatus",
              header: "QR Status",
              render: (row) => (row.hasQr ? "Generated" : "Not generated"),
            },
            {
              key: "sessionStatus",
              header: "Active Session",
              render: (row) => (row.hasActiveSession ? "Active" : "None"),
            },
            {
              key: "createdAt",
              header: "Created",
              render: (row) => formatDateTime(row.createdAt),
            },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setViewTable(row)}>
                    View
                  </Button>
                  {canEdit ? (
                    <Button variant="secondary" onClick={() => openEditModal(row)}>
                      Edit
                    </Button>
                  ) : null}
                  {canGenerateQr ? (
                    <>
                      <Button
                        disabled={mutationLoading}
                        onClick={() => handleGenerateQr(row, false)}
                      >
                        {row.hasQr ? "View QR" : "Generate QR"}
                      </Button>
                      {row.hasQr ? (
                        <>
                          <Button
                            variant="secondary"
                            disabled={mutationLoading}
                            onClick={() => handleDownloadQr(row.id, "png")}
                          >
                            PNG
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={mutationLoading}
                            onClick={() => handleDownloadQr(row.id, "svg")}
                          >
                            SVG
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={mutationLoading}
                            onClick={() => handleDownloadQr(row.id, "pdf")}
                          >
                            PDF
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={mutationLoading}
                            onClick={() => handleGenerateQr(row, true)}
                          >
                            Regenerate
                          </Button>
                        </>
                      ) : null}
                    </>
                  ) : null}
                  {row.hasActiveSession && canEdit ? (
                    <Button
                      variant="secondary"
                      disabled={mutationLoading}
                      onClick={() => handleCloseSession(row)}
                    >
                      Close Session
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      className="border border-rose-300 bg-white text-rose-600 hover:bg-rose-50"
                      disabled={mutationLoading}
                      onClick={() => handleDelete(row)}
                      variant="secondary"
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
          data={tables}
          emptyMessage="No tables found for the selected restaurant."
        />

        {!isLoading && !error && !tables.length ? (
          <EmptyState
            description="Create tables for a restaurant to start generating QR codes."
            title="No tables yet"
          />
        ) : null}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTable ? "Edit Table" : "Create Table"}
      >
        <div className="space-y-4">
          {!editingTable ? (
            <SelectField
              error={formErrors.restaurantId}
              label="Restaurant"
              options={restaurantOptions.filter((option) => option.value)}
              required
              value={form.restaurantId}
              onChange={(event) => setForm((current) => ({ ...current, restaurantId: event.target.value }))}
            />
          ) : null}
          <TextField
            error={formErrors.tableNumber}
            label="Table Number"
            required
            value={form.tableNumber}
            onChange={(event) => setForm((current) => ({ ...current, tableNumber: event.target.value }))}
          />
          <TextField
            error={formErrors.capacity}
            label="Capacity"
            required
            type="number"
            value={form.capacity}
            onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
          />
          {editingTable ? (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                checked={form.isActive}
                onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
                type="checkbox"
              />
              Active
            </label>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button disabled={mutationLoading} onClick={handleSubmit}>
              {editingTable ? "Save Changes" : "Create Table"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(viewTable)} onClose={() => setViewTable(null)} title="Table Details">
        {viewTable ? (
          <div className="space-y-3 text-sm text-slate-700">
            <p><strong>Restaurant:</strong> {viewTable.restaurantName}</p>
            <p><strong>Table:</strong> {viewTable.tableNumber}</p>
            <p><strong>Capacity:</strong> {viewTable.capacity}</p>
            <p><strong>QR Status:</strong> {viewTable.hasQr ? "Generated" : "Not generated"}</p>
            <p><strong>Session:</strong> {viewTable.hasActiveSession ? "Active" : "None"}</p>
            <p><strong>Created:</strong> {formatDateTime(viewTable.createdAt)}</p>
            {viewTable.qrCodeUrl ? (
              <p className="break-all"><strong>QR URL:</strong> {viewTable.qrCodeUrl}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(qrPreviewTable)} onClose={() => setQrPreviewTable(null)} title="QR Preview">
        {qrPreviewTable?.qrCodeUrl ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-600">{qrPreviewTable.qrCodeUrl}</p>
            <img
              alt={`QR for ${qrPreviewTable.tableNumber}`}
              className="mx-auto h-64 w-64 rounded-2xl border border-slate-200 bg-white p-4"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrPreviewTable.qrCodeUrl)}`}
            />
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => handleDownloadQr(qrPreviewTable.id, "png")}>Download PNG</Button>
              <Button variant="secondary" onClick={() => handleDownloadQr(qrPreviewTable.id, "svg")}>
                Download SVG
              </Button>
              <Button variant="secondary" onClick={() => handleDownloadQr(qrPreviewTable.id, "pdf")}>
                Download PDF
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
