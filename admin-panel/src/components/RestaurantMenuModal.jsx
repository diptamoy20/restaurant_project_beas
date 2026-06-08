import { useEffect, useMemo, useState } from "react";

import { Button } from "./ui/Button";
import { EmptyState } from "./ui/EmptyState";
import { ErrorState } from "./ui/ErrorState";
import { Loader } from "./ui/Loader";
import { Modal } from "./ui/Modal";
import { SelectField } from "./ui/SelectField";
import { Table } from "./ui/Table";
import { TextField } from "./ui/TextField";
import {
  useCreateAdminMenuItemMutation,
  useDeleteAdminMenuItemMutation,
  useGetAdminRestaurantMenuQuery,
  useGetRestaurantCategoriesQuery,
  useUpdateAdminMenuItemMutation,
  useUploadMenuItemImageMutation,
} from "../services/menuApi";
import { IMAGE_UPLOAD_ACCEPT, validateImageFile } from "../utils/imageUpload";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  discountPrice: "",
  categoryId: "",
  foodType: "VEG",
  imageUrl: "",
  isAvailable: true,
  isBestSelling: false,
  ingredients: "",
  addonGroups: [],
};
const formatCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function toForm(item) {
  return {
    name: item.name ?? "",
    description: item.description ?? "",
    price: String(item.price ?? ""),
    discountPrice: item.discountPrice != null ? String(item.discountPrice) : "",
    categoryId: item.categoryId != null ? String(item.categoryId) : "",
    foodType: item.foodType ?? "VEG",
    imageUrl: item.imageUrl ?? "",
    isAvailable: item.isAvailable !== false,
    isBestSelling: Boolean(item.isBestSelling),
    ingredients: item.ingredients ?? "",
    addonGroups: (item.addonGroups ?? []).map((group) => ({
      name: group.name ?? "",
      selectionType: group.selectionType ?? "MULTI",
      isRequired: Boolean(group.isRequired),
      minSelect: group.minSelect != null ? String(group.minSelect) : "",
      maxSelect: group.maxSelect != null ? String(group.maxSelect) : "",
      options: (group.options ?? []).map((option) => ({
        name: option.name ?? "",
        price: String(option.price ?? ""),
        isAvailable: option.isAvailable !== false,
      })),
    })),
  };
}

