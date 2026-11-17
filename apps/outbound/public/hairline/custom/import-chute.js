const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A loading chute with a waiting parcel: lower the product into the catalog intake. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.55);
  fit(camera, [[-9, -9, 0], [119, 103, 147]], 200, 158);
  const P = proj(camera), front = facing(camera);
  const group = mk("g", {}, svg);
  const motion = tween(0), following = tween(0);
  function geometry(amount, follow = 0) {
    const paths = [];
    const plate = vertices => poly(fillet(vertices, vertices.map(() => 1.5), 4));
    const add = (paint, d) => paths.push({ class: paint, d });
    const slab = (x0,y0,x1,y1,z0,z1,r=3,accent=null) => {
      const shape = prism(P, front, ...rings(x0,y0,x1,y1,r,0.9), z0,z1);
      add(accent ? 'sil hi' : 'sil', shape.sil); add('nf lo', shape.crease);
    };

    slab(15,18,99,77,0,47,6);
    add('sil',plate([P(-4,-2,77),P(113,-2,77),P(98,76,48),P(15,76,48)]));
    add('sil',plate([P(-4,-2,77),P(-4,91,77),P(15,76,48),P(15,12,48)]));
    const z=95-amount;
    slab(25,23,77,62,z,z+34,3,'hi');
    add('nf lo',seg(P(49,24,z+35),P(49,61,z+35))+seg(P(49,63,z+9),P(49,63,z+33)));
    add('sil',plate([P(-4,91,77+follow),P(113,91,77+follow),P(98,76,48),P(15,76,48)]));
    add('nf lo',plate([P(12,7,74),P(96,7,74),P(96,78,74),P(12,78,74)]));
    add('nf lo',seg(P(27,78,22),P(88,78,22)));

    return paths;
  }
  const nodes = geometry(0).map(attributes => mk('path', attributes, group));
  const draw = (amount, follow) => {
    const signature = `${amount.toFixed(4)}:${follow.toFixed(4)}`;
    if (signature === state.previous) return;
    state.previous = signature;
    geometry(amount, follow).forEach((attributes,index) => { nodes[index].setAttribute('d', attributes.d); nodes[index].setAttribute('class', attributes.class); });
  };
  const loop = register(stage, (_delta, now) => { draw(tval(motion,now),tval(following,now)); return !tdone(motion,now) || !tdone(following,now); });
  const choose = active => {
    if (active === state.active) return;
    state.active = active;
    const now = performance.now();
    tset(motion, active ? state.reach : 0, now, 0);
    tset(following, active ? state.reach * 0.25 : 0, now, 40);
    read.textContent = active ? "parcel" : 'rest';
    loop.wake();
  };
  const center = P(...[47, 33, 107]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "import-chute", means: "A loading chute with a waiting parcel: lower the product into the catalog intake.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [47, 33, 107], edge: [47, 33, 107], mount });
