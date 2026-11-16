/** A sealed wine bottle with a rounded shoulder, glass heel and curved paper label. */
const { Cam, clamp, facing, fit, proj, circ, ringAt, hull, poly, open, run, rrect,
  prism, solid, put, mk, tween, tset, tval, tdone, disposer, pointer, register } = HL;

function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { reach: clamp(value, 6, 18), active: -1, previous: '' };
  const camera = Cam(45, 0.5, 1.8);
  fit(camera, [[-30, -30, 0], [30, 30, 0], [-30, 30, 0], [30, -30, 0], [0, 0, 171]], 200, 166);
  const P = proj(camera), front = facing(camera);
  const group = mk('g', {}, svg);
  const neck = solid(group), body = solid(group), cork = solid(group), label = solid(group);
  const round = radius => circ(radius, 96);
  const profile = [[27, 0], [29, 4], [29, 80], [28.8, 85], [27.8, 90],
    [25.8, 95], [22.5, 100], [18.3, 104.5], [13.3, 108], [10, 111]];
  const neckRing = round(10), neckInner = round(8.8);
  const corkRing = round(9.5), corkInner = round(8.3);
  const labelRing = rrect(-22, 25, 22, 69, 3.5, 14);
  const labelCrease = rrect(-20, 26.5, 20, 67.5, 2.5, 12);
  const parts = [
    { name: 'cork', offset: tween(0), factor: 1 },
    { name: 'bottle', offset: tween(0), factor: 0.14 },
    { name: 'label', offset: tween(0), factor: 0.22 },
  ];
  // Fixed rest centers keep each part selected while it answers the pointer.
  const centers = [P(0, 0, 145), P(0, 0, 95), P(21, 21, 47)];
  const radii = [[27, 27], [48, 35], [50, 42]];
  const hit = ([x, y]) => {
    const distances = centers.map((point, index) =>
      ((x - point[0]) / radii[index][0]) ** 2 + ((y - point[1]) / radii[index][1]) ** 2);
    const nearest = distances.reduce((best, distance, index) => distance < distances[best] ? index : best, 0);
    return distances[nearest] < 1.2 ? nearest : -1;
  };
  const draw = now => {
    const [stopper, glass, paper] = parts.map(part => tval(part.offset, now));
    const signature = [stopper, glass, paper].map(position => position.toFixed(5)).join(':');
    if (signature === state.previous) return;
    state.previous = signature;
    const bottle = (x, y, z) => P(x, y, z + glass);
    put(neck, prism(bottle, front, neckRing, neckInner, 107, 141));
    // A rounded glass shoulder conceals the lower neck seam.
    put(body, {
      sil: poly(hull(profile.flatMap(([radius, height]) => ringAt(bottle, round(radius), height)))),
      crease: open(ringAt(bottle, run(round(26.5), front), 4)),
    });
    // The stopper is seated at rest and rises directly above the bottle mouth.
    const cap = (x, y, z) => bottle(x, y, z + stopper);
    put(cork, prism(cap, front, corkRing, corkInner, 137, 150));
    const paperPoint = (u, z) => {
      const angle = Math.PI / 4 + u / 38;
      const distance = 29.6 + paper * Math.max(0, (z - 25) / 44);
      return bottle(distance * Math.cos(angle), distance * Math.sin(angle), z);
    };
    put(label, {
      sil: poly(labelRing.map(point => paperPoint(point.u, point.v))),
      crease: open(labelCrease.filter(point => point.v < 28).map(point => paperPoint(point.u, point.v))),
    });
  };
  label.sil.classList.add('hi');
  read.textContent = 'rest';
  draw(0);
  const loop = register(stage, (_delta, now) => {
    draw(now);
    return parts.some(part => !tdone(part.offset, now));
  });
  const select = (index, force = false) => {
    if (index === state.active && !force) return;
    const origin = index < 0 ? state.active : index;
    state.active = index;
    parts.forEach((part, position) => {
      const distance = Math.abs(position - origin);
      const reach = index < 0 ? 0 : Math.exp(-distance * 1.8);
      tset(part.offset, state.reach * reach * part.factor, performance.now(), distance * 40);
    });
    cork.sil.classList.toggle('hi', index === 0);
    body.sil.classList.toggle('hi', index === 1);
    neck.sil.classList.toggle('hi', index === 1);
    label.sil.classList.toggle('hi', index === 2 || index < 0);
    read.textContent = index < 0 ? 'rest' : parts[index].name;
    loop.wake();
  };
  cleanup.add(loop.unregister);
  cleanup.add(pointer(stage, { move: point => select(hit(point)), leave: () => select(-1) }));
  cleanup.add(() => svg.replaceChildren());
  return {
    set: next => { state.reach = clamp(next, 6, 18); select(state.active, true); },
    destroy: cleanup.dispose,
  };
}

hairline({ name: 'wine-bottle', means: 'An upright wine bottle: inspect the rounded glass, gently peel the paper label, or lift the seated cork.',
  rules: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], range: [6, 12, 18], mount });
