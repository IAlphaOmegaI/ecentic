const { Cam, clamp, fit, proj, facing, rrect, circ, fillet, hull, poly, open, seg, ringAt, rings, prism, solid, put, mk, tdone, tset, tval, tween, disposer, pointer, register } = HL;
/** Engraved banknotes and milled coins lift from a compact stack. */
function mount({stage,svg,read},value){
  const cleanup=disposer(),state={active:-1,lift:value},camera=Cam(45,0.5,2.4);
  fit(camera,[[-8,-8,0],[133,87,0],[-8,87,0],[133,-8,40]],200,166);const P=proj(camera),front=facing(camera);
  const notes=[0,1,2].map(index=>({index,body:solid(svg),frame:mk('path',{class:'nf lo'},svg),seal:mk('path',{class:'nf lo'},svg)}));
  const coins=[0,1,2].map(index=>({index,body:solid(svg),rim:mk('path',{class:'nf lo'},svg)}));
  const parts=[
    {name:'banknotes',rest:0,lift:tween(0),last:null,center:P(49,31,12),highlight:notes[2].body.sil,draw:lift=>{
      notes.forEach(note=>{const offset=note.index*3,z=note.index*3+1+(note.index===2?lift:lift*0.1);put(note.body,prism(P,front,...rings(offset,offset,94+offset,56+offset,5,1.2),z,z+2));
        note.frame.setAttribute('d',poly(ringAt(P,rrect(7+offset,7+offset,87+offset,49+offset,5,10),z+2)));note.seal.setAttribute('d',poly(circ(14,40).map(point=>P(47+offset+point.u,28+offset+point.v*0.8,z+2))));});}},
    {name:'coins',rest:0,lift:tween(0),last:null,center:P(114,62,12),highlight:coins[2].body.sil,draw:lift=>{
      coins.forEach(coin=>{const z=coin.index*4+1+(coin.index===2?lift:lift*0.1),outer=circ(19,48).map(point=>({...point,u:point.u+114,v:point.v+62})),inner=circ(16.5,48).map(point=>({...point,u:point.u+114,v:point.v+62}));
        put(coin.body,prism(P,front,outer,inner,z,z+3.5));coin.rim.setAttribute('d',poly(circ(12,40).map(point=>P(114+point.u,62+point.v,z+3.5))));});}}
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
hairline({name:'money-stack',means:'Engraved banknotes and milled coins lift from their stacks for inspection.',rules:[1,2,3,4,5,6,8,9],range:[6,12,18],mount});
