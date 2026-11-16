const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A stocked ranking shelf and rolling ladder: raise one product onto the top shelf. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.72);
  fit(camera, [[-7, -1, 0], [121, 68, 129]], 200, 158);
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

    slab(3,4,10,41,0,107,2); slab(94,4,101,41,0,107,2);
    [7,42,78].forEach(height=>{
      slab(0,4,104,42,height,height+5,2);
      [18,47,76].forEach((x,index)=>{
        const lift=height===78?(index===1?amount:follow):0;
        slab(x,11,x+18,33,height+5+lift,height+26+lift,2,height===78&&index===1?'hi':null);
        add('nf lo',seg(P(x+5,34,height+11+lift),P(x+13,34,height+11+lift)));
      });
    });
    const rail=(x)=>[P(x,55,0),P(x+4,55,0),P(x+4,29,102),P(x,29,102)];
    add('sil',plate(rail(76))); add('sil',plate(rail(112)));
    [15,33,51,69,87].forEach(z=>add('nf lo',seg(P(80,55-z*26/102,z),P(112,55-z*26/102,z))));

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
    read.textContent = active ? "top product" : 'rest';
    loop.wake();
  };
  const center = P(...[55, 23, 92]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "shelf-ladder", means: "A stocked ranking shelf and rolling ladder: raise one product onto the top shelf.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [55, 23, 92], edge: [55, 23, 92], mount });
