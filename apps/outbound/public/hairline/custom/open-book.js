/** A clothbound book opens at a raised spine; each page fans upward from its binding. */
const {Cam,clamp,fit,proj,rrect,poly,open,ringAt,solid,put,mk,tdone,tset,tval,tween,disposer,pointer,register}=HL;
function mount({stage,svg,read},value){
  const cleanup=disposer(),state={active:-1,lift:value},camera=Cam(45,0.5,1.65);
  fit(camera,[[-78,0,0],[78,0,0],[-78,104,0],[78,104,0],[-78,0,38],[78,104,38]],200,166);const P=proj(camera);
  const covers=[-1,1].map(side=>({side,body:solid(svg)}));
  covers.forEach(cover=>{const ring=rrect(0,0,78,104,4,12),project=(x,y,z)=>P(x*cover.side,y,z+(1-x/78)*5);put(cover.body,{sil:poly(ringAt(project,ring,2)),crease:open(ringAt(project,rrect(2,2,76,102,3,12),0).slice(1,30))});});
  const leaves=[-1,1].flatMap(side=>[0,1,2].map(index=>{const group=mk('g',{},svg);return{side,index,back:mk('path',{class:'lo'},group),face:mk('path',{class:'sil'},group),print:mk('path',{class:'nf lo'},group),bend:tween(0),last:null};}));
  const spine=mk('path',{class:'nf lo'},svg);spine.setAttribute('d',open([P(0,3,14),P(0,100,14)]));
  const draw=(leaf,bend)=>{if(leaf.last===bend)return;leaf.last=bend;
    const project=(x,y,z)=>P(x*leaf.side,y,z+7+leaf.index*1.5+6*Math.cos(x/74*Math.PI/2)+bend*Math.sin(x/74*Math.PI/2)),ring=rrect(1.5,3,74,100,2,12);
    leaf.back.setAttribute('d',poly(ringAt(project,ring,-.8)));leaf.face.setAttribute('d',poly(ringAt(project,ring,0)));
    leaf.print.setAttribute('d',leaf.index===2?[0,1,2,3,4,5].map(index=>open([project(13,20+index*11,.05),project(index===5?49:63,20+index*11,.05)])).join(''):'');};
  leaves.forEach(leaf=>draw(leaf,0));leaves[2].face.classList.add('hi');
  const loop=register(stage,(_delta,now)=>{const moving=leaves.map(leaf=>{draw(leaf,tval(leaf.bend,now));return !tdone(leaf.bend,now);});return moving.some(Boolean);});cleanup.add(loop.unregister);
  const choose=active=>{if(active===state.active)return;const origin=active<0?state.active:active,now=performance.now();state.active=active;
    leaves.forEach((leaf,index)=>{const side=index<3?0:1,lift=active<0?0:(side===active?state.lift:state.lift*.1)*(leaf.index+1)/3;tset(leaf.bend,lift,now,Math.abs(side-origin)*45+(2-leaf.index)*35);leaf.face.classList.toggle('hi',active<0?index===2:side===active&&leaf.index===2);});
    read.textContent=active<0?'rest':active===0?'left pages':'right pages';loop.wake();};
  const centers=[P(-41,51,12),P(41,51,12)],hit=([x,y])=>{const distances=centers.map(center=>Math.hypot(x-center[0],y-center[1]));const closest=Math.min(...distances);return closest<80?distances.indexOf(closest):-1;};
  cleanup.add(pointer(stage,{move:point=>choose(hit(point)),leave:()=>choose(-1)}));cleanup.add(()=>svg.replaceChildren());read.textContent='rest';loop.wake();
  return{set:next=>{state.lift=clamp(next,8,24);const active=state.active;state.active=-2;choose(active);},destroy:cleanup.dispose};
}
hairline({name:'open-book',means:'An open clothbound book fans its pages up from the spine when the pointer reaches either page.',rules:[1,2,3,4,5,6,8,9,10],range:[8,16,24],mount});
