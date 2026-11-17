const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A physical connection hub with three plugs: seat the front connector in its socket. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.6);
  fit(camera, [[-16, -7, 0], [131, 133, 62]], 200, 158);
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

    slab(7,0,107,75,0,28,7);
    [23,49,75].forEach(x=>add('nf lo',poly(rrect(x,9,x+12,18,2,6).map(({u,v})=>P(u,v,29)))));
    add('nf lo',poly(rrect(24,7,89,21,3,8).map(({u,v})=>P(u,76,v))));
    const y=102-amount;
    add('nf lo',open([P(51,y+24,13),P(51,132,13),P(110,132,13),P(120,106,13)]));
    slab(34,y-7,77,y+20,6,25,4,'hi');
    slab(41,y-20,70,y-7,11,20,1.5);
    [48,61].forEach(x=>add('nf lo',seg(P(x,y-18,21),P(x,y-10,21))));
    add('nf lo',open([P(7,25,14),P(-9,25,14),P(-9,79,14),P(15,91,14)]));
    slab(-15,9,7,39,7,22,3);

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
    read.textContent = active ? "plug" : 'rest';
    loop.wake();
  };
  const center = P(...[72, 93, 24]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "channel-plug-hub", means: "A physical connection hub with three plugs: seat the front connector in its socket.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [72, 93, 24], edge: [72, 93, 24], mount });
