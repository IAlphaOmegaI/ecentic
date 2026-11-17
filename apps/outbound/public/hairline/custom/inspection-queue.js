const { Cam, clamp, fit, proj, facing, rrect, rings, prism, ringAt, poly, open, seg, rad, mk, solid, put, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A catalog-inspection tray: choose a record and the scanner follows it. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: -1, reach: value };
  const camera = Cam(45, 0.5, 1.45);
  fit(camera, [[-8, -8, -8], [116, 78, -8], [-8, -8, 126], [116, 78, 126]], 200, 165);
  const P = proj(camera), front = facing(camera);
  const group = mk("g", {}, svg);

  // Paint the tray floor and its far lip before the upright records.
  put(solid(group), prism(P, front, ...rings(-8, -8, 114, 78, 7, 1.5), -8, 0));
  put(solid(group), prism(P, front, ...rings(-6, -6, 112, 1, 3, 1), 0, 13));
  const rail = solid(group);
  put(rail, prism(P, front, ...rings(101, 0, 112, 70, 3, 1), 1, 6));
  const records = [
    { y: 8, lean: -6, lift: 2 },
    { y: 29, lean: 0, lift: 9 },
    { y: 51, lean: 6, lift: 1 },
  ].map((rest, index) => {
    const holder = mk("g", {}, group);
    return {
      ...rest, index, holder,
      back: mk("path", { class: "lo" }, holder),
      face: mk("path", { class: "sil" }, holder),
      thumbnail: mk("path", { class: "nf lo" }, holder),
      rows: mk("path", { class: "nf lo" }, holder),
      liftTween: tween(rest.lift), leanTween: tween(rest.lean), previous: "",
    };
  });
  const recordShape = rrect(0, 0, 88, 61, 4, 8);
  const thumbnailShape = rrect(10, 30, 30, 49, 3, 6);

  function drawRecord(record, lift, lean) {
    const signature = `${lift.toFixed(3)}:${lean.toFixed(3)}`;
    if (record.previous === signature) return;
    record.previous = signature;
    const sine = Math.sin(rad(lean)), cosine = Math.cos(rad(lean));
    const project = (x, z, depth = 0) => P(x, record.y + z * sine + depth, z * cosine + lift + 4);
    record.back.setAttribute("d", poly(recordShape.map(({ u, v }) => project(u, v, -1.5))));
    record.face.setAttribute("d", poly(recordShape.map(({ u, v }) => project(u, v))));
    record.thumbnail.setAttribute("d", poly(thumbnailShape.map(({ u, v }) => project(u, v))));
    record.rows.setAttribute("d", [46, 38, 22, 15].map((z, index) => seg(project(index < 2 ? 39 : 10, z), project(index === 1 || index === 3 ? 65 : 78, z))).join(""));
  }
  records.forEach(record => drawRecord(record, record.lift, record.lean));

  // One low near lip occludes the bottoms, leaving the record faces readable.
  put(solid(group), prism(P, front, ...rings(-6, 71, 112, 78, 3, 1), 0, 15));
  mk("path", { d: seg(P(26, 78, 8), P(69, 78, 8)), class: "nf lo" }, group);

  // The scanner slides along the rail to the selected record's fixed slot.
  const scanner = {
    foot: solid(group), stem: solid(group), head: solid(group),
    lens: mk("path", { class: "nf" }, group),
    position: tween(27), previous: null,
  };
  function drawScanner(y) {
    if (scanner.previous === y) return;
    scanner.previous = y;
    put(scanner.foot, prism(P, front, ...rings(99, y - 8, 114, y + 8, 4, 1), 5, 12));
    put(scanner.stem, prism(P, front, ...rings(103, y - 4, 112, y + 4, 3, 1), 12, 112));
    put(scanner.head, prism(P, front, ...rings(10, y - 10, 112, y + 7, 5, 1.4), 106, 118));
    scanner.lens.setAttribute("d", open(rrect(20, 107, 88, 110, 1.5, 6).map(({ u, v }) => P(u, y + 7, v))));
  }
  drawScanner(27);
  const restCenters = records.map(record => P(44, record.y + 48 * Math.sin(rad(record.lean)), 48 * Math.cos(rad(record.lean)) + record.lift + 4));
  const loop = register(stage, (_delta, now) => {
    records.forEach(record => drawRecord(record, tval(record.liftTween, now), tval(record.leanTween, now)));
    drawScanner(tval(scanner.position, now));
    return !tdone(scanner.position, now) || records.some(record => !tdone(record.liftTween, now) || !tdone(record.leanTween, now));
  });

  function choose(index) {
    if (index === state.active) return;
    const origin = index < 0 ? state.active : index, now = performance.now();
    state.active = index;
    records.forEach(record => {
      const distance = Math.abs(record.index - origin);
      tset(record.liftTween, record.lift + (record.index === index ? state.reach : 0), now, distance * 40);
      tset(record.leanTween, record.lean + (index < 0 ? 0 : record.index < index ? -4 : record.index > index ? 4 : 0), now, distance * 40);
      record.face.classList.toggle("hi", record.index === index);
    });
    scanner.lens.classList.toggle("hi", index < 0);
    tset(scanner.position, index < 0 ? 27 : records[index].y, now, 0);
    read.textContent = index < 0 ? "rest" : `record ${index + 1}`;
    loop.wake();
  }
  cleanup.add(pointer(stage, {
    move: point => {
      const distances = restCenters.map(center => Math.hypot(center[0] - point[0], center[1] - point[1]));
      const closest = Math.min(...distances);
      choose(closest < 76 ? distances.indexOf(closest) : -1);
    },
    leave: () => choose(-1),
  }));
  scanner.lens.classList.add("hi");
  read.textContent = "rest";
  cleanup.add(loop.unregister);
  cleanup.add(() => svg.replaceChildren());
  return {
    set: next => { state.reach = clamp(next, 6, 20); const selected = state.active; state.active = -2; choose(selected); },
    destroy: cleanup.dispose,
  };
}

hairline({ name: "inspection-queue", means: "An inspection tray of catalog records: lift a record and the scanner moves to its slot.", rules: [1, 2, 3, 4, 5, 6, 7, 8, 9], range: [6, 13, 20], mount });
