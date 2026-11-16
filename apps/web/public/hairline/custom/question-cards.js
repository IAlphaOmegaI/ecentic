const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** Two physical speech cards: lift the foreground question to read it beside the answer. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.95);
  fit(camera, [[-5, -17, 0], [119, 38, 125]], 200, 158);
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

    const card=(x,y,z,accent)=>{
      const outline=[[0,0],[49,0],[49,-12],[63,0],[81,0],[81,74],[0,74]];
      add('lo',plate(outline.map(([u,v])=>P(x+u,y-3,z+v+2))));
      add(accent?'sil hi':'sil',plate(outline.map(([u,v])=>P(x+u,y,z+v))));
      [54,42,30].forEach((height,index)=>add('nf lo',seg(P(x+13,y,z+height),P(x+(index===2?49:68),y,z+height))));
      [18,28,38].forEach(left=>add('sil',poly(Array.from({length:24},(_,i)=>P(x+left+2*Math.cos(i*Math.PI/12),y,z+15+2*Math.sin(i*Math.PI/12))))));
    };
    card(33,-10,31+follow,false);
    card(0,24,17+amount,true);

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
    read.textContent = active ? "question" : 'rest';
    loop.wake();
  };
  const center = P(...[35, 24, 61]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "question-cards", means: "Two physical speech cards: lift the foreground question to read it beside the answer.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [35, 24, 61], edge: [35, 24, 61], mount });
