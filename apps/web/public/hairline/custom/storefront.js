const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A small storefront with a striped canopy: raise the shutter to open the shop. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.72);
  fit(camera, [[-4, -3, 0], [117, 83, 123]], 200, 158);
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

    slab(2,3,107,63,0,83,3);
    add('sil',plate([P(3,3,87),P(108,3,87),P(114,79,74),P(-3,79,74)]));
    Array.from({length:7},(_,i)=>{
      const x=i*16;
      add('sil',plate([P(x,3,89),P(x+16,3,89),P(x+16,77,75),P(x,77,75)]));
      add('sil',poly(rrect(x,65,x+16,78,6,8).map(({u,v})=>P(u,77,v))));
    });
    add('sil',poly(rrect(13,3,96,66,2,8).map(({u,v})=>P(u,64,v))));
    add('nf lo',seg(P(55,65,4),P(55,65,65)));
    [27,41,69,82].forEach(x=>add('nf lo',seg(P(x,65,14),P(x,65,55))));
    const bottom=30+amount;
    add('sil hi',plate([P(14,66,bottom),P(95,66,bottom),P(95,66,66),P(14,66,66)]));
    [0.2,0.4,0.6,0.8].forEach(f=>add('nf lo',seg(P(15,67,bottom+(66-bottom)*f),P(94,67,bottom+(66-bottom)*f))));
    slab(-3,59,114,78,0,5,2);

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
    read.textContent = active ? "shutter" : 'rest';
    loop.wake();
  };
  const center = P(...[65, 62, 49]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "storefront", means: "A small storefront with a striped canopy: raise the shutter to open the shop.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [65, 62, 49], edge: [65, 62, 49], mount });
