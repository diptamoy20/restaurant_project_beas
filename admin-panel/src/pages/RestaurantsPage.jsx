import { useState, useRef } from "react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Loader } from "../components/ui/Loader";
import { Modal } from "../components/ui/Modal";
import { Table } from "../components/ui/Table";
import { TextField } from "../components/ui/TextField";
import { PermissionGate } from "../components/PermissionGate";
import {
  useGetAllRestaurantsQuery,
  useCreateRestaurantMutation,
  useUpdateRestaurantMutation,
  useUploadRestaurantImageMutation,
  useDeleteRestaurantMutation,
} from "../services/restaurantApi";
import { useGetAdminRestaurantMenuQuery } from "../services/menuApi";
import { RestaurantMenuModal } from "../components/RestaurantMenuModal.jsx";
import { IMAGE_UPLOAD_ACCEPT, validateImageFile } from "../utils/imageUpload";

const initialFormState = {
  name: "",
  address: "",
  city: "",
  latitude: "",
  longitude: "",
  cuisineType: "",
  description: "",
  imageUrl: "",
  deliveryRadiusKm: "8",
  deliveryEnabled: true,
  deliveryBaseFee: "20",
  deliveryBaseDistanceKm: "1",
  deliveryPerKmFee: "7",
  deliveryFeeMin: "",
  deliveryFeeCap: "",
  freeDeliveryMinAmount: "",
  packagingCharge: "0",
  gstin: "",
  gstRate: "5",
  gstEnabled: true,
  isLocationEnabled: true,
  isActive: true,
};

