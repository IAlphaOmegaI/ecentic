const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A catalog feeder with a telescoping beacon: extend the feed antenna above the records. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.7);
  fit(camera, [[-6, -5, 0], [124, 75, 146]], 200, 158);
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

    slab(0,0,100,61,0,27,6);
    [0,1,2].forEach(index=>{
      const z=30+index*7+(index===2?follow:0);
      slab(7+index*4,6,64+index*4,49,z,z+2,2);
      add('nf lo',seg(P(17+index*4,17,z+3),P(52+index*4,17,z+3)));
    });
    slab(82,8,99,27,27,44,4);
    slab(88,13,93,22,44,102+amount,2);
    const ring=(z,r)=>Array.from({length:40},(_,i)=>P(91+r*Math.cos(i*Math.PI/20),18+r*Math.sin(i*Math.PI/20),z));
    add('sil hi',plate(hull(ring(96+amount,9).concat(ring(109+amount,9)))));
    add('sil',poly(ring(109+amount,9)));
    add('nf lo',seg(P(13,62,15),P(73,62,15)));
    [21,35,49].forEach(x=>add('nf lo',poly(Array.from({length:20},(_,i)=>P(x+2*Math.cos(i*Math.PI/10),63,8+2*Math.sin(i*Math.PI/10))))));

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
    read.textContent = active ? "antenna" : 'rest';
    loop.wake();
  };
  const center = P(...[91, 28, 101]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "feed-beacon", means: "A catalog feeder with a telescoping beacon: extend the feed antenna above the records.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [91, 28, 101], edge: [91, 28, 101], mount });
