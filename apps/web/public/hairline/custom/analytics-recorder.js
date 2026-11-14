const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A chart recorder with a moving paper strip: reveal more of the measured trace. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.8);
  fit(camera, [[-6, -5, 0], [114, 111, 102]], 200, 158);
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

    slab(0,0,108,70,0,64,7);
    add('sil',poly(rrect(13,12,95,52,5,8).map(({u,v})=>P(u,71,v))));
    add('nf lo',seg(P(18,72,56),P(90,72,56)));
    const end=91+amount;
    add('sil hi',plate([P(20,70,46),P(88,70,46),P(88,end,15),P(20,end,15)]));
    const chart=(x,fraction)=>P(x,70+(end-70)*fraction,46-31*fraction);
    [0.25,0.5,0.75].forEach(fraction=>add('nf lo',seg(chart(24,fraction),chart(84,fraction))));
    add('nf',open([[26,.86],[36,.65],[47,.72],[58,.34],[70,.49],[82,.13]].map(([x,f])=>chart(x,f))));
    slab(72,17,93,37,64,68,4);
    add('nf lo',poly(Array.from({length:32},(_,i)=>P(28+11*Math.cos(i*Math.PI/16),27+11*Math.sin(i*Math.PI/16),65))));
    add('nf',seg(P(28,27,66),P(28+7*Math.cos(-0.7+follow*.1),27+7*Math.sin(-0.7+follow*.1),66)));

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
    read.textContent = active ? "paper" : 'rest';
    loop.wake();
  };
  const center = P(...[56, 63, 41]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "analytics-recorder", means: "A chart recorder with a moving paper strip: reveal more of the measured trace.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [56, 63, 41], edge: [56, 63, 41], mount });
