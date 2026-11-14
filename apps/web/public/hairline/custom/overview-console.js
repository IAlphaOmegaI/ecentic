const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A control console with a large dial and two faders: turn the dial to inspect the workspace. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.95);
  fit(camera, [[-4, -4, 0], [120, 79, 103]], 200, 158);
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

    add('sil',plate(hull([P(0,0,38),P(112,0,38),P(112,72,0),P(0,72,0),P(0,0,82),P(112,0,82),P(112,72,44),P(0,72,44)])));
    const Q=(x,y)=>P(x,y,82-y*38/72);
    add('sil',plate([Q(0,0),Q(112,0),Q(112,72),Q(0,72)]));
    const circle=(x,y,r)=>Array.from({length:48},(_,i)=>Q(x+Math.cos(i*Math.PI/24)*r,y+Math.sin(i*Math.PI/24)*r));
    add('sil hi',poly(circle(35,34,25)));
    add('nf lo',poly(circle(35,34,19)));
    const angle=-Math.PI*.65+amount*.065;
    add('nf',seg(Q(35,34),Q(35+Math.cos(angle)*16,34+Math.sin(angle)*16)));
    [75,93].forEach((x,index)=>{
      add('nf lo',seg(Q(x,13),Q(x,57)));
      add('sil',poly(rrect(x-7,25+index*12+follow*(index+1),x+7,33+index*12+follow*(index+1),2,6).map(({u,v})=>Q(u,v))));
    });
    add('nf lo',seg(P(10,73,25),P(102,73,25)));

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
    read.textContent = active ? "dial" : 'rest';
    loop.wake();
  };
  const center = P(...[47, 31, 57]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "overview-console", means: "A control console with a large dial and two faders: turn the dial to inspect the workspace.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [47, 31, 57], edge: [47, 31, 57], mount });
