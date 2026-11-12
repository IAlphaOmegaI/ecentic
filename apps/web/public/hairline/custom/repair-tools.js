const { Cam, clamp, fit, proj, facing, rrect, circ, fillet, hull, poly, open, seg, ringAt, rings, prism, solid, put, mk, tdone, tset, tval, tween, disposer, pointer, register } = HL;
/** An open-jaw wrench and a fluted screwdriver lift for inspection. */
function mount({stage,svg,read},value){
  const cleanup=disposer(),state={active:-1,lift:value},camera=Cam(45,0.5,2.25);
  fit(camera,[[-24,-8,0],[67,114,0],[-24,114,0],[67,-8,28]],200,166);
  const P=proj(camera),front=facing(camera);
  const shape=fillet([[-9,-4],[9,-4],[9,57],[23,73],[23,96],[12,105],[12,81],[-12,81],[-12,105],[-23,96],[-23,73],[-9,57]],[7,7,4,5,4,2,2,2,2,4,5,4],7);
  const wrench=mk('g',{},svg),back=mk('path',{class:'lo'},wrench),face=mk('path',{class:'sil'},wrench),crease=mk('path',{class:'nf lo'},wrench),hole=mk('path',{class:'nf lo'},wrench);
  const driver=mk('g',{},svg),shaft=solid(driver),head=solid(driver),handle=solid(driver),grip=mk('path',{class:'nf lo'},driver);
  const shaftRing=rings(45,42,51,97,2,0.6),headRing=rings(43,96,53,108,1,0.6),handleRing=rings(37,-1,59,49,9,1.5);
  const parts=[
    {name:'wrench',rest:0,lift:tween(0),last:null,center:P(0,62,8),highlight:face,draw:lift=>{
      back.setAttribute('d',poly(shape.map(([x,y])=>P(x,y,3+lift))));face.setAttribute('d',poly(shape.map(([x,y])=>P(x,y,7+lift))));
      crease.setAttribute('d',open([P(-5,13,7+lift),P(-5,55,7+lift),P(-16,76,7+lift)]));hole.setAttribute('d',poly(circ(3,24).map(point=>P(point.u,6+point.v,7+lift))));}},
    {name:'screwdriver',rest:2,lift:tween(2),last:null,center:P(48,26,12),highlight:handle.sil,draw:lift=>{
      put(shaft,prism(P,front,...shaftRing,5+lift,10+lift));put(head,prism(P,front,...headRing,5+lift,8+lift));put(handle,prism(P,front,...handleRing,2+lift,16+lift));
      grip.setAttribute('d',[-5,0,5].map(offset=>seg(P(48+offset,10,16+lift),P(48+offset,37,16+lift))).join(''));}}
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
hairline({name:'repair-tools',means:'A wrench and a fluted screwdriver lift for inspection, with a smaller lift in the neighbouring tool.',rules:[1,2,3,4,5,6,8,9],range:[6,12,18],mount});
