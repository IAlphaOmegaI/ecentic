const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A checkout till with keypad and cash drawer: slide the drawer open. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.65);
  fit(camera, [[-4, -3, 0], [117, 123, 123]], 200, 158);
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

    slab(0,0,108,68,0,35,6);
    add('sil',plate(hull([P(10,5,37),P(99,5,37),P(99,46,66),P(10,46,66),P(10,5,81),P(99,5,81)])));
    const Q=(x,y)=>P(x,y,83-y*.7);
    add('sil',plate([Q(10,5),Q(99,5),Q(99,47),Q(10,47)]));
    [22,40,58,76].forEach(x=>[20,31,42].forEach(y=>add('nf lo',poly(rrect(x,y,x+11,y+6,1.5,4).map(({u,v})=>Q(u,v))))));
    slab(72,4,78,11,80,103,2);
    add('sil',poly(rrect(50,94,100,115,3,8).map(({u,v})=>P(u,8,v))));
    const frontY=79+amount;
    slab(7,58,101,frontY,7,27,3,'hi');
    add('nf lo',poly(rrect(42,12,67,21,2,6).map(({u,v})=>P(u,frontY+1,v))));
    add('nf lo',seg(P(17,71,28),P(91,71,28)));

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
    read.textContent = active ? "drawer" : 'rest';
    loop.wake();
  };
  const center = P(...[55, 81, 21]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "checkout-till", means: "A checkout till with keypad and cash drawer: slide the drawer open.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [55, 81, 21], edge: [55, 81, 21], mount });
