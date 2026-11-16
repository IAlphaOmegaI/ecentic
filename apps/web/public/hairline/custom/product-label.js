const { Cam, clamp, fit, proj, facing, rrect, rings, prism, hull, fillet, poly, open, seg, mk, tween, tset, tval, tdone, register, pointer, disposer } = HL;

/** A parcel with a hanging product tag: turn the label out for close inspection. */
function mount({ stage, svg, read }, value) {
  const cleanup = disposer();
  const state = { active: false, reach: value, previous: "" };
  const camera = Cam(45, 0.5, 1.85);
  fit(camera, [[-3, -4, 0], [135, 80, 119]], 200, 158);
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

    slab(0,0,78,66,0,71,5);
    add('nf lo',seg(P(34,1,72),P(34,65,72))+seg(P(34,67,1),P(34,67,70)));
    add('nf lo',open([P(35,33,73),P(71,22,101),P(89,37,86)]));
    const angle=amount*.025;
    const Q=(u,v)=>P(88+u*Math.cos(angle),38+u*Math.sin(angle),86+v);
    const tag=[[-8,0],[7,4],[38,-12],[38,-56],[-8,-56]];
    add('sil hi',plate(tag.map(([u,v])=>Q(u,v))));
    add('nf lo',poly(Array.from({length:24},(_,i)=>Q(2+3*Math.cos(i*Math.PI/12),-6+3*Math.sin(i*Math.PI/12)))));
    [5,11,15,22,28].forEach((u,index)=>add('nf lo',seg(Q(u,-45),Q(u,-(index%2?30:25)))));
    add('nf lo',seg(Q(0,-17),Q(27,-17)));

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
    read.textContent = active ? "tag" : 'rest';
    loop.wake();
  };
  const center = P(...[94, 58, 70]);
  cleanup.add(pointer(stage, { move: point => choose(Math.hypot(point[0]-center[0],point[1]-center[1]) < 100), leave: () => choose(false) }));
  read.textContent = 'rest';
  cleanup.add(loop.unregister); cleanup.add(() => svg.replaceChildren());
  return { set: next => { state.reach=clamp(next,6,22); const active=state.active; state.active=!active; choose(active); }, destroy: cleanup.dispose };
}

hairline({ name: "product-label", means: "A parcel with a hanging product tag: turn the label out for close inspection.", rules: [1,2,3,4,5,6,7,8,9,10], range: [6,14,22], answer: [94, 58, 70], edge: [94, 58, 70], mount });
