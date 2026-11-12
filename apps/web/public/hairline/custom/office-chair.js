/** An office chair with a padded back, seat, armrests and a five-wheel base. */
const { Cam, clamp, facing, fit, proj, rrect, ringAt, hull, poly, open, rings, prism,
  solid, put, mk, tween, tset, tval, tdone, disposer, pointer, register } = HL;
function mount({ stage, svg, read }, value) {
  const cleanup = disposer(), state = { lift: value, active: -1 };
  const camera = Cam(45, 0.5, 1.85);
  fit(camera, [[-23,-35,0],[78,66,0],[-23,66,0],[78,-35,0],[-8,-24,121],[64,-24,121]],200,166);
  const P = proj(camera), front = facing(camera);
  const root = mk('g', {}, svg);
  const block = (parent,x0,y0,x1,y1,r,z0,z1) => {
    const [ring, inner] = rings(x0,y0,x1,y1,r,0.8);
    put(solid(parent),prism(P,front,ring,inner,z0,z1));
  };
  const base = mk('g', {}, root);
  const spokes = Array.from({length:5},(_,index)=>({angle:(index*72+18)*Math.PI/180,index}));
  spokes.sort((first,second)=>Math.sin(first.angle)+Math.cos(first.angle)-Math.sin(second.angle)-Math.cos(second.angle));
  spokes.forEach(({angle})=>{
    const cosine=Math.cos(angle),sine=Math.sin(angle);
    const Q=(u,v,z)=>P(28+u*cosine-v*sine,16+u*sine+v*cosine,z);
    const [ring,inner]=rings(0,-2,43,2,1.8,0.6);
    const facingSpoke=q=>front({nu:q.nu*cosine-q.nv*sine,nv:q.nu*sine+q.nv*cosine});
    put(solid(base),prism(Q,facingSpoke,ring,inner,8,11));
    const wheel=rrect(-5,-4,5,4,3.8,10), wheelInner=rrect(-3.5,-2.5,3.5,2.5,2.3,10);
    const W=(u,v,depth)=>Q(40+u,depth,v+4);
    put(solid(base),{sil:poly(hull(ringAt(W,wheel,-2).concat(ringAt(W,wheel,3)))),crease:poly(ringAt(W,wheelInner,3))});
  });
  block(root,23,11,33,21,4,10,44);
  const back=solid(root), backInset=mk('path',{class:'nf lo'},back.g);
  const leftArm=solid(root),seat=solid(root),rightArm=solid(root);
  const pieces=[{lift:tween(1.5),body:back},{lift:tween(0),body:seat}];
  const seatRings=rings(-2,-9,59,43,9,1.5);
  const backRing=rrect(-3,49,61,109,12,14), backInner=rrect(0,52,58,106,10,14);
  const draw=(backLift,seatLift)=>{
    const signature=`${backLift.toFixed(4)}:${seatLift.toFixed(4)}`;
    if(state.last===signature)return;state.last=signature;
    const B=(u,v,depth)=>P(u,-18+depth-(v-49)*0.08,v+backLift);
    put(back,{sil:poly(hull(ringAt(B,backRing,0).concat(ringAt(B,backRing,7)))),crease:poly(ringAt(B,backInner,7))});
    backInset.setAttribute('d',open([B(6,69,7.3),B(29,66,7.3),B(52,69,7.3)]));
    const arm=(body,x)=>{
      const outline=rrect(-11,42,34,68,5,8),inner=rrect(-8,45,31,65,3,8);
      const A=(u,v,depth)=>P(x+depth,u,v+seatLift*0.6);
      put(body,{sil:poly(hull(ringAt(A,outline,0).concat(ringAt(A,outline,4)))),crease:poly(ringAt(A,inner,4))});
    };
    arm(leftArm,-8);
    put(seat,prism(P,front,...seatRings,43+seatLift,50+seatLift));
    arm(rightArm,61);
  };
  draw(1.5,0);back.sil.classList.add('hi');read.textContent='rest';
  const loop=register(stage,(_delta,now)=>{draw(tval(pieces[0].lift,now),tval(pieces[1].lift,now));return pieces.some(piece=>!tdone(piece.lift,now));});
  cleanup.add(loop.unregister);
  const choose=active=>{
    if(active===state.active)return;
    state.active=active;const now=performance.now();
    pieces.forEach((piece,index)=>{
      const rest=index===0?1.5:0;
      tset(piece.lift,rest+(active<0?0:index===active?state.lift:state.lift*0.3),now,Math.abs(index-active)*45);
      piece.body.sil.classList.toggle('hi',active<0?index===0:index===active);
    });
    read.textContent=active<0?'rest':active===0?'backrest':'seat';loop.wake();
  };
  const centers=[P(28,-16,84),P(28,19,50)];
  const hit=([x,y])=>{
    const distances=centers.map(center=>Math.hypot(x-center[0],y-center[1]));
    const minimum=Math.min(...distances);return minimum<58?distances.indexOf(minimum):-1;
  };
  cleanup.add(pointer(stage,{move:point=>choose(hit(point)),leave:()=>choose(-1)}));
  cleanup.add(()=>svg.replaceChildren());loop.wake();
  return {set:next=>{state.lift=clamp(next,4,12);const active=state.active;state.active=-2;choose(active);},destroy:cleanup.dispose};
}
hairline({name:'office-chair',means:'A padded office chair lifts its seat or backrest for inspection; its supporting parts follow.',rules:[1,2,3,4,5,6,8,9],range:[4,8,12],mount});
