const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A balance holding two rival parcels: tip the beam to compare their weight. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.6);
  fit(camera, [[-13, -4, 0], [139, 65, 124]], 200, 158);
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

    slab(42,10,83,51,0,8,6);
    slab(59,27,66,34,8,90,2);
    const level=x=>91+(x-62)*amount/57;
    add('sil hi',plate([P(2,28,level(2)-3),P(123,28,level(123)-3),P(123,34,level(123)+3),P(2,34,level(2)+3)]));
    [13,112].forEach((x,index)=>{
      const z=level(x)-51;
      add('nf lo',seg(P(x,31,level(x)),P(x-19,11,z))+seg(P(x,31,level(x)),P(x+19,51,z)));
      const pan=Array.from({length:40},(_,i)=>P(x+25*Math.cos(i*Math.PI/20),31+24*Math.sin(i*Math.PI/20),z));
      add('sil',poly(pan));
      slab(x-13,19,x+13,43,z+1,z+(index===0?22:28),2.2);
      add('nf lo',seg(P(x,20,z+(index===0?22:28)),P(x,42,z+(index===0?22:28))));
      add('nf lo',seg(P(x,31,level(x)),P(x+19,51,z)));
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
    read.textContent = active ? "balance" : 'rest';
    loop.wake();
  };
  const center = P(...[66, 31, 89]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "rivals-balance", means: "A balance holding two rival parcels: tip the beam to compare their weight.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [66, 31, 89], edge: [66, 31, 89], mount });
