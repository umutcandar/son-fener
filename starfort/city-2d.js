// Painted city. Presentation only: building ids and levels still come from the save.
// Bases sit on the quay pads of the wide gothic panorama.
export const CITY_SPOTS = {
  farm: { x: 9, y: 86, w: 12 },
  lumber: { x: 23, y: 86, w: 12 },
  forge: { x: 37, y: 85, w: 12 },
  tavern: { x: 51, y: 86, w: 11 },
  quarry: { x: 64, y: 85, w: 12 },
  observatory: { x: 78, y: 84, w: 12 },
  keep: { x: 91, y: 83, w: 15 },
};

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
    const label = document.createElement('span');
    label.className = 'city-label';
    label.innerHTML = '<span class="city-label-level"></span><span class="city-label-name"></span>';
    const img = document.createElement('img');
    img.alt = '';
    img.draggable = false;
    img.src = `assets/buildings/${id}-a.webp`;
    button.append(label, img);
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
    const short = rect.width > rect.height && rect.height < 520;
    const minW = rect.width * (short ? 1.7 : 1.18);
    let w = Math.max(rect.height * aspect, minW);
    let h = w / aspect;
    if (h < rect.height) { h = rect.height; w = h * aspect; }
    scene.style.width = `${w}px`;
    scene.style.height = `${h}px`;
    if (reset) {
      scale = short ? 0.78 : 1;
      const sw = w * scale;
      const sh = h * scale;
      const focusY = short ? 0.7 : 0.64;
      x = short ? -sw * 0.02 : rect.width * 0.5 - sw * 0.5;
      y = rect.height * 0.56 - sh * focusY;
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
