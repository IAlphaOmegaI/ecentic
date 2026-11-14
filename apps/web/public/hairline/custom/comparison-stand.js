const { Cam, clamp, fit, proj, facing, rrect, rings, prism, poly, seg, rad, mk, solid, put, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** Two product listings in a desk stand; the pointer lifts one for inspection. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: -1, reach: value };
  const camera = Cam(45, 0.5, 1.82);
  fit(camera, [[-8, -10, 0], [134, 24, 0], [-8, -10, 114], [134, 24, 114]], 200, 158);
  const P = proj(camera), front = facing(camera);
  const group = mk("g", {}, svg);

  // A shared stand gives the two upright records a physical resting place.
  put(solid(group), prism(P, front, ...rings(-8, -5, 134, 24, 5, 1.3), 0, 7));
  put(solid(group), prism(P, front, ...rings(-5, -4, 131, 1, 2, 0.7), 7, 12));
  const listings = [
    { x: 0, lean: -12, lift: 9 },
    { x: 72, lean: -5, lift: 12 },
  ].map((rest, index) => {
    const holder = mk("g", {}, group);
    return {
      ...rest, index,
      back: mk("path", { class: "lo" }, holder),
      face: mk("path", { class: "sil" }, holder),
      thumbnail: mk("path", { class: "nf lo" }, holder),
      product: mk("path", { class: "nf" }, holder),
      cap: mk("path", { class: "nf lo" }, holder),
      rows: mk("path", { class: "nf lo" }, holder),
      liftTween: tween(rest.lift), leanTween: tween(rest.lean), previous: "",
    };
  });
  const cardShape = rrect(0, 0, 54, 80, 4, 8);
  const thumbnailShape = rrect(7, 30, 47, 64, 3, 6);
  const bottleShape = rrect(21, 35, 33, 53, 3, 8);
  const capShape = rrect(23, 53, 31, 57, 1.2, 6);

  function drawListing(listing, lift, lean) {
    const signature = `${lift.toFixed(3)}:${lean.toFixed(3)}`;
    if (listing.previous === signature) return;
    listing.previous = signature;
    const sine = Math.sin(rad(lean)), cosine = Math.cos(rad(lean));
    const project = (x, z, depth = 0) => P(listing.x + x, 8 + z * sine + depth, z * cosine + lift);
    const outline = (shape, depth = 0) => poly(shape.map(({ u, v }) => project(u, v, depth)));
    listing.back.setAttribute("d", outline(cardShape, -1.4));
    listing.face.setAttribute("d", outline(cardShape));
    listing.thumbnail.setAttribute("d", outline(thumbnailShape));
    listing.product.setAttribute("d", outline(bottleShape));
    listing.cap.setAttribute("d", outline(capShape) + seg(project(23, 45), project(31, 45)));
    listing.rows.setAttribute("d", [71, 23, 16, 10].map((z, index) => seg(project(7, z), project(index === 2 ? 34 : index === 3 ? 23 : 47, z))).join(""));
  }
  listings.forEach(listing => drawListing(listing, listing.lift, listing.lean));
  // Paint the near rim last so it hides the record bottoms correctly.
  put(solid(group), prism(P, front, ...rings(-5, 16, 131, 23, 2.6, 0.9), 7, 13));

  const restCenters = listings.map(listing => P(listing.x + 27, 8 + 45 * Math.sin(rad(listing.lean)), 45 * Math.cos(rad(listing.lean)) + listing.lift));
  const loop = register(stage, (_delta, now) => {
    listings.forEach(listing => drawListing(listing, tval(listing.liftTween, now), tval(listing.leanTween, now)));
    return listings.some(listing => !tdone(listing.liftTween, now) || !tdone(listing.leanTween, now));
  });

  function choose(index) {
    if (index === state.active) return;
    const origin = index < 0 ? state.active : index, now = performance.now();
    state.active = index;
    listings.forEach(listing => {
      const distance = Math.abs(listing.index - origin);
      tset(listing.liftTween, listing.lift + (listing.index === index ? state.reach : 0), now, distance * 40);
      tset(listing.leanTween, listing.lean + (index < 0 ? 0 : listing.index === index ? 7 : -4), now, distance * 40);
      listing.face.classList.toggle("hi", listing.index === (index < 0 ? 0 : index));
    });
    read.textContent = index < 0 ? "rest" : `listing ${index + 1}`;
    loop.wake();
  }
  cleanup.add(pointer(stage, {
    move: point => {
      const distances = restCenters.map(center => Math.hypot(center[0] - point[0], center[1] - point[1]));
      const nearest = Math.min(...distances);
      choose(nearest < 82 ? distances.indexOf(nearest) : -1);
    },
    leave: () => choose(-1),
  }));
  listings[0].face.classList.add("hi");
  read.textContent = "rest";
  cleanup.add(loop.unregister);
  cleanup.add(() => svg.replaceChildren());
  return {
    set: next => { state.reach = clamp(next, 8, 20); const selected = state.active; state.active = -2; choose(selected); },
    destroy: cleanup.dispose,
  };
}

hairline({ name: "comparison-stand", means: "Two product listings in a comparison stand: lift either card to inspect it beside the other.", rules: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], range: [8, 14, 20], mount });
