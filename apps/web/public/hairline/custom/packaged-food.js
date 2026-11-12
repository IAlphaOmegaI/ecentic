/** A standing food pouch with a zip seal, a folded base and a grain window. */
const { Cam, clamp, fit, proj, rrect, rings, prism, facing, fillet, hull, poly, open, solid, put, mk,
  tdone, tset, tval, tween, disposer, pointer, register } = HL;
function mount({stage,svg,read},value) {
  const cleanup=disposer(),state={lift:value,active:-1};
  const camera=Cam(45,0.5,1.9);
  fit(camera,[[-46,-10,0],[46,23,0],[-46,23,0],[46,-10,0],[-36,-8,145],[36,23,145]],200,168);
  const P=proj(camera),front=facing(camera);
  const outline=fillet([[-38,5],[-43,24],[-39,91],[-32,106],[32,106],[39,91],[43,24],[38,5]],Array(8).fill(6),6);
  const inside=fillet([[-35,8],[-39,25],[-35,89],[-29,102],[29,102],[35,89],[39,25],[35,8]],Array(8).fill(5),6);
  const body=solid(svg),fold=mk('path',{class:'nf lo'},svg),seal=solid(svg),zip=mk('path',{class:'nf lo'},svg);
  const [sealRing,sealInner]=rings(-34,7,34,16,2,1);
  const window=solid(svg),windowRing=rrect(-23,33,23,74,7,10);
  const grains=[[-13,46],[-2,59],[12,47],[12,65]].map(([x,z])=>({ring:rrect(x-2.3,z-5,x+2.3,z+5,2.3,8),path:mk('path',{class:'nf lo'},svg)}));
  const parts=[tween(0),tween(0),tween(1)],cache={last:''};
  const draw=(sealLift,bodyLift,windowLift)=>{
    const signature=[sealLift,bodyLift,windowLift].join(',');if(signature===cache.last)return;cache.last=signature;
    const frontY=z=>z>90?19-(z-90)*6/16:19,backY=z=>z>90?-5+(z-90)*14/16:-5;
    const frontRing=outline.map(([x,z])=>P(x,frontY(z),z+bodyLift)),backRing=outline.map(([x,z])=>P(x,backY(z),z+bodyLift));
    put(body,{sil:poly(hull(backRing.concat(frontRing))),crease:poly(inside.map(([x,z])=>P(x,frontY(z),z+bodyLift)))});
    fold.setAttribute('d',open([P(-34,19,9+bodyLift),P(0,12,18+bodyLift),P(34,19,9+bodyLift)]));
    put(seal,prism(P,front,sealRing,sealInner,104+bodyLift+sealLift,111+bodyLift+sealLift));
    zip.setAttribute('d',open([P(-29,16,108+bodyLift+sealLift),P(29,16,108+bodyLift+sealLift)]));
    const windowY=20+windowLift*0.4,windowZ=bodyLift+windowLift;
    put(window,{sil:poly(windowRing.map(sample=>P(sample.u,windowY,sample.v+windowZ))),crease:''});
    grains.forEach(grain=>grain.path.setAttribute('d',poly(grain.ring.map(sample=>P(sample.u,windowY+0.1,sample.v+windowZ)))));
  };
  draw(0,0,1);seal.sil.classList.add('hi');
  const loop=register(stage,(_delta,now)=>{draw(...parts.map(part=>tval(part,now)));return parts.some(part=>!tdone(part,now));});cleanup.add(loop.unregister);
  const choose=active=>{
    if(active===state.active)return;
    const origin=active<0?state.active:active,now=performance.now();state.active=active;
    parts.forEach((part,index)=>{const rest=index===2?1:0;tset(part,active<0?rest:index===active?state.lift:rest+state.lift*0.1,now,Math.abs(index-origin)*45);});
    [seal,body,window].forEach((part,index)=>part.sil.classList.toggle('hi',active===index||(active<0&&index===0)));
    read.textContent=active<0?'rest':['seal','pouch','window'][active];loop.wake();
  };
  const centers=[P(0,10,110),P(-30,19,52),P(7,21,54)];
  const hit=([x,y])=>{const distances=centers.map(center=>Math.hypot(x-center[0],y-center[1]));const nearest=Math.min(...distances);return nearest<55?distances.indexOf(nearest):-1;};
  cleanup.add(pointer(stage,{move:point=>choose(hit(point)),leave:()=>choose(-1)}));
  cleanup.add(()=>svg.replaceChildren());read.textContent='rest';loop.wake();
  return {set:next=>{state.lift=clamp(next,6,18);const active=state.active;state.active=-2;choose(active);},destroy:cleanup.dispose};
}
hairline({name:'packaged-food',means:'A sealed food pouch lifts its closure, body or grain window for inspection, with a smaller neighbouring response.',rules:[1,2,3,4,5,6,8,9],range:[6,12,18],mount});
