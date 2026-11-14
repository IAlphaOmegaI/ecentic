const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A handheld megaphone: extend the bell to give the brand a clear voice. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 2.25);
  fit(camera, [[-1, -1, 0], [132, 75, 105]], 200, 158);
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

    add('sil',plate([P(31,29,53),P(46,29,50),P(42,29,6),P(29,29,10)]));
    add('nf lo',seg(P(33,29,17),P(37,29,42)));
    const rim=(x,r)=>Array.from({length:48},(_,i)=>P(x,34+Math.cos(i*Math.PI/24)*r,64+Math.sin(i*Math.PI/24)*r));
    add('sil',plate(hull(rim(22,12).concat(rim(100+amount,34)))));
    add('nf lo',poly(rim(29,14)));
    add('sil hi',poly(rim(100+amount,34)));
    add('nf lo',poly(rim(101+amount,28)));
    add('nf lo',poly(rim(102+amount,8)));
    add('sil',plate(hull(rim(6,8).concat(rim(23,8)))));
    add('sil',poly(rim(6,8)));

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
    read.textContent = active ? "bell" : 'rest';
    loop.wake();
  };
  const center = P(...[98, 34, 69]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "brand-megaphone", means: "A handheld megaphone: extend the bell to give the brand a clear voice.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [98, 34, 69], edge: [98, 34, 69], mount });
