import { useCallback, useEffect, useMemo, useState } from "react";
import { getEffectiveMenuPrice } from "../store/slices/cartSlice";

export function needsCustomization(item) {
  return Boolean(
    item &&
      (item.variants?.length > 0 || (item.addonGroups?.length ?? 0) > 0),
  );
}

export function useItemCustomizer({ addToCart }) {
  const [customizingItem, setCustomizingItem] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");

  // Lock background scroll while the customizer sheet is open
  useEffect(() => {
    if (customizingItem) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [customizingItem]);

  const open = useCallback((item) => {
    setCustomizingItem(item);
    setSelectedVariant(item?.variants?.[0] || null);
    setSelectedAddons([]);
    setQuantity(1);
    setError("");
  }, []);

  const close = useCallback(() => {
    setCustomizingItem(null);
    setError("");
  }, []);

  const toggleAddon = useCallback((group, option) => {
    setSelectedAddons((current) => {
      const isSelected = current.some(
        (addon) => addon.addonOptionId === option.id,
      );

      if (isSelected) {
        return current.filter((addon) => addon.addonOptionId !== option.id);
      }

      // If single choice group, filter out other options from same group
      if (group.selectionType === "SINGLE") {
        const filtered = current.filter(
          (addon) => addon.addonGroupId !== group.id,
        );
        return [
          ...filtered,
          {
            addonGroupId: group.id,
            addonGroupName: group.name,
            addonOptionId: option.id,
            addonOptionName: option.name,
            name: option.name,
            price: option.price,
          },
        ];
      }

      // Check maxSelect limits
      const groupSelections = current.filter(
        (addon) => addon.addonGroupId === group.id,
      );
      if (group.maxSelect && groupSelections.length >= group.maxSelect) {
        setError(
          `You can select a maximum of ${group.maxSelect} options for ${group.name}`,
        );
        return current;
      }

      setError("");
      return [
        ...current,
        {
          addonGroupId: group.id,
          addonGroupName: group.name,
          addonOptionId: option.id,
          addonOptionName: option.name,
          name: option.name,
          price: option.price,
        },
      ];
    });
  }, []);

  const addCustomizedToCart = useCallback(() => {
    setError("");

    // Validate required groups
    const activeGroups =
      customizingItem?.addonGroups?.filter((g) => g.options.length > 0) || [];
    for (const group of activeGroups) {
      const selections = selectedAddons.filter(
        (addon) => addon.addonGroupId === group.id,
      );

      const minSelect = group.isRequired
        ? Math.max(group.minSelect ?? 1, 1)
        : (group.minSelect ?? 0);

      if (selections.length < minSelect) {
        setError(
          `Please select at least ${minSelect} option(s) for ${group.name}`,
        );
        return;
      }
    }

    addToCart?.(customizingItem, selectedVariant, selectedAddons, quantity);
    setCustomizingItem(null);
  }, [
    addToCart,
    customizingItem,
    quantity,
    selectedAddons,
    selectedVariant,
  ]);

  // Dynamically calculate customized unit price
  const unitPrice = useMemo(() => {
    if (!customizingItem) return 0;
    const base = getEffectiveMenuPrice(customizingItem, selectedVariant);
    const addonsTotal = selectedAddons.reduce(
      (sum, addon) => sum + addon.price,
      0,
    );
    return base + addonsTotal;
  }, [customizingItem, selectedAddons, selectedVariant]);

  return {
    item: customizingItem,
    selectedVariant,
    selectedAddons,
    quantity,
    error,
    unitPrice,
    hasCustomization: needsCustomization,
    open,
    close,
    onSelectVariant: setSelectedVariant,
    onToggleAddon: toggleAddon,
    onSetQuantity: setQuantity,
    onAdd: addCustomizedToCart,
    onClose: close,
  };
}
