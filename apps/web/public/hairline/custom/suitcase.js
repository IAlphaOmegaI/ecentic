/** A carry-on lifts its telescoping handle and rounded shell for inspection. */
const {Cam,circ,clamp,disposer,fillet,fit,hull,mk,open,pointer,poly,proj,put,register,ringAt,rrect,seg,solid,tdone,tset,tval,tween}=HL;
function mount({stage,svg,read},value){
 const cleanup=disposer(),state={active:-1,intensity:value,last:''};
 const camera=Cam(45,.5,1.75);fit(camera,[[-45,-24,0],[45,24,0],[-45,24,0],[45,-24,115],[-23,-12,153],[23,-12,153]],200,156);
 const P=proj(camera),root=mk('g',{},svg);
 const wheels=[[-34,-18],[34,-18],[-34,18],[34,18]].sort((a,b)=>a[0]+a[1]-b[0]-b[1]).map(([x,y])=>{
  const wheel=solid(root),outer=circ(6,40),inner=circ(3.8,40),W=(u,v,w)=>P(w,y+u,7+v);
  put(wheel,{sil:poly(hull(ringAt(W,outer,x-4).concat(ringAt(W,outer,x+4)))),crease:poly(ringAt(W,inner,x+4))});return wheel;
 });
 const handleRails=mk('path',{class:'nf'},root),handleGrip=mk('path',{class:'sil hi'},root);
 const shell=solid(root),ribs=mk('path',{class:'nf lo'},root),zipper=mk('path',{class:'nf lo'},root),sideGrip=mk('path',{class:'sil'},root);
 const outer=rrect(-45,15,45,113,10,12),inner=rrect(-42.8,17.2,42.8,110.8,8.5,12);
 const extension=tween(6),lift=tween(0);
 function draw(extend,rise){
  const key=extend+','+rise;if(key===state.last)return;state.last=key;
  const top=128+extend+rise;
  handleRails.setAttribute('d',seg(P(-19,-12,106+rise),P(-19,-12,top))+seg(P(19,-12,106+rise),P(19,-12,top)));
  handleGrip.setAttribute('d',poly(fillet([[-24,-17],[24,-17],[24,-7],[-24,-7]],[4,4,4,4],8).map(([x,y])=>P(x,y,top))));
  const B=(u,v,w)=>P(u,w,v+rise);
  put(shell,{sil:poly(hull(ringAt(B,outer,-24).concat(ringAt(B,outer,24)))),crease:poly(ringAt(B,inner,24))});
  ribs.setAttribute('d',[-23,0,23].map(x=>open([[x-2,31],[x-2,94],[x,99],[x+2,94],[x+2,31]].map(([u,z])=>P(u,24.2,z+rise)))).join(''));
  zipper.setAttribute('d',open([[39,0,15],[45,0,22],[45,0,103],[39,0,112],[-38,0,112]].map(([x,y,z])=>P(x,y,z+rise))));
  sideGrip.setAttribute('d',poly(fillet([[-8,60],[8,60],[8,78],[-8,78]],[3,3,3,3],8).map(([y,z])=>P(45.2,y,z+rise))));
 }
 draw(6,0);
 const loop=register(stage,(_delta,now)=>{draw(tval(extension,now),tval(lift,now));return !tdone(extension,now)||!tdone(lift,now);});cleanup.add(loop.unregister);
 const targets=[[0,-12,134],[0,24,66],[34,18,7]].map(point=>P(...point));
 const choose=active=>{if(active===state.active)return;const origin=active<0?state.active:active;state.active=active;const now=performance.now();
  tset(extension,active===0?state.intensity+6:6,now,Math.abs(origin)*40);
  tset(lift,active===0?2:active===1?3:active===2?state.intensity*.45:0,now,Math.abs(origin-1)*40);
  handleGrip.classList.toggle('hi',active===0||active<0);shell.sil.classList.toggle('hi',active===1);wheels[3].sil.classList.toggle('hi',active===2);
  read.textContent=active<0?'rest':['handle','shell','wheels'][active];loop.wake();
 };
 cleanup.add(pointer(stage,{move:([x,y])=>{const distances=targets.map(point=>Math.hypot(x-point[0],y-point[1]));const nearest=Math.min(...distances);choose(nearest<62?distances.indexOf(nearest):-1);},leave:()=>choose(-1)}));
 cleanup.add(()=>svg.replaceChildren());read.textContent='rest';loop.wake();
 return {set:next=>{state.intensity=clamp(next,8,20);const active=state.active;state.active=-2;choose(active);},destroy:cleanup.dispose};
}
hairline({name:'suitcase',means:'A carry-on extends its handle and lifts its rounded shell as the pointer inspects each part.',rules:[1,2,3,4,5,6,7,8,9,10],range:[8,14,20],mount});
