/** Three catalog documents: pick a sheet to lift it and part its neighbours. */
const { Cam, clamp, fit, proj, fillet, poly, hull, open, seg, rrect, tween, tset, tval, tdone, mk, pointer, register, disposer } = HL;
const sheets = [
  { x: -44, y: -18, z: 5 },
  { x: -6, y: 0, z: 14 },
  { x: 32, y: 18, z: 25 },
];
const mount = ({ stage, svg, read }, value) => {
  const bag = disposer();
  const state = { active: -1, spread: value };
  const camera = Cam(45, 0.5, 1.8);
  fit(camera, [[-44,-18,4],[102,106,25],[-44,106,4],[102,-18,68]],200,166);
  const P = proj(camera);
  const outline = fillet([[0,0],[54,0],[70,16],[70,88],[0,88]],[3,2,2,3,3]);
  const group = mk('g', {}, svg);
  const cards = sheets.map((sheet, index) => {
    const layer = mk('g', {}, group);
    return {
      ...sheet, layer,
      body: mk('path', { class: index === 2 ? 'sil hi' : 'sil' }, layer),
      fold: mk('path', { class: 'nf lo' }, layer),
      image: mk('path', { class: 'nf lo' }, layer),
      lines: mk('path', { class: 'nf lo' }, layer),
      lift: tween(0), last: null,
    };
  });
  const draw = (card, lift) => {
    const height = Math.round((card.z + lift) * 1000) / 1000;
    if (height === card.last) return;
    card.last = height;
    const point = (x,y,z=height) => P(card.x+x,card.y+y,z);
    const top = outline.map(([x,y])=>point(x,y));
    const base = outline.map(([x,y])=>point(x,y,height-1.4));
    card.body.setAttribute('d',poly(hull(top.concat(base))));
    card.fold.setAttribute('d',open([point(54,1),point(54,16),point(69,16)]));
    card.image.setAttribute('d',poly(rrect(10,24,31,45,3,8).map(q=>point(q.u,q.v))));
    card.lines.setAttribute('d',[
      seg(point(39,29),point(58,29)),seg(point(39,37),point(55,37)),
      seg(point(10,56),point(58,56)),seg(point(10,65),point(58,65)),seg(point(10,74),point(44,74)),
    ].join(''));
  };
  cards.forEach(card=>draw(card,0));
  const loop = register(stage, (_dt, now) => {
    cards.forEach(card=>draw(card,tval(card.lift,now)));
    return cards.some(card=>!tdone(card.lift,now));
  });
  bag.add(loop.unregister);
  const select = (active) => {
    if (active === state.active) return;
    const origin = active < 0 ? state.active : active;
    state.active = active;
    const now = performance.now();
    cards.forEach((card,index)=>{
      const distance = Math.abs(index-active);
      tset(card.lift, active < 0 ? 0 : state.spread * (distance === 0 ? 1 : .24),now,Math.abs(index-origin)*40);
      card.body.classList.toggle('hi',index === (active < 0 ? 2 : active));
    });
    read.textContent = active < 0 ? 'rest' : `document ${active+1}`;
    loop.wake();
  };
  const hit = ([x,y]) => {
    const targets = cards.map((card,index)=>{
      const center = P(card.x+35,card.y+44,card.z);
      return { index, distance: Math.hypot((x-center[0])*.75,y-center[1]) };
    }).sort((a,b)=>a.distance-b.distance);
    return targets[0].distance < 78 ? clamp(targets[0].index,0,2) : -1;
  };
  bag.add(pointer(stage,{move:point=>select(hit(point)),leave:()=>select(-1)}));
  bag.add(()=>svg.replaceChildren());
  read.textContent = 'rest';
  return {
    set: next => { const active=state.active; state.spread=next; state.active=-2; select(active); },
    destroy: bag.dispose,
  };
};
hairline({name:'document-stack',means:'Three product documents lift from the stack as the pointer selects a sheet.',rules:[1,2,5,8,10],range:[14,25,38],mount});
