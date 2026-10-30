// Painted hillside town. Spots are the empty terraces on the backdrop.
// y is the front edge of each lot; higher on the hill paints behind.
export const CITY_SPOTS = {
  keep: { x: 53.0, y: 31.4, w: 16 },
  forge: { x: 39.2, y: 55.2, w: 12 },
  observatory: { x: 75.4, y: 53.2, w: 12 },
  farm: { x: 15.8, y: 66.0, w: 13.5 },
  lumber: { x: 33.4, y: 72.2, w: 13.5 },
  quarry: { x: 80.8, y: 70.0, w: 12.5 },
  tavern: { x: 63.4, y: 73.2, w: 13.5 },
};
const SMOKE_IDS = new Set(['keep', 'forge', 'farm', 'lumber', 'tavern']);

const tierOf = level => (level <= 2 ? 'a' : level <= 5 ? 'b' : 'c');

export function createCity2D(stage, { onSelect = () => {} } = {}) {
  const scene = stage.querySelector('#city-scene');
  const sprites = stage.querySelector('#city-labels');
  const buttons = new Map();
  let scale = 1, x = 0, y = 0, selected = 'keep';
  const pointers = new Map();
  let drag = null, pinch = null, moved = false;

  for (const [id, spot] of Object.entries(CITY_SPOTS)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'city-sprite';
    button.dataset.building = id;
    button.style.left = `${spot.x}%`;
    button.style.top = `${spot.y}%`;
    button.style.width = `${spot.w}%`;
    button.style.zIndex = String(20 + Math.round(spot.y));
    const label = document.createElement('span');
    label.className = 'city-label';
    label.innerHTML = '<span class="city-label-level"></span><span class="city-label-name"></span>';
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = `assets/buildings/${id}-a.webp`;
    button.append(label, img);
    if (SMOKE_IDS.has(id)) {
      const smoke = document.createElement('i');
      smoke.className = 'chimney-smoke';
      smoke.setAttribute('aria-hidden', 'true');
      button.append(smoke);
    }
    sprites.append(button);
    buttons.set(id, button);
  }

  function apply() {
    scene.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }
  function sceneSize() {
    return { w: scene.offsetWidth * scale, h: scene.offsetHeight * scale, rect: stage.getBoundingClientRect() };
  }
  function clampPan() {
    const { w, h, rect } = sceneSize();
    if (w <= rect.width) x = (rect.width - w) / 2;
    else x = Math.min(0, Math.max(rect.width - w, x));
    if (h <= rect.height) y = (rect.height - h) / 2;
    else y = Math.min(0, Math.max(rect.height - h, y));
  }
  function zoomAt(clientX, clientY, nextScale) {
    const rect = stage.getBoundingClientRect();
    const px = clientX - rect.left, py = clientY - rect.top;
    const next = Math.min(2.6, Math.max(0.38, nextScale));
    const k = next / scale;
    x = px - (px - x) * k;
    y = py - (py - y) * k;
    scale = next;
    clampPan();
    apply();
  }
  function layout(reset = true) {
    const rect = stage.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const aspect = 16 / 9;
    let w = rect.width;
    let h = w / aspect;
    if (h < rect.height) { h = rect.height; w = h * aspect; }
    scene.style.width = `${w}px`;
    scene.style.height = `${h}px`;
    if (reset) {
      scale = 1;
      x = (rect.width - w) / 2;
      const short = rect.height < 520 && rect.width > rect.height;
      y = short ? -h * 0.08 : rect.height * 0.46 - h * 0.5;
      clampPan();
      apply();
    }
  }
  function update(state) {
    for (const [id, button] of buttons) {
      const level = Math.max(1, Math.trunc(Number(state?.buildings?.[id]) || 1));
      const src = `assets/buildings/${id}-${tierOf(level)}.webp`;
      const img = button.querySelector('img');
      if (img.getAttribute('src') !== src) img.src = src;
      button.classList.toggle('is-selected', id === selected);
      button.style.zIndex = String((id === selected ? 40 : 0) + 20 + Math.round(CITY_SPOTS[id].y));
      button.setAttribute('aria-label', `${id} seviye ${level}`);
    }
  }
  function focus(id) {
    if (!CITY_SPOTS[id]) return;
    selected = id;
    const spot = CITY_SPOTS[id];
    const rect = stage.getBoundingClientRect();
    const { w, h } = sceneSize();
    const sx = (spot.x / 100) * w, sy = (spot.y / 100) * h;
    x = rect.width / 2 - sx;
    y = rect.height * 0.46 - sy;
    clampPan();
    apply();
    for (const [key, button] of buttons) button.classList.toggle('is-selected', key === id);
  }
  function zoomBy(factor) {
    const rect = stage.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, scale * factor);
  }
  function overview() { layout(true); }
  function resize() { layout(false); clampPan(); apply(); }

  stage.addEventListener('pointerdown', event => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    stage.setPointerCapture?.(event.pointerId);
    moved = false;
    if (pointers.size === 1) drag = { x: event.clientX, y: event.clientY, ox: x, oy: y };
    else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), scale, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      drag = null;
    }
  });
  stage.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, pinch.scale * (dist / pinch.dist));
      moved = true;
      return;
    }
    if (!drag) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 6) moved = true;
    x = drag.ox + dx; y = drag.oy + dy;
    clampPan();
    apply();
  });
  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) drag = null;
    else if (pointers.size === 1) {
      const remaining = [...pointers.values()][0];
      drag = { x: remaining.x, y: remaining.y, ox: x, oy: y };
    }
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);
  stage.addEventListener('click', event => {
    if (!moved) return;
    event.preventDefault();
    event.stopPropagation();
    moved = false;
  }, true);
  stage.addEventListener('wheel', event => {
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, scale * Math.exp(-event.deltaY * 0.0012));
  }, { passive: false });

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => resize()) : null;
  observer?.observe(stage);
  layout(true);
  function dispose() { observer?.disconnect(); }
  return { update, focus, resize, zoomBy, overview, dispose };
}
