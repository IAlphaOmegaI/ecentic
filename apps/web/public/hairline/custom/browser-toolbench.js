const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A browser inspection screen with a tool probe: slide the probe over the page controls. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.87);
  fit(camera, [[-7, -5, 0], [133, 79, 123]], 200, 158);
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

    slab(21,14,86,56,0,7,5);
    slab(48,28,58,38,7,37,3);
    add('lo',poly(rrect(0,32,111,112,6,8).map(({u,v})=>P(u,24,v))));
    add('sil',poly(rrect(0,30,111,110,6,8).map(({u,v})=>P(u,28,v))));
    add('nf lo',seg(P(2,29,94),P(108,29,94)));
    [10,18,26].forEach(x=>add('nf lo',poly(Array.from({length:16},(_,i)=>P(x+1.5*Math.cos(i*Math.PI/8),29,102+1.5*Math.sin(i*Math.PI/8))))));
    add('nf lo',poly(rrect(11,43,46,83,3,6).map(({u,v})=>P(u,29,v))));
    [81,69,57].forEach((z,i)=>add('nf lo',seg(P(57,29,z+follow),P(i===2?81:97,29,z+follow))));
    const x=89-amount;
    add('sil hi',plate([P(x,35,39),P(x+12,35,39),P(x+12,35,80),P(x,35,80)]));
    add('nf lo',seg(P(x+6,35,81),P(x+6,29,91)));
    add('nf lo',open([P(x+6,35,39),P(x+6,60,13),P(120,68,13),P(126,45,20)]));

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
    read.textContent = active ? "probe" : 'rest';
    loop.wake();
  };
  const center = P(...[94, 40, 62]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "browser-toolbench", means: "A browser inspection screen with a tool probe: slide the probe over the page controls.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [94, 40, 62], edge: [94, 40, 62], mount });
