/** Over-ear headphones: an open curved headband and two padded, oval ear cups. */
const { Cam, clamp, fit, proj, rrect, fillet, hull, poly, open, ringAt, solid, put, mk,
  tdone, tset, tval, tween, disposer, pointer, register } = HL;
function mount({ stage, svg, read }, value) {
  const cleanup = disposer(), state = { lift:value, active:-1 };
  const camera = Cam(45,0.5,2.05);
  fit(camera,[[-7,-7,0],[122,40,0],[-7,40,0],[122,-7,0],[4,12,115],[110,24,115]],200,166);
  const P = proj(camera);
  const arc = (radius, reverse=false) => Array.from({length:49},(_,index) => {
    const angle = Math.PI * (reverse ? 48-index : index) / 48;
    return [55+radius*Math.cos(angle),54+radius*Math.sin(angle)];
  });
  const band = fillet([...arc(53),...arc(45,true)],Array(98).fill(1),3);
  const projectBand = depth => band.map(([x,z]) => P(x,depth,z));
  mk('path',{d:poly(projectBand(10)),class:'lo'},svg);
  const headband = mk('path',{d:poly(projectBand(16)),class:'sil hi'},svg);
  mk('path',{d:open(arc(47).slice(5,-5).map(([x,z])=>P(x,16,z))),class:'nf lo'},svg);
  const cups = [4,100].map((x,index) => {
    const [ring,inner] = [rrect(-16,-27,16,27,15,14),rrect(-12.5,-23.5,12.5,23.5,11.5,14)];
    return {x,index,ring,inner,body:solid(svg),hinge:solid(svg),lift:tween(index===0?1.5:0),last:null};
  });
  const draw = (cup,lift) => {
    if (cup.last === lift) return; cup.last=lift;
    const project = (u,v,depth) => P(cup.x+depth,18+u,34+v+lift);
    put(cup.body,{sil:poly(hull(ringAt(project,cup.ring,0).concat(ringAt(project,cup.ring,9)))),crease:poly(ringAt(project,cup.inner,9))});
    const hinge = rrect(-5,-3,5,8,3,10), inset = rrect(-3,-1,3,6,2,10);
    const pivot = (u,v,depth) => P(cup.x+depth,18+u,57+v+lift*0.35);
    put(cup.hinge,{sil:poly(hull(ringAt(pivot,hinge,1).concat(ringAt(pivot,hinge,7)))),crease:poly(ringAt(pivot,inset,7))});
  };
  cups.forEach((cup,index)=>draw(cup,index===0?1.5:0));
  const loop=register(stage,(_delta,now)=>{
    const movement=cups.map(cup=>{draw(cup,tval(cup.lift,now));return !tdone(cup.lift,now);}); return movement.some(Boolean);
  }); cleanup.add(loop.unregister);
  const choose=active=>{
    if(active===state.active)return;
    const origin=active<0?state.active:active,now=performance.now();state.active=active;
    cups.forEach((cup,index)=>{
      const rest=index===0?1.5:0;
      tset(cup.lift,active<0?rest:index===active?state.lift:rest+state.lift*0.12,now,Math.abs(index-origin)*45);
      cup.body.sil.classList.toggle('hi',index===active);
    });
    headband.classList.toggle('hi',active<0); read.textContent=active<0?'rest':active===0?'left cup':'right cup';loop.wake();
  };
  const centers=cups.map((cup,index)=>P(cup.x+6,18,34+(index===0?1.5:0)));
  const hit=([x,y])=>{const distances=centers.map(center=>Math.hypot(x-center[0],y-center[1]));const nearest=Math.min(...distances);return nearest<62?distances.indexOf(nearest):-1;};
  cleanup.add(pointer(stage,{move:point=>choose(hit(point)),leave:()=>choose(-1)}));
  cleanup.add(()=>svg.replaceChildren());read.textContent='rest';loop.wake();
  return {set:next=>{state.lift=clamp(next,6,18);const active=state.active;state.active=-2;choose(active);},destroy:cleanup.dispose};
}
hairline({name:'headphones',means:'Padded headphones lift an ear cup for inspection, with a smaller response in the opposite cup.',rules:[1,2,3,4,5,6,8,9],range:[6,12,18],mount});
