const formatRupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function ItemCustomizerModal({
  item,
  selectedVariant,
  selectedAddons,
  quantity,
  error,
  unitPrice,
  onSelectVariant,
  onToggleAddon,
  onSetQuantity,
  onAdd,
  onClose,
}) {
  if (!item) {
    return null;
  }

  return (
    <div className="customizer-overlay" onClick={onClose}>
      <div className="customizer-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="customizer-header">
          <div className="customizer-header-info">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" />
            ) : (
              <div
                className="menu-slide-placeholder"
                style={{ width: "60px", height: "60px" }}
              />
            )}
            <div className="customizer-header-copy">
              <h2>{item.name}</h2>
              <p>{item.description || "Freshly cooked to your requirements."}</p>
              <strong>{formatRupees.format(unitPrice)}</strong>
            </div>
          </div>
          <button
            type="button"
            className="customizer-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Customization Content */}
        <div className="customizer-body">
          {/* Option 1: Variants Selector (Capsules) */}
          {item.variants && item.variants.length > 0 && (
            <div className="customizer-variant-section">
              <h3>Select Variant / Size</h3>
              <div className="customizer-variant-grid">
                {item.variants.map((v) => (
                  <div
                    key={`variant-${v.id}`}
                    className={`customizer-variant-pill ${selectedVariant?.id === v.id ? "selected" : ""}`}
                    onClick={() => onSelectVariant(v)}
                  >
                    <span>{v.name}</span>
                    <strong>{formatRupees.format(v.price)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Option 2: Addon Groups */}
          {item.addonGroups &&
            item.addonGroups
              .filter((g) => g.options.length > 0)
              .map((group) => {
                const maxSelect =
                  group.selectionType === "SINGLE" ? 1 : group.maxSelect;

                return (
                  <div
                    key={`addon-group-${group.id}`}
                    className="customizer-option-group"
                  >
                    <div className="customizer-group-title">
                      <div>
                        <h3>{group.name}</h3>
                        {maxSelect && (
                          <span className="customizer-group-limits">
                            Choose up to {maxSelect} option(s)
                          </span>
                        )}
                      </div>
                      <span
                        className={`customizer-group-badge ${group.isRequired ? "required" : ""}`}
                      >
                        {group.isRequired ? "Required" : "Optional"}
                      </span>
                    </div>

                    <div className="customizer-option-list">
                      {group.options.map((opt) => {
                        const isChecked = selectedAddons.some(
                          (addon) => addon.addonOptionId === opt.id,
                        );
                        const inputType =
                          group.selectionType === "SINGLE"
                            ? "radio"
                            : "checkbox";

                        return (
                          <div
                            key={`option-${opt.id}`}
                            className={`customizer-option-row ${isChecked ? "checked" : ""}`}
                            onClick={() => onToggleAddon(group, opt)}
                          >
                            <label
                              className="customizer-option-label"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type={inputType}
                                name={`group-${group.id}`}
                                checked={isChecked}
                                onChange={() => onToggleAddon(group, opt)}
                              />
                              <span>{opt.name}</span>
                            </label>
                            <span className="customizer-option-price">
                              + {formatRupees.format(opt.price)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
        </div>

        {/* Error alerts */}
        {error && (
          <div className="customizer-addon-error" style={{ margin: "1rem" }}>
            {error}
          </div>
        )}

        {/* Footer with Quantities Stepper and Checkout Action */}
        <div className="customizer-footer">
          <div className="customizer-stepper">
            <button
              type="button"
              className="customizer-stepper-button"
              onClick={() => onSetQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              -
            </button>
            <strong>{quantity}</strong>
            <button
              type="button"
              className="customizer-stepper-button"
              onClick={() => onSetQuantity((q) => q + 1)}
            >
              +
            </button>
          </div>

          <button
            type="button"
            className="primary-btn customizer-add-btn"
            onClick={onAdd}
          >
            Add Item - {formatRupees.format(unitPrice * quantity)}
          </button>
        </div>
      </div>
    </div>
  );
}
