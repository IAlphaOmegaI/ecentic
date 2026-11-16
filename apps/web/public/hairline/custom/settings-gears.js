const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** Two interlocking adjustment gears: turn the large wheel to tune the workspace. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 2.0);
  fit(camera, [[-14, -9, 0], [119, 88, 58]], 200, 158);
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

    slab(-6,0,110,77,0,8,8);
    const gear=(x,y,r,z,angle,accent)=>{
      const tooth=Array.from({length:96},(_,i)=>{const a=i*Math.PI/48+angle, radius=i%8<4?r:r-5; return [x+Math.cos(a)*radius,y+Math.sin(a)*radius];});
      add('sil',plate(hull(tooth.map(([u,v])=>P(u,v,z-7)).concat(tooth.map(([u,v])=>P(u,v,z))))));
      add(accent?'sil hi':'sil',poly(tooth.map(([u,v])=>P(u,v,z))));
      add('nf lo',poly(Array.from({length:40},(_,i)=>P(x+(r-11)*Math.cos(i*Math.PI/20),y+(r-11)*Math.sin(i*Math.PI/20),z))));
      add('sil',poly(Array.from({length:32},(_,i)=>P(x+7*Math.cos(i*Math.PI/16),y+7*Math.sin(i*Math.PI/16),z))));
      [0,1,2].forEach(i=>{const a=angle+i*Math.PI*2/3; add('nf lo',seg(P(x+10*Math.cos(a),y+10*Math.sin(a),z),P(x+(r-14)*Math.cos(a),y+(r-14)*Math.sin(a),z)));});
    };
    gear(24,27,27,23,-amount*Math.PI/50,false);
    gear(72,47,34,25,amount*Math.PI/70,true);

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
    read.textContent = active ? "gear" : 'rest';
    loop.wake();
  };
  const center = P(...[72, 47, 25]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "settings-gears", means: "Two interlocking adjustment gears: turn the large wheel to tune the workspace.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [72, 47, 25], edge: [72, 47, 25], mount });
