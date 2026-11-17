const { Cam, clamp, fit, proj, facing, rrect, circ, fillet, hull, poly, open, seg, ringAt, rings, prism, solid, put, mk, tdone, tset, tval, tween, disposer, pointer, register } = HL;
/** A flatbed document scanner with a raised lid and a visible paper original. */
function mount({stage,svg,read},value){
  const cleanup=disposer(),state={active:-1,lift:value},camera=Cam(45,0.5,1.8);
  fit(camera,[[0,0,0],[112,92,0],[0,92,0],[112,0,0],[0,36,109],[112,36,109]],200,166);const P=proj(camera),front=facing(camera);
  const lid=solid(svg),lidInset=mk('path',{class:'nf lo'},svg),body=solid(svg),glass=mk('path',{class:'nf lo'},svg),button=mk('path',{class:'nf'},svg),paper=solid(svg),lines=mk('path',{class:'nf lo'},svg);
  const base=rings(0,0,112,92,8,1.8),sheet=rings(19,19,88,72,2,0.8),lidRing=rrect(0,0,112,83,7,12),lidInner=rrect(6,6,106,77,5,12);
  const parts=[
    {name:'scanner lid',rest:0,lift:tween(0),last:null,center:P(55,5,57),highlight:lid.sil,draw:lift=>{
      const project=(x,y,z)=>P(x,5+y*0.37,21+y*0.77+z+lift);put(lid,{sil:poly(hull(ringAt(project,lidRing,0).concat(ringAt(project,lidRing,4)))),crease:poly(ringAt(project,lidInner,4))});
      lidInset.setAttribute('d',poly(ringAt(project,rrect(13,13,99,70,4,12),4)));}},
    {name:'document',rest:1,lift:tween(1),last:null,center:P(55,49,20),highlight:paper.sil,draw:lift=>{
      put(body,prism(P,front,...base,0,16));glass.setAttribute('d',poly(ringAt(P,rrect(12,12,100,79,4,10),16)));button.setAttribute('d',poly(circ(2,24).map(point=>P(95+point.u,85+point.v,16))));
      put(paper,prism(P,front,...sheet,17+lift,18+lift));lines.setAttribute('d',[0,1,2,3].map(index=>seg(P(28,30+index*9,18+lift),P(index===3?60:78,30+index*9,18+lift))).join(''));}}
  ];

  const loop=register(stage,(_delta,now)=>{const moving=parts.map(part=>{const next=tval(part.lift,now);if(next!==part.last){part.draw(next);part.last=next;}return !tdone(part.lift,now);});return moving.some(Boolean);});cleanup.add(loop.unregister);
  const choose=active=>{if(active===state.active)return;const origin=active<0?state.active:active,now=performance.now();state.active=active;
    parts.forEach((part,index)=>{tset(part.lift,active<0?part.rest:index===active?part.rest+state.lift:part.rest+state.lift*0.12,now,Math.abs(index-origin)*45);part.highlight.classList.toggle('hi',active<0?index===0:index===active);});
    read.textContent=active<0?'rest':parts[active].name;loop.wake();};
  const hit=([x,y])=>{const distances=parts.map(part=>Math.hypot(x-part.center[0],y-part.center[1]));const closest=Math.min(...distances);return closest<68?distances.indexOf(closest):-1;};
  cleanup.add(pointer(stage,{move:point=>choose(hit(point)),leave:()=>choose(-1)}));cleanup.add(()=>svg.replaceChildren());
  parts.forEach((part,index)=>{part.draw(part.rest);part.highlight.classList.toggle('hi',index===0);});read.textContent='rest';loop.wake();
  return {set:next=>{state.lift=clamp(next,6,18);const active=state.active;state.active=-2;choose(active);},destroy:cleanup.dispose};
}
hairline({name:'readiness-scanner',means:'A flatbed document scanner opens its lid and lifts the original page for inspection.',rules:[1,2,3,4,5,6,8,9],range:[6,12,18],mount});
