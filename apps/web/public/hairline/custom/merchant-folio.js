const { Cam, fit, proj, facing, rrect, rings, prism, fillet, poly, open, seg, rad, mk, solid, put, tween, tset, tval, tdone, register, pointer, disposer } = HL;
function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const state = { reach: value, active: -1 };
  const camera = Cam(45, 0.5, 1.55);
  fit(camera, [[-6, -6, -8], [108, 55, -8], [-6, -6, 118], [108, 55, 132]], 200, 166);
  const P = proj(camera), front = facing(camera);
  const group = mk("g", {}, svg);
  const [base, inset] = rings(-6, -6, 108, 55, 5, 1.2);
  put(solid(group), prism(P, front, base, inset, -7, 0));
  const backShape = fillet([[-4, 0], [106, 0], [106, 84], [45, 84], [38, 94], [1, 94], [-4, 89]], [3, 3, 3, 2, 2, 3, 3], 5);
  mk("path", { d: poly(backShape.map(([x, z]) => P(x, -4, z))), class: "sil" }, group);
  mk("path", { d: seg(P(7, -4, 81), P(34, -4, 81)), class: "nf lo" }, group);
  const records = [
    { x: 1, y: 6, lean: -9, lift: 0 },
    { x: 5, y: 22, lean: -4, lift: 13 },
    { x: 0, y: 39, lean: 5, lift: 3 },
  ].map((rest, index) => {
    const holder = mk("g", {}, group);
    const record = { ...rest, index, holder,
      back: mk("path", { class: "lo" }, holder), face: mk("path", { class: "sil" }, holder),
      crease: mk("path", { class: "nf lo" }, holder), picture: mk("path", { class: "nf" }, holder),
      bottle: mk("path", { class: "nf" }, holder), rows: mk("path", { class: "nf lo" }, holder),
      liftTween: tween(rest.lift), leanTween: tween(rest.lean), previous: "",
    };
    record.face.classList.toggle("hi", index === 1);
    return record;
  });
  const pocket = fillet([[-4, 0], [106, 0], [106, 39], [79, 39], [74, 32], [27, 32], [21, 39], [-4, 39]], [3, 3, 3, 2, 3, 3, 2, 3], 5);
  mk("path", { d: poly(pocket.map(([x, z]) => P(x, 54, z))), class: "sil" }, group);
  mk("path", { d: open(pocket.slice(0, 7).map(([x, z]) => P(x, 55.5, z - 1))), class: "nf lo" }, group);
  mk("path", { d: poly(rrect(39, 10, 63, 19, 4, 9).map(({u,v}) => P(u, 54, v))), class: "nf lo" }, group);
  const pageShape = fillet([[0, 0], [94, 0], [94, 89], [83, 101], [0, 101]], [3, 3, 2, 2, 3], 5);
  const bottleShape = fillet([[39, 58], [59, 58], [59, 76], [54, 82], [54, 90], [44, 90], [44, 82], [39, 76]], [3, 3, 2, 3, 1, 1, 3, 2], 5);
  function draw(record, lift, lean) {
    const signature = `${lift.toFixed(3)}:${lean.toFixed(3)}`;
    if (record.previous === signature) return;
    record.previous = signature;
    const sine = Math.sin(rad(lean)), cosine = Math.cos(rad(lean));
    const project = (x, z, depth = 0) => P(record.x + x, record.y + z * sine + depth, z * cosine + lift + 4);
    record.back.setAttribute("d", poly(pageShape.map(([x,z]) => project(x, z, -1.5))));
    record.face.setAttribute("d", poly(pageShape.map(([x,z]) => project(x, z))));
    record.crease.setAttribute("d", open([[83,100],[83,90],[93,90]].map(([x,z]) => project(x,z))));
    record.picture.setAttribute("d", poly(rrect(13, 52, 80, 94, 3, 6).map(({u,v}) => project(u,v))));
    record.bottle.setAttribute("d", poly(bottleShape.map(([x,z]) => project(x,z))) + seg(project(40,66),project(58,66)) + seg(project(44,86),project(54,86)));
    record.rows.setAttribute("d", [43,36,29].map((z,index) => seg(project(13,z),project(index === 2 ? 52 : 80,z))).join(""));
  }
  records.forEach(record => draw(record, record.lift, record.lean));
  const restCenters = records.map(record => P(record.x + 47, record.y + 78 * Math.sin(rad(record.lean)), 78 * Math.cos(rad(record.lean)) + record.lift + 4));
  const loop = register(stage, (_dt, now) => {
    records.forEach(record => draw(record, tval(record.liftTween, now), tval(record.leanTween, now)));
    return records.some(record => !tdone(record.liftTween, now) || !tdone(record.leanTween, now));
  });
  function activate(index) {
    if (index === state.active) return;
    const origin = index < 0 ? state.active : index;
    state.active = index;
    const now = performance.now();
    records.forEach(record => {
      const distance = Math.abs(record.index - origin);
      tset(record.liftTween, record.lift + (record.index === index ? state.reach : 0), now, distance * 42);
      tset(record.leanTween, record.lean + (index < 0 ? 0 : record.index < index ? -5 : record.index > index ? 5 : -4), now, distance * 42);
      record.face.classList.toggle("hi", record.index === (index < 0 ? 1 : index));
    });
    read.textContent = index < 0 ? "rest" : `record ${index + 1}`;
    loop.wake();
  }
  bag.add(pointer(stage, {
    move: point => {
      const distances = restCenters.map(center => Math.hypot(center[0] - point[0], center[1] - point[1]));
      const closest = Math.min(...distances);
      activate(closest < 76 ? distances.indexOf(closest) : -1);
    },
    leave: () => activate(-1),
  }));
  read.textContent = "rest";
  bag.add(loop.unregister);
  bag.add(() => svg.replaceChildren());
  return { set: next => { state.reach = next; const selected = state.active; state.active = -2; activate(selected); }, destroy: bag.dispose };
}
hairline({ name: "merchant-folio", means: "Product records in a catalog sleeve: inspect a supplemental sheet by lifting it from the original records.", rules: [1, 2, 5, 6, 8, 9], range: [10, 23, 33], mount });
