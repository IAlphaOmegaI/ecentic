/** A leaning wine bottle, lifted cork and curved paper label unfold for inspection. */
const { Cam, clamp, facing, fit, proj, circ, ringAt, hull, poly, open, run, rrect,
  prism, solid, put, mk, tween, tset, tval, tdone, disposer, pointer, register } = HL;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const state = { value: clamp(value, 6, 18), active: -1, last: '' };
  const C = Cam(45, 0.5, 1.70);
  fit(C, [[-33, -28, 0], [34, 33, 0], [46, -42, 158], [7, 2, 191]], 200, 166);
  const P = proj(C), front = facing(C);
  // The glass leans as one object; rest is intentionally off-axis.
  const Q = (x, y, z) => P(x + z * 0.38, y - z * 0.10, z);
  const root = mk('g', {}, svg);
  const neck = solid(root), body = solid(root), cork = solid(root);
  const grain = mk('path', { class: 'nf lo' }, cork.g);
  const label = solid(root);
  const round = radius => circ(radius, 72);
  const bodyRing = round(26), bottomRing = round(24.5), shoulderRing = round(23.5);
  const neckRing = round(9), neckInner = round(7.5), corkRing = round(8.5), corkInner = round(7);
  const labelRing = rrect(-25, 28, 25, 71, 3, 9), labelInner = rrect(-23.5, 29.5, 23.5, 69.5, 2, 9);
  const parts = [
    { name: 'cork', lift: tween(8), rest: 8 },
    { name: 'bottle', lift: tween(0), rest: 0 },
    { name: 'label', lift: tween(2), rest: 2 },
  ];
  const centers = [Q(-15, 10, 155), Q(0, 0, 97), Q(23, 23, 49)];
  const radii = [[32, 30], [48, 35], [51, 42]];
  const hit = ([x, y]) => {
    const distances = centers.map((point, index) =>
      ((x - point[0]) / radii[index][0]) ** 2 + ((y - point[1]) / radii[index][1]) ** 2);
    const nearest = distances.reduce((best, distance, index) => distance < distances[best] ? index : best, 0);
    return distances[nearest] < 1.25 ? nearest : -1;
  };
  const draw = now => {
    const [stopper, glass, paper] = parts.map(part => tval(part.lift, now));
    const signature = [stopper, glass, paper].map(position => position.toFixed(5)).join(':');
    if (signature === state.last) return;
    state.last = signature;
    const bottle = (x, y, z) => Q(x, y, z + glass);
    put(neck, prism(bottle, front, neckRing, neckInner, 103, 139));
    // Rounded shoulder rings conceal the neck's lower seam.
    const profile = [[bottomRing, 0], [bodyRing, 3], [bodyRing, 77],
      [shoulderRing, 87], [round(18), 96], [neckRing, 106]];
    put(body, { sil: poly(hull(profile.flatMap(([ring, height]) => ringAt(bottle, ring, height)))),
      crease: open(ringAt(bottle, run(round(24), front), 3)) });
    const cap = (x, y, z) => Q(x - 14, y + 9, z + stopper + glass * 0.35);
    put(cork, prism(cap, front, corkRing, corkInner, 139, 156));
    grain.setAttribute('d', open(ringAt(cap, run(round(8.2), front), 145)));
    const paperPoint = (u, z, inset = 0) => {
      const angle = Math.PI / 4 + u / 36;
      return bottle((27 + paper - inset) * Math.cos(angle), (27 + paper - inset) * Math.sin(angle), z);
    };
    put(label, { sil: poly(labelRing.map(point => paperPoint(point.u, point.v))),
      crease: open(labelInner.filter(point => point.v < 32).map(point => paperPoint(point.u, point.v, -0.1))) });
  };
  label.sil.classList.add('hi');
  read.textContent = 'rest';
  draw(0);
  const loop = register(stage, (_dt, now) => { draw(now); return parts.some(part => !tdone(part.lift, now)); });
  bag.add(loop.unregister);
  const select = (index, force = false) => {
    if (index === state.active && !force) return;
    const origin = index < 0 ? state.active : index;
    state.active = index;
    parts.forEach((part, item) => {
      const distance = Math.abs(item - origin), reach = index < 0 ? 0 : Math.exp(-distance * 1.3);
      tset(part.lift, part.rest + state.value * reach * (item === 1 ? 0.45 : 1), performance.now(), distance * 40);
    });
    cork.sil.classList.toggle('hi', index === 0);
    body.sil.classList.toggle('hi', index === 1);
    neck.sil.classList.toggle('hi', index === 1);
    label.sil.classList.toggle('hi', index === 2 || index < 0);
    read.textContent = index < 0 ? 'rest' : parts[index].name;
    loop.wake();
  };
  bag.add(pointer(stage, { move: point => select(hit(point)), leave: () => select(-1) }));
  bag.add(() => svg.replaceChildren());
  return { set: next => { state.value = clamp(next, 6, 18); select(state.active, true); }, destroy: bag.dispose };
}

hairline({ name: 'wine-bottle', means: 'A leaning wine bottle releases its cork and curved paper label for inspection, with each neighbour following quietly.',
  rules: [1, 2, 3, 4, 5, 6, 8, 9], range: [6, 12, 18], mount });
