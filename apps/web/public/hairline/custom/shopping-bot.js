/** A tabletop shopping bot turns its scanner toward a fanned set of product cards. */
const { Cam, clamp, facing, fit, open, poly, proj, ringAt, rings, rrect, seg, prism,
  spring, stepS, tween, tset, tval, tdone, disposer, mk, solid, put, pointer, register, unproj } = HL;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const state = { value: clamp(value, 6, 18), active: -1, inside: false, head: '', beam: '' };
  const C = Cam(45, 0.5, 1.72);
  fit(C, [[-51, 2, 0], [-3, 55, 0], [30, -61, 0], [82, 18, 0],
    [-50, 7, 105], [0, 55, 105], [30, -61, 100], [82, 18, 100]], 200, 166);
  const P = proj(C), front = facing(C);
  const root = mk('g', {}, svg);
  const beam = mk('path', { class: 'nf dash lo' }, root);
  const base = mk('g', {}, root);
  const still = (ring, inner, z0, z1) => put(solid(base), prism(P, front, ring, inner, z0, z1));
  const block = (x0, y0, x1, y1, radius, z0, z1) => {
    const [ring, inner] = rings(x0, y0, x1, y1, radius, 1.1);
    still(ring, inner, z0, z1);
  };
  // Opaque boots and a compact body give the scanner a physical, asymmetric stance.
  block(-47, 2, -9, 22, 6, 0, 10);
  block(-50, 29, -9, 50, 6, 2, 12);
  block(-41, 14, -11, 40, 7, 10, 46);
  const chest = mk('path', { class: 'nf lo' }, base);
  chest.setAttribute('d', poly(rrect(20, 24, 33, 30, 3, 8).map(q => P(-10.8, q.u, q.v))));
  const neck = solid(root), head = solid(root);
  const visor = mk('path', { class: 'nf sil hi' }, head.g);
  const eyes = [mk('path', { class: 'nf' }, head.g), mk('path', { class: 'nf' }, head.g)];
  const antenna = solid(head.g);
  const [neckRing, neckInner] = rings(-32, 21, -20, 33, 4, 1);
  const [headRing, headInner] = rings(-24, -19, 24, 19, 8, 1.3);
  const [tipRing, tipInner] = rings(-2, -6, 2, -2, 1.7, 0.6);
  const yaw = spring(-0.14), height = spring(0);
  const cards = [-43, -18, 7].map((y, index) => {
    const group = mk('g', {}, root);
    return { y, index, rest: [0, 2, 5][index], last: '', lift: tween([0, 2, 5][index]),
      tilt: tween(-12 + index * 2), back: mk('path', { class: 'lo' }, group),
      face: mk('path', { class: 'sil' }, group), image: mk('path', { class: 'nf lo' }, group),
      detail: mk('path', { class: 'nf lo' }, group), group };
  });
  const outline = rrect(0, 0, 50, 68, 4, 8);
  const picture = rrect(8, 29, 42, 57, 4, 8);
  const target = (card, tilt, lift) => {
    const angle = tilt * Math.PI / 180;
    return (u, v, thickness = 0) => P(30 + u, card.y + Math.sin(angle) * v - thickness,
      8 + Math.cos(angle) * v + lift);
  };
  const hits = cards.map(card => {
    const at = target(card, -12 + card.index * 2, card.rest);
    return { x: at(25, 56)[0], top: at(25, 68)[1], bottom: at(25, 0)[1] };
  });
  const hit = ([x, y]) => {
    const nearest = hits.reduce((best, point, index) =>
      Math.abs(point.x - x) < Math.abs(hits[best].x - x) ? index : best, 0);
    const point = hits[nearest];
    return Math.abs(point.x - x) < 24 && y > point.top - 15 && y < point.bottom + 9 ? nearest : -1;
  };
  const draw = now => {
    const angle = yaw.x, lift = height.x;
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    const Q = (x, y, z) => P(-26 + x * cosine - y * sine, 27 + x * sine + y * cosine, z + lift);
    const headFront = q => front({ nu: q.nu * cosine - q.nv * sine, nv: q.nu * sine + q.nv * cosine });
    const signature = `${angle.toFixed(5)}:${lift.toFixed(5)}`;
    if (signature !== state.head) {
      state.head = signature;
      put(neck, prism(P, front, neckRing, neckInner, 43, 54 + lift));
      put(head, prism(Q, headFront, headRing, headInner, 51, 85));
      visor.setAttribute('d', poly(rrect(-14, 59, 14, 77, 6, 10).map(q => Q(24.2, q.u, q.v))));
      eyes.forEach((eye, index) => eye.setAttribute('d', poly(rrect(-10 + index * 13, 64,
        -3 + index * 13, 72, 3.4, 8).map(q => Q(24.4, q.u, q.v)))));
      put(antenna, prism(Q, headFront, tipRing, tipInner, 84, 100));
    }
    cards.forEach(card => {
      const rise = tval(card.lift, now), tilt = tval(card.tilt, now);
      const signature = `${rise.toFixed(5)}:${tilt.toFixed(5)}`;
      if (signature === card.last) return;
      card.last = signature;
      const at = target(card, tilt, rise);
      card.back.setAttribute('d', poly(outline.map(q => at(q.u, q.v, 1.4))));
      card.face.setAttribute('d', poly(outline.map(q => at(q.u, q.v))));
      card.image.setAttribute('d', poly(picture.map(q => at(q.u, q.v))));
      card.detail.setAttribute('d', [seg(at(9, 21), at(39, 21)), seg(at(9, 15), at(29, 15)),
        open(rrect(9, 7, 19, 9, 1, 4).map(q => at(q.u, q.v)))].join(''));
    });
    const card = cards[state.active < 0 ? 2 : state.active];
    const at = target(card, tval(card.tilt, now), tval(card.lift, now));
    const beamPath = seg(Q(25, 0, 68), at(8, 30)) + seg(Q(25, 0, 68), at(42, 57));
    if (beamPath !== state.beam) { state.beam = beamPath; beam.setAttribute('d', beamPath); }
  };
  read.textContent = 'rest';
  draw(0);
  const loop = register(stage, (dt, now) => {
    const turning = stepS(yaw, dt), rising = stepS(height, dt);
    draw(now);
    return turning || rising || cards.some(card => !tdone(card.lift, now) || !tdone(card.tilt, now));
  });
  bag.add(loop.unregister);
  const select = (index, force = false) => {
    if (index === state.active && !force) return;
    const origin = index < 0 ? state.active : index;
    state.active = index;
    const now = performance.now();
    cards.forEach(card => {
      const distance = Math.abs(card.index - origin);
      const reach = index < 0 ? 0 : Math.exp(-distance * 1.6);
      tset(card.lift, card.rest + state.value * reach, now, distance * 40);
      tset(card.tilt, -12 + card.index * 2 + (index < 0 ? 0 : 15 * reach), now, distance * 40);
      card.face.classList.toggle('hi', card.index === index);
    });
    visor.classList.toggle('hi', index < 0);
    read.textContent = index < 0 ? (state.inside ? 'scanning' : 'rest') : `selected product ${index + 1}`;
    loop.wake();
  };
  bag.add(pointer(stage, {
    move: point => {
      state.inside = true;
      const [x, y] = unproj(C, point[0], point[1], 66);
      yaw.t = clamp(Math.atan2(y - 27, x + 26), -0.4, 0.5);
      height.t = clamp((166 - point[1]) / 28, -2, 4);
      select(hit(point));
      if (state.active < 0) read.textContent = 'scanning';
      loop.wake();
    },
    leave: () => {
      state.inside = false; yaw.t = -0.14; height.t = 0;
      select(-1); read.textContent = 'rest'; loop.wake();
    },
  }));
  bag.add(() => svg.replaceChildren());
  return { set: next => { state.value = clamp(next, 6, 18); select(state.active, true); }, destroy: bag.dispose };
}

hairline({ name: 'shopping-bot',
  means: 'A shopping bot aims its scanner at product cards; the chosen card rises and its neighbours follow.',
  rules: [1, 3, 4, 5, 8, 9], range: [6, 12, 18], mount });
