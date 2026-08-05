import React, { useState } from 'react';
import {
  useGetRecipesQuery,
  useGetStoreInventoryQuery,
  useCreateOrUpdateRecipeMutation,
} from '../../services/inventoryApi';
import { InventorySubNav } from './InventorySubNav';

export function RecipesPage() {
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [recipeName, setRecipeName] = useState('');
  const [yieldQuantity, setYieldQuantity] = useState(1);
  const [ingredients, setIngredients] = useState([{ itemId: '', quantity: 1, unit: 'GM' }]);

  const { data: recipes, isLoading, error, refetch } = useGetRecipesQuery();
  const { data: storeInventory } = useGetStoreInventoryQuery();
  const [saveRecipe, { isLoading: isSaving }] = useCreateOrUpdateRecipeMutation();

  const handleEditClick = (item) => {
    setEditingMenuItem(item);
    setRecipeName(item.recipeName || `${item.menuItemName} Recipe`);
    setYieldQuantity(item.yieldQuantity || 1);
    if (item.ingredients.length > 0) {
      setIngredients(
        item.ingredients.map((ing) => ({
          itemId: ing.itemId,
          quantity: ing.quantity,
          unit: ing.unit,
        }))
      );
    } else {
      setIngredients([{ itemId: '', quantity: 1, unit: 'GM' }]);
    }
  };

  const handleAddIngredientRow = () => {
    setIngredients([...ingredients, { itemId: '', quantity: 1, unit: 'GM' }]);
  };

  const handleRemoveIngredientRow = (index) => {
    const updated = [...ingredients];
    updated.splice(index, 1);
    setIngredients(updated);
  };

  const handleIngredientChange = (index, field, value) => {
    const updated = [...ingredients];
    updated[index][field] = value;

    // Automatically set default unit if item is chosen
    if (field === 'itemId' && storeInventory) {
      const match = storeInventory.find((s) => s.itemId === Number(value));
      if (match) {
        updated[index].unit = match.unit;
      }
    }

    setIngredients(updated);
  };

  const handleSaveRecipeSubmit = async (e) => {
    e.preventDefault();
    const payloadIngredients = ingredients
      .filter((i) => i.itemId)
      .map((i) => ({
        itemId: Number(i.itemId),
        quantity: Number(i.quantity),
        unit: i.unit,
      }));

    if (payloadIngredients.length === 0) return;

    try {
      await saveRecipe({
        menuItemId: editingMenuItem.menuItemId,
        name: recipeName,
        yieldQuantity: Number(yieldQuantity),
        ingredients: payloadIngredients,
      }).unwrap();
      setEditingMenuItem(null);
      refetch();
    } catch (err) {
      console.error('Failed to save recipe BOM:', err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Recipes (Bill of Materials)</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Define raw ingredient quantities consumed per portion of a finished Menu Item.
        </p>
      </div>

      <InventorySubNav />

      {/* Recipes configured table */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-500/10 p-4 text-red-500">Failed to load recipes.</div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                <tr>
                  <th className="py-3 px-4">Menu Item</th>
                  <th className="py-3 px-4">Recipe Title</th>
                  <th className="py-3 px-4">Ingredients Count</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recipes.map((item) => (
                  <tr key={item.menuItemId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">{item.menuItemName}</td>
                    <td className="py-3.5 px-4 text-slate-500">{item.recipeName || 'Not Set'}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {item.hasRecipe ? `${item.ingredients.length} items` : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.hasRecipe
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-rose-500/10 text-rose-600'
                        }`}
                      >
                        {item.hasRecipe ? 'BOM CONFIGURED' : 'NO RECIPE (BOM)'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleEditClick(item)}
                        className="rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 text-xs"
                      >
                        {item.hasRecipe ? 'Edit Recipe (BOM)' : 'Configure BOM'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Recipe / BOM Modal */}
      {editingMenuItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                BOM Configuration: {editingMenuItem.menuItemName}
              </h3>
              <button
                onClick={() => setEditingMenuItem(null)}
                className="rounded-full bg-slate-100 dark:bg-slate-800 p-1.5 text-slate-400 hover:text-slate-900"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRecipeSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Recipe Name / Version</label>
                  <input
                    type="text"
                    required
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">Yield Output Portions</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={yieldQuantity}
                    onChange={(e) => setYieldQuantity(e.target.value)}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                <p className="text-xs font-bold text-slate-400 uppercase">Ingredient Specifications (BOM)</p>
                {ingredients.map((row, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <select
                      required
                      value={row.itemId}
                      onChange={(e) => handleIngredientChange(idx, 'itemId', e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                    >
                      <option value="">Select Ingredient</option>
                      {storeInventory?.map((item) => (
                        <option key={item.id} value={item.itemId}>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    <div className="w-28 flex items-center gap-1.5">
                      <input
                        type="number"
                        required
                        min="0.001"
                        step="0.001"
                        placeholder="Quantity"
                        value={row.quantity}
                        onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                      />
                      <span className="text-xs text-slate-500 font-semibold">{row.unit}</span>
                    </div>

                    {ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredientRow(idx)}
                        className="text-rose-500 text-sm hover:underline font-bold px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddIngredientRow}
                className="text-xs font-bold text-amber-500 hover:text-amber-600"
              >
                + Add Ingredient
              </button>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingMenuItem(null)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 disabled:opacity-50"
                >
                  {isSaving ? 'Saving Recipe...' : 'Save Recipe (BOM)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
