import type { AddOnIngredient } from '../../types/addOn.types';
import type { QRMenuAddonGroup, QRMenuItem, QRMenuItemVariant } from '../../types/menu.types';
import { formatCurrency } from '../../utils/formatters';
import { getMenuItemImage } from '../../utils/images';

interface AddOnSheetProps {
  item: QRMenuItem | null;
  selectedAddOns: AddOnIngredient[];
  selectedVariantId?: number;
  quantity: number;
  validationMessage?: string;
  onSelectVariant: (variant: QRMenuItemVariant) => void;
  onToggleAddOn: (group: QRMenuAddonGroup, optionId: number) => void;
  onIncrease: () => void;
  onDecrease: () => void;
  onAdd: () => void;
  onClose: () => void;
}

export function AddOnSheet({
  item,
  selectedAddOns,
  selectedVariantId,
  quantity,
  validationMessage,
  onSelectVariant,
  onToggleAddOn,
  onIncrease,
  onDecrease,
  onAdd,
  onClose,
}: AddOnSheetProps) {
  if (!item) {
    return null;
  }

  const variants = item.variants?.filter((variant) => variant.isAvailable) ?? [];
  const addonGroups = item.addonGroups?.filter((group) => group.options.length > 0) ?? [];
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
  const itemPrice = (selectedVariant?.price ?? item.price) + addOnsTotal;
  const total = itemPrice * quantity;

  return (
    <div className="qr-sheet-backdrop" onClick={onClose} role="presentation">
      <section
        className="qr-addon-sheet"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-addon-title"
      >
        <div className="qr-sheet-handle" />
        <div className="qr-sheet-header">
          <article className="qr-sheet-food">
            <img src={getMenuItemImage(item)} alt={item.name} />
            <div>
              <h2 id="qr-addon-title">{item.name}</h2>
              <p>{item.description || 'Freshly prepared and served at your table.'}</p>
              <strong>{formatCurrency(itemPrice)}</strong>
            </div>
          </article>
          <button className="qr-sheet-close" type="button" onClick={onClose} aria-label="Close add-ons">
            x
          </button>
        </div>

        {variants.length > 0 ? (
          <div className="qr-variant-list" aria-label="Size options">
            {variants.map((variant) => (
              <button
                className={`qr-variant-pill ${selectedVariantId === variant.id ? 'is-selected' : ''}`}
                key={variant.id}
                type="button"
                onClick={() => onSelectVariant(variant)}
              >
                <span>{variant.name}</span>
                <strong>{formatCurrency(variant.price)}</strong>
              </button>
            ))}
          </div>
        ) : null}

        {addonGroups.length > 0 ? (
          <div className="qr-addon-groups">
            {addonGroups.map((group) => (
              <section className="qr-addon-group" key={group.id}>
                <div className="qr-addon-group-title">
                  <h3>{group.name}</h3>
                  <span>{group.isRequired ? 'Required' : group.selectionType === 'SINGLE' ? 'Choose one' : 'Optional'}</span>
                </div>
                <div className="qr-addon-list">
                  {group.options.map((option) => {
                    const isSelected = selectedAddOns.some(
                      (addOn) =>
                        addOn.addonGroupId === group.id && addOn.addonOptionId === option.id,
                    );

                    return (
                      <button
                        className="qr-addon-row"
                        key={option.id}
                        type="button"
                        onClick={() => onToggleAddOn(group, option.id)}
                      >
                        <span>{option.name}</span>
                        <i />
                        <strong>{formatCurrency(option.price)}</strong>
                        <em className={isSelected ? 'is-selected' : ''} />
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="qr-addon-empty">No add-ons available for this item.</div>
        )}

        {validationMessage ? <p className="qr-addon-error">{validationMessage}</p> : null}

        <div className="qr-sheet-actions">
          <div className="qr-stepper qr-stepper--large">
            <button
              type="button"
              className="qr-stepper-button qr-stepper-button--muted"
              onClick={onDecrease}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              -
            </button>
            <strong>{quantity}</strong>
            <button
              type="button"
              className="qr-stepper-button"
              onClick={onIncrease}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button className="qr-add-item-button" type="button" onClick={onAdd}>
            Add item - {formatCurrency(total)}
          </button>
        </div>
      </section>
    </div>
  );
}
