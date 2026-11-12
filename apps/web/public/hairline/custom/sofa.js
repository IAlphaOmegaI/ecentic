/** A two-seat sofa: upholstered arms, loose cushions and a low, rounded base. */
const { Cam, clamp, facing, fit, proj, rings, prism, solid, put,
  tdone, tset, tval, tween, disposer, pointer, register } = HL;
function mount({ stage, svg, read }, value) {
  const cleanup = disposer(), state = { lift: value, active: -1 };
  const camera = Cam(45, 0.5, 1.85);
  fit(camera, [[-8,-10,0],[130,65,0],[-8,65,0],[130,-10,0],[0,0,88],[118,8,88]], 200,166);
  const P = proj(camera), front = facing(camera);
  const block = (parent, box, radius, bottom, top) => {
    const [ring, inner] = rings(...box, radius, 1.2), element = solid(parent);
    put(element, prism(P, front, ring, inner, bottom, top)); return element;
  };
  [[2,0],[108,0],[2,53],[108,53]].forEach(([x,y]) => block(svg,[x,y,x+8,y+8],3,0,10));
  block(svg,[-5,-6,123,63],6,8,20);
  block(svg,[-2,-10,120,7],6,18,62);
  block(svg,[-8,-3,8,64],6,15,43);
  const cushions = [0,1].map(index => {
    const x = 11 + index * 52;
    const [seat, seam] = rings(x,10,x+49,59,7,1.7);
    const [back, backSeam] = rings(x,1,x+49,14,5,1.2);
    return { index, x, seat, seam, back, backSeam, backrest:solid(svg), cushion:solid(svg),
      lift:tween(index === 0 ? 0 : 1.2), last:null };
  });
  block(svg,[114,-3,130,64],6,15,43);
  const draw = (cushion, lift) => {
    if (cushion.last === lift) return; cushion.last = lift;
    put(cushion.backrest, prism(P,front,cushion.back,cushion.backSeam,24+lift*0.35,58+lift*0.35));
    put(cushion.cushion, prism(P,front,cushion.seat,cushion.seam,20+lift,30+lift));
  };
  cushions.forEach((cushion,index) => draw(cushion,index === 0 ? 0 : 1.2));
  cushions[0].cushion.sil.classList.add('hi');
  const loop = register(stage,(_delta,now) => {
    const movement = cushions.map(cushion => { draw(cushion,tval(cushion.lift,now)); return !tdone(cushion.lift,now); });
    return movement.some(Boolean);
  }); cleanup.add(loop.unregister);
  const choose = active => {
    if (active === state.active) return;
    const origin = active < 0 ? state.active : active, now = performance.now(); state.active = active;
    cushions.forEach((cushion,index) => {
      const rest = index === 0 ? 0 : 1.2;
      const target = active < 0 ? rest : index === active ? state.lift : rest + state.lift*0.14;
      tset(cushion.lift,target,now,Math.abs(index-origin)*45);
      cushion.cushion.sil.classList.toggle('hi',index === (active < 0 ? 0 : active));
    });
    read.textContent = active < 0 ? 'rest' : 'cushion '+(active+1); loop.wake();
  };
  const centers = cushions.map((cushion,index) => P(cushion.x+24,35,30+(index === 0 ? 0 : 1.2)));
  const hit = ([x,y]) => { const distances = centers.map(center => Math.hypot(x-center[0],y-center[1])); const nearest = Math.min(...distances); return nearest < 52 ? distances.indexOf(nearest) : -1; };
  cleanup.add(pointer(stage,{move:point=>choose(hit(point)),leave:()=>choose(-1)}));
  cleanup.add(()=>svg.replaceChildren()); read.textContent='rest'; loop.wake();
  return {set:next=>{state.lift=clamp(next,8,24);const active=state.active;state.active=-2;choose(active);},destroy:cleanup.dispose};
}
hairline({name:'sofa',means:'A sofa lifts the cushion under the pointer while the neighbouring upholstery eases apart.',rules:[1,2,4,5,6,8,9],range:[8,16,24],mount});
