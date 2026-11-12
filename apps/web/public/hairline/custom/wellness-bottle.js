/** A rounded wellness bottle, ribbed cap and capsule: inspect the closure or one capsule. */
const { Cam, clamp, facing, fit, proj, rrect, ringAt, hull, poly, open, prism, solid, put, mk,
  tdone, tset, tval, tween, disposer, pointer, register } = HL;
function mount({stage,svg,read},value) {
  const cleanup=disposer(),state={lift:value,active:-1};
  const camera=Cam(45,0.5,2.05);
  fit(camera,[[-30,-27,0],[86,35,0],[-30,35,0],[86,-27,0],[-24,-21,110],[24,21,110]],200,166);
  const P=proj(camera),front=facing(camera);
  const round=(x,y,radius)=>rrect(x-radius,y-radius,x+radius,y+radius,radius,16);
  const body=rrect(-27,-23,27,23,19,14),bodyInner=rrect(-25.5,-21.5,25.5,21.5,17.5,14);
  const bottle=solid(svg);put(bottle,prism(P,front,body,bodyInner,0,62));
  const neck=round(0,0,18),shoulder=solid(svg);
  put(shoulder,{sil:poly(hull(ringAt(P,body,60).concat(ringAt(P,neck,74)))),crease:poly(ringAt(P,round(0,0,16.5),74))});
  const panel=rrect(-12,17,12,46,4,8);
  mk('path',{class:'nf lo',d:poly(panel.map(sample=>P(27.1,sample.u,sample.v)))},svg);
  const cap=solid(svg),rib1=mk('path',{class:'nf lo'},svg),rib2=mk('path',{class:'nf lo'},svg);
  const capRing=round(0,0,20),capInner=round(0,0,18.5);
  const pill=solid(svg),seam=mk('path',{class:'nf lo'},svg);
  const pillRing=rrect(45,8,85,23,7.5,14),pillInner=rrect(46.2,9.2,83.8,21.8,6.3,14);
  const parts=[{lift:tween(0),last:null},{lift:tween(1),last:null}];
  const draw=(index,lift)=>{
    if(parts[index].last===lift)return;parts[index].last=lift;
    if(index===0){
      put(cap,prism(P,front,capRing,capInner,73+lift,91+lift));
      [rib1,rib2].forEach((path,level)=>{path.setAttribute('d',open(Array.from({length:33},(_,step)=>{const angle=(-45+step*180/32)*Math.PI/180;return P(20*Math.cos(angle),20*Math.sin(angle),79+level*6+lift);})));});return;
    }
    put(pill,prism(P,front,pillRing,pillInner,2+lift,10+lift));
    seam.setAttribute('d',open([P(65,8,10+lift),P(65,23,10+lift),P(65,23,2+lift)]));
  };
  parts.forEach((part,index)=>draw(index,index));cap.sil.classList.add('hi');
  const loop=register(stage,(_delta,now)=>{const movement=parts.map((part,index)=>{draw(index,tval(part.lift,now));return !tdone(part.lift,now);});return movement.some(Boolean);});cleanup.add(loop.unregister);
  const choose=active=>{
    if(active===state.active)return;
    const origin=active<0?state.active:active,now=performance.now();state.active=active;
    parts.forEach((part,index)=>{const rest=index;tset(part.lift,active<0?rest:index===active?state.lift:rest+state.lift*0.1,now,Math.abs(index-origin)*45);});
    cap.sil.classList.toggle('hi',active===0||active<0);pill.sil.classList.toggle('hi',active===1);
    read.textContent=active<0?'rest':active===0?'cap':'capsule';loop.wake();
  };
  const centers=[P(0,0,85),P(65,15,10)];
  const hit=([x,y])=>{const distances=centers.map(center=>Math.hypot(x-center[0],y-center[1]));const nearest=Math.min(...distances);return nearest<57?distances.indexOf(nearest):-1;};
  cleanup.add(pointer(stage,{move:point=>choose(hit(point)),leave:()=>choose(-1)}));
  cleanup.add(()=>svg.replaceChildren());read.textContent='rest';loop.wake();
  return {set:next=>{state.lift=clamp(next,6,18);const active=state.active;state.active=-2;choose(active);},destroy:cleanup.dispose};
}
hairline({name:'wellness-bottle',means:'A rounded wellness bottle lifts its ribbed cap or capsule for inspection, with a quiet companion response.',rules:[1,2,3,4,5,6,8,9],range:[6,12,18],mount});
