const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** Two checkout lanes with parcel stops: open one barrier to compare the paths. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.7);
  fit(camera, [[-9, -9, 0], [135, 102, 115]], 200, 158);
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

    [0,68].forEach((x,index)=>{
      slab(x,0,x+50,88,0,15,5);
      add('nf lo',poly(rrect(x+6,7,x+44,80,5,8).map(({u,v})=>P(u,v,16))));
      [16,32,48,64].forEach(y=>add('nf lo',seg(P(x+8,y,17),P(x+42,y,17))));
      slab(x+12,12,x+38,39,17,42,2);
      slab(x+2,72,x+8,79,15,64,2);
      const angle=index===1?amount*.045:0;
      const Q=(u,z)=>P(x+7+u*Math.cos(angle),76,62+z+u*Math.sin(angle));
      add(index===1?'sil hi':'sil',plate([Q(0,-3),Q(43,-3),Q(43,3),Q(0,3)]));
      [12,27].forEach(u=>add('nf lo',seg(Q(u,-2),Q(u+4,2))));
    });

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
    read.textContent = active ? "barrier" : 'rest';
    loop.wake();
  };
  const center = P(...[96, 58, 53]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "checkout-lanes", means: "Two checkout lanes with parcel stops: open one barrier to compare the paths.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [96, 58, 53], edge: [96, 58, 53], mount });
