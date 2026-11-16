/** A shopping basket of physical conversation cards; lift a question to inspect it. */
const { Cam, clamp, facing, fillet, fit, hull, open, poly, proj, rad, ringAt, rrect, run, seg,
  tdone, tset, tval, tween, disposer, mk, pointer, register } = HL;

function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value };
  const camera = Cam(45, 0.5, 1.9);
  fit(camera, [[-8, -16, 0], [108, 58, 0], [-8, 58, 0], [108, -16, 0], [8, -16, 126], [98, 45, 126]], 200, 158);
  const P = proj(camera), front = facing(camera);
  const group = mk("g", {}, svg);
  const foot = rrect(1, -6, 99, 49, 5, 8);
  const rim = rrect(-8, -16, 108, 58, 6, 8);
  const inner = rrect(-4, -12, 104, 54, 4, 8);
  const ordered = points => points[0][0] < points[points.length - 1][0] ? points : points.slice().reverse();

  // The far wall and folded handle sit behind the cards.
  mk("path", { d: poly(hull(ringAt(P, foot, 0).concat(ringAt(P, rim, 42)))), class: "sil" }, group);
  mk("path", { d: poly(ringAt(P, inner, 42)), class: "nf lo" }, group);
  const handle = rrect(12, 34, 87, 84, 21, 14).map(point => P(point.u, -12, point.v));
  const handleInside = rrect(17, 34, 82, 79, 16, 14).map(point => P(point.u, -12, point.v));
  mk("path", { d: poly(handle) + poly(handleInside.slice().reverse()), class: "sil", "fill-rule": "evenodd" }, group);

  const cards = [
    { x: 21, y: -4, z: 50, lean: -5, height: 67 },
    { x: -1, y: 28, z: 43, lean: 4, height: 59 },
  ].map((rest, index) => {
    const holder = mk("g", {}, group);
    const vertices = [[0, 13], [13, 13], [10, 0], [31, 13], [77, 13], [77, rest.height], [0, rest.height]];
    return {
      ...rest, index,
      shape: fillet(vertices, [3, 1.5, 1.5, 1.5, 3, 5, 5], 6),
      back: mk("path", { class: "lo" }, holder),
      face: mk("path", { class: index === 1 ? "sil hi" : "sil" }, holder),
      lines: mk("path", { class: "nf lo" }, holder),
      lift: tween(0), angle: tween(rest.lean), previous: "",
    };
  });

  function draw(card, lift, lean) {
    const signature = `${lift.toFixed(4)}:${lean.toFixed(4)}`;
    if (card.previous === signature) return;
    card.previous = signature;
    const sine = Math.sin(rad(lean)), cosine = Math.cos(rad(lean));
    const project = (x, z, depth = 0) => P(card.x + x, card.y + z * sine + depth, card.z + z * cosine + lift);
    card.back.setAttribute("d", poly(card.shape.map(([x, z]) => project(x, z, -1.8))));
    card.face.setAttribute("d", poly(card.shape.map(([x, z]) => project(x, z))));
    card.lines.setAttribute("d", [0, 10, 20].map((row, index) => seg(project(13, card.height - 13 - row), project(index === 2 ? 48 : 63, card.height - 13 - row))).join(""));
  }
  cards.forEach(card => draw(card, 0, card.lean));

  // One near wall occludes the lower cards. Basket slots are molded into its two faces.
  const top = ordered(ringAt(P, run(rim, front), 42));
  const base = ordered(ringAt(P, run(foot, front), 0));
  const lip = ordered(ringAt(P, run(inner, front), 42));
  mk("path", { d: poly([...lip, top[top.length - 1], ...base.slice().reverse(), top[0]]), class: "fo" }, group);
  mk("path", { d: open(top), class: "nf lo" }, group);
  mk("path", { d: open(lip), class: "nf" }, group);
  mk("path", { d: open([top[0], ...base, top[top.length - 1]]), class: "nf sil" }, group);
  [15, 33, 51, 69, 87].forEach(x => {
    const slot = rrect(x - 3, 10, x + 3, 31, 3, 8);
    mk("path", { d: poly(slot.map(point => P(point.u, 49 + point.v * 9 / 42, point.v))), class: "nf lo" }, group);
  });
  [6, 23, 40].forEach(y => {
    const slot = rrect(y - 3, 10, y + 3, 31, 3, 8);
    mk("path", { d: poly(slot.map(point => P(99 + point.v * 9 / 42, point.u, point.v))), class: "nf lo" }, group);
  });
  // A short second handle folds against the near rim, identifying a hand basket.
  mk("path", { d: open(rrect(25, 35, 75, 43, 4, 10).map(point => P(point.u, 58, point.v))), class: "nf lo" }, group);

  const loop = register(stage, (_delta, now) => {
    cards.forEach(card => draw(card, tval(card.lift, now), tval(card.angle, now)));
    return cards.some(card => !tdone(card.lift, now) || !tdone(card.angle, now));
  });
  const choose = active => {
    if (active === state.active) return;
    state.active = active;
    const now = performance.now();
    cards.forEach(card => {
      const distance = Math.abs(card.index - 1);
      tset(card.lift, active ? state.reach * (card.index === 1 ? 1 : 0.22) : 0, now, distance * 40);
      tset(card.angle, active ? (card.index === 1 ? 0 : -10) : card.lean, now, distance * 40);
    });
    read.textContent = active ? "question" : "rest";
    loop.wake();
  };
  // This fixed rest center keeps the card selected while it lifts away from the pointer.
  const center = P(37.5, 28 + 38 * Math.sin(rad(4)), 43 + 38 * Math.cos(rad(4)));
  cleanup.add(pointer(stage, {
    move: point => choose(Math.hypot(point[0] - center[0], point[1] - center[1]) < 82),
    leave: () => choose(false),
  }));
  read.textContent = "rest";
  cleanup.add(loop.unregister);
  cleanup.add(() => svg.replaceChildren());
  return {
    set: next => { state.reach = clamp(next, 6, 18); const active = state.active; state.active = !active; choose(active); },
    destroy: cleanup.dispose,
  };
}

hairline({ name: "shopper-basket", means: "A shopping basket of conversation cards: the front question lifts while the card behind gently parts.", rules: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], range: [6, 12, 18], mount });
