const { Cam, fit, proj, fillet, poly, open, seg, clamp, rad, spring, stepS, mk, pointer, register, disposer } = HL;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const state = { intensity: value, point: null, last: "" };
  const bank = spring(-5), pitch = spring(9), lift = spring(0);
  const camera = Cam(45, 0.5, 1.65);
  fit(camera, [[-71,-62,-35],[112,62,-35],[-71,-62,62],[112,62,62]], 200, 166);
  const P = proj(camera);
  const group = mk("g", {}, svg);
  const plates = [
    { points: [[108,0,4],[-53,-7,-18],[-61,0,-7]], radius: [1.5,2,2], class: "lo" },
    { points: [[108,0,4],[-61,0,-7],[-53,7,-18]], radius: [1.5,2,2], class: "sil" },
    { points: [[108,0,4],[-71,-62,12],[-45,-8,2]], radius: [1.5,3,2], class: "sil" },
    { points: [[108,0,4],[-45,-8,2],[-53,-7,-18]], radius: [1.5,2,2], class: "lo" },
    { points: [[108,0,4],[-53,7,-18],[-45,8,2]], radius: [1.5,2,2], class: "lo" },
    { points: [[108,0,4],[-45,8,2],[-71,62,12]], radius: [1.5,2,3], class: "sil" },
  ].map(plate => ({ ...plate, element: mk("path", { class: plate.class }, group) }));
  const farFold = mk("path", { class: "nf lo" }, group);
  const nearFold = mk("path", { class: "nf lo" }, group);
  const spine = mk("path", { class: "nf hi" }, group);
  function project([x,y,z]) {
    const roll = rad(bank.x), rise = rad(pitch.x);
    const yy = y*Math.cos(roll)-z*Math.sin(roll), zz = y*Math.sin(roll)+z*Math.cos(roll);
    return P(x*Math.cos(rise)-zz*Math.sin(rise), yy, x*Math.sin(rise)+zz*Math.cos(rise)+lift.x);
  }
  function draw() {
    const signature = [bank.x,pitch.x,lift.x].map(n=>n.toFixed(3)).join(":");
    if (state.last === signature) return;
    state.last = signature;
    plates.forEach(plate => {
      const points = plate.points.map(project);
      plate.element.setAttribute("d", poly(fillet(points,plate.radius,6)));
    });
    farFold.setAttribute("d", seg(project([-58,-44,9]),project([78,-3,4])));
    nearFold.setAttribute("d", seg(project([-58,44,9]),project([78,3,4])));
    spine.setAttribute("d", open([[-53,0,-7],[80,0,2],[106,0,4]].map(project)));
  }
  draw();
  const loop = register(stage, dt => {
    const moving = [stepS(bank,dt),stepS(pitch,dt),stepS(lift,dt)].some(Boolean);
    draw();
    return moving;
  });
  function aim() {
    const point = state.point;
    const horizontal = point ? clamp((point[0]-200)/140,-1,1) : 0;
    const vertical = point ? clamp((166-point[1])/115,-1,1) : 0;
    bank.t = -5 + horizontal*state.intensity;
    pitch.t = 9 + vertical*state.intensity*0.36;
    lift.t = point ? 9 + vertical*state.intensity*0.5 : 0;
    spine.classList.toggle("hi", !point);
    plates[2].element.classList.toggle("hi", Boolean(point && horizontal < 0));
    plates[5].element.classList.toggle("hi", Boolean(point && horizontal >= 0));
    read.textContent = !point ? "rest" : horizontal < -0.15 ? "bank left" : horizontal > 0.15 ? "bank right" : "glide";
    loop.wake();
  }
  bag.add(pointer(stage, { move: point => { state.point=point; aim(); }, leave: () => { state.point=null; aim(); } }));
  bag.add(loop.unregister);
  bag.add(() => svg.replaceChildren());
  read.textContent = "rest";
  return { set: next => { state.intensity=next; aim(); }, destroy: bag.dispose };
}

hairline({ name: "demo-plane", means: "A folded paper plane lifts and banks toward the pointer, then settles back into its resting glide.", rules: [1,3,5,6,7,8,9], range: [4,13,20], mount });
