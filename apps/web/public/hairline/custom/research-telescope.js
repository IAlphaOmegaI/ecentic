const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A focusing telescope on a tripod: extend the eyepiece to examine the evidence. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.8);
  fit(camera, [[-30, -5, 0], [113, 77, 127]], 200, 158);
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

    // Three splayed legs carry a real optical tube, rather than a search icon.
    add('sil', plate([P(49,31,65),P(55,31,65),P(88,10,0),P(82,10,0)]));
    add('sil', plate([P(48,35,65),P(54,35,65),P(20,66,0),P(13,66,0)]));
    add('sil', plate([P(51,36,65),P(57,36,65),P(90,70,0),P(82,70,0)]));
    slab(42,28,64,44,59,68,4);
    const Q=(x,y,z)=>P(x,y,z+x*0.24+follow*(x-52)/65);
    const rim=(x,r)=>Array.from({length:48},(_,i)=>Q(x,36+Math.cos(i*Math.PI/24)*r,65+Math.sin(i*Math.PI/24)*r));
    add('sil',plate(hull(rim(23,18).concat(rim(96,18)))));
    add('nf lo',poly(rim(31,18)));
    add('sil',poly(rim(96,18)));
    add(state.active?'nf lo':'nf hi',poly(rim(97,14)));
    add('sil',plate(hull(rim(8-amount,8).concat(rim(25,8)))));
    add(state.active?'sil hi':'sil',poly(rim(8-amount,8)));
    add('nf lo',poly(rim(5-amount,6)));
    add('nf lo',seg(Q(41,52,64),Q(78,52,64)));

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
    read.textContent = active ? "eyepiece" : 'rest';
    loop.wake();
  };
  const center = P(...[9, 36, 69]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "research-telescope", means: "A focusing telescope on a tripod: extend the eyepiece to examine the evidence.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [9, 36, 69], edge: [9, 36, 69], mount });
