const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A readiness test meter with a probe: sweep the dial while examining the product connector. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.8);
  fit(camera, [[-13, -3, 0], [135, 91, 119]], 200, 158);
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

    slab(0,0,80,48,0,91,8);
    const dial=(r)=>Array.from({length:48},(_,i)=>P(40+r*Math.cos(i*Math.PI/24),49,61+r*Math.sin(i*Math.PI/24)));
    add('sil hi',poly(dial(26))); add('nf lo',poly(dial(21)));
    const angle=2.6-amount*.065;
    add('nf',seg(P(40,50,61),P(40+17*Math.cos(angle),50,61+17*Math.sin(angle))));
    [0,1,2,3,4].forEach(i=>{const a=Math.PI*(.15+i*.175); add('nf lo',seg(P(40+22*Math.cos(a),50,61+22*Math.sin(a)),P(40+25*Math.cos(a),50,61+25*Math.sin(a))));});
    add('sil',poly(rrect(24,12,56,24,4,6).map(({u,v})=>P(u,49,v))));
    add('nf lo',open([P(40,49,6),P(40,76,1),P(107,79,1),P(117-follow,49,25)]));
    add('sil',plate([P(109-follow,46,14),P(121-follow,46,14),P(121-follow,32,63),P(109-follow,32,63)]));
    add('nf lo',seg(P(115-follow,32,64),P(115-follow,28,84)));

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
    read.textContent = active ? "dial" : 'rest';
    loop.wake();
  };
  const center = P(...[43, 39, 58]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "agent-test-gauge", means: "A readiness test meter with a probe: sweep the dial while examining the product connector.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [43, 39, 58], edge: [43, 39, 58], mount });
