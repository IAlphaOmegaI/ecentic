const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A viewfinder on a focusing rail: slide the sight forward to locate a rival product. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.8);
  fit(camera, [[-8, -13, 0], [129, 71, 109]], 200, 158);
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

    slab(0,4,117,52,0,8,5);
    slab(10,14,106,42,8,13,3);
    add('nf lo',seg(P(16,28,14),P(102,28,14)));
    slab(42+amount,15,73+amount,42,13,30,3);
    const y=27, x=55+amount;
    add('sil',poly(rrect(-34,-31,34,31,5,8).map(({u,v})=>P(x+u,y-4,67+v))));
    add('sil hi',poly(rrect(-34,-31,34,31,5,8).map(({u,v})=>P(x+u,y,67+v))));
    add('nf lo',poly(rrect(-26,-23,26,23,2,6).map(({u,v})=>P(x+u,y,67+v))));
    add('nf lo',seg(P(x-12,y,67),P(x+12,y,67))+seg(P(x,y,55),P(x,y,79)));
    add('nf',poly(Array.from({length:32},(_,i)=>P(x+8*Math.cos(i*Math.PI/16),y,67+8*Math.sin(i*Math.PI/16)))));

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
    read.textContent = active ? "viewfinder" : 'rest';
    loop.wake();
  };
  const center = P(...[66, 20, 72]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "target-finder", means: "A viewfinder on a focusing rail: slide the sight forward to locate a rival product.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [66, 20, 72], edge: [66, 20, 72], mount });