export function RestaurantMenuModal({
  restaurant,
  open,
  mode = "list",
  onModeChange,
  onClose,
}) {
  const restaurantId = restaurant?.id;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [editingItem, setEditingItem] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageError, setImageError] = useState("");

  const showForm = mode === "create" || Boolean(editingItem);

  const {
    data,
    isLoading: isMenuLoading,
    error: menuError,
    refetch,
  } = useGetAdminRestaurantMenuQuery(restaurantId, {
    skip: !open || !restaurantId,
  });

  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError,
  } = useGetRestaurantCategoriesQuery(restaurantId, {
    skip: !open || !restaurantId,
  });

  const [createItem, createState] = useCreateAdminMenuItemMutation();
  const [updateItem, updateState] = useUpdateAdminMenuItemMutation();
  const [uploadMenuItemImage, uploadImageState] =
    useUploadMenuItemImageMutation();
  const [deleteItem, deleteState] = useDeleteAdminMenuItemMutation();

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setErrors({});
      setEditingItem(null);
      setImageFile(null);
      setImageError("");
    }
  }, [open]);

  useEffect(() => {
    if (open && mode === "create") {
      setEditingItem(null);
      setForm(emptyForm);
      setErrors({});
      setImageFile(null);
      setImageError("");
    }
  }, [mode, open]);

  const categoryOptions = useMemo(
    () => [
      {
        value: "",
        label: categories.length
          ? "Select category"
          : "Create a category first",
      },
      ...categories.map((category) => ({
        value: String(category.id),
        label: category.name,
      })),
    ],
    [categories],
  );

  const mutationError =
    createState.error?.data?.message ||
    createState.error?.error ||
    updateState.error?.data?.message ||
    updateState.error?.error ||
    uploadImageState.error?.data?.message ||
    uploadImageState.error?.error ||
    deleteState.error?.data?.message ||
    deleteState.error?.error;

  const menuItems = data?.items ?? [];

  const validate = () => {
    const next = {};

    if (!form.name.trim()) {
      next.name = "Menu name is required";
    }

    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price <= 0) {
      next.price = "Enter a valid price";
    }

    if (!form.categoryId) {
      next.categoryId = "Select a category";
    }

    const discount = form.discountPrice ? Number(form.discountPrice) : null;
    if (form.discountPrice && (Number.isNaN(discount) || discount < 0)) {
      next.discountPrice = "Invalid discount price";
    }

    if (discount !== null && !Number.isNaN(discount) && discount > price) {
      next.discountPrice = "Discounted price cannot exceed price";
    }

    setErrors(next);

    return Object.keys(next).length === 0;
  };

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    const validationError = file ? validateImageFile(file) : "";

    if (validationError) {
      setImageFile(null);
      setImageError(validationError);
      window.alert(validationError);
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setImageError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate() || !restaurantId) {
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      discountPrice: form.discountPrice
        ? Number(form.discountPrice)
        : undefined,
      categoryId: Number(form.categoryId),
      foodType: form.foodType,
      imageUrl: imageFile ? undefined : form.imageUrl.trim() || undefined,
      isAvailable: Boolean(form.isAvailable),
      isBestSelling: Boolean(form.isBestSelling),
      ingredients: form.ingredients.trim() || undefined,
      addonGroups: form.addonGroups
        .filter((group) => group.name.trim())
        .map((group, groupIndex) => ({
          name: group.name.trim(),
          selectionType: group.selectionType,
          isRequired: Boolean(group.isRequired),
          minSelect: group.minSelect ? Number(group.minSelect) : undefined,
          maxSelect: group.maxSelect ? Number(group.maxSelect) : undefined,
          sortOrder: groupIndex,
          isActive: true,
          options: group.options
            .filter((option) => option.name.trim())
            .map((option, optionIndex) => ({
              name: option.name.trim(),
              price: Number(option.price || 0),
              isAvailable: option.isAvailable !== false,
              sortOrder: optionIndex,
            })),
        }))
        .filter((group) => group.options.length > 0),
    };

    try {
      let savedItem;

      if (editingItem) {
        savedItem = await updateItem({
          id: editingItem.id,
          restaurantId,
          body: payload,
        }).unwrap();
      } else {
        savedItem = await createItem({ restaurantId, body: payload }).unwrap();
      }

      if (imageFile) {
        const menuItemId = savedItem?.id ?? editingItem?.id;
        await uploadMenuItemImage({
          id: menuItemId,
          restaurantId,
          file: imageFile,
        }).unwrap();
      }

      setForm(emptyForm);
      setEditingItem(null);
      setImageFile(null);
      setImageError("");
      onModeChange?.("list");
      refetch();
    } catch (error) {
      const message =
        error?.data?.message ||
        error?.error ||
        error?.message ||
        "Failed to save menu item.";
      window.alert(message);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setForm(toForm(item));
    setErrors({});
    setImageFile(null);
    setImageError("");
    onModeChange?.("list");
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) {
      return;
    }

    try {
      await deleteItem({ id: item.id, restaurantId }).unwrap();
      refetch();
    } catch {
      /* surfaced via mutationError */
    }
  };

  const addAddonGroup = () => {
    setForm((prev) => ({
      ...prev,
      addonGroups: [
        ...prev.addonGroups,
        {
          name: "",
          selectionType: "MULTI",
          isRequired: false,
          minSelect: "",
          maxSelect: "",
          options: [{ name: "", price: "", isAvailable: true }],
        },
      ],
    }));
  };

  const updateAddonGroup = (groupIndex, patch) => {
    setForm((prev) => ({
      ...prev,
      addonGroups: prev.addonGroups.map((group, index) =>
        index === groupIndex ? { ...group, ...patch } : group,
      ),
    }));
  };

  const removeAddonGroup = (groupIndex) => {
    setForm((prev) => ({
      ...prev,
      addonGroups: prev.addonGroups.filter((_, index) => index !== groupIndex),
    }));
  };

  const addAddonOption = (groupIndex) => {
    setForm((prev) => ({
      ...prev,
      addonGroups: prev.addonGroups.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              options: [
                ...group.options,
                { name: "", price: "", isAvailable: true },
              ],
            }
          : group,
      ),
    }));
  };

  const updateAddonOption = (groupIndex, optionIndex, patch) => {
    setForm((prev) => ({
      ...prev,
      addonGroups: prev.addonGroups.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              options: group.options.map((option, currentOptionIndex) =>
                currentOptionIndex === optionIndex
                  ? { ...option, ...patch }
                  : option,
              ),
            }
          : group,
      ),
    }));
  };

  const removeAddonOption = (groupIndex, optionIndex) => {
    setForm((prev) => ({
      ...prev,
      addonGroups: prev.addonGroups.map((group, index) =>
        index === groupIndex
          ? {
              ...group,
              options: group.options.filter(
                (_, currentOptionIndex) => currentOptionIndex !== optionIndex,
              ),
            }
          : group,
      ),
    }));
  };

  const title = restaurant
    ? `${showForm ? (editingItem ? "Edit Menu" : "Add Menu") : "All Menu"} - ${restaurant.name}`
    : "Menu management";

  return (
    <Modal
      footer={
        <div className="flex flex-wrap gap-3">
          {showForm ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingItem(null);
                setForm(emptyForm);
                setErrors({});
                setImageFile(null);
                setImageError("");
                onModeChange?.("list");
              }}
            >
              All Menu
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onModeChange?.("create")}
            >
              Add Menu
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          {showForm ? (
            <Button
              type="submit"
              form="restaurant-menu-item-form"
              disabled={
                createState.isLoading ||
                updateState.isLoading ||
                uploadImageState.isLoading ||
                !categories.length
              }
            >
              {editingItem ? "Save Changes" : "Create Menu"}
            </Button>
          ) : null}
        </div>
      }
      onClose={onClose}
      open={open}
      title={title}
      maxWidth="max-w-6xl"
    >
      <div className="space-y-6">
        {isMenuLoading || isCategoriesLoading ? (
          <Loader label="Loading menu data..." />
        ) : null}
        {menuError ? (
          <ErrorState
            message={
              menuError?.data?.message ||
              menuError?.error ||
              "Unable to load menu."
            }
          />
        ) : null}
        {categoriesError ? (
          <ErrorState
            message={
              categoriesError?.data?.message ||
              categoriesError?.error ||
              "Unable to load categories."
            }
          />
        ) : null}
        {mutationError ? <ErrorState message={mutationError} /> : null}

        {!showForm ? (
          <div className="overflow-x-auto">
            <Table
              columns={[
                { key: "name", header: "Menu Item Name" },
                {
                  key: "category",
                  header: "Category",
                  render: (row) => row.category?.name ?? "Unassigned",
                },
                {
                  key: "price",
                  header: "Price",
                  render: (row) => formatCurrency.format(row.price),
                },
                {
                  key: "discountPrice",
                  header: "Discounted Price",
                  render: (row) =>
                    row.discountPrice != null
                      ? formatCurrency.format(row.discountPrice)
                      : "-",
                },
                {
                  key: "foodType",
                  header: "Food Type",
                  render: (row) => row.foodType ?? "-",
                },
                {
                  key: "isAvailable",
                  header: "Availability Status",
                  render: (row) => (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        row.isAvailable
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {row.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  ),
                },
                {
                  key: "isBestSelling",
                  header: "Best Seller Status",
                  render: (row) => (row.isBestSelling ? "Best Seller" : "-"),
                },
                {
                  key: "addonGroups",
                  header: "Add-ons",
                  render: (row) =>
                    row.addonGroups?.length
                      ? `${row.addonGroups.length} group(s)`
                      : "-",
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) => (
                    <div className="flex gap-2">
                      <Button
                        className="px-3 py-1.5 text-xs"
                        onClick={() => handleEdit(row)}
                        variant="secondary"
                      >
                        Edit
                      </Button>
                      <Button
                        className="px-3 py-1.5 text-xs"
                        onClick={() => handleDelete(row)}
                        variant="danger"
                      >
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]}
              data={menuItems}
              emptyMessage="No menu items found for this restaurant."
            />
          </div>
        ) : null}

        {showForm ? (
          <form
            className="grid gap-4 md:grid-cols-2"
            id="restaurant-menu-item-form"
            onSubmit={handleSubmit}
          >
            {!categories.length && !isCategoriesLoading ? (
              <div className="md:col-span-2">
                <EmptyState
                  description="Create a category in Master Category before adding menu items."
                  title="No categories available"
                />
              </div>
            ) : null}

            <TextField
              required
              error={errors.name}
              label="Menu Name *"
              name="name"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />

            <SelectField
              required
              className={errors.categoryId ? "text-rose-600" : ""}
              label="Category *"
              name="categoryId"
              value={form.categoryId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, categoryId: event.target.value }))
              }
              options={categoryOptions}
            />
            {errors.categoryId ? (
              <span className="-mt-3 text-xs text-rose-600 md:col-start-2">
                {errors.categoryId}
              </span>
            ) : null}

            <TextField
              required
              error={errors.price}
              label="Price (₹) *"
              min="0"
              name="price"
              step="0.01"
              type="number"
              value={form.price}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, price: event.target.value }))
              }
            />

            <TextField
              error={errors.discountPrice}
              label="Discounted Price (₹)"
              min="0"
              name="discountPrice"
              step="0.01"
              type="number"
              value={form.discountPrice}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  discountPrice: event.target.value,
                }))
              }
            />

            <SelectField
              label="Food Type"
              name="foodType"
              value={form.foodType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, foodType: event.target.value }))
              }
              options={[
                { value: "VEG", label: "Vegetarian" },
                { value: "NON_VEG", label: "Non-vegetarian" },
              ]}
            />

            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-2 block">Upload Image</span>
              <input
                accept={IMAGE_UPLOAD_ACCEPT}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                onChange={handleImageFileChange}
                type="file"
              />
              {imageFile ? (
                <span className="mt-1 block text-xs text-slate-500">
                  {imageFile.name}
                </span>
              ) : null}
              {imageError ? (
                <span className="mt-1 block text-xs text-rose-600">
                  {imageError}
                </span>
              ) : null}
            </label>

            <label className="flex items-center gap-3 md:col-span-2">
              <input
                checked={form.isAvailable}
                name="isAvailable"
                type="checkbox"
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isAvailable: event.target.checked,
                  }))
                }
              />
              <span className="text-sm font-medium text-slate-700">
                Available for Ordering
              </span>
            </label>

            <label className="flex items-center gap-3 md:col-span-2">
              <input
                checked={form.isBestSelling}
                name="isBestSelling"
                type="checkbox"
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isBestSelling: event.target.checked,
                  }))
                }
              />
              <span className="text-sm font-medium text-slate-700">
                Mark as Best Selling
              </span>
            </label>

            <TextField
              className="md:col-span-2"
              label="Ingredients"
              name="ingredients"
              value={form.ingredients}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  ingredients: event.target.value,
                }))
              }
            />

            <TextField
              className="md:col-span-2"
              label="Description"
              name="description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />

            <section className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-950">
                    Add-On Customizations
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Configure item-specific groups like size, toppings, patty,
                    or extras.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addAddonGroup}
                >
                  Add Group
                </Button>
              </div>

              {form.addonGroups.length ? (
                <div className="grid gap-4">
                  {form.addonGroups.map((group, groupIndex) => (
                    <div
                      className="rounded-2xl border border-slate-200 bg-white p-4"
                      key={groupIndex}
                    >
                      <div className="grid gap-3 md:grid-cols-[1fr_160px_120px_120px_auto]">
                        <TextField
                          label="Group Name"
                          value={group.name}
                          onChange={(event) =>
                            updateAddonGroup(groupIndex, {
                              name: event.target.value,
                            })
                          }
                        />
                        <SelectField
                          label="Type"
                          value={group.selectionType}
                          onChange={(event) =>
                            updateAddonGroup(groupIndex, {
                              selectionType: event.target.value,
                              maxSelect:
                                event.target.value === "SINGLE"
                                  ? "1"
                                  : group.maxSelect,
                            })
                          }
                          options={[
                            { value: "SINGLE", label: "Single" },
                            { value: "MULTI", label: "Multiple" },
                          ]}
                        />
                        <TextField
                          label="Min"
                          min="0"
                          type="number"
                          value={group.minSelect}
                          onChange={(event) =>
                            updateAddonGroup(groupIndex, {
                              minSelect: event.target.value,
                            })
                          }
                        />
                        <TextField
                          label="Max"
                          min="1"
                          type="number"
                          value={group.maxSelect}
                          onChange={(event) =>
                            updateAddonGroup(groupIndex, {
                              maxSelect: event.target.value,
                            })
                          }
                        />
                        <Button
                          className="self-end"
                          type="button"
                          variant="danger"
                          onClick={() => removeAddonGroup(groupIndex)}
                        >
                          Remove
                        </Button>
                      </div>
                      <label className="mt-3 flex items-center gap-3">
                        <input
                          checked={group.isRequired}
                          type="checkbox"
                          onChange={(event) =>
                            updateAddonGroup(groupIndex, {
                              isRequired: event.target.checked,
                            })
                          }
                        />
                        <span className="text-sm font-medium text-slate-700">
                          Required group
                        </span>
                      </label>

                      <div className="mt-4 grid gap-3">
                        {group.options.map((option, optionIndex) => (
                          <div
                            className="grid gap-3 rounded-xl bg-slate-50 p-3 md:grid-cols-[1fr_140px_auto_auto]"
                            key={optionIndex}
                          >
                            <TextField
                              label="Option Name"
                              value={option.name}
                              onChange={(event) =>
                                updateAddonOption(groupIndex, optionIndex, {
                                  name: event.target.value,
                                })
                              }
                            />
                            <TextField
                              label="Price (₹)"
                              min="0"
                              step="0.01"
                              type="number"
                              value={option.price}
                              onChange={(event) =>
                                updateAddonOption(groupIndex, optionIndex, {
                                  price: event.target.value,
                                })
                              }
                            />
                            <label className="flex items-center gap-2 self-end pb-3 text-sm font-medium text-slate-700">
                              <input
                                checked={option.isAvailable}
                                type="checkbox"
                                onChange={(event) =>
                                  updateAddonOption(groupIndex, optionIndex, {
                                    isAvailable: event.target.checked,
                                  })
                                }
                              />
                              Available
                            </label>
                            <Button
                              className="self-end"
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                removeAddonOption(groupIndex, optionIndex)
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => addAddonOption(groupIndex)}
                        >
                          Add Option
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No add-ons configured for this item.
                </p>
              )}
            </section>
          </form>
        ) : null}
      </div>
    </Modal>
  );
}
