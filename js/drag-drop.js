/**
 * js/drag-drop.js
 * Dual reordering engine for catalog cards:
 * 1. Pointer-event drag-and-drop (optimized for touch screens) & HTML5 Drag (desktop).
 * 2. Accessible arrow step reordering (▲ Up / ▼ Down buttons).
 */

import { updateProductsOrder } from './db.js';

let draggedElement = null;
let touchStartY = 0;
let isDragging = false;

/**
 * Initializes drag-and-drop and arrow button events on the catalog grid.
 * 
 * @param {HTMLElement} gridContainer - The #catalog-grid element.
 * @param {Function} onOrderChanged - Callback invoked when a reorder action is committed.
 */
export function initDragAndDrop(gridContainer, onOrderChanged) {
  if (!gridContainer) return;

  // 1. Event delegation for button-based reordering (▲ / ▼)
  gridContainer.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-move]');
    if (!button) return;

    const card = button.closest('.product-card');
    if (!card) return;

    const direction = button.dataset.move;
    const moved = moveCardStep(card, direction, gridContainer);

    if (moved && typeof onOrderChanged === 'function') {
      await persistCurrentDomOrder(gridContainer);
      onOrderChanged();
    }
  });

  // 2. Desktop HTML5 Drag & Drop
  gridContainer.addEventListener('dragstart', (event) => {
    const card = event.target.closest('.product-card');
    if (!card) return;

    draggedElement = card;
    card.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.dataset.id || '');
  });

  gridContainer.addEventListener('dragend', async (event) => {
    const card = event.target.closest('.product-card');
    if (card) {
      card.classList.remove('is-dragging');
    }
    draggedElement = null;
    clearDropIndicators(gridContainer);

    await persistCurrentDomOrder(gridContainer);
    if (typeof onOrderChanged === 'function') {
      onOrderChanged();
    }
  });

  gridContainer.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const targetCard = event.target.closest('.product-card');
    if (!targetCard || targetCard === draggedElement || !draggedElement) return;

    const rect = targetCard.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    if (event.clientY < midY) {
      gridContainer.insertBefore(draggedElement, targetCard);
    } else {
      gridContainer.insertBefore(draggedElement, targetCard.nextSibling);
    }
  });

  // 3. Touch / Pen Pointer handling for mobile devices
  gridContainer.addEventListener('pointerdown', (event) => {
    // Let native HTML5 drag handle desktop mouse events
    if (event.pointerType === 'mouse') return;

    const handle = event.target.closest('.drag-handle');
    if (!handle) return;

    const card = handle.closest('.product-card');
    if (!card) return;

    touchStartY = event.clientY;
    draggedElement = card;
    isDragging = false;
  });

  gridContainer.addEventListener('pointermove', (event) => {
    if (!draggedElement || event.pointerType === 'mouse') return;

    if (Math.abs(event.clientY - touchStartY) > 10) {
      isDragging = true;
      draggedElement.classList.add('is-dragging');

      const targetEl = document.elementFromPoint(event.clientX, event.clientY);
      const targetCard = targetEl?.closest('.product-card');

      if (targetCard && targetCard !== draggedElement && targetCard.parentNode === gridContainer) {
        const rect = targetCard.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;

        if (event.clientY < midY) {
          gridContainer.insertBefore(draggedElement, targetCard);
        } else {
          gridContainer.insertBefore(draggedElement, targetCard.nextSibling);
        }
      }
    }
  });

  const finishPointerDrag = async (event) => {
    if (event.pointerType === 'mouse') return;

    if (draggedElement) {
      draggedElement.classList.remove('is-dragging');
      if (isDragging) {
        await persistCurrentDomOrder(gridContainer);
        if (typeof onOrderChanged === 'function') {
          onOrderChanged();
        }
      }
    }
    draggedElement = null;
    isDragging = false;
  };

  gridContainer.addEventListener('pointerup', finishPointerDrag);
  gridContainer.addEventListener('pointercancel', finishPointerDrag);
}

function moveCardStep(card, direction, container) {
  if (direction === 'up') {
    const prev = card.previousElementSibling;
    if (prev) {
      container.insertBefore(card, prev);
      return true;
    }
  } else if (direction === 'down') {
    const next = card.nextElementSibling;
    if (next) {
      container.insertBefore(next, card);
      return true;
    }
  }
  return false;
}

/**
 * Reads the current sequence of card IDs in the DOM and updates their order in IndexedDB.
 * 
 * @param {HTMLElement} gridContainer - The grid element.
 * @returns {Promise<void>}
 */
async function persistCurrentDomOrder(gridContainer) {
  const cards = Array.from(gridContainer.querySelectorAll('.product-card'));
  const orderedIds = cards.map(card => card.dataset.id).filter(Boolean);
  await updateProductsOrder(orderedIds);
}

function clearDropIndicators(container) {
  container.querySelectorAll('.is-dragging').forEach((el) => {
    el.classList.remove('is-dragging');
  });
}