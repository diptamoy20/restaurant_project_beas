import React, { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../utils/api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { TextField } from '../components/ui/TextField';
import { SelectField } from '../components/ui/SelectField';
import { SearchableSelect } from '../components/ui/SearchableSelect';

function StatusBadge({ active }) {
  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

const EMPTY_INGREDIENT_ROW = { ingredientId: '', quantity: 1, unit: 'KG', wastagePct: 0 };

export function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState(null);

  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [menuItemId, setMenuItemId] = useState(null);
  const [yieldQty, setYieldQty] = useState(1);
  const [recipeItems, setRecipeItems] = useState([EMPTY_INGREDIENT_ROW]);
  const [submitError, setSubmitError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recipesRes, ingRes, restRes] = await Promise.all([
        apiFetch('recipes').catch(() => []),
        apiFetch('master/ingredients').catch(() => []),
        apiFetch('integration/restaurants').catch(() => []),
      ]);
      setRecipes(Array.isArray(recipesRes) ? recipesRes : []);
      setIngredients(Array.isArray(ingRes) ? ingRes : []);
      setRestaurants(Array.isArray(restRes) ? restRes : []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load recipes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const restaurantOptions = restaurants.map((r) => ({ value: r.id, label: r.name }));
  const categoryNameMap = useMemo(
    () => new Map(catalogCategories.map((c) => [c.id, c.name])),
    [catalogCategories],
  );

  const visibleMenuItems = useMemo(() => {
    if (!selectedCategoryId) return menuItems;
    return menuItems.filter((item) => item.categoryId === Number(selectedCategoryId));
  }, [menuItems, selectedCategoryId]);

  const menuItemOptions = visibleMenuItems.map((item) => ({
    value: item.id,
    label: item.name,
    sublabel: categoryNameMap.get(item.categoryId) || '',
  }));

  const loadCatalog = async (restaurantId, prefill = null) => {
    if (!restaurantId) return;
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const catalog = await apiFetch(`recipes/catalog/${restaurantId}`);
      setCatalogCategories(Array.isArray(catalog.categories) ? catalog.categories : []);
      setMenuItems(Array.isArray(catalog.items) ? catalog.items : []);
      if (prefill) {
        setSelectedCategoryId(prefill.categoryId ?? '');
        setMenuItemId(prefill.menuItemId ?? null);
      } else {
        setSelectedCategoryId('');
        setMenuItemId(null);
      }
    } catch (err) {
      setCatalogError(err.message || 'Failed to load the restaurant menu catalog.');
      setCatalogCategories([]);
      setMenuItems([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  const resetForm = () => {
    setEditingRecipe(null);
    setSelectedRestaurantId('');
    setSelectedCategoryId('');
    setMenuItemId(null);
    setYieldQty(1);
    setRecipeItems([EMPTY_INGREDIENT_ROW]);
    setSubmitError('');
    setCatalogError(null);
    setCatalogCategories([]);
    setMenuItems([]);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (recipe) => {
    setEditingRecipe(recipe);
    setSelectedRestaurantId(recipe.restaurantId);
    setSelectedCategoryId(recipe.categoryId ?? '');
    setMenuItemId(recipe.menuItemId);
    setYieldQty(recipe.yieldQuantity ?? 1);
    const mappedIngredients = (recipe.ingredients || []).map((ing) => ({
      ingredientId: ing.ingredientId,
      quantity: ing.quantity,
      unit: ing.unit,
      wastagePct: ing.wastagePct || 0,
    }));
    setRecipeItems(mappedIngredients.length > 0 ? mappedIngredients : [EMPTY_INGREDIENT_ROW]);
    setSubmitError('');
    setCatalogError(null);
    setCatalogCategories([]);
    setMenuItems([]);
    setModalOpen(true);
    loadCatalog(recipe.restaurantId, {
      menuItemId: recipe.menuItemId,
      categoryId: recipe.categoryId ?? '',
    });
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const handleRestaurantChange = (restaurantId) => {
    setSelectedRestaurantId(restaurantId);
    setSelectedCategoryId('');
    setMenuItemId(null);
    setCatalogCategories([]);
    setMenuItems([]);
    loadCatalog(restaurantId);
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...recipeItems];
    updated[idx] = { ...updated[idx], [field]: val };
    if (field === 'ingredientId') {
      const ing = ingredients.find((i) => i.id === Number(val));
      if (ing) updated[idx].unit = ing.unit || 'KG';
    }
    setRecipeItems(updated);
  };

  const addItemRow = () => setRecipeItems([...recipeItems, { ...EMPTY_INGREDIENT_ROW }]);

  const removeItemRow = (idx) => {
    if (recipeItems.length === 1) return;
    setRecipeItems(recipeItems.filter((_, i) => i !== idx));
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!selectedRestaurantId) {
      setSubmitError('Please select a restaurant.');
      return;
    }
    if (!menuItemId) {
      setSubmitError('Please select a menu item from the restaurant menu.');
      return;
    }
    if (recipeItems.some((row) => !row.ingredientId || !row.quantity || Number(row.quantity) <= 0)) {
      setSubmitError('Each ingredient row requires an ingredient and a quantity greater than zero.');
      return;
    }

    const payload = {
      restaurantId: Number(selectedRestaurantId),
      categoryId: selectedCategoryId ? Number(selectedCategoryId) : undefined,
      menuItemId: Number(menuItemId),
      yieldQuantity: Number(yieldQty) || 1,
      ingredients: recipeItems.map((row) => ({
        ingredientId: Number(row.ingredientId),
        quantity: Number(row.quantity),
        unit: row.unit,
        wastagePct: Number(row.wastagePct || 0),
      })),
    };

    try {
      if (editingRecipe) {
        await apiFetch(`recipes/${editingRecipe.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('recipes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      closeModal();
      fetchData();
    } catch (err) {
      setSubmitError(err.message || 'Failed to save recipe.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    try {
      await apiFetch(`recipes/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Delete failed.');
    }
  };

  if (loading && recipes.length === 0) return <Loader label="Loading recipes (Bill of Materials)..." />;
  if (error) return <ErrorState error={error} />;

  const columns = [
    { header: 'Restaurant', key: 'restaurant', render: (row) => (
      <span className="text-slate-900">{row.restaurantName || `#${row.restaurantId}`}</span>
    )},
    { header: 'Menu Item', key: 'menuItemName' },
    { header: 'Yield Qty', key: 'yieldQuantity' },
    { header: 'Ingredients', key: 'ingredients', render: (row) => row.ingredients?.length || 0 },
    { header: 'Status', key: 'isActive', render: (row) => <StatusBadge active={row.isActive} /> },
    { header: 'Actions', key: 'actions', render: (row) => (
      <div className="flex gap-2">
        <Button variant="secondary" className="py-1 px-2.5 text-xs" onClick={() => openEditModal(row)}>
          Edit
        </Button>
        <Button variant="danger" className="py-1 px-2.5 text-xs" onClick={() => handleDelete(row.id)}>
          Delete
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recipes (Bill of Materials)</h1>
          <p className="text-sm text-slate-500">Map restaurant menu items to ingredient BOM recipes for automatic consumption on order preparation.</p>
        </div>
        <Button onClick={openCreateModal}>Create Recipe</Button>
      </div>

      <Card title="Recipe Registry" eyebrow="BOM Mapping">
        <Table columns={columns} data={recipes} emptyMessage="No recipes defined. Create one to link a menu item to ingredients." />
      </Card>

      <Modal
        open={modalOpen}
        title={editingRecipe ? 'Edit Recipe (BOM)' : 'Define New Recipe (BOM)'}
        onClose={closeModal}
        maxWidth="max-w-4xl"
      >
        <form onSubmit={handleSaveRecipe} className="space-y-6">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-xs font-semibold text-emerald-800 mb-3">Menu mapping</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SelectField
                label="Restaurant"
                value={selectedRestaurantId}
                onChange={(e) => handleRestaurantChange(e.target.value)}
                options={[{ value: '', label: 'Select restaurant...' }, ...restaurantOptions]}
                required
              />
              <SelectField
                label="Category"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                options={[{ value: '', label: 'All Categories' }, ...catalogCategories.map((c) => ({ value: c.id, label: c.name }))]}
                disabled={!selectedRestaurantId || catalogLoading}
                required
              />
              <SearchableSelect
                label="Menu Item"
                value={menuItemId}
                onChange={(val) => setMenuItemId(val)}
                options={menuItemOptions}
                placeholder="Search menu items..."
                required
                disabled={!selectedRestaurantId || catalogLoading}
              />
            </div>
            {catalogLoading && <p className="mt-3 text-xs text-slate-500">Loading menu catalog from the Restaurant Management System...</p>}
            {catalogError && <p className="mt-3 text-xs text-rose-600">{catalogError}</p>}
            {!catalogLoading && selectedRestaurantId && !catalogError && (
              <p className="mt-3 text-xs text-slate-500">
                {menuItems.length} menu items · {catalogCategories.length} categories · select by name only — the system stores the menu ID internally.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextField
              label="Yield Quantity"
              type="number"
              step="any"
              min="0.1"
              value={yieldQty}
              onChange={(e) => setYieldQty(e.target.value)}
              required
            />
            <p className="text-xs text-slate-400 md:col-span-2 self-end pb-1">
              One portion (yield) of the selected menu item consumes the ingredient quantities below.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-slate-900">Ingredient Requirements</h4>
              <Button variant="secondary" className="py-1 px-3 text-xs" onClick={addItemRow}>+ Add Ingredient</Button>
            </div>
            {recipeItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[1.5fr_1fr_0.7fr_1fr_auto] gap-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                <SelectField
                  label="Ingredient"
                  value={item.ingredientId}
                  onChange={(e) => handleItemChange(idx, 'ingredientId', e.target.value)}
                  options={[{ value: '', label: 'Select ingredient...' }, ...ingredients.map((ing) => ({ label: `${ing.name} (${ing.sku})`, value: ing.id }))]}
                  required
                />
                <TextField
                  label="Qty per Portion"
                  type="number"
                  step="any"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                  required
                />
                <TextField label="Unit" value={item.unit} onChange={(e) => handleItemChange(idx, 'unit', e.target.value)} required />
                <TextField
                  label="Wastage %"
                  type="number"
                  step="any"
                  value={item.wastagePct}
                  onChange={(e) => handleItemChange(idx, 'wastagePct', e.target.value)}
                />
                <Button variant="danger" className="py-2.5 px-3 mb-0.5" onClick={() => removeItemRow(idx)} disabled={recipeItems.length === 1}>
                  X
                </Button>
              </div>
            ))}
          </div>

          {submitError ? <ErrorState error={submitError} /> : null}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{editingRecipe ? 'Save Changes' : 'Save Recipe'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
