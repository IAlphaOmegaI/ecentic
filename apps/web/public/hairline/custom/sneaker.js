/** A rounded sneaker separates into its sole, upper and lacing under inspection. */
const {Cam,clamp,facing,fillet,fit,hull,mk,open,poly,prism,proj,put,ringAt,run,seg,solid,tdone,tset,tval,tween,disposer,pointer,register}=HL;
const outline=fillet([[0,3],[8,-13],[47,-16],[102,-14],[125,-4],[133,10],[127,28],[100,36],[49,33],[8,27],[-1,17]],Array(11).fill(7),8);
const ring=(points)=>points.map(([u,v],index)=>{const previous=points[(index+points.length-1)%points.length],next=points[(index+1)%points.length];const length=Math.hypot(next[1]-previous[1],next[0]-previous[0]);return {u,v,nu:(next[1]-previous[1])/length,nv:-(next[0]-previous[0])/length};});
const height=(x)=>18+35*Math.exp(-(((x-19)/45)**2));
function mount({stage,svg,read},value){
 const cleanup=disposer(),state={active:-1,intensity:value,last:''};
 const camera=Cam(45,0.5,2.1);fit(camera,[[0,-16,0],[133,36,0],[0,27,0],[0,-13,76],[133,-4,24]],200,156);
 const P=proj(camera),front=facing(camera),root=mk('g',{},svg);
 const soleRing=ring(outline),soleInner=ring(outline.map(([x,y])=>[64+(x-64)*.97,10+(y-10)*.92]));
 const base=solid(root);put(base,prism(P,front,soleRing,soleInner,0,9));
 const seam=mk('path',{class:'nf lo'},root);
 seam.setAttribute('d',open(run(soleInner,front).map(q=>P(q.u,q.v,4))));
 const upper=solid(root),collar=mk('path',{class:'sil'},root),tongue=mk('path',{class:'sil'},root),laces=mk('path',{class:'nf hi'},root),toe=mk('path',{class:'nf lo'},root);
 const opening=Array.from({length:64},(_,index)=>{const angle=index/64*Math.PI*2;return [25+17*Math.cos(angle),9+11*Math.sin(angle)];});
 const upperRing=ring(outline.map(([x,y])=>[64+(x-64)*.92,10+(y-10)*.82]));
 const upperInner=ring(outline.map(([x,y])=>[64+(x-64)*.89,10+(y-10)*.76]));
 const upperLift=tween(2),laceLift=tween(0);
 function draw(lift,lace){
  const key=lift+','+lace;if(key===state.last)return;state.last=key;
  const top=upperRing.map(q=>P(q.u,q.v,height(q.u)+lift));
  put(upper,{sil:poly(hull(ringAt(P,upperRing,11+lift).concat(top))),crease:open(run(upperInner,front).map(q=>P(q.u,q.v,height(q.u)+lift-1)))});
  collar.setAttribute('d',poly(opening.map(([x,y])=>P(x,y,height(x)+lift+1))));
  const throat=fillet([[37,-2],[78,0],[74,22],[37,21]],[4,3,3,4],7);
  tongue.setAttribute('d',poly(throat.map(([x,y])=>P(x,y,height(x)+lift+2+lace))));
  const knots=[43,50,57,64,71];
  laces.setAttribute('d',knots.map((x,index)=>seg(P(x,1,height(x)+lift+3+lace),P(x+3,18,height(x+3)+lift+3+lace))).join(''));
  toe.setAttribute('d',open([[97,-8],[103,2],[105,15],[100,28]].map(([x,y])=>P(x,y,height(x)+lift+.5))));
 }
 draw(2,0);
 const loop=register(stage,(_delta,now)=>{draw(tval(upperLift,now),tval(laceLift,now));return !tdone(upperLift,now)||!tdone(laceLift,now);});cleanup.add(loop.unregister);
 const targets=[[104,30,5],[17,27,44],[58,10,height(58)+5]].map(point=>P(...point));
 const choose=(active)=>{if(active===state.active)return;const origin=active<0?state.active:active;state.active=active;const now=performance.now();
  tset(upperLift,active<0?2:active===0?state.intensity:state.intensity*.6,now,Math.abs(origin-1)*40);
  tset(laceLift,active===2?state.intensity*.25:0,now,Math.abs(origin-2)*40);
  base.sil.classList.toggle('hi',active===0);upper.sil.classList.toggle('hi',active===1);laces.classList.toggle('hi',active===2||active<0);
  read.textContent=active<0?'rest':['sole','upper','laces'][active];loop.wake();
 };
 cleanup.add(pointer(stage,{move:([x,y])=>{const distances=targets.map(point=>Math.hypot(x-point[0],y-point[1]));const nearest=Math.min(...distances);choose(nearest<70?distances.indexOf(nearest):-1);},leave:()=>choose(-1)}));
 cleanup.add(()=>svg.replaceChildren());read.textContent='rest';loop.wake();
 return {set:next=>{state.intensity=clamp(next,8,20);const active=state.active;state.active=-2;choose(active);},destroy:cleanup.dispose};
}
hairline({name:'sneaker',means:'A sneaker opens into its rounded sole, upper and lacing as the pointer inspects each part.',rules:[1,2,3,4,5,6,7,8,9],range:[8,14,20],mount});
