const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A checkout test bench with a slotted reader: insert the test card into the terminal. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.72);
  fit(camera, [[-6, -5, 0], [116, 91, 137]], 200, 158);
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

    slab(-2,0,107,84,0,8,4);
    [10,28,46,64,82].forEach(x=>[13,31,49,67].forEach(y=>add('nf lo',poly(Array.from({length:16},(_,i)=>P(x+1.5*Math.cos(i*Math.PI/8),y+1.5*Math.sin(i*Math.PI/8),9))))));
    const bottom=68-amount;
    add('sil hi',poly(rrect(28,bottom,80,bottom+54,4,8).map(({u,v})=>P(u,31,v))));
    add('nf lo',poly(rrect(35,bottom+27,49,bottom+39,2,6).map(({u,v})=>P(u,32,v))));
    add('nf lo',seg(P(35,32,bottom+16),P(71,32,bottom+16)));
    slab(20,15,87,65,8,61,6);
    add('sil',poly(rrect(30,29,77,52,3,6).map(({u,v})=>P(u,66,v))));
    [37,50,63].forEach(x=>add('nf lo',seg(P(x,67,16),P(x+6,67,16))));
    add('nf lo',seg(P(27,32,62),P(80,32,62)));
    add('nf lo',open([P(87,41,30),P(107,41,30),P(107,77,9),P(79,81,9)]));

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
    read.textContent = active ? "test card" : 'rest';
    loop.wake();
  };
  const center = P(...[52, 28, 98]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "checkout-workbench", means: "A checkout test bench with a slotted reader: insert the test card into the terminal.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [52, 28, 98], edge: [52, 28, 98], mount });