const formatCurrency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function ManageMenuSection({
  restaurants = [],
  isRestaurantsLoading,
  restaurantsError,
  onAddMenu,
  onViewMenu,
}) {
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const selectedRestaurant = restaurants.find(
    (restaurant) => String(restaurant.id) === String(selectedRestaurantId),
  );

  const filteredRestaurants = restaurants.filter((restaurant) => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [restaurant.name, restaurant.city, restaurant.cuisineType]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  const {
    data: menuData,
    isLoading: isMenuLoading,
    error: menuError,
  } = useGetAdminRestaurantMenuQuery(selectedRestaurantId, {
    skip: !selectedRestaurantId,
  });

  const menuItems = menuData?.items ?? [];
  const addMenuDisabled = !selectedRestaurant || isRestaurantsLoading;

  return (
    <Card
      eyebrow="Master Menu"
      title="Manage Menu"
      actions={
        <PermissionGate module="restaurants" action="edit">
          <Button
            disabled={addMenuDisabled}
            onClick={() => selectedRestaurant && onAddMenu(selectedRestaurant)}
          >
            Add Menu
          </Button>
        </PermissionGate>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          <TextField
            aria-label="Search or select restaurant"
            label="Search or select restaurant"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Type restaurant name"
            value={searchTerm}
          />

          <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
            {isRestaurantsLoading ? (
              <div className="px-4 py-5">
                <Loader label="Loading restaurants..." />
              </div>
            ) : null}

            {restaurantsError ? (
              <div className="p-3">
                <ErrorState
                  message={
                    restaurantsError?.data?.message ||
                    restaurantsError?.error ||
                    "Failed to load restaurants."
                  }
                />
              </div>
            ) : null}

            {!isRestaurantsLoading &&
            !restaurantsError &&
            filteredRestaurants.length === 0 ? (
              <div className="px-4 py-5 text-sm text-slate-500">
                No restaurants match your search.
              </div>
            ) : null}

            {filteredRestaurants.map((restaurant) => {
              const isSelected =
                String(restaurant.id) === String(selectedRestaurantId);

              return (
                <button
                  className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 ${
                    isSelected
                      ? "bg-slate-950 text-white"
                      : "bg-white text-slate-900 hover:bg-slate-50"
                  }`}
                  key={restaurant.id}
                  onClick={() => setSelectedRestaurantId(String(restaurant.id))}
                  type="button"
                >
                  <span className="block text-sm font-semibold">
                    {restaurant.name}
                  </span>
                  <span
                    className={`mt-1 block text-xs ${isSelected ? "text-slate-200" : "text-slate-500"}`}
                  >
                    {restaurant.city ||
                      restaurant.cuisineType ||
                      "Location not specified"}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-h-[190px] rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5">
          {!selectedRestaurant ? (
            <div className="flex min-h-[150px] flex-col items-center justify-center text-center">
              <h3 className="text-base font-semibold text-slate-900">
                Select a restaurant
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Search and select a restaurant to manage its menu.
              </p>
            </div>
          ) : null}

          {selectedRestaurant ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">
                    {selectedRestaurant.name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedRestaurant.address}
                    {selectedRestaurant.city
                      ? `, ${selectedRestaurant.city}`
                      : ""}
                  </p>
                </div>
                <Button
                  onClick={() => onViewMenu(selectedRestaurant)}
                  variant="secondary"
                >
                  Open Full Menu
                </Button>
              </div>

              {isMenuLoading ? <Loader label="Loading menu items..." /> : null}
              {menuError ? (
                <ErrorState
                  message={
                    menuError?.data?.message ||
                    menuError?.error ||
                    "Unable to load menu items."
                  }
                />
              ) : null}

              {!isMenuLoading && !menuError && menuItems.length === 0 ? (
                <EmptyState
                  description="No menu items are linked to this restaurant yet."
                  title="No menu items"
                />
              ) : null}

              {menuItems.length ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <Table
                    columns={[
                      {
                        key: "name",
                        header: "Menu Item",
                        render: (row) => (
                          <div>
                            <p className="font-medium text-slate-900">
                              {row.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {row.description || "No description available"}
                            </p>
                          </div>
                        ),
                      },
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
                        key: "isAvailable",
                        header: "Status",
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
                    ]}
                    data={menuItems}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </Card>
  );
}

export function RestaurantsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [menuRestaurant, setMenuRestaurant] = useState(null);
  const [menuMode, setMenuMode] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imageError, setImageError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const { data, isLoading, error } = useGetAllRestaurantsQuery();
  const [createRestaurant, createState] = useCreateRestaurantMutation();
  const [updateRestaurant, updateState] = useUpdateRestaurantMutation();
  const [uploadRestaurantImage, uploadImageState] =
    useUploadRestaurantImageMutation();
  const [deleteRestaurant, deleteState] = useDeleteRestaurantMutation();

  const mutationError =
    createState.error?.data?.message ||
    createState.error?.error ||
    updateState.error?.data?.message ||
    updateState.error?.error ||
    uploadImageState.error?.data?.message ||
    uploadImageState.error?.error ||
    deleteState.error?.data?.message ||
    deleteState.error?.error;

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Restaurant name is required";
    }

    if (!form.address.trim()) {
      newErrors.address = "Address is required";
    }

    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);

    if (!form.latitude || isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.latitude = "Valid latitude is required (-90 to 90)";
    }

    if (!form.longitude || isNaN(lng) || lng < -180 || lng > 180) {
      newErrors.longitude = "Valid longitude is required (-180 to 180)";
    }

    const radius = parseFloat(form.deliveryRadiusKm);
    if (!form.deliveryRadiusKm || isNaN(radius) || radius < 0.1) {
      newErrors.deliveryRadiusKm = "Delivery radius must be at least 0.1 km";
    }

    const deliveryFields = [
      ["deliveryBaseFee", "Outside-range fee"],
      ["deliveryBaseDistanceKm", "Free delivery range"],
      ["deliveryPerKmFee", "Per km fee"],
      ["packagingCharge", "Packaging charge"],
    ];

    deliveryFields.forEach(([key, label]) => {
      const value = parseFloat(form[key]);
      if (form[key] === "" || isNaN(value) || value < 0) {
        newErrors[key] = `${label} must be 0 or more`;
      }
    });

    ["deliveryFeeMin", "deliveryFeeCap", "freeDeliveryMinAmount"].forEach(
      (key) => {
        if (form[key] === "") {
          return;
        }
        const value = parseFloat(form[key]);
        if (isNaN(value) || value < 0) {
          newErrors[key] = "Value must be 0 or more";
        }
      },
    );

    const minFee =
      form.deliveryFeeMin === "" ? null : parseFloat(form.deliveryFeeMin);
    const maxFee =
      form.deliveryFeeCap === "" ? null : parseFloat(form.deliveryFeeCap);
    if (minFee !== null && maxFee !== null && maxFee < minFee) {
      newErrors.deliveryFeeCap = "Max fee cannot be less than min fee";
    }

    const gstRate = parseFloat(form.gstRate);
    if (
      form.gstEnabled &&
      (form.gstRate === "" || isNaN(gstRate) || gstRate < 0 || gstRate > 28)
    ) {
      newErrors.gstRate = "GST rate must be between 0 and 28";
    }

    if (form.gstin && !/^[0-9A-Z]{15}$/.test(form.gstin.trim().toUpperCase())) {
      newErrors.gstin = "GSTIN must be 15 uppercase letters/numbers";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAddNew = () => {
    setEditingId(null);
    setForm(initialFormState);
    setErrors({});
    setImageFile(null);
    setImageError("");
    setModalOpen(true);
  };

  const handleEdit = (restaurant) => {
    setEditingId(restaurant.id);
    setForm({
      name: restaurant.name || "",
      address: restaurant.address || "",
      city: restaurant.city || "",
      latitude: restaurant.latitude.toString(),
      longitude: restaurant.longitude.toString(),
      cuisineType: restaurant.cuisineType || "",
      description: restaurant.description || "",
      imageUrl: restaurant.imageUrl || "",
      deliveryRadiusKm: (restaurant.deliveryRadiusKm || 8).toString(),
      deliveryEnabled: restaurant.deliveryEnabled !== false,
      deliveryBaseFee: (restaurant.deliveryBaseFee ?? 20).toString(),
      deliveryBaseDistanceKm: (
        restaurant.deliveryBaseDistanceKm ?? 1
      ).toString(),
      deliveryPerKmFee: (restaurant.deliveryPerKmFee ?? 7).toString(),
      deliveryFeeMin:
        restaurant.deliveryFeeMin != null
          ? restaurant.deliveryFeeMin.toString()
          : "",
      deliveryFeeCap:
        restaurant.deliveryFeeCap != null
          ? restaurant.deliveryFeeCap.toString()
          : "",
      freeDeliveryMinAmount:
        restaurant.freeDeliveryMinAmount != null
          ? restaurant.freeDeliveryMinAmount.toString()
          : "",
      packagingCharge: (restaurant.packagingCharge ?? 0).toString(),
      gstin: restaurant.gstin || "",
      gstRate: (restaurant.gstRate ?? 5).toString(),
      gstEnabled: restaurant.gstEnabled !== false,
      isLocationEnabled: restaurant.isLocationEnabled !== false,
      isActive: restaurant.isActive !== false,
    });
    setErrors({});
    setImageFile(null);
    setImageError("");
    setModalOpen(true);
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

    if (isSubmitting || submittingRef.current) {
      console.log("[DEBUG] Form submission already in progress, ignoring");
      return;
    }

    if (!validateForm()) {
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    const payload = {
      name: form.name,
      address: form.address,
      city: form.city || undefined,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      cuisineType: form.cuisineType || undefined,
      description: form.description || undefined,
      imageUrl: imageFile ? undefined : form.imageUrl || undefined,
      deliveryRadiusKm: parseFloat(form.deliveryRadiusKm),
      deliveryEnabled: form.deliveryEnabled,
      deliveryBaseFee: parseFloat(form.deliveryBaseFee),
      deliveryBaseDistanceKm: parseFloat(form.deliveryBaseDistanceKm),
      deliveryPerKmFee: parseFloat(form.deliveryPerKmFee),
      deliveryFeeMin:
        form.deliveryFeeMin === "" ? null : parseFloat(form.deliveryFeeMin),
      deliveryFeeCap:
        form.deliveryFeeCap === "" ? null : parseFloat(form.deliveryFeeCap),
      freeDeliveryMinAmount:
        form.freeDeliveryMinAmount === ""
          ? null
          : parseFloat(form.freeDeliveryMinAmount),
      packagingCharge: parseFloat(form.packagingCharge),
      gstin: form.gstin.trim() ? form.gstin.trim().toUpperCase() : undefined,
      gstRate: parseFloat(form.gstRate || "0"),
      gstEnabled: form.gstEnabled,
      isLocationEnabled: form.isLocationEnabled,
      isActive: form.isActive,
    };

    try {
      let savedRestaurant;

      if (editingId) {
        savedRestaurant = await updateRestaurant({
          id: editingId,
          ...payload,
        }).unwrap();
      } else {
        console.log("[DEBUG] Calling createRestaurant API");
        savedRestaurant = await createRestaurant(payload).unwrap();
        console.log("[DEBUG] createRestaurant API call completed");
      }

      if (imageFile) {
        const restaurantId = savedRestaurant?.id ?? editingId;
        await uploadRestaurantImage({
          id: restaurantId,
          file: imageFile,
        }).unwrap();
      }

      setModalOpen(false);
      setForm(initialFormState);
      setErrors({});
      setImageFile(null);
      setImageError("");
    } catch (err) {
      console.error("Failed to save restaurant:", err);
      const message =
        err?.data?.message ||
        err?.error ||
        err?.message ||
        "Failed to save restaurant.";
      window.alert(message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this restaurant?")) {
      return;
    }

    try {
      await deleteRestaurant(id).unwrap();
    } catch (err) {
      console.error("Failed to delete restaurant:", err);
    }
  };

  const openMenu = (restaurant, mode) => {
    setMenuRestaurant(restaurant);
    setMenuMode(mode);
  };

  return (
    <div className="space-y-6">
      <Card
        eyebrow="Restaurant Management"
        title="Manage Restaurants"
        actions={
          <PermissionGate module="restaurants" action="create">
            <Button onClick={handleAddNew}>Add Restaurant</Button>
          </PermissionGate>
        }
      >
        {isLoading ? <Loader label="Loading restaurants..." /> : null}
        {error ? (
          <ErrorState
            message={
              error?.data?.message ||
              error?.error ||
              "Failed to load restaurants."
            }
          />
        ) : null}
        {!isLoading && !error && !(data?.length > 0) ? (
          <EmptyState
            description="No restaurants added yet. Start by adding your first restaurant."
            title="No restaurants"
          />
        ) : null}

        {data?.length ? (
          <div className="overflow-x-auto">
            <Table
              columns={[
                {
                  key: "name",
                  header: "Restaurant",
                  render: (row) => (
                    <div className="flex items-center gap-3">
                      {row.imageUrl ? (
                        <img
                          src={row.imageUrl}
                          alt={row.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-slate-100" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">{row.name}</p>
                        <p className="text-xs text-slate-500">
                          {row.cuisineType || "Cuisine not specified"}
                        </p>
                      </div>
                    </div>
                  ),
                },
                {
                  key: "address",
                  header: "Location",
                  render: (row) => (
                    <div>
                      <p className="text-sm text-slate-900">{row.address}</p>
                      <p className="text-xs text-slate-500">
                        {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
                      </p>
                    </div>
                  ),
                },
                // {
                //   key: 'deliveryRadiusKm',
                //   header: 'Delivery Radius',
                //   render: (row) => <span className="text-sm text-slate-700">{row.deliveryRadiusKm} km</span>,
                // },
                {
                  key: "deliveryPricing",
                  header: "Delivery Fee",
                  render: (row) => (
                    <span className="text-sm text-slate-700">
                      {row.deliveryEnabled === false
                        ? "Disabled"
                        : `Free within ${row.deliveryBaseDistanceKm ?? 1} km, then ₹${row.deliveryBaseFee ?? 20} + ₹${row.deliveryPerKmFee ?? 7}/km`}
                    </span>
                  ),
                },
                {
                  key: "gst",
                  header: "GST",
                  render: (row) => (
                    <span className="text-sm text-slate-700">
                      {row.gstEnabled === false
                        ? "Off"
                        : `${row.gstRate ?? 5}%`}
                    </span>
                  ),
                },
                {
                  key: "isActive",
                  header: "Status",
                  render: (row) => (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        row.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {row.isActive ? "Active" : "Inactive"}
                    </span>
                  ),
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) => (
                    <PermissionGate
                      fallback={
                        <span className="text-xs text-slate-400">
                          Read only
                        </span>
                      }
                      module="restaurants"
                      action="edit"
                    >
                      <div
                        className="flex gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Button
                          onClick={() => openMenu(row, "list")}
                          variant="secondary"
                        >
                          All Menu
                        </Button>
                        <Button
                          onClick={() => handleEdit(row)}
                          variant="secondary"
                        >
                          Edit
                        </Button>
                        <PermissionGate module="restaurants" action="delete">
                          <Button
                            onClick={() => handleDelete(row.id)}
                            variant="danger"
                          >
                            Delete
                          </Button>
                        </PermissionGate>
                      </div>
                    </PermissionGate>
                  ),
                },
              ]}
              data={data}
            />
          </div>
        ) : null}

        {mutationError ? <ErrorState message={mutationError} /> : null}
      </Card>

      {/* <ManageMenuSection
        restaurants={data ?? []}
        isRestaurantsLoading={isLoading}
        restaurantsError={error}
        onAddMenu={(restaurant) => openMenu(restaurant, 'create')}
        onViewMenu={(restaurant) => openMenu(restaurant, 'list')}
      /> */}

      <RestaurantMenuModal
        open={Boolean(menuRestaurant)}
        restaurant={menuRestaurant}
        mode={menuMode}
        onModeChange={setMenuMode}
        onClose={() => setMenuRestaurant(null)}
      />

      <Modal
        footer={
          <div className="flex gap-3">
            <Button onClick={() => setModalOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                createState.isLoading ||
                updateState.isLoading ||
                uploadImageState.isLoading
              }
            >
              {isSubmitting ||
              createState.isLoading ||
              updateState.isLoading ||
              uploadImageState.isLoading
                ? "Saving..."
                : "Save Restaurant"}
            </Button>
          </div>
        }
        onClose={() => setModalOpen(false)}
        open={modalOpen}
        title={editingId ? "Edit Restaurant" : "Add New Restaurant"}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <TextField
            error={errors.name}
            label="Restaurant Name *"
            name="name"
            onChange={handleInputChange}
            placeholder="e.g., Downtown Spice Hub"
            value={form.name}
          />

          <TextField
            error={errors.address}
            label="Address *"
            name="address"
            onChange={handleInputChange}
            placeholder="e.g., 45 Residency Road"
            value={form.address}
          />

          <TextField
            label="City"
            name="city"
            onChange={handleInputChange}
            placeholder="e.g., Bangalore"
            value={form.city}
          />

          <div className="grid grid-cols-2 gap-4">
            <TextField
              error={errors.latitude}
              label="Latitude *"
              name="latitude"
              onChange={handleInputChange}
              placeholder="e.g., 12.9663"
              step="any"
              type="number"
              value={form.latitude}
            />

            <TextField
              error={errors.longitude}
              label="Longitude *"
              name="longitude"
              onChange={handleInputChange}
              placeholder="e.g., 77.6012"
              step="any"
              type="number"
              value={form.longitude}
            />
          </div>

          <TextField
            label="Cuisine Type"
            name="cuisineType"
            onChange={handleInputChange}
            placeholder="e.g., North Indian, Chinese"
            value={form.cuisineType}
          />

          <TextField
            label="Description"
            name="description"
            onChange={handleInputChange}
            placeholder="Brief description of the restaurant"
            value={form.description}
          />

          {/* <TextField
            label="Image URL"
            name="imageUrl"
            onChange={handleInputChange}
            placeholder="https://example.com/restaurant-image.jpg"
            type="url"
            value={form.imageUrl}
          /> */}

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

          {/*
          <TextField
            error={errors.deliveryRadiusKm}
            label="Delivery Radius (km) *"
            min="0.1"
            name="deliveryRadiusKm"
            onChange={handleInputChange}
            placeholder="e.g., 10"
            step="0.1"
            type="number"
            value={form.deliveryRadiusKm}
          />
          */}

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Delivery pricing
              </h3>
              <p className="text-xs text-slate-500">
                Delivery is free within free delivery range. Beyond that, checkout charges
                outside-range fee plus per-km fee on extra distance.
              </p>
            </div>

            <label className="mb-4 flex items-center gap-3">
              <input
                checked={form.deliveryEnabled}
                className="h-4 w-4 rounded border-slate-300"
                name="deliveryEnabled"
                onChange={handleInputChange}
                type="checkbox"
              />
              <span className="text-sm font-medium text-slate-700">
                Enable delivery
              </span>
            </label>

            <div className="grid grid-cols-2 gap-4">
              <TextField
                error={errors.deliveryBaseFee}
                label="Outside-range fee (₹)"
                min="0"
                name="deliveryBaseFee"
                onChange={handleInputChange}
                placeholder="e.g., 20"
                step="0.01"
                type="number"
                value={form.deliveryBaseFee}
              />

              <TextField
                error={errors.deliveryBaseDistanceKm}
                label="Free delivery range (km)"
                min="0"
                name="deliveryBaseDistanceKm"
                onChange={handleInputChange}
                step="0.1"
                type="number"
                value={form.deliveryBaseDistanceKm}
              />

              <TextField
                error={errors.deliveryPerKmFee}
                label="Extra fee per km outside range (₹)"
                min="0"
                name="deliveryPerKmFee"
                onChange={handleInputChange}
                placeholder="e.g., 7"
                step="0.01"
                type="number"
                value={form.deliveryPerKmFee}
              />

              <TextField
                error={errors.packagingCharge}
                label="Packaging charge (₹)"
                min="0"
                name="packagingCharge"
                onChange={handleInputChange}
                placeholder="e.g., 10"
                step="0.01"
                type="number"
                value={form.packagingCharge}
              />

              {/* <TextField
                error={errors.deliveryFeeMin}
                label="Min delivery fee (₹)"
                min="0"
                name="deliveryFeeMin"
                onChange={handleInputChange}
                placeholder="e.g., 20"
                step="0.01"
                type="number"
                value={form.deliveryFeeMin}
              /> */}

              {/* <TextField
                error={errors.deliveryFeeCap}
                label="Max delivery fee (₹)"
                min="0"
                name="deliveryFeeCap"
                onChange={handleInputChange}
                placeholder="e.g., 99"
                step="0.01"
                type="number"
                value={form.deliveryFeeCap}
              /> */}
            </div>

            <div className="mt-4">
              <TextField
                error={errors.freeDeliveryMinAmount}
                label="Free delivery above (₹)"
                min="0"
                name="freeDeliveryMinAmount"
                onChange={handleInputChange}
                placeholder="e.g., 499"
                step="0.01"
                type="number"
                value={form.freeDeliveryMinAmount}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <TextField
              error={errors.gstin}
              label="GSTIN"
              name="gstin"
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  gstin: event.target.value.toUpperCase(),
                }))
              }
              placeholder="29ABCDE1234F1Z5"
              value={form.gstin}
            />

            <TextField
              error={errors.gstRate}
              label="GST Rate (%)"
              min="0"
              max="28"
              name="gstRate"
              onChange={handleInputChange}
              step="0.01"
              type="number"
              value={form.gstRate}
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                checked={form.gstEnabled}
                className="h-4 w-4 rounded border-slate-300"
                name="gstEnabled"
                onChange={handleInputChange}
                type="checkbox"
              />
              <span className="text-sm font-medium text-slate-700">
                Enable GST billing
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                checked={form.isLocationEnabled}
                className="h-4 w-4 rounded border-slate-300"
                name="isLocationEnabled"
                onChange={handleInputChange}
                type="checkbox"
              />
              <span className="text-sm font-medium text-slate-700">
                Enable location-based delivery
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                checked={form.isActive}
                className="h-4 w-4 rounded border-slate-300"
                name="isActive"
                onChange={handleInputChange}
                type="checkbox"
              />
              <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
