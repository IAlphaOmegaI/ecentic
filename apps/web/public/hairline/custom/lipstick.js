/** An uncapped lipstick with a slanted bullet, metal collar and separate rounded cap. */
const { Cam, clamp, facing, fit, proj, rrect, ringAt, hull, poly, prism, solid, put,
  tdone, tset, tval, tween, disposer, pointer, register } = HL;
function mount({stage,svg,read},value) {
  const cleanup=disposer(),state={lift:value,active:-1};
  const camera=Cam(45,0.5,2.05);
  fit(camera,[[-18,-18,0],[92,42,0],[-18,42,0],[92,-18,0],[-12,-12,112],[15,15,112]],200,166);
  const P=proj(camera),front=facing(camera);
  const circle=(x,y,radius)=>rrect(x-radius,y-radius,x+radius,y+radius,radius,16);
  const base=circle(0,0,17),baseInner=circle(0,0,15.6);
  const casing=solid(svg);put(casing,prism(P,front,base,baseInner,0,49));
  const collar=circle(0,0,14.8),collarInner=circle(0,0,13.6);
  const sleeve=solid(svg);put(sleeve,prism(P,front,collar,collarInner,46,63));
  const bullet=circle(0,0,11.5),bulletInner=circle(0,0,10);
  const tip=solid(svg),cap=solid(svg);
  const capRing=circle(61,19,18),capInner=circle(61,19,16.5);
  const parts=[{lift:tween(0),last:null},{lift:tween(1.5),last:null}];
  const draw=(index,lift)=>{
    if(parts[index].last===lift)return;parts[index].last=lift;
    if(index===0){
      const top=bullet.map(sample=>P(sample.u,sample.v,96+sample.u*0.68+lift));
      const seam=bulletInner.map(sample=>P(sample.u,sample.v,95.5+sample.u*0.68+lift));
      put(tip,{sil:poly(hull(ringAt(P,bullet,61+lift).concat(top))),crease:poly(seam)});return;
    }
    put(cap,prism(P,front,capRing,capInner,lift,57+lift));
  };
  parts.forEach((part,index)=>draw(index,index===0?0:1.5));tip.sil.classList.add('hi');
  const loop=register(stage,(_delta,now)=>{
    const movement=parts.map((part,index)=>{draw(index,tval(part.lift,now));return !tdone(part.lift,now);});return movement.some(Boolean);
  });cleanup.add(loop.unregister);
  const choose=active=>{
    if(active===state.active)return;
    const origin=active<0?state.active:active,now=performance.now();state.active=active;
    parts.forEach((part,index)=>{const rest=index===0?0:1.5;tset(part.lift,active<0?rest:index===active?state.lift:rest+state.lift*0.12,now,Math.abs(index-origin)*45);});
    tip.sil.classList.toggle('hi',active===0||active<0);cap.sil.classList.toggle('hi',active===1);
    read.textContent=active<0?'rest':active===0?'lipstick':'cap';loop.wake();
  };
  const centers=[P(0,0,86),P(61,19,39)];
  const hit=([x,y])=>{const distances=centers.map(center=>Math.hypot(x-center[0],y-center[1]));const nearest=Math.min(...distances);return nearest<57?distances.indexOf(nearest):-1;};
  cleanup.add(pointer(stage,{move:point=>choose(hit(point)),leave:()=>choose(-1)}));
  cleanup.add(()=>svg.replaceChildren());read.textContent='rest';loop.wake();
  return {set:next=>{state.lift=clamp(next,6,16);const active=state.active;state.active=-2;choose(active);},destroy:cleanup.dispose};
}
hairline({name:'lipstick',means:'A lipstick and its cap lift for inspection, keeping the slanted bullet and collar visible.',rules:[1,2,3,4,5,6,8,9],range:[6,11,16],mount});
