const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A desktop report printer: feed a finished report out of the front rollers. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.7);
  fit(camera, [[-3, -3, 0], [111, 125, 108]], 200, 158);
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

    add('sil',plate([P(17,4,57-follow),P(92,4,57-follow),P(92,-2,96-follow),P(17,-2,96-follow)]));
    [70,80,88].forEach(z=>add('nf lo',seg(P(27,1,z-follow),P(80,1,z-follow))));
    slab(0,3,109,72,14,64,8);
    slab(11,18,97,45,64,68,4);
    add('nf lo',seg(P(16,73,38),P(94,73,38)));
    const end=99+amount;
    add('sil hi',plate([P(18,73,37),P(91,73,37),P(91,end,1),P(18,end,1)]));
    const paper=(x,f)=>P(x,73+(end-73)*f,37-36*f);
    [0.3,0.46,0.62,0.78].forEach((f,index)=>add('nf lo',seg(paper(27,f),paper(index===3?61:80,f))));
    add('nf lo',poly(Array.from({length:24},(_,i)=>P(91+3*Math.cos(i*Math.PI/12),58+3*Math.sin(i*Math.PI/12),65))));

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
    read.textContent = active ? "report" : 'rest';
    loop.wake();
  };
  const center = P(...[54, 66, 20]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "report-printer", means: "A desktop report printer: feed a finished report out of the front rollers.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [54, 66, 20], edge: [54, 66, 20], mount });
