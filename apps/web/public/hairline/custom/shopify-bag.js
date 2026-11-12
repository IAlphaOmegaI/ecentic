/** A Shopify shopping bag; catalog cards lift and part from the selected product. */
const { Cam, clamp, facing, fit, hull, open, poly, proj, rad, ringAt, rrect, run, seg,
  tdone, tset, tval, tween, disposer, mk, pointer, register } = HL;
const BRAND = [[47.152,32.662],[46.685,34.408],[46.219,36.154],[45.752,37.9],[45.285,39.646],[44.819,41.392],[44.352,43.138],[43.45,44.014],[41.724,43.479],[39.955,43.114],[38.158,42.93],[36.352,42.951],[34.566,43.218],[32.875,43.84],[31.467,44.956],[30.639,46.547],[30.517,48.338],[31.269,49.96],[32.558,51.221],[34.021,52.281],[35.536,53.266],[37.051,54.251],[38.534,55.285],[39.953,56.403],[41.274,57.635],[42.457,59],[43.462,60.501],[44.253,62.124],[44.811,63.842],[45.138,65.618],[45.259,67.42],[45.222,69.227],[45.019,71.022],[44.638,72.788],[44.065,74.501],[43.295,76.135],[42.325,77.658],[41.162,79.04],[39.821,80.249],[38.326,81.262],[36.708,82.063],[34.997,82.643],[33.228,83.005],[31.428,83.161],[29.621,83.161],[27.821,83.014],[26.039,82.716],[24.289,82.264],[22.586,81.661],[20.944,80.908],[19.376,80.01],[17.903,78.965],[16.845,77.674],[17.258,75.914],[17.672,74.155],[18.086,72.396],[18.499,70.636],[19.062,69.278],[20.572,70.271],[22.145,71.159],[23.781,71.927],[25.482,72.534],[27.248,72.906],[29.05,72.912],[30.73,72.287],[31.924,70.954],[32.396,69.225],[32.134,67.445],[31.308,65.846],[30.09,64.516],[28.685,63.38],[27.218,62.325],[25.758,61.259],[24.364,60.109],[23.094,58.825],[22.01,57.381],[21.165,55.786],[20.58,54.078],[20.244,52.303],[20.12,50.501],[20.169,48.695],[20.389,46.902],[20.781,45.138],[21.346,43.423],[22.082,41.773],[22.985,40.208],[24.047,38.747],[25.257,37.405],[26.6,36.197],[28.059,35.131],[29.615,34.214],[31.249,33.444],[32.945,32.82],[34.685,32.334],[36.457,31.98],[38.249,31.747],[40.052,31.627],[41.859,31.63],[43.659,31.779],[45.437,32.101]];
const WIDTH = 72, HEIGHTS = [78, 88, 74], DEPTHS = [2, 19, 37];
const ordered = (points) => points[0][0] < points[points.length - 1][0] ? points : points.slice().reverse();
function mount({stage, svg, read}, value) {
  const cleanup = disposer(), state = { lift: value, active: -1 };
  const camera = Cam(45, 0.5, 2);
  fit(camera, [[-10,-12,0],[90,60,0],[-10,60,0],[90,-12,0],[0,-12,118],[80,48,104]], 200,137);
  const P = proj(camera), front = facing(camera), root = mk('g', {}, svg);
  const foot = rrect(-10,-12,90,60,5,8), rim = rrect(-4,-6,84,54,5,8);
  const inner = rrect(-1,-3,81,51,3,8);
  mk('path', {d:poly(hull(ringAt(P,foot,0).concat(ringAt(P,rim,52)))),class:'sil'},root);
  mk('path', {d:poly(ringAt(P,inner,52)),class:'nf lo'},root);
  // Two rounded handles are bag construction, painted on their actual faces.
  const handle = (y) => {
    const outside = rrect(20,47,60,99,19,14).map(q=>P(q.u,y,q.v));
    const inside = rrect(24,47,56,95,15,14).map(q=>P(q.u,y,q.v));
    return poly(outside)+poly(inside.slice().reverse());
  };
  mk('path',{d:handle(-4),class:'sil','fill-rule':'evenodd'},root);
  const cards = HEIGHTS.map((height,index)=>{
    const group=mk('g',{},root);
    return {index,height,group,back:mk('path',{class:'lo'},group),face:mk('path',{class:'sil'},group),
      image:mk('path',{class:'nf'},group),rules:mk('path',{class:'nf lo'},group),
      lean:tween([-9,-5,5][index]),lift:tween([2,0,5][index]),last:''};
  });
  // The near wall hides card bases and the far wall; no transparent wireframe.
  const top=ordered(ringAt(P,run(rim,front),52)), base=ordered(ringAt(P,run(foot,front),0));
  const lip=ordered(ringAt(P,run(inner,front),52));
  mk('path',{d:poly([...lip,top[top.length-1],...base.slice().reverse(),top[0]]),class:'fo'},root);
  mk('path',{d:open(top),class:'nf lo'},root);
  mk('path',{d:open(lip),class:'nf'},root);
  mk('path',{d:open([top[0],...base,top[top.length-1]]),class:'nf sil'},root);
  mk('path',{d:handle(53),class:'sil','fill-rule':'evenodd'},root);
  // The user requested Shopify identity: this outline is sampled from the local official S artwork.
  const brand=mk('path',{d:poly(BRAND.map(([x,y])=>P(24+(x-16.7)*1.05,60-(83-y)*0.07,12+(83-y)*0.64))),class:'nf hi'},root);
  function draw(card,angle,lift) {
    const key=angle+','+lift;if(card.last===key)return;card.last=key;
    const sine=Math.sin(rad(angle)),cosine=Math.cos(rad(angle));
    const project=(x,z,back=0)=>P(x,DEPTHS[card.index]+z*sine-back,z*cosine+lift);
    const outline=rrect(4,10,WIDTH,card.height,4,8);
    card.back.setAttribute('d',poly(outline.map(q=>project(q.u,q.v,1.5))));
    card.face.setAttribute('d',poly(outline.map(q=>project(q.u,q.v))));
    const upper=card.height-10;
    const photo=rrect(13,upper-23,33,upper,3,8).map(q=>project(q.u,q.v));
    const neck=rrect(19,upper-4,27,upper+1,2,6).map(q=>project(q.u,q.v));
    card.image.setAttribute('d',poly(photo)+poly(neck));
    card.rules.setAttribute('d',[0,7,14].map((step)=>seg(project(41,upper-3-step),project(step===14?57:63,upper-3-step))).join(''));
  }
  cards.forEach((card,index)=>draw(card,[-9,-5,5][index],[2,0,5][index]));
  const loop=register(stage,(_delta,now)=>{
    const movement=cards.map(card=>{draw(card,tval(card.lean,now),tval(card.lift,now));return !tdone(card.lean,now)||!tdone(card.lift,now);});
    return movement.some(Boolean);
  });
  cleanup.add(loop.unregister);
  const choose=(active)=>{
    if(active===state.active)return;
    const origin=active<0?state.active:active,now=performance.now();state.active=active;
    cards.forEach((card,index)=>{
      const delay=Math.abs(index-origin)*45;
      const angle=active<0?[-9,-5,5][index]:index<active?-18:index>active?16:0;
      tset(card.lean,angle,now,delay);tset(card.lift,active===index?state.lift:[2,0,5][index],now,delay);
      card.face.classList.toggle('hi',index===active);card.image.classList.toggle('hi',index===active);
    });
    brand.classList.toggle('hi',active<0);read.textContent=active<0?'rest':'product '+(active+1);loop.wake();
  };
  // Distance is measured only from fixed resting top edges, never moving geometry.
  const bands=cards.map((card,index)=>{const angle=rad([-9,-5,5][index]);return [P(4,DEPTHS[index]+card.height*Math.sin(angle),card.height*Math.cos(angle)+[2,0,5][index]),P(WIDTH,DEPTHS[index]+card.height*Math.sin(angle),card.height*Math.cos(angle)+[2,0,5][index])];});
  const hit=([x,y])=>{
    const distances=bands.map(([a,b])=>{const dx=b[0]-a[0],dy=b[1]-a[1];const along=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(x-a[0]-along*dx,y-a[1]-along*dy);});
    const nearest=Math.min(...distances);return nearest<25?distances.indexOf(nearest):-1;
  };
  cleanup.add(pointer(stage,{move:point=>choose(hit(point)),leave:()=>choose(-1)}));
  cleanup.add(()=>svg.replaceChildren());read.textContent='rest';loop.wake();
  return {set:next=>{state.lift=clamp(next,12,30);const active=state.active;state.active=-2;choose(active);},choose,destroy:cleanup.dispose};
}
hairline({name:'shopify-bag',means:'A Shopify bag lifts a catalog card while its neighbours part to reveal the selected product.',rules:[1,2,4,5,6,8,9],range:[12,22,30],mount});
