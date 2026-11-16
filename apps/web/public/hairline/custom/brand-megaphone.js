const { Cam, clamp, disposer, fit, hull, mk, open, pointer, poly, proj, rad, register, rrect, spring, stepS } = HL;

/** A handheld speaking horn: the bell gently aims toward the inspecting pointer. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { reach: value, active: false, last: null };
  const pitch = spring(0);
  const pivot = [45, 34, 40];
  const axis = x => 74 + (x - 30) * 0.2;
  const ring = (x, radius, steps = 64) => Array.from({ length: steps }, (_, index) => {
    const angle = index * Math.PI * 2 / steps;
    return [x, 34 + Math.cos(angle) * radius, axis(x) + Math.sin(angle) * radius];
  });
  const turn = ([x, y, z], angle) => {
    const sine = Math.sin(rad(angle)), cosine = Math.cos(rad(angle));
    const dx = x - pivot[0], dz = z - pivot[2];
    return [pivot[0] + dx * cosine - dz * sine, y, pivot[2] + dx * sine + dz * cosine];
  };
  const frame = [...ring(4, 11), ...ring(119, 39), [29, 25, 8], [52, 43, 66]];
  const camera = Cam(45, 0.5, 2.25);
  fit(camera, frame.flatMap(point => [-10, 0, 10].map(angle => turn(point, angle))), 200, 166);
  const P = proj(camera);
  const group = mk('g', {}, svg);
  const handle = rrect(29, 8, 48, 67, 5, 10);
  const innerHandle = rrect(31.5, 10.5, 45.5, 64.5, 3, 10);
  const flare = [0, 0.2, 0.4, 0.6, 0.8, 1].flatMap(amount => ring(31 + amount * 85, 13 + amount ** 1.45 * 26));

  const geometry = angle => {
    const project = point => P(...turn(point, angle));
    const circle = (x, radius) => ring(x, radius).map(project);
    const grip = (shape, y) => shape.map(point => project([point.u + (point.v - 8) * 0.1, y, point.v]));
    const throat = ring(99, 7, 48).map(project);
    return [
      { class: 'sil', d: poly(hull([...grip(handle, 25), ...grip(handle, 43)])) },
      { class: 'nf lo', d: open(grip(innerHandle, 43).slice(9, 30)) },
      { class: 'sil', d: poly(hull([...circle(4, 11), ...circle(33, 14)])) },
      { class: 'nf lo', d: open(circle(7, 9).slice(3, 35)) },
      { class: 'sil', d: poly(hull(flare.map(project))) },
      { class: 'nf lo', d: open(circle(35, 14).slice(4, 34)) },
      { class: 'sil hi', d: poly(circle(119, 39)) },
      { class: 'nf lo', d: poly(circle(119.5, 35.5)) },
      { class: 'nf lo', d: poly(throat) },
    ];
  };
  const nodes = geometry(0).map(attributes => mk('path', attributes, group));
  const draw = angle => {
    const signature = angle.toFixed(4);
    if (signature === state.last) return;
    state.last = signature;
    geometry(angle).forEach((attributes, index) => nodes[index].setAttribute('d', attributes.d));
  };
  const clock = register(stage, delta => {
    const moving = stepS(pitch, delta);
    draw(pitch.x);
    return moving;
  });
  const center = P(94, 34, axis(94));
  const inspect = point => {
    const active = point !== null && Math.hypot(point[0] - center[0], point[1] - center[1]) < 112;
    state.active = active;
    pitch.t = active ? state.reach * (0.4 + 0.6 * clamp((center[1] - point[1]) / 90, -1, 1)) : 0;
    read.textContent = active ? 'bell' : 'rest';
    clock.wake();
  };
  cleanup.add(pointer(stage, { move: inspect, leave: () => inspect(null) }));
  cleanup.add(clock.unregister);
  cleanup.add(() => svg.replaceChildren());
  read.textContent = 'rest';
  return {
    set: next => { state.reach = clamp(next, 3, 10); if (state.active) { pitch.t = state.reach * 0.4; clock.wake(); } },
    destroy: cleanup.dispose,
  };
}

hairline({
  name: 'brand-megaphone',
  means: 'A handheld speaking horn: the bell gently aims toward the inspecting pointer.',
  rules: [1, 3, 4, 5, 6, 7, 8, 9, 10],
  range: [3, 6, 10],
  answer: [105, 34, 89],
  edge: [118, 34, 115],
  mount,
});
