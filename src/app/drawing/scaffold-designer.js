/* ================= SCAFFOLD DESIGNER: James's scaffold designer – the building and scaffold on a plan, in 3D and as elevations, the parts list, picking list and client PDFs ================= */
export { SCF_CSS, SCF_HTML, scfEngine };
/* James's own Scaffold Designer (Nov 2026), brought into SiteHQ as it was: how it designs the scaffold is unchanged.
   It runs inside a shadow root (drawing/scaffold-jobs.js opens it in the viewer), so its ids, its styles and its
   event handlers stay inside it and can't clash with the rest of the app; its colours are SiteHQ's own (light and
   dark). What SiteHQ changed is marked "SiteHQ:" – saving goes to the job (host.save) instead of the browser,
   company details and logo come from Setup, the PDFs use the firm's letterhead and SiteHQ's way of saving files,
   libraries load through SiteHQ's loaders, and the AI drawing reader is gone (Trace a drawing stays). */
const SCF_CSS = `:host{display:block}
.scaf{--red:var(--brand,#7F191D);--redi:var(--accent,#7F191D);--card:var(--surface,#fff);--mute:var(--muted,#6b6461);--sheet:var(--bg,#f5f2f2);--sky:light-dark(linear-gradient(#cfdbe6,#eef1f3 70%),linear-gradient(#141a20,#262b30 70%))}
@supports not (color:light-dark(#000,#fff)){.scaf{--sky:linear-gradient(#cfdbe6,#eef1f3 70%)}}
*{box-sizing:border-box;min-width:0}
[hidden]{display:none!important}
.scaf{color:var(--ink);font:16px/1.5 Barlow,system-ui,sans-serif;overflow-x:clip}
h1,h2{font-family:Oswald,Impact,sans-serif;font-weight:600;line-height:1.05;margin:0}
.scf-main{max-width:1240px;margin:0 auto;padding:4px 0 40px}
.top{display:flex;align-items:end;gap:6px 12px;flex-wrap:wrap;margin-bottom:14px}
.top h1{font-size:clamp(30px,5vw,44px)}
.sub{font-size:14px;color:var(--mute)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px}
.card h2{font-size:20px;margin-bottom:10px}
.bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}
.seg{display:flex;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.seg button{border:0;border-radius:0}
.bar .tabs{display:flex;gap:6px;flex-wrap:wrap}
button{font:600 15px Barlow,sans-serif;min-height:44px;padding:0 14px;border-radius:9px;border:1px solid var(--line);background:var(--sheet);color:var(--ink);cursor:pointer}
button[aria-pressed=true]{background:var(--ink);color:var(--card);border-color:var(--ink)}
button.pri{background:var(--red);border-color:var(--red);color:#fff}
.hint{font-size:14px;color:var(--mute);margin-left:auto}
.stage{position:relative;height:clamp(380px,62vh,620px);border-radius:10px;overflow:hidden;background:var(--sky);border:1px solid var(--line);touch-action:none}
.stage>canvas,.stage>svg{position:absolute;inset:0;width:100%;height:100%;display:block}
.d2{display:grid;grid-template-columns:minmax(0,1fr) 200px;gap:10px;height:100%}
.d2 .pane{position:relative;background:var(--sheet);border-radius:8px;overflow:hidden}
.d2 svg{position:absolute;inset:0;width:100%;height:100%}
@media(max-width:600px){.d2{grid-template-columns:minmax(0,1fr)}.d2 #pe{display:none}}
.zui{position:absolute;right:10px;bottom:10px;display:flex;gap:6px;z-index:4}.zui button{min-height:40px;min-width:40px;padding:0 10px;background:color-mix(in srgb,var(--card) 90%,transparent);box-shadow:0 2px 6px rgba(0,0,0,.15);font-size:16px}
.psb{position:absolute;left:10px;right:10px;top:58px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;z-index:4;pointer-events:none}.psb>*{pointer-events:auto}.psb b{font-size:14px;background:color-mix(in srgb,var(--card) 92%,transparent);padding:6px 10px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.12)}.psb button{min-height:40px;padding:0 12px;background:var(--card);box-shadow:0 2px 6px rgba(0,0,0,.15);font-size:14px}.psb .danger{background:#b3262c;color:#fff;border-color:#b3262c}.ptx{position:absolute;left:10px;top:10px;display:flex;gap:6px;align-items:center;z-index:4}.ptx button{min-height:40px;min-width:44px;padding:0 10px;background:color-mix(in srgb,var(--card) 92%,transparent);box-shadow:0 2px 6px rgba(0,0,0,.15);font-size:16px;font-weight:700}.ptx span{font-size:13px;color:var(--mute);background:color-mix(in srgb,var(--card) 85%,transparent);padding:4px 6px;border-radius:6px}.ptx button[aria-pressed=true],.zui button[aria-pressed=true]{background:var(--red);color:#fff;border-color:var(--red)}
.lens{position:absolute;z-index:6;pointer-events:none;border:3px solid #1c1a1a;border-radius:50%;overflow:hidden;background:var(--sheet);box-shadow:0 6px 18px rgba(0,0,0,.35)}.lens.sq{border-radius:14px;background:transparent}.lens svg{width:100%;height:100%;display:block}
.layers{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;align-items:center}.layers span{font-size:14px;color:var(--mute);margin-right:4px}.layers button{min-height:34px;font-size:13px;padding:0 10px;border-radius:99px}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chips label{display:flex;align-items:center;gap:5px;margin:0;border:1px solid var(--line);border-radius:99px;padding:4px 10px;font-size:14px;color:var(--ink);min-height:36px}.chips input{width:18px;min-height:18px}
.adv{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:6px 8px;background:var(--sheet);border:1px solid var(--line);border-radius:10px;padding:8px 10px;margin-bottom:6px}.adv label{margin:0 0 3px}.adv .chk{grid-column:1/-1;margin:0}
.selp{position:absolute;left:10px;top:10px;z-index:7;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:12px 14px;max-width:270px;box-shadow:0 6px 18px rgba(0,0,0,.25);font-size:14px}.selp b{font:600 17px Oswald,sans-serif;display:block}.selb{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
.addp{display:grid;grid-template-columns:minmax(0,1fr) 80px auto;gap:6px;margin:8px 0}.addp #xother{grid-column:1/-1;order:-1}.xrow{display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed var(--line);padding:2px 0;font-size:15px}
#rmbar:empty{display:none}
.jobbar{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 10px}.jobbar button{min-height:40px;font-size:14px}.joblist{border:1px solid var(--line);border-radius:10px;margin:0 0 12px;max-height:360px;overflow:auto}.joblist .jr{display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line)}.joblist .jr:last-child{border-bottom:0}.joblist .jr.cur{background:color-mix(in srgb,var(--red) 8%,transparent)}.joblist .jn{flex:1;min-width:0}.joblist .jn b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.joblist .jn span{font-size:12px;color:var(--mute)}.joblist button{min-height:36px;font-size:13px;padding:0 10px}.joblist input{margin:8px 12px;width:calc(100% - 24px)}
button:disabled{opacity:.4;cursor:default}
.qd{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:14px;background:var(--sheet)}.qd summary{cursor:pointer;font-size:15px;padding:4px 0}.qd[open] summary{margin-bottom:6px}
.plbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid var(--line)}.plbar span{font-size:14px;color:var(--mute)}.plbar button{min-height:38px;font-size:14px}.plbar .ghost{margin-left:auto;background:transparent;color:var(--mute)}
.props{margin-top:12px;background:var(--sheet);border:1px solid var(--line);border-radius:12px;padding:12px 14px}.props h3{font:600 18px Oswald,sans-serif;margin:0 0 6px}
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:2px 10px}.pgrid .wide{grid-column:1/-1}.pgrid label{margin-top:8px}.pgrid .chk{margin-top:8px}
.pbtn{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.pbtn select{width:auto;min-height:44px}.danger{color:#b3262c;border-color:color-mix(in srgb,#b3262c 40%,var(--line))}
.psec{display:grid;grid-template-columns:minmax(0,1fr) 40px;gap:6px;margin-bottom:8px}.psec textarea{grid-column:1/2}.psec .x{grid-row:1/3;grid-column:2}
#pl{touch-action:none}
.tip{position:absolute;z-index:5;pointer-events:none;background:#1c1a1a;color:#fff;padding:8px 11px;border-radius:8px;font-size:14px;line-height:1.35;max-width:240px;box-shadow:0 4px 14px rgba(0,0,0,.3);display:none}
.tip b{display:block;font:600 16px Oswald,sans-serif;color:#ffd9a8}
.load{position:absolute;inset:0;display:grid;place-items:center;color:var(--mute)}
.stats{display:flex;flex-wrap:wrap;gap:8px 24px;margin-top:12px}
.stats div{font-size:14px;color:var(--mute)}.stats b{display:block;font:600 24px Oswald,sans-serif;color:var(--ink)}
.grid{display:grid;grid-template-columns:minmax(0,380px) minmax(0,1fr);gap:18px;margin-top:18px}
@media(max-width:900px){.grid{grid-template-columns:minmax(0,1fr)}}
label{display:block;font-size:14px;color:var(--mute);font-weight:500;margin:10px 0 4px}
input,select,textarea{width:100%;font:16px Barlow,sans-serif;padding:10px;border:1px solid var(--line);border-radius:9px;background:var(--sheet);color:var(--ink);min-height:44px}
input:focus,select:focus,textarea:focus,button:focus-visible{outline:3px solid color-mix(in srgb,var(--redi) 45%,transparent);outline-offset:1px}
.row{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) 40px 40px;gap:6px;align-items:end;margin-bottom:6px}
.row label{margin-top:0}
.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8px}
.co{margin-top:14px;border-top:1px solid var(--line);padding-top:10px}.co summary{font-weight:600;cursor:pointer;min-height:36px;display:flex;align-items:center}
.logo-prev{margin-top:8px;display:flex;gap:10px;align-items:center}.logo-prev img{max-height:48px;max-width:180px;background:#fff;padding:4px;border-radius:6px;border:1px solid var(--line)}
@media(max-width:600px){.arow{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}}
.lrow{display:grid;grid-template-columns:52px minmax(0,1fr) auto 44px;gap:6px;align-items:center;margin-bottom:6px}.lrow span{font-size:14px;color:var(--mute)}.lrow .chk{margin:0}
.liftwarn{display:flex;flex-direction:column;gap:6px;align-items:stretch;margin:4px 0 8px}.liftwarn button{text-align:left;min-height:44px;height:auto;padding:6px 12px}
.arow{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1.2fr) minmax(0,.9fr) minmax(0,1.1fr) 40px;gap:6px;align-items:end;margin-bottom:6px}.arow label{margin:0 0 3px}
.cost{margin-top:18px;border-top:2px solid var(--line);padding-top:14px}.cxrow{display:grid;grid-template-columns:minmax(0,1fr) 110px 40px;gap:6px;margin-bottom:6px}
.ctab{width:100%;margin-top:12px}.ctab td{padding:6px 4px}.ctab td:last-child{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.ctab tr.tot td{font:600 20px Oswald,sans-serif;border-top:2px solid var(--ink)}
.x{padding:0;font-size:20px;color:var(--mute)}
.chk{display:flex;gap:8px;align-items:center;margin-top:10px;font-size:15px;color:var(--ink)}.chk input{width:22px;min-height:22px;flex:none}
.up{border:2px dashed var(--line);border-radius:12px;padding:14px;margin-bottom:14px;background:var(--sheet)}
.up p{margin:0 0 10px;font-size:15px}.up .note{font-size:14px;color:var(--mute);margin-top:8px}
.lhead{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px}.lhead h2{margin:0 auto 0 0}
table{width:100%;border-collapse:collapse}
th{font:500 13px Barlow,sans-serif;color:var(--mute);text-align:left;padding:6px 8px;border-bottom:1px solid var(--line)}
td{padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:top}
td.q,th.q{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;width:64px}
td.q{font:600 18px Oswald,sans-serif}
tr.grp td{font:600 15px Oswald,sans-serif;color:var(--redi);padding-top:16px;border-bottom:2px solid var(--line)}
tr.on td{background:color-mix(in srgb,var(--redi) 12%,transparent)}
.why{color:var(--mute);font-size:14px}
.warn{margin-top:14px;padding:12px 14px;border-radius:10px;background:light-dark(#fbeaea,#3a1d1e);font-size:15px}
.warn ul{margin:6px 0 0;padding-left:20px}
.toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:var(--ink);color:var(--card);padding:10px 16px;border-radius:99px;font-size:15px;opacity:0;transition:opacity .25s;pointer-events:none}
.toast.on{opacity:1}
@media(prefers-reduced-motion:reduce){.toast{transition:none}}
@media(max-width:600px){table{font-size:14px}.why{display:none}.hint{margin-left:0;width:100%}}
/* SiteHQ: file pickers stay in the page (an iPad won't open a hidden one); the owner-only badge; job fields from the job */
.scf-file{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
.only{font:600 13px Barlow,sans-serif;color:var(--mute);margin-left:8px;white-space:nowrap;vertical-align:middle}
input[readonly]{background:transparent;border-style:dashed}
`;
const SCF_HTML = `<div class="scaf"><div class="scf-main">
<div class="top" hidden><span class="sub" id="jobsub"></span></div>

<section class="card">
  <div class="bar">
    <div class="seg" role="group" aria-label="View"><button id="vP" aria-pressed="false">Plan</button><button id="v3" aria-pressed="true">3D model</button><button id="v2" aria-pressed="false">Elevation</button></div>
    <button id="gundo" aria-label="Undo" disabled>↶ Undo</button><button id="gredo" aria-label="Redo" disabled>↷ Redo</button><button id="gstart" data-lbl="↺ Start over">↺ Start over</button><button id="bld">Building: solid</button><button id="sty">Style: technical</button>
    <div class="tabs" id="tabs"></div>
    <span class="hint" id="hint">Drag to turn · scroll or pinch to zoom · hover or tap a part</span>
  </div>
  <div class="stage" id="stage">
    <div class="load" id="load">Loading 3D model…</div>
    <div class="d2" id="d2" hidden><div class="pane" id="pf"><svg id="sv" aria-label="Elevation drawing"></svg></div><div class="pane" id="pe"><svg id="ss" aria-label="End view"></svg></div></div>
    <svg id="pl" hidden aria-label="Plan of the building and scaffold"></svg>
    <div class="tip" id="tip"></div>
    <div class="selp" id="selp" hidden></div>
    <div class="lens" id="lens" hidden><svg id="lsv" preserveAspectRatio="xMidYMid slice"></svg></div>
    <div class="psb" id="psb" hidden></div><div class="ptx" id="ptx" hidden><button id="pdim" aria-pressed="true">Sizes</button><button id="ptm" aria-label="Smaller text">A−</button><span id="ptv">100%</span><button id="ptp" aria-label="Bigger text">A+</button></div>
    <div class="zui" id="zui"><button id="zin" aria-label="Zoom in">+</button><button id="zout" aria-label="Zoom out">−</button><button id="zreset">Reset</button><button id="mag" aria-pressed="false">Magnifier</button></div>
  </div>
  <div class="layers" id="layers"></div>
  <div class="layers" id="rmbar"></div>
  <div class="stats" id="stats"></div>
  <div class="plbar"><span>Add:</span><button data-act="addWing">Building</button><button data-act="addCons">Conservatory</button><button data-act="addBird">Birdcage</button><button data-act="addLoad">Loading bay</button><button data-act="addPerson">Person</button><button data-act="addCone">Cone</button><button data-act="addSleeper">Sleeper</button><button data-act="addSign">Sign board</button><button data-act="addRoad">Road</button><button data-act="addPath">Path</button><button data-act="addCrossing">Crossing</button><button data-act="addLamp">Lamppost</button><button data-act="addFence">Fence</button><button id="tracebtn">Trace a drawing</button><input type="file" id="tracefile" class="scf-file" accept="image/*,application/pdf" tabindex="-1" aria-hidden="true"><button id="newdesign" class="ghost" data-lbl="Start a new drawing">Start a new drawing</button></div>
  <div class="props" id="props"></div>
</section>

<div class="grid">
<section class="card">
  <details class="qd" id="qd" open><summary><b>Building &amp; scaffold</b> — type the sizes and pick the style</summary>
    <div class="two"><div><label for="q_style">Building</label><select id="q_style"><option value="detached">Detached house</option><option value="semi">Semi-detached (neighbour on the left)</option><option value="end">End terrace (neighbour on the left)</option><option value="mid">Mid terrace (neighbours both sides)</option><option value="row">Row of terraced houses</option><option value="bung">Bungalow</option><option value="flat">Flat-roofed building</option></select></div>
    <div><label for="q_storeys">Storeys</label><select id="q_storeys"><option value="1">1</option><option value="2" selected>2</option><option value="3">3</option></select></div></div>
    <div class="two" id="q_rowf" hidden><div><label for="q_n">Houses in the row</label><input id="q_n" type="number" min="2" max="12" step="1" value="4" inputmode="numeric"></div><div><label for="q_from">Scaffold houses</label><div style="display:flex;gap:6px;align-items:center"><input id="q_from" type="number" min="1" step="1" value="1" inputmode="numeric"><span>to</span><input id="q_to" type="number" min="1" step="1" value="4" inputmode="numeric"></div></div></div>
    <div class="two"><div><label for="q_w">Front width (m)<span id="q_weach" hidden> — each house</span></label><input id="q_w" type="number" step="0.1" value="9.6" inputmode="decimal"></div><div><label for="q_d">Depth front to back (m)</label><input id="q_d" type="number" step="0.1" value="6" inputmode="decimal"></div></div>
    <div class="two"><div><label for="q_e">Eaves height (m)</label><input id="q_e" type="number" step="0.1" value="5.4" inputmode="decimal"></div><div><label for="q_roof">Roof</label><select id="q_roof"><option value="gx">Gable — ridge along the front</option><option value="gz">Gable — ridge front to back</option><option value="hip">Hipped</option><option value="halfhip">Half-hipped</option><option value="mono">Lean-to (mono-pitch)</option><option value="flat">Flat</option></select></div></div>
    <div class="two"><div><label for="q_kind">Type</label><select id="q_kind"><option value="">House</option><option value="bung">Bungalow</option><option value="chalet">Chalet bungalow</option><option value="town">Townhouse (3 storeys)</option><option value="flats">Block of flats</option><option value="comm">Commercial unit / warehouse</option><option value="church">Church / tall building</option></select></div><div><label for="q_ov">Eaves overhang (m)</label><input id="q_ov" type="number" step="0.05" value="0.3" inputmode="decimal"></div></div>
    <div class="two"><div><label for="q_bay">Bay windows at the front</label><select id="q_bay"><option value="0">None</option><option value="1">Single-storey bay</option><option value="2">Two-storey bay</option><option value="11">Two single-storey bays</option></select></div><div><label for="q_dorm">Dormers (front / back)</label><div style="display:flex;gap:6px"><input id="q_dormF" type="number" min="0" max="6" step="1" value="0" inputmode="numeric" aria-label="Front dormers"><input id="q_dormB" type="number" min="0" max="6" step="1" value="0" inputmode="numeric" aria-label="Back dormers"></div></div></div>
    <div class="two"><div><label class="chk" style="margin-top:6px"><input type="checkbox" id="q_porch"> Porch at the front</label></div><div><label for="q_par">Parapet (flat roofs, m)</label><input id="q_par" type="number" step="0.1" value="0" inputmode="decimal"></div></div>
    <div class="two"><div><label for="q_p">Roof pitch (°)</label><input id="q_p" type="number" step="1" value="35" inputmode="decimal"></div><div><label for="q_ch">Chimney</label><select id="q_ch"><option value="ridge">On the ridge</option><option value="gable">On a gable end</option><option value="none">None</option></select></div></div>
    <label class="chk"><input type="checkbox" id="q_ext"> Single-storey extension at the back (the scaffold bridges over it on beams)</label>
    <label class="chk"><input type="checkbox" id="q_cons"> Conservatory at the back (bridged on beams)</label>
    <label style="margin-top:12px">Scaffold on</label><div class="chips"><label><input type="checkbox" id="q_sf" checked> Front</label><label><input type="checkbox" id="q_sr" checked> Right</label><label><input type="checkbox" id="q_sb" checked> Back</label><label><input type="checkbox" id="q_sl" checked> Left</label></div>
    <div class="two"><div><label for="q_bw">Platform width</label><select id="q_bw"><option value="3">3 boards</option><option value="4" selected>4 boards</option><option value="5">5 boards</option><option value="6">6 boards</option></select></div><div><label for="q_acc">Access</label><select id="q_acc"><option value="stair">Stair tower</option><option value="ladder">Ladders</option><option value="ramp">Ramp to first lift + ladders</option></select></div></div>
    <label class="chk"><input type="checkbox" id="q_tbl" checked> Table lifts up the gable ends</label>
    <label class="chk"><input type="checkbox" id="q_chs" checked> Chimney scaffold</label>
    <label class="chk"><input type="checkbox" id="q_tr"> Temporary roof</label>
    <label class="chk"><input type="checkbox" id="q_pub"> Public footpath at the front (padding, lamps, fan)</label>
    <button class="pri" id="q_go" style="margin-top:12px;width:100%">Draw the building and scaffold</button>
    <div class="sub" style="margin-top:6px" id="q_note">This replaces the current drawing (Undo brings it back). Fine-tune anything afterwards on the Plan.</div>
  </details>
  <h2>Job</h2>
  <div class="sub">The job name, client and address come from the job in SiteHQ.</div>
  <div class="jobbar"><button id="jobopen">📂 Open a saved scaffold or a job</button><button id="jobfrom">Copy scaffold design from another job</button></div>
  <label for="job">Job name</label><input id="job" readonly>
  <label for="client">Client name</label><input id="client" autocomplete="off" readonly>
  <label for="site">Site address</label><input id="site" autocomplete="off" readonly>
  <div class="two"><div><label for="ref">Ref / quote no.</label><input id="ref"></div><div><label for="pdate">Date</label><input id="pdate" type="date"></div></div>
  <label for="notes">Notes for the client (optional)</label><textarea id="notes" rows="3"></textarea>
  <details class="co"><summary>Your sign board</summary>
    <div class="sub">Your company name, address, phone, email, website and logo come from Setup › My company details.</div>
    <label for="signimg">Your sign board (photo or artwork, PNG or JPG)</label><input type="file" id="signimg" accept="image/*">
    <div class="sub">Used on the sign board in the 3D model and drawings. Take the photo straight on and crop it to the edges of the board.</div>
    <div class="logo-prev" id="signprev"></div>
  </details>
  <h2 style="margin-top:18px">Scaffold</h2>
  <div class="two">
    <div><label for="bay">Max bay length (m)</label><input id="bay" type="number" step="0.1" min="1.2" max="2.7" inputmode="decimal"></div>
    <div><label for="boards">Width</label><select id="boards"><option value="2">2 boards (0.49m)</option><option value="3">3 boards (0.72m)</option><option value="4">4 boards (0.94m)</option><option value="5">5 boards (1.17m)</option><option value="6">6 boards (1.39m)</option><option value="7">7 boards (1.61m)</option><option value="8">8 boards (1.84m)</option></select></div>
    <div><label for="lift1">First lift (m)</label><input id="lift1" type="number" step="0.1" min="1" inputmode="decimal"></div>
    <div><label for="lift">Lift height (m)</label><input id="lift" type="number" step="0.1" min="1" inputmode="decimal"></div>
    <div><label for="boarded">Boarded lifts</label><select id="boarded"><option value="1">Top lift only</option><option value="2">Top two</option><option value="99">Every lift</option></select></div>
    <div><label for="clad">Sheeting (whole scaffold)</label><select id="clad"><option value="32">None</option><option value="25">Debris netting</option><option value="16">Sheeted</option></select></div>
    <div><label for="hop">Inside (hop-up) boards</label><select id="hop"><option value="0">None</option><option value="1">1 board</option><option value="2">2 boards</option></select></div>
    <div><label for="brace">Façade brace every (bays)</label><input id="brace" type="number" min="2" max="12" inputmode="numeric"></div>
    <div><label for="beam">Beams</label><select id="beam"><option value="ladder">Steel ladder beams</option><option value="unit">Aluminium unit beams (750mm)</option></select></div>
    <div><label for="tiearea">One tie per (m²)</label><input id="tiearea" type="number" min="4" max="60" inputmode="decimal" placeholder="Auto from sheeting"></div>
  </div>
  <label class="chk"><input type="checkbox" id="autolift"> Auto lifts — even lift heights (about 2m) up to the top, so nothing is left as an odd short lift</label>
  <label class="chk"><input type="checkbox" id="sole"> Sole boards (untick on hard standing)</label>
  <label class="chk"><input type="checkbox" id="baselift"> Base lift (ledgers and transoms near the ground)</label>
  <label style="margin-top:14px">Tube lengths you stock</label><div class="chips" id="stockT"></div>
  <label>Board lengths you stock</label><div class="chips" id="stockB"></div>
  <h2 style="margin-top:18px">Access</h2>
  <div class="sub" style="margin-bottom:6px">Add a ladder or stair tower, pick the elevation and how far along from the left end.</div>
  <div id="acc"></div>
  <button id="addacc">+ Add access point</button>
  <h2 style="margin-top:18px">Safety equipment</h2>
  <label class="chk"><input type="checkbox" id="brick"> Brick guards on boarded lifts</label>
  <div class="sub" style="margin-top:10px">Footpath protection (padding, lamps, signs) and pedestrian fans are set on each scaffold run: tap the run on the Plan. Cones, sleepers and your sign board are added with the buttons under the drawing. Always included: guardrails, toe boards, end guardrails, ladder gates, ladder guards, Scafftag holders and access signs.</div>
  <details class="co" id="pdfw"><summary>PDF wording</summary>
    <div class="sub">Change any wording on the client PDF. Use {company}, {client} and {site} to fill in names. One line per bullet point.</div>
    <label for="pw_title">Document title</label><input id="pw_title" data-pw="title">
    <label for="pw_intro">Opening paragraph</label><textarea id="pw_intro" data-pw="intro" rows="3"></textarea>
    <label for="pw_sx">Extra lines under "The scaffold"</label><textarea id="pw_sx" data-pw="scaffoldExtra" rows="2" placeholder="Added after the lines worked out from the drawing"></textarea>
    <label for="pw_safe">Extra safety lines</label><textarea id="pw_safe" data-pw="safetyExtra" rows="2" placeholder="Added after the safety lines worked out from the drawing"></textarea>
    <label for="pw_insp">Inspection and handover</label><textarea id="pw_insp" data-pw="inspection" rows="4"></textarea>
    <label for="pw_note">Please note</label><textarea id="pw_note" data-pw="note" rows="4"></textarea>
    <label>Your own sections</label><div id="pdfsecs"></div><button id="addsec">+ Add a section</button>
    <label for="pw_acc">Sign-off heading</label><input id="pw_acc" data-pw="accept">
    <label for="pw_pick">Picking list note</label><textarea id="pw_pick" data-pw="pickNote" rows="2"></textarea>
    <button id="pdfreset" style="margin-top:10px">Put back the standard wording</button>
  </details>
</section>

<section class="card">
  <div class="lhead"><h2>Parts list — everything</h2><button id="pdfPick" class="pri">Picking list PDF</button><button id="pdfClient" class="pri">Client PDF</button><button id="copy">Copy list</button></div>
  <div class="sub" style="margin-bottom:6px">Counted straight off the model, so every part here is in the drawing. Tap a part on the drawing to remove it.</div>
  <div class="addp"><select id="xname" aria-label="Part to add"></select><input id="xother" placeholder="Part name" hidden><input id="xq" type="number" min="1" value="1" inputmode="numeric" aria-label="Quantity"><button id="xadd">Add part</button></div>
  <div id="xlist"></div>
  <table><thead><tr><th>Item</th><th class="q">Qty</th><th class="why">What for</th></tr></thead><tbody id="tb"></tbody></table>
  <div class="warn" id="warn"></div>
  <div class="cost">
    <h2>Costing <span class="only">🔒 Only you can see this</span></h2><div class="sub">Only you see this. It never goes on the picking list, and only goes on the client PDF if you tick the box.</div>
    <div class="two"><div><label for="cbasis">Price by</label><select id="cbasis"><option value="m">Per metre run</option><option value="m2">Per m² (length × height)</option></select></div>
    <div><label for="crate">Rate (£)</label><input id="crate" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00"></div></div>
    <label style="margin-top:12px">Extras</label><div id="cx"></div><button id="cxadd">+ Add extra</button>
    <label class="chk"><input type="checkbox" id="cvat"> Add VAT at 20%</label>
    <label class="chk"><input type="checkbox" id="cpdf"> Show the price on the client PDF</label>
    <div id="ctot"></div>
  </div>
</section>
</div>
</div>
<div class="toast" id="toast"></div></div>
`;
/* R: the shadow root the markup is in; host: what SiteHQ gives it (drawing/scaffold-jobs.js) */
function scfEngine(R, host) {
  const $ = (id) => R.getElementById(id);
  // SiteHQ: keys pressed with nothing focused reach the document, not the designer; these stop when it's closed
  const OFF = [],
    docOn = (t, f) => {
      const g = (e) => {
        if (R.host.isConnected) f(e);
      };
      document.addEventListener(t, g);
      OFF.push(() => document.removeEventListener(t, g));
    };
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
  const ALLT = [
      [6.4, 21],
      [4.8, 16],
      [3.9, 13],
      [3.0, 10],
      [2.4, 8],
      [1.8, 6],
      [1.5, 5],
      [1.2, 4],
    ],
    ALLB = [
      [3.9, 13],
      [3.0, 10],
      [2.4, 8],
      [1.8, 6],
      [1.5, 5],
      [1.2, 4],
    ];
  let TUBES = ALLT,
    BOARDS = ALLB;
  const LADS = [3.0, 3.5, 4.0, 4.5, 5.0, 6.0],
    RLADS = [3, 4, 5, 6, 7, 8];
  const pick = (L, len) =>
    L.slice()
      .reverse()
      .find((t) => t[0] >= len - 0.01) || L[0];
  const pieces = (L, len) => {
    const o = [];
    let r = len;
    while (r > L[0][0] + 0.01) {
      o.push(L[0]);
      r -= L[0][0];
    }
    o.push(pick(L, r));
    return o;
  };
  const tn = (t) => `${t[1]}ft tube (${t[0]}m)`,
    bn = (t) => `${t[1]}ft scaffold board (${t[0]}m)`;
  const RA = "Double (right-angle) coupler",
    PUT = "Putlog (single) coupler",
    SW = "Swivel coupler",
    SLV = "Sleeve coupler";
  const SOLE = "Sole board (300mm scaffold board)",
    SOLER = "300mm length of scaffold board under each standard";
  const DEG = Math.PI / 180,
    uid = () => Math.random().toString(36).slice(2, 9);
  const num = (v, d) => {
    const n = parseFloat(v);
    return isFinite(n) && n > 0 ? n : d;
  };
  const num0 = (v) => {
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  };
  const f1 = (v) => (+v).toFixed(1);
  const ladPick = (len) =>
    pick(
      LADS.slice()
        .reverse()
        .map((m) => [m, m]),
      len,
    )[0];

  // ---------- building geometry ----------
  const tanP = (w) => Math.tan(Math.min(60, Math.max(0, num0(w.pitch))) * DEG);
  function roofH(w, X, Z, clamp) {
    let u = X - num0(w.x),
      v = Z - num0(w.z);
    const W = num(w.w, 1),
      D = num(w.d, 1),
      e = num(w.eaves, 3),
      t = tanP(w);
    if (clamp) {
      u = Math.min(W, Math.max(0, u));
      v = Math.min(D, Math.max(0, v));
    }
    if (w.roof === "flat") return e + (clamp && num0(w.parapet) > 0.15 ? num0(w.parapet) : 0.15);
    if (w.roof === "mono") return e + (w.high === "front" ? v : D - v) * t;
    if (w.roof === "hip")
      return e + Math.min(D / 2 - Math.abs(v - D / 2), W / 2 - Math.abs(u - W / 2)) * t;
    if (w.roof === "halfhip") {
      const gb =
          w.ridge === "z" ? (W / 2 - Math.abs(u - W / 2)) * t : (D / 2 - Math.abs(v - D / 2)) * t,
        hp =
          Math.min(D / 2 - Math.abs(v - D / 2), W / 2 - Math.abs(u - W / 2)) * t +
          ((w.ridge === "z" ? W : D) / 4) * t;
      return e + Math.min(gb, hp);
    }
    return w.ridge === "z"
      ? e + (W / 2 - Math.abs(u - W / 2)) * t
      : e + (D / 2 - Math.abs(v - D / 2)) * t;
  }
  const inWing = (w, X, Z) =>
    X >= num0(w.x) - 1e-6 &&
    X <= num0(w.x) + num(w.w, 1) + 1e-6 &&
    Z >= num0(w.z) - 1e-6 &&
    Z <= num0(w.z) + num(w.d, 1) + 1e-6;
  function roofYw(X, Z) {
    let y = null;
    (S.wings || []).forEach((w) => {
      if (inWing(w, X, Z)) {
        const h = roofH(w, X, Z, true);
        if (y == null || h > y) y = h;
      }
    });
    return y;
  }
  function ridgeOf(w) {
    const W = num(w.w, 1),
      D = num(w.d, 1),
      t = tanP(w),
      e = num(w.eaves, 3);
    return w.roof === "flat"
      ? e + Math.max(0.15, num0(w.parapet))
      : w.roof === "mono"
        ? e + D * t
        : w.roof === "hip"
          ? e + (Math.min(W, D) / 2) * t
          : w.ridge === "z"
            ? e + (W / 2) * t
            : e + (D / 2) * t;
  }
  const toW = (b, p) => {
    const r = num0(b.ry) * DEG,
      c = Math.cos(r),
      s = Math.sin(r);
    return [num0(b.x) + p[0] * c + p[2] * s, p[1], num0(b.z) - p[0] * s + p[2] * c];
  };
  const toL = (b, P) => {
    const r = num0(b.ry) * DEG,
      c = Math.cos(r),
      s = Math.sin(r),
      dx = P[0] - num0(b.x),
      dz = P[2] - num0(b.z);
    return [dx * c - dz * s, P[1], dx * s + dz * c];
  };
  const SIDEF = {
      front: (w) => ({ x: num0(w.x), z: num0(w.z) + num(w.d, 1), ry: 0, len: num(w.w, 1) }),
      right: (w) => ({
        x: num0(w.x) + num(w.w, 1),
        z: num0(w.z) + num(w.d, 1),
        ry: 90,
        len: num(w.d, 1),
      }),
      back: (w) => ({ x: num0(w.x) + num(w.w, 1), z: num0(w.z), ry: 180, len: num(w.w, 1) }),
      left: (w) => ({ x: num0(w.x), z: num0(w.z), ry: 270, len: num(w.d, 1) }),
    },
    ORD = ["front", "right", "back", "left"];
  function traceRuns(w, sides, ht) {
    return sides.map((s) => {
      const i = ORD.indexOf(s);
      return {
        id: uid(),
        type: "run",
        name: `${w.name} ${s}`,
        wing: w.id,
        side: s,
        fit: true,
        ...SIDEF[s](w),
        ht: +(ht ?? num(w.eaves, 3)).toFixed(2),
        js: sides.includes(ORD[(i + 3) % 4]),
        je: sides.includes(ORD[(i + 1) % 4]),
        table: false,
      };
    });
  }
  function sampleDesign() {
    const w = {
      id: "w1",
      name: "House",
      x: 0,
      z: 0,
      w: 9.6,
      d: 6,
      eaves: 5.4,
      roof: "gable",
      pitch: 35,
      ridge: "x",
    };
    const ch = {
      id: "c1",
      wing: "w1",
      x: 7.4,
      z: 3,
      w: 0.9,
      d: 0.6,
      top: +(ridgeOf(w) + 1.1).toFixed(2),
    };
    const runs = traceRuns(w, ORD, 5.4);
    runs[1].table = true;
    runs[3].table = true;
    runs[0].pub = true;
    const fz = 6 + 1.24;
    const P = (kind, x, z, ry, y) => ({
      id: uid(),
      type: "prop",
      kind,
      x,
      z,
      ry: ry || 0,
      ...(y ? { y } : {}),
    });
    const blocks = [
      ...runs,
      { id: uid(), type: "chim", name: "Chimney scaffold", chim: "c1", below: 1.0, boards: 3 },
      { ...P("person", 2.6, fz + 1.5, 0), pose: "point" },
      { ...P("person", 8.6, fz + 2.4, -25), pose: "walk", wear: "orange" },
      ...[-1.6, 0.9, 3.4, 5.9, 8.4, 10.9].map((x) => P("cone", x, fz + 1.0)),
      ...[0.4, 2.9, 5.4, 7.9].map((x) => P("sleeper", x + 1.2, fz + 3.2)),
      P("sign", 1.9, fz + 0.16, 0, 3.0),
    ];
    return {
      wings: [w],
      chims: [ch],
      blocks,
      access: [
        { type: "stair", block: runs[0].id, at: 5.7 },
        { type: "ladder", block: runs[2].id, at: 2 },
      ],
    };
  }
  const PDFDEF = {
    title: "Scaffold specification",
    intro:
      "This document sets out the scaffold {company} will provide at {site}, how it will be accessed and the safety measures included.",
    scaffoldExtra: "",
    safetyExtra: "",
    inspection:
      "The scaffold will be erected, altered and taken down by CISRS-qualified scaffolders.\nA handover certificate will be issued before first use.\nIt will be inspected at least every 7 days, after bad weather and after any alteration, with the result recorded on the Scafftag.",
    note: "Please do not alter, remove or load the scaffold, or remove ties, guardrails or boards. Call us if anything needs changing.\nKeep the area round the base clear and tell us straight away about any damage.\nDo not use the scaffold if the Scafftag shows it is not safe or the inspection is out of date.",
    accept: "Accepted",
    pickNote:
      "Allow 5-10% spare fittings. Quantities are counted from the scaffold model; check against the job before loading.",
  };
  const CO0 = { name: "", addr: "", tel: "", email: "", web: "", logo: "" }; // SiteHQ: filled from Setup › My company details
  function freshState() {
    return Object.assign(
      {
        job: "Sample job — 14 Marine Parade",
        client: "",
        site: "",
        ref: "",
        pdate: "",
        notes: "",
        co: { ...CO0 },
        cost: { basis: "m", rate: "", extras: [], vat: true, inpdf: false },
        bay: 2.0,
        boards: "4",
        lift1: 2.0,
        lift: 2.0,
        boarded: "99",
        clad: "32",
        hop: "0",
        brace: 2,
        tiearea: "",
        sole: true,
        baselift: false,
        beam: "ladder",
        brick: false,
        notube: [],
        noboard: [],
        hide: [],
        removed: [],
        extra: [],
        bldMode: "solid",
        pdf: { ...PDFDEF, sections: [] },
      },
      sampleDesign(),
    );
  }
  // SiteHQ: this job's saved design, the firm's shared settings and the job's name, client and address (drawing/scaffold-jobs.js)
  let S = Object.assign(freshState(), host.initial || {});
  S.co = Object.assign({ ...CO0 }, S.co || {});
  S.cost = Object.assign(
    { basis: "m", rate: "", extras: [], vat: true, inpdf: false },
    S.cost || {},
  );
  S.pdf = Object.assign({ ...PDFDEF, sections: [] }, S.pdf || {});
  if (!S.pdate) S.pdate = new Date().toISOString().slice(0, 10);
  let curId = null,
    view = "3d",
    MODELS = [],
    SUP = {};
  const SHARED = ["co", "pdf", "style", "ptxt", "pdim", "bldMode", "hide", "notube", "noboard"];
  // SiteHQ: keys starting with _ are worked out on every redraw, so they aren't saved
  const snapOf = (o) =>
    JSON.parse(JSON.stringify(o, (k, v) => (k && k[0] === "_" ? undefined : v)));
  function jobSnap() {
    const d = snapOf(S);
    SHARED.forEach((k) => delete d[k]);
    delete d.jobId;
    return d;
  }
  function sharedSnap() {
    const d = snapOf(S),
      o = {};
    SHARED.forEach((k) => {
      if (d[k] !== undefined) o[k] = d[k];
    });
    return o;
  }
  const HIST = { u: [], r: [], last: null, t: 0, mute: false };
  const histSnap = () =>
    JSON.stringify(S, (k, v) => (k === "co" || k === "bgimg" || k[0] === "_" ? undefined : v));
  function histNote() {
    if (HIST.mute) return;
    const cur = histSnap();
    if (HIST.last == null) {
      HIST.last = cur;
      return;
    }
    if (cur === HIST.last) return;
    const now = Date.now();
    if (now - HIST.t > 700) {
      HIST.u.push(HIST.last);
      if (HIST.u.length > 60) HIST.u.shift();
      HIST.r = [];
    }
    HIST.t = now;
    HIST.last = cur;
    histUI();
  }
  function storeJob() {
    jobT = 0;
    return host.save(jobSnap(), sharedSnap());
  }
  function histUI() {
    const u = $("gundo"),
      r = $("gredo");
    if (u) u.disabled = !HIST.u.length;
    if (r) r.disabled = !HIST.r.length;
  }
  function histGo(dir) {
    const from = dir < 0 ? HIST.u : HIST.r,
      to = dir < 0 ? HIST.r : HIST.u;
    if (!from.length) {
      toast(dir < 0 ? "Nothing to undo" : "Nothing to redo");
      return;
    }
    to.push(histSnap());
    const d = JSON.parse(from.pop()),
      co = S.co,
      bgimg = S.bgimg;
    HIST.mute = true;
    S = Object.assign(d, { co, bgimg });
    SELB = null;
    signCache.key = "";
    sync();
    accUI();
    propsUI();
    update(true);
    HIST.mute = false;
    HIST.last = histSnap();
    HIST.t = 0;
    histUI();
    toast(dir < 0 ? "Undone" : "Redone");
  }
  let jobT = 0;
  const save = () => {
    histNote();
    clearTimeout(jobT);
    jobT = setTimeout(storeJob, 700);
  };
  const wingById = (id) => (S.wings || []).find((w) => w.id === id),
    chimById = (id) => (S.chims || []).find((c) => c.id === id),
    blockById = (id) => (S.blocks || []).find((b) => b.id === id);
  const VIEWT = ["run", "bird", "load", "chim", "troof"],
    TYPEN = {
      run: "Scaffold run",
      bird: "Birdcage",
      load: "Loading bay",
      chim: "Chimney scaffold",
      troof: "Temporary roof",
      prop: "Site item",
    };
  const BTYPES = [
    ["", "House"],
    ["bung", "Bungalow"],
    ["chalet", "Chalet bungalow (rooms in the roof)"],
    ["town", "Townhouse (3 storeys)"],
    ["flats", "Block of flats"],
    ["comm", "Commercial unit / warehouse"],
    ["garage", "Garage / outbuilding"],
    ["ext", "Extension"],
    ["cons", "Conservatory (glass)"],
    ["bay", "Bay window"],
    ["porch", "Porch"],
    ["church", "Church / tall building"],
  ];
  const BPRE = {
    bung: { eaves: 2.6, pitch: 35, roof: "hip" },
    chalet: { eaves: 2.6, pitch: 45, roof: "gable", dormF: 2 },
    town: { eaves: 8.1, pitch: 35, roof: "gable" },
    flats: { eaves: 11, roof: "flat", parapet: 0.6 },
    comm: { eaves: 6.5, pitch: 8, roof: "gable" },
    garage: { eaves: 2.4, roof: "flat", parapet: 0 },
    ext: { eaves: 2.7, pitch: 12, roof: "mono" },
    cons: { eaves: 2.2, pitch: 15, roof: "mono" },
    church: { eaves: 9, pitch: 50, roof: "gable" },
  };
  const FENCEN = {
    heras: "Heras temporary fencing",
    ch8: "Pedestrian barriers (Chapter 8)",
    close: "Close-board timber fence",
    hoard: "Plywood hoarding",
    chain: "Chain-link fence",
    pal: "Steel palisade fence",
  };
  const PROPN = {
    fence: "Fence",
    person: "Person (for scale)",
    cone: "Traffic cone",
    sleeper: "Timber sleeper",
    sign: "Company sign board",
    road: "Road",
    path: "Path / pavement",
    crossing: "Zebra crossing",
    lamp: "Lamppost",
  };

  function levelsFor(H) {
    if (S.autolift) {
      const n = Math.max(1, Math.ceil((H - 0.05) / 2.1)),
        L = [];
      for (let i = 1; i <= n; i++) L.push(+((H * i) / n).toFixed(2));
      return L;
    }
    const l1 = num(S.lift1, 2),
      lh = num(S.lift, 2),
      L = [];
    let h = l1;
    if (H <= l1 + 0.05) return [H];
    // SiteHQ (James, Nov 2026: "it shows 2 lifts when one is all that is needed"): another lift only when there's more
    // than 0.7m left above the last one – otherwise the top platform is that lift
    while (H - h > 0.7) {
      L.push(+h.toFixed(2));
      h += lh;
    }
    L.push(H);
    return L;
  }
  // SiteHQ: a run's own lifts (James, Nov 2026: "I should be able to add the heights of each lift needed … I need to
  // be able to adjust it easily"): b.lifts = [{ h, b }] – the height of each lift and whether it's boarded
  function liftRows(b) {
    const raw = b && b.lifts;
    const R = (
      Array.isArray(raw)
        ? raw.map((r) => ({ h: parseFloat(r.h), b: r.b !== false }))
        : String(raw || "")
            .split(/[\s,;]+/)
            .map((x) => ({ h: parseFloat(x), b: true }))
    )
      .filter((r) => isFinite(r.h) && r.h >= 0.5 && r.h <= 60)
      .map((r) => ({ h: +r.h.toFixed(2), b: r.b }))
      .sort((p, q) => p.h - q.h)
      .filter((r, i, A) => !i || r.h !== A[i - 1].h);
    return R.length ? R : null;
  }
  // when the top platform doesn't fall on 2m lifts from 2m: the ways to sort it, for James to pick
  function liftChoices(H) {
    const out = [],
      g = (n, f) => [...Array(n).keys()].map(f);
    const n2 = Math.floor((H + 0.05) / 2),
      r = +(H - 2 * n2).toFixed(2);
    if (H <= 2.75 || r < 0.05) return out;
    [n2, n2 + 1].forEach((n) => {
      const f = +(H - 2 * (n - 1)).toFixed(2);
      if (n >= 1 && f >= 1.2 && f <= 3 && Math.abs(f - 2) > 0.05)
        out.push({
          t: `${f > 2 ? "Raise" : "Lower"} the first lift to ${f2s(f)}m – then 2m lifts up to ${f2s(H)}m`,
          rows: g(n, (i) => ({ h: +(f + 2 * i).toFixed(2), b: true })),
        });
    });
    if (n2 >= 1)
      out.push({
        t: `Lower the top platform to ${f2s(2 * n2)}m – 2m lifts all the way`,
        rows: g(n2, (i) => ({ h: 2 * (i + 1), b: true })),
      });
    if (n2 >= 1 && r >= 0.5)
      out.push({
        t: `Keep 2m lifts, with the ${f2s(2 * n2)}m lift left without boards, and the top platform at ${f2s(H)}m`,
        rows: [...g(n2, (i) => ({ h: 2 * (i + 1), b: i < n2 - 1 })), { h: +H.toFixed(2), b: true }],
      });
    return out;
  }
  function geomW() {
    const bw = Math.max(2, Math.min(8, +S.boards || 4)),
      w = +(bw * 0.225 + 0.04).toFixed(2),
      hop = Math.max(0, Math.min(2, +S.hop || 0)),
      din = 0.3 + Math.max(0, hop - 1) * 0.23;
    return { bw, w, hop, din, dout: din + w };
  }
  const beamType = (k, keder) =>
    k === "unit" || keder
      ? {
          list: [
            [6, 6],
            [5, 5],
            [4, 4],
            [3, 3],
            [2, 2],
          ],
          dep: 0.75,
          lat: "z",
          nm: (t) => `${keder ? "Aluminium keder beam" : "Aluminium unit beam"} 750mm (${t[0]}m)`,
        }
      : {
          list: [
            [6.4, 21],
            [4.8, 16],
            [3.9, 13],
            [3.0, 10],
          ],
          dep: 0.3,
          lat: "r",
          nm: (t) => `Steel ladder beam ${t[1]}ft (${t[0]}m)`,
        };
  function kit() {
    const P = [];
    const tube = (a, b, t, role, at) => P.push({ k: "tube", a, b, name: tn(t), role, at });
    const fit = (p, name, role, at, ft) => P.push({ k: "fit", p, name, role, at, ft });
    const box = (c, s, name, role, at, mat, rx, nc, rz) =>
      P.push({ k: "box", c, s, name, role, at, mat, rx, nc, rz });
    const run = (a, ax, total, role, at) => {
      if (total <= 0.05) return;
      const ps = pieces(TUBES, total);
      let t = 0;
      ps.forEach((tb, i) => {
        const seg = Math.min(tb[0], total - t),
          s = a.slice(),
          e = a.slice();
        s[ax] += t;
        e[ax] += t + seg;
        tube(s, e, tb, role, at);
        t += seg;
        if (i < ps.length - 1) {
          const j = a.slice();
          j[ax] += t;
          fit(j, SLV, "Joining tubes", at, "slv");
        }
      });
    };
    const boardRun = (x0, total, y, d, role, at, rx, ax) => {
      let t = x0;
      pieces(BOARDS, total).forEach((bd) => {
        const seg = Math.min(bd[0], x0 + total - t);
        if (ax === 2)
          box([d, y, t + seg / 2], [0.225, 0.038, seg - 0.01], bn(bd), role, at, "board", rx);
        else box([t + seg / 2, y, d], [seg - 0.01, 0.038, 0.225], bn(bd), role, at, "board", rx);
        t += seg;
      });
    };
    const toe = (a, b2, by, fixed, ax, role, at) => {
      let t = a;
      pieces(BOARDS, b2 - a).forEach((bd) => {
        const seg = Math.min(bd[0], b2 - t),
          c = ax === 2 ? [fixed, by + 0.13, t + seg / 2] : [t + seg / 2, by + 0.13, fixed],
          sz = ax === 2 ? [0.038, 0.225, seg - 0.01] : [seg - 0.01, 0.225, 0.038];
        box(c, sz, bn(bd), role || "Toe board", at, "board");
        const q = Math.min(0.3, seg / 4);
        [t + q, t + seg - q].forEach((v) =>
          fit(
            ax === 2 ? [fixed, by + 0.13, v] : [v, by + 0.13, fixed],
            "Toe board clip",
            "Toe boards",
            at,
            "clip",
          ),
        );
        t += seg;
      });
    };
    const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const beamRun = (BT, a, b, role, at) => {
      const Lb = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
        ps = pieces(BT.list, Lb);
      let t = 0;
      ps.forEach((bm, i) => {
        const seg = Math.min(bm[0], Lb - t);
        P.push({
          k: "beam",
          a: lerp(a, b, t / Lb),
          b: lerp(a, b, (t + seg) / Lb),
          dep: BT.dep,
          lat: BT.lat,
          name: BT.nm(bm),
          role,
          at,
        });
        t += seg;
        if (i < ps.length - 1)
          fit(lerp(a, b, t / Lb), "Beam joiner (spigot set)", "Joins beams end to end", at, "slv");
      });
    };
    const lad = (a, b, name, role, at) => P.push({ k: "lad", a, b, name, role, at });
    return { P, tube, fit, box, run, boardRun, toe, lerp, beamRun, lad };
  }

  // ---------- MODEL: scaffold run along a wall (x along wall, y up, d out from wall) ----------
  function buildRun(b) {
    const LR = liftRows(b),
      LF = LR ? LR.map((r) => r.h) : null,
      L = num(b.len, 1),
      H = LF ? LF[LF.length - 1] : num(b.ht, 1),
      bayMax = num(b.bay, num(S.bay, 2));
    const n = Math.max(1, Math.ceil(L / bayMax - 1e-9)),
      bay = L / n,
      pairs = n + 1,
      SP = SUP[b.id];
    const lv = LF || levelsFor(H),
      all = S.baselift ? [0.15, ...lv] : lv,
      bl = [0.15, ...lv, ...(SP ? [Math.min(SP.yin, SP.yout)] : [])],
      nb = Math.min(+(b.boarded || S.boarded), lv.length),
      boarded = LR ? LR.filter((r) => r.b).map((r) => r.h) : lv.slice(lv.length - nb);
    // worked-out lifts that aren't 2m apart from 2m (lifts set on the run are as James wants them)
    const liftWarn =
      !LR &&
      !S.autolift &&
      H > 2.75 &&
      lv.some((h, i) => Math.abs(h - (i ? lv[i - 1] : 0) - 2) > 0.05)
        ? { H, lv: lv.slice(), choices: liftChoices(H) }
        : null;
    const { bw, w, hop, din, dout } = geomW(),
      trT = pick(TUBES, dout + 0.05),
      BT = beamType(S.beam);
    const gW = num(b.gapW, 0),
      gA = Math.max(0, num0(b.gapAt) - (b._atShift || 0));
    let gap = null;
    const lvAt = (minY) => {
      const gl = num(b.gapLift, 0);
      if (gl > 0) return lv[Math.min(lv.length, gl) - 1];
      return lv.find((h) => h >= minY) ?? lv[lv.length - 1];
    };
    if (gW > 0 && lv.length) {
      const iA = Math.max(0, Math.min(n, Math.floor((gA + 1e-6) / bay))),
        iB = Math.max(0, Math.min(n, Math.ceil((gA + gW - 1e-6) / bay)));
      if (iB - iA >= 2) gap = { iA, iB, y: lvAt(0) };
    } else if (lv.length && b.autoBridge !== false) {
      // standards that would land on an extension or conservatory roof: bridge over it on beams
      const bad = [];
      let roofMax = 0;
      for (let i = 0; i <= n; i++) {
        let hit = false;
        for (const d of [din, dout]) {
          const q = toW(b, [i * bay, 0, d]),
            y = obstY(q[0], q[2], 0.08);
          if (y != null) {
            hit = true;
            roofMax = Math.max(roofMax, y);
          }
        }
        if (hit) bad.push(i);
      }
      if (bad.length) {
        const iA = Math.min(...bad) - 1,
          iB = Math.max(...bad) + 1;
        if (iA >= 0 && iB <= n) {
          for (let x = iA * bay; x <= iB * bay; x += 0.25)
            for (const d of [din, dout]) {
              const q = toW(b, [x, 0, d]),
                y = obstY(q[0], q[2], 0.08);
              if (y != null) roofMax = Math.max(roofMax, y);
            }
          gap = { iA, iB, y: lvAt(roofMax + 0.5), auto: true };
        }
      }
    }
    const hung = (i) => !!gap && i > gap.iA && i < gap.iB && i < pairs,
      below = (h) => !!gap && h < gap.y - 0.01,
      topY = SP ? Math.max(H + 1.2, Math.max(SP.yin, SP.yout) + 0.15) : H + 1.2;
    const K = kit(),
      { P, tube, fit, box, run, boardRun, toe, lad } = K,
      X = (i) => i * bay,
      dA = Math.max(0, num0(b.dropA)),
      dB = Math.max(0, num0(b.dropB)),
      GD = (x) => -(dA + (dB - dA) * Math.max(0, Math.min(1, x / Math.max(L, 0.1))));
    const ACCS = (S.access || []).filter((a) => a.block === b.id),
      STH = ACCS.filter((a) => a.type === "stair"),
      RMP = ACCS.filter((a) => a.type === "ramp"),
      LDH = ACCS.filter((a) => a.type !== "stair" && a.type !== "ramp"),
      stM = Math.min(n, Math.max(1, Math.ceil(2.6 / bay - 1e-9))),
      at0 = (a) => Math.max(0, num0(a.at) - (b._atShift || 0));
    const stI = (a) => Math.max(0, Math.min(n - stM, Math.floor(at0(a) / bay + 1e-6))),
      sgs = STH.map((a) => [X(stI(a)), X(stI(a) + stM)]);
    const segs = (a, c) => {
      let out = [[a, c]];
      sgs.forEach(([g0, g1]) => {
        out = out.flatMap(([u, v]) =>
          g1 <= u || g0 >= v
            ? [[u, v]]
            : [
                [u, g0],
                [g1, v],
              ].filter(([p, q]) => q - p > 0.3),
        );
      });
      return out;
    };
    const RW = 1.2,
      rmpH = (a) => lv[Math.max(0, Math.min(lv.length, num(a.lift, 1)) - 1)],
      rgs = RMP.map((a) => {
        const h = rmpH(a),
          xt = Math.min(L, Math.max(0, at0(a))),
          Lr = h * 4,
          dir = xt - Lr >= -1 || (xt + Lr > L + 1 && xt > L / 2) ? 1 : -1,
          x2 = xt - dir * 1.3;
        return [Math.max(0, Math.min(xt, x2)), Math.min(L, Math.max(xt, x2)), h];
      }),
      segsH = (a, c, h) => {
        let out = segs(a, c);
        rgs
          .filter((g) => Math.abs(g[2] - h) < 0.02)
          .forEach(([g0, g1]) => {
            out = out.flatMap(([u, v]) =>
              g1 <= u || g0 >= v
                ? [[u, v]]
                : [
                    [u, g0],
                    [g1, v],
                  ].filter(([p, q]) => q - p > 0.3),
            );
          });
        return out;
      };
    const startJ = !!(b._js ?? b.js),
      endJ = !!(b._je ?? b.je),
      endTie = !!b._jeTie;
    const SX0 = startJ ? -dout : 0,
      SX1 = endJ ? L + dout : L,
      stdX = [...Array(pairs).keys()].map(X).concat(endJ && !endTie ? [L + dout] : []);
    const lx0 = SX0 - 0.15,
      lx1 = SX1 + 0.15,
      bx0 = startJ ? -din : -0.15,
      bx1 = endJ ? (endTie ? L + din : L + dout) : L + 0.15,
      ox0 = startJ ? -dout - 0.12 : -0.15,
      ox1 = endJ ? L + dout + 0.12 : L + 0.15;
    const side = (d) => (d === din ? "Inside" : "Outside");
    // gable table lifts: extra lifts that step up following the gable
    const wg = wingById(b.wing),
      TBL = [];
    if (b.table && wg) {
      const prof = (x) => {
        const q = toW(b, [x, 0, -0.05]),
          y = roofYw(q[0], q[2]);
        return y == null ? H : y;
      };
      const nB = stdX.length - 1,
        mid = (q) => prof((stdX[q] + stdX[q + 1]) / 2),
        pmax = Math.max(...[...Array(nB).keys()].map(mid)),
        lh = Math.min(num(S.lift, 2), Math.max(1.2, (pmax - H) / 2));
      let h = H + lh;
      const lvT = [];
      while (h < pmax - 0.3) {
        lvT.push(+h.toFixed(2));
        h += lh;
      }
      lvT.forEach((h) => {
        const ok = (q) => mid(q) >= h + 0.1;
        let q = 0;
        while (q < nB) {
          if (!ok(q)) {
            q++;
            continue;
          }
          let j = q;
          while (j + 1 < nB && ok(j + 1)) j++;
          TBL.push({ h, i0: q, i1: j + 1 });
          q = j + 1;
        }
      });
    }
    const stdTop = (i) => {
      let t = topY;
      TBL.forEach((r) => {
        if (i >= r.i0 && i <= r.i1) t = Math.max(t, r.h + 1.2);
      });
      return t;
    };
    // base + standards
    stdX.forEach((x, i) => {
      const cn = i >= pairs ? "corner " : "";
      for (const d of [din, dout]) {
        if (hung(i)) {
          const y0 = gap.y - 0.05 - BT.dep - 0.1;
          run(
            [x, y0, d],
            1,
            stdTop(i) - y0,
            "Standard (stands on the beam)",
            `${side(d)} line, standard ${i + 1}`,
          );
          continue;
        }
        const g = GD(x);
        if (S.sole !== false)
          box(
            [x, g + 0.02, d],
            [0.225, 0.038, 0.3],
            SOLE,
            SOLER,
            `${side(d)} ${cn}standard ${i + 1}`,
            "sole",
          );
        box(
          [x, g + 0.045, d],
          [0.15, 0.008, 0.15],
          "Base plate",
          "Under every standard",
          `${side(d)} ${cn}standard ${i + 1}`,
          "plate",
        );
        run(
          [x, g + 0.05, d],
          1,
          stdTop(i) - g - 0.05,
          cn ? "Corner standard" : "Standard",
          `${side(d)} line, ${cn}standard ${i + 1}`,
        );
      }
    });
    // sloping ground: stepped kicker lifts and make-up lifts built up from the low side until the first lift is level
    if (dA > 0.05 || dB > 0.05) {
      const low = all[0],
        step = num(S.lift, 2),
        lab0 = "Make-up lift (sloping ground)",
        seg = (h, need) => {
          const out = [];
          let st = null;
          for (let q = 0; q < n; q++) {
            const ok = need(q, h);
            if (ok && st == null) st = q;
            if ((!ok || q === n - 1) && st != null) {
              out.push([st, ok ? q + 1 : q]);
              st = null;
            }
          }
          return out;
        };
      const put = (h, q0, q1, lab) => {
        [din, dout].forEach((d) => {
          run(
            [X(q0) - 0.15, h, d],
            0,
            X(q1) - X(q0) + 0.3,
            "Ledger (" + lab.toLowerCase() + ")",
            `${side(d)} line at ${f1(h)}m`,
          );
          for (let i = q0; i <= q1; i++) fit([X(i), h, d], RA, "Ledger to standard", lab, "ra");
        });
        for (let i = q0; i <= q1; i++) {
          tube(
            [X(i) + 0.07, h + 0.06, 0.08],
            [X(i) + 0.07, h + 0.06, 0.08 + trT[0]],
            trT,
            "Transom (" + lab.toLowerCase() + ")",
            lab,
          );
          fit([X(i) + 0.07, h + 0.06, din], RA, "Transom to ledger", lab, "ra");
          fit([X(i) + 0.07, h + 0.06, dout], RA, "Transom to ledger", lab, "ra");
        }
      };
      for (let h = low - step; h > Math.min(GD(0), GD(L)) + 0.35; h -= step) {
        const hh = +h.toFixed(2);
        seg(hh, (q) => Math.max(GD(X(q)), GD(X(q + 1))) < hh - 0.3).forEach(([q0, q1]) =>
          put(hh, q0, q1, lab0),
        );
      }
      for (let q = 0; q < n; q++) {
        const gh = Math.max(GD(X(q)), GD(X(q + 1))) + 0.15;
        let lowest = low;
        for (let h = low - step; h > gh + 0.3; h -= step) lowest = h;
        if (lowest - gh > 0.45) put(+gh.toFixed(2), q, q + 1, "Kicker lift (stepped on the slope)");
      }
    }
    // ledgers + transoms every lift
    all.forEach((h) => {
      const li = lv.indexOf(h),
        lab = li >= 0 ? `Lift ${li + 1} at ${f1(h)}m` : "Base lift",
        cut = below(h);
      for (const d of [din, dout]) {
        const lt = `${side(d)} ledger, ${lab}${startJ || endJ ? " (runs round the corner)" : ""}`;
        if (cut) {
          const xa = X(gap.iA) + 0.15,
            xb = X(gap.iB) - 0.15;
          if (xa - lx0 > 0.3) run([lx0, h, d], 0, xa - lx0, "Ledger", lt);
          if (lx1 - xb > 0.3) run([xb, h, d], 0, lx1 - xb, "Ledger", lt);
        } else run([lx0, h, d], 0, lx1 - lx0, "Ledger", lt);
        stdX.forEach((x, i) => {
          if (!(cut && hung(i))) fit([x, h, d], RA, "Ledger to standard", lab, "ra");
        });
      }
      for (let i = 0; i < stdX.length; i++) {
        if (cut && hung(i)) continue;
        const x = stdX[i] + (i === stdX.length - 1 ? -0.07 : 0.07),
          y = h + 0.06;
        tube([x, y, 0.08], [x, y, 0.08 + trT[0]], trT, "Transom", lab);
        fit([x, y, din], PUT, "Transom to ledger", lab, "put");
        fit([x, y, dout], PUT, "Transom to ledger", lab, "put");
      }
    });
    // bridging beams over a gap
    if (gap) {
      const yt = gap.y - 0.05;
      [din, dout].forEach((d) => {
        K.beamRun(
          BT,
          [X(gap.iA) - 0.25, yt, d],
          [X(gap.iB) + 0.25, yt, d],
          "Bridging beam",
          `Over the gap, ${side(d).toLowerCase()} line`,
        );
        for (let i = gap.iA; i <= gap.iB; i++) {
          fit([X(i), yt, d], RA, "Beam to standard", "Bridging beam", "ra");
          fit([X(i), yt - BT.dep, d], RA, "Beam to standard", "Bridging beam", "ra");
        }
      });
      [gap.iA, gap.iB].forEach((i) => {
        const sgn = i === gap.iA ? 1 : -1,
          y = gap.y - 0.05 - BT.dep,
          a = [X(i) + sgn * 0.15, y, din],
          c = [X(i) + sgn * (0.15 + Math.min(bay, 1.5)), y, dout];
        tube(
          a,
          c,
          pick(TUBES, Math.hypot(c[0] - a[0], w) + 0.2),
          "Beam plan brace",
          "Bridging beam",
        );
        fit(a, SW, "Beam plan brace", "Bridging beam", "sw");
        fit(c, SW, "Beam plan brace", "Bridging beam", "sw");
      });
    }
    // temporary roof support ledgers: set at the beam line so the roof beams sit on both lines
    if (SP) {
      const rl = "Temporary roof support";
      [
        [din, SP.yin],
        [dout, SP.yout],
      ].forEach(([d, yy]) => {
        run([lx0, yy, d], 0, lx1 - lx0, "Roof support ledger", `At ${f1(yy)}m`);
        stdX.forEach((x) => fit([x, yy, d], RA, "Ledger to standard", rl, "ra"));
      });
      const top = lv[lv.length - 1],
        ymn = Math.min(SP.yin, SP.yout);
      if (ymn - top > 2.2) {
        const yy = top + (ymn - top) / 2;
        [din, dout].forEach((d) => {
          run([lx0, yy, d], 0, lx1 - lx0, "Roof support ledger", `At ${f1(yy)}m`);
          stdX.forEach((x) => fit([x, yy, d], RA, "Ledger to standard", rl, "ra"));
        });
        stdX.forEach((x0, i) => {
          const x = x0 + (i === stdX.length - 1 ? -0.07 : 0.07),
            y = yy + 0.06;
          tube([x, y, 0.08], [x, y, 0.08 + trT[0]], trT, "Roof support transom", rl);
          fit([x, y, din], PUT, "Transom to ledger", rl, "put");
          fit([x, y, dout], PUT, "Transom to ledger", rl, "put");
        });
      }
    }
    // SiteHQ (James, Nov 2026: "ladders need to go the other way … they need holes through the scaffold"): each ladder
    // runs along the scaffold inside the platform, in the outer two board widths, from the lift below up through a
    // hole (a ladder trap) in the boards at the far end of its bay – one transom space long, so the boards either side
    // still end on a transom. Lifts go in alternate bays (zig-zag) so each ladder stands on whole boards. ac.dir: -1
    // climbs towards the left. LADG: per ladder, per lift: { j, h, q, dir, xTop, xFoot, y0, hs, he }
    const k = Math.max(0, Math.ceil(bay / 1.2 - 1e-9) - 1),
      gapT = bay / (k + 1),
      zRow = (r) => (din + dout) / 2 - (bw * 0.225) / 2 + 0.1125 + r * 0.225,
      zl = bw >= 2 ? (zRow(bw - 1) + zRow(bw - 2)) / 2 : (din + dout) / 2;
    const LADG = LDH.map((ac) => {
      const base = Math.max(0, Math.min(n - 1, Math.floor(at0(ac) / bay + 1e-6))),
        d0 = parseFloat(ac.dir) < 0 ? -1 : 1;
      let prev = null;
      return lv.map((h, j) => {
        const q =
            n > 1
              ? Math.min(
                  n - 1,
                  base + (j % 2 && base < n - 1 ? 1 : 0) - (j % 2 && base === n - 1 ? 1 : 0),
                )
              : 0,
          dir = n > 1 ? d0 : j % 2 ? -d0 : d0,
          hs = dir > 0 ? X(q) + bay - gapT : X(q),
          he = dir > 0 ? X(q) + bay : X(q) + gapT,
          xTop = dir > 0 ? he - 0.12 : hs + 0.12,
          y0 = prev != null ? prev + 0.12 : GD(xTop) + 0.05,
          run = (h + 1.05 - y0) / 4,
          xFoot = xTop - dir * run;
        prev = h;
        return { j, h, q, dir, xTop, xFoot, y0, hs, he };
      });
    });
    const holesAt = (h) =>
      LADG.flat()
        .filter((g) => Math.abs(g.h - h) < 1e-6)
        .map((g) => [g.hs, g.he])
        .sort((a, c) => a[0] - c[0]);
    const cutRun = (a, c, H) => {
      let out = [[a, c]];
      H.forEach(([u, v]) => {
        out = out.flatMap(([p, q]) =>
          v <= p || u >= q
            ? [[p, q]]
            : [
                [p, u],
                [v, q],
              ],
        );
      });
      return out.filter(([p, q]) => q - p > 0.05);
    };
    boarded.forEach((h) => {
      const lab = `Lift ${lv.indexOf(h) + 1} at ${f1(h)}m`,
        y = h + 0.06,
        by = h + 0.105;
      for (let q = 0; q < n; q++)
        for (let j = 1; j <= k; j++) {
          const x = X(q) + (j * bay) / (k + 1);
          tube(
            [x, y, 0.08],
            [x, y, 0.08 + trT[0]],
            trT,
            "Board transom (boards span 1.2m max)",
            lab,
          );
          fit([x, y, din], PUT, "Transom to ledger", lab, "put");
          fit([x, y, dout], PUT, "Transom to ledger", lab, "put");
        }
      const HL = holesAt(h);
      for (let r = 0; r < bw; r++)
        (HL.length && r >= bw - 2 ? cutRun(bx0, bx1, HL) : [[bx0, bx1]]).forEach(([u, v]) =>
          boardRun(u, v - u, by, zRow(r), "Platform boards", lab),
        );
      for (let r = 0; r < hop; r++)
        boardRun(
          bx0,
          bx1 - bx0,
          by,
          din - 0.04 - 0.1125 - r * 0.225,
          "Inside (hop-up) boards",
          lab,
        );
      segsH(ox0, ox1, h).forEach(([u, v]) => toe(u, v, by, dout - 0.04, 0, "Toe board", lab));
      const et = pick(BOARDS, w + 0.1);
      [startJ ? null : -0.12, endJ ? null : L + 0.12]
        .filter((x) => x !== null)
        .forEach((x) => {
          box(
            [x, by + 0.13, (din + dout) / 2],
            [0.038, 0.225, et[0]],
            bn(et),
            "End toe board",
            lab,
            "board",
          );
          fit([x, by + 0.13, dout], "Toe board clip", "Toe boards", lab, "clip");
          fit([x, by + 0.13, din], "Toe board clip", "Toe boards", lab, "clip");
        });
      [
        [0.55, "Middle guardrail"],
        [1.1, "Main guardrail"],
      ].forEach(([o, nm]) => {
        segsH(ox0, ox1, h).forEach(([u, v]) => run([u, h + o, dout + 0.06], 0, v - u, nm, lab));
        stdX.forEach((x) => fit([x, h + o, dout + 0.03], RA, "Guardrail to standard", lab, "ra"));
        const et2 = pick(TUBES, w + 0.2);
        [startJ ? null : -0.06, endJ ? null : L + 0.06]
          .filter((x) => x !== null)
          .forEach((x) => {
            tube(
              [x, h + o, din - 0.1],
              [x, h + o, din - 0.1 + et2[0]],
              et2,
              "End " + nm.toLowerCase(),
              lab,
            );
            fit([x, h + o, din], RA, "End guardrail to standard", lab, "ra");
            fit([x, h + o, dout], RA, "End guardrail to standard", lab, "ra");
          });
      });
      (b._open || []).forEach(([u, v]) => {
        if (v - u < 0.3) return;
        [
          [0.55, "Inside middle guardrail"],
          [1.1, "Inside main guardrail"],
        ].forEach(([o, nm]) => {
          run([u, h + o, din - 0.06], 0, v - u, nm, lab + " (open side, past the building)");
          stdX
            .filter((x) => x >= u - 0.05 && x <= v + 0.05)
            .forEach((x) => fit([x, h + o, din - 0.03], RA, "Guardrail to standard", lab, "ra"));
        });
        toe(u, v, by, din + 0.04, 0, "Inside toe board", lab);
      });
      if (S.brick)
        for (let q = 0; q < n; q++)
          if (
            !sgs.some((g) => X(q) >= g[0] - 0.01 && X(q + 1) <= g[1] + 0.01) &&
            !rgs.some((g) => Math.abs(g[2] - h) < 0.02 && g[1] > X(q) && g[0] < X(q + 1))
          )
            box(
              [X(q) + bay / 2, h + 0.68, dout + 0.1],
              [bay - 0.08, 1.0, 0.01],
              "Brick guard",
              "Stops bricks falling off the edge",
              lab,
              "mesh",
            );
    });
    // SiteHQ (James, Nov 2026: "access onto the gable are needed when gable hops are added"): a ladder up to each
    // table lift from the platform below it, through a hole in the table lift's boards like the main ladders, in a bay
    // where its foot stands on whole boards (clear of any hole below)
    const TLAD_HOLES = [];
    const TLAD = TBL.map((r, t) => {
      const lower = TBL.filter((u) => u.h < r.h - 1e-6 && u.i0 <= r.i0 && u.i1 >= r.i1).reduce(
          (m, u) => Math.max(m, u.h),
          H,
        ),
        below = lower > H + 1e-6 ? TLAD_HOLES.filter((x) => Math.abs(x.h - lower) < 1e-6) : null,
        holesBelow = below ? below.map((x) => [x.hs, x.he]) : holesAt(H),
        y0 = lower + 0.12,
        bays = [...Array(r.i1 - r.i0).keys()].map((k) => r.i0 + k),
        midB = Math.floor((r.i0 + r.i1 - 1) / 2),
        order = bays.sort((a, c) => Math.abs(a - midB) - Math.abs(c - midB) || a - c);
      for (const q of order)
        for (const dir of [t % 2 ? -1 : 1, t % 2 ? 1 : -1]) {
          const gl = stdX[q + 1] - stdX[q],
            kk = Math.max(0, Math.ceil(gl / 1.2 - 1e-9) - 1),
            gT = gl / (kk + 1),
            hs = dir > 0 ? stdX[q + 1] - gT : stdX[q],
            he = dir > 0 ? stdX[q + 1] : stdX[q] + gT,
            xTop = dir > 0 ? he - 0.12 : hs + 0.12,
            xFoot = xTop - (dir * (r.h + 1.05 - y0)) / 4;
          if (holesBelow.some(([u, v]) => xFoot > u - 0.15 && xFoot < v + 0.15)) continue;
          const g = { h: r.h, q, dir, hs, he, xTop, xFoot, y0 };
          TLAD_HOLES.push(g);
          return g;
        }
      return null;
    });
    // gable table lifts
    TBL.forEach((r, t) => {
      const lab = `Gable table lift at ${f1(r.h)}m`,
        xa = stdX[r.i0],
        xb = stdX[r.i1],
        y = r.h + 0.06,
        by = r.h + 0.105;
      [din, dout].forEach((d) => {
        run([xa - 0.15, r.h, d], 0, xb - xa + 0.3, "Table lift ledger", lab);
        for (let i = r.i0; i <= r.i1; i++)
          fit([stdX[i], r.h, d], RA, "Ledger to standard", lab, "ra");
      });
      for (let i = r.i0; i <= r.i1; i++) {
        const x = stdX[i] + (i === r.i1 ? -0.07 : 0.07);
        tube([x, y, 0.08], [x, y, 0.08 + trT[0]], trT, "Table lift transom", lab);
        fit([x, y, din], PUT, "Transom to ledger", lab, "put");
        fit([x, y, dout], PUT, "Transom to ledger", lab, "put");
      }
      for (let i = r.i0; i < r.i1; i++) {
        const gl = stdX[i + 1] - stdX[i],
          kk = Math.max(0, Math.ceil(gl / 1.2 - 1e-9) - 1);
        for (let j = 1; j <= kk; j++) {
          const x = stdX[i] + (j * gl) / (kk + 1);
          tube(
            [x, y, 0.08],
            [x, y, 0.08 + trT[0]],
            trT,
            "Board transom (boards span 1.2m max)",
            lab,
          );
          fit([x, y, din], PUT, "Transom to ledger", lab, "put");
          fit([x, y, dout], PUT, "Transom to ledger", lab, "put");
        }
      }
      const TL = TLAD[t];
      for (let q = 0; q < bw; q++)
        (TL && q >= bw - 2
          ? cutRun(xa - 0.1, xb + 0.1, [[TL.hs, TL.he]])
          : [[xa - 0.1, xb + 0.1]]
        ).forEach(([u, v]) => boardRun(u, v - u, by, zRow(q), "Table lift boards", lab));
      if (TL) {
        const len = ladPick(Math.hypot(TL.h + 1.05 - TL.y0, TL.xTop - TL.xFoot) + 0.05),
          al = `Ladder to the gable table lift at ${f1(r.h)}m`;
        lad(
          [TL.xFoot, TL.y0, zl],
          [TL.xTop, TL.h + 1.05, zl],
          `${len}m ladder`,
          "Access ladder up to the gable table lift, through a hole in its boards",
          al,
        );
        [-0.22, 0.22].forEach((o) =>
          fit(
            [TL.xTop, TL.h + 0.3, zl + o],
            "Ladder clamp",
            "Ties ladder to the scaffold",
            al,
            "clip",
          ),
        );
        box(
          [TL.dir > 0 ? TL.hs : TL.he, TL.h + 0.6, zl],
          [0.04, 0.9, 0.5],
          "Ladder gate",
          "Self-closing gate at the ladder hole",
          al,
          "gate",
        );
      }
      toe(xa - 0.12, xb + 0.12, by, dout - 0.04, 0, "Toe board", lab);
      const et = pick(BOARDS, w + 0.1);
      [xa - 0.12, xb + 0.12].forEach((x) =>
        box(
          [x, by + 0.13, (din + dout) / 2],
          [0.038, 0.225, et[0]],
          bn(et),
          "End toe board",
          lab,
          "board",
        ),
      );
      [
        [0.55, "Middle guardrail"],
        [1.1, "Main guardrail"],
      ].forEach(([o, nm]) => {
        run([xa - 0.15, r.h + o, dout + 0.06], 0, xb - xa + 0.3, nm, lab);
        for (let i = r.i0; i <= r.i1; i++)
          fit([stdX[i], r.h + o, dout + 0.03], RA, "Guardrail to standard", lab, "ra");
        const et2 = pick(TUBES, w + 0.2);
        [xa - 0.06, xb + 0.06].forEach((x) => {
          tube(
            [x, r.h + o, din - 0.1],
            [x, r.h + o, din - 0.1 + et2[0]],
            et2,
            "End " + nm.toLowerCase(),
            lab,
          );
          fit([x, r.h + o, din], RA, "End guardrail to standard", lab, "ra");
          fit([x, r.h + o, dout], RA, "End guardrail to standard", lab, "ra");
        });
      });
      const lo = r.h - num(S.lift, 2);
      [
        [r.i0, r.i0 + 1],
        [r.i1, r.i1 - 1],
      ].forEach(([i1, i2]) => {
        if (i2 < r.i0 || i2 > r.i1 || i1 === i2) return;
        const a = [stdX[i1], lo, dout + 0.11],
          c = [stdX[i2], r.h, dout + 0.11];
        tube(a, c, pick(TUBES, Math.hypot(c[0] - a[0], r.h - lo) + 0.3), "Façade brace", lab);
        fit(a, SW, "Façade brace to standard", lab, "sw");
        fit(c, SW, "Façade brace to standard", lab, "sw");
      });
      const im = Math.round((r.i0 + r.i1) / 2),
        tx = stdX[im] + (im < r.i1 ? 0.35 : -0.35),
        tt = pick(TUBES, dout + 0.15);
      tube(
        [tx, r.h + 0.04, 0],
        [tx, r.h + 0.04, tt[0]],
        tt,
        "Tie tube",
        `Table lift tie at ${f1(r.h)}m`,
      );
      fit([tx, r.h + 0.04, din], RA, "Tie tube to ledger", lab, "ra");
      fit([tx, r.h + 0.04, dout], RA, "Tie tube to ledger", lab, "ra");
      fit(
        [tx, r.h + 0.04, 0.01],
        "Ring bolt / tie anchor",
        "Fixes the tie into the building — test before use",
        lab,
        "bolt",
      );
    });
    // ledger bracing (alternate pairs) + façade bracing (zig-zag)
    for (let i = 0; i < pairs; i += 2)
      for (let j = 1; j < bl.length; j++) {
        const lo = bl[j - 1],
          hi = bl[j];
        if (hung(i) && hi <= gap.y + 0.01) continue;
        const x = X(i) + (i === n ? -0.13 : 0.13),
          f = j % 2;
        const a = [x, lo, f ? din : dout],
          c = [x, hi, f ? dout : din];
        tube(
          a,
          c,
          pick(TUBES, Math.hypot(w, hi - lo) + 0.2),
          "Ledger brace",
          `Standard pair ${i + 1}, lift ${j}`,
        );
        fit(a, RA, "Ledger brace", `Standard pair ${i + 1}`, "ra");
        fit(c, RA, "Ledger brace", `Standard pair ${i + 1}`, "ra");
      }
    const bev = Math.max(2, Math.round(num(S.brace, 6))),
      sets = Math.max(1, Math.ceil(n / bev));
    for (let s = 0; s < sets; s++) {
      const b0 = Math.min(s * bev, n - 1);
      for (let j = 1; j < bl.length; j++) {
        const lo = bl[j - 1],
          hi = bl[j],
          f = (j + s) % 2,
          ia = f ? b0 : Math.min(b0 + 1, n),
          ib = f ? Math.min(b0 + 1, n) : b0,
          xa = X(ia),
          xb = X(ib),
          d = dout + 0.11;
        if (gap && lo < gap.y - 0.01 && (hung(ia) || hung(ib))) continue;
        const a = [xa, lo, d],
          c = [xb, hi, d];
        tube(
          a,
          c,
          pick(TUBES, Math.hypot(bay, hi - lo) + 0.3),
          "Façade brace",
          `Bays ${b0 + 1}–${b0 + 2}, lift ${j}`,
        );
        fit(a, SW, "Façade brace to standard", "", "sw");
        fit(c, SW, "Façade brace to standard", "", "sw");
      }
    }
    // ties
    const CL = String(b.clad || S.clad || "32"),
      ties = Math.max(H >= 4 ? 2 : 1, Math.ceil((L * H) / (num(S.tiearea, 0) || +CL)));
    const cand = [];
    lv.forEach((h, j) => {
      for (let i = 0; i < pairs; i++) if ((i + j) % 2 === 0) cand.push([i, h]);
    });
    for (let t = 0; t < ties && cand.length; t++) {
      const [i, h] = cand[Math.floor(((t + 0.5) * cand.length) / ties)],
        x = X(i) + (i === n ? -0.35 : 0.35),
        y = h + 0.04,
        tt = pick(TUBES, dout + 0.15);
      tube([x, y, 0], [x, y, tt[0]], tt, "Tie tube", `Tie ${t + 1} at ${f1(h)}m`);
      fit([x, y, din], RA, "Tie tube to ledger", `Tie ${t + 1}`, "ra");
      fit([x, y, dout], RA, "Tie tube to ledger", `Tie ${t + 1}`, "ra");
      fit(
        [x, y, 0.01],
        "Ring bolt / tie anchor",
        "Fixes the tie into the building — test before use",
        `Tie ${t + 1}`,
        "bolt",
      );
    }
    // netting / sheeting
    if (CL !== "32") {
      const net = CL === "25",
        area = (SX1 - SX0) * (H + 1.2);
      if (endJ)
        box(
          [L + dout / 2, (H + 1.35) / 2, dout + 0.17],
          [dout, H + 1.05, 0.005],
          net ? "Debris netting" : "Monaflex sheeting",
          "Covers the outside face",
          "",
          net ? "net" : "sheet",
          0,
          true,
        );
      for (let q = 0; q < n; q++)
        box(
          [X(q) + bay / 2, (H + 1.35) / 2, dout + 0.17],
          [bay, H + 1.05, 0.005],
          net ? "Debris netting" : "Monaflex sheeting",
          "Covers the outside face",
          "",
          net ? "net" : "sheet",
          0,
          true,
        );
      P.push({
        k: "qty",
        name: net ? "Debris netting roll (2m × 50m)" : "Monaflex sheeting roll (2m × 50m)",
        q: Math.ceil(area / 100),
        role: "Covers the outside face",
      });
      P.push({
        k: "qty",
        name: "Sheeting ties / bungees",
        q: Math.ceil(area * 1.5),
        role: "Fixing netting or sheeting",
      });
    }
    // public footpath + fan
    if (b.pub) {
      for (let i = 0; i < pairs; i++)
        if (!hung(i))
          for (const d of [din, dout])
            P.push({
              k: "pad",
              a: [X(i), 0.1, d],
              b: [X(i), 2.1, d],
              name: "Standard padding (2m)",
              role: "Protects people walking past",
              at: `Standard ${i + 1}`,
            });
      const nl2 = Math.max(2, Math.ceil(L / 6) + 1);
      for (let t = 0; t < nl2; t++) {
        const i = Math.round((t * n) / (nl2 - 1));
        fit(
          [X(i), 1.0, dout + 0.07],
          "Warning lamp (red)",
          "Marks the scaffold on the footpath at night",
          `Standard ${i + 1}`,
          "lamp",
        );
      }
      [0, n].forEach((i) =>
        box(
          [X(i) + (i ? -0.35 : 0.35), 1.6, dout + 0.08],
          [0.45, 0.32, 0.01],
          "Safety sign",
          "Danger — scaffold warning for the public",
          i ? "Right end" : "Left end",
          "sign",
        ),
      );
    }
    if (b.fan && lv.length) {
      const fy = lv[0],
        rise = 0.55,
        rn = 1.6,
        ang = Math.atan2(rise, rn),
        lab = "Pedestrian fan";
      for (let i = 0; i < pairs; i++) {
        tube(
          [X(i), fy, dout + 0.03],
          [X(i), fy + rise, dout + 0.03 + rn],
          pick(TUBES, Math.hypot(rise, rn) + 0.1),
          "Fan rake",
          lab,
        );
        fit([X(i), fy, dout + 0.03], RA, "Fan rake to standard", lab, "ra");
        tube(
          [X(i), fy - 1.2, dout + 0.03],
          [X(i), fy + 0.06, dout + 0.03 + 1.2],
          pick(TUBES, Math.hypot(1.26, 1.2) + 0.1),
          "Fan strut",
          lab,
        );
        fit([X(i), fy - 1.2, dout + 0.03], SW, "Fan strut to standard", lab, "sw");
        fit([X(i), fy + rise, dout + 0.03 + rn], RA, "Fan ledger to rake", lab, "ra");
      }
      run([-0.15, fy + rise + 0.05, dout + 0.03 + rn], 0, L + 0.3, "Fan ledger", lab);
      for (let r = 0; r < 6; r++) {
        const dd = 0.15 + r * 0.235;
        boardRun(
          -0.15,
          L + 0.3,
          fy + 0.09 + dd * Math.sin(ang),
          dout + 0.03 + dd * Math.cos(ang),
          "Fan boards",
          lab,
          -ang,
        );
      }
    }
    // ladders
    const nl = LDH.length;
    RMP.forEach((ac, a) => {
      const h = rmpH(ac),
        Lr = h * 4,
        th = Math.atan2(h, Lr),
        sl = Math.hypot(h, Lr),
        xt = Math.min(L, Math.max(0, at0(ac))),
        dir = xt - Lr >= -1 || (xt + Lr > L + 1 && xt > L / 2) ? 1 : -1,
        lab = `Ramp ${a + 1} to lift at ${f1(h)}m`;
      // the ramp runs alongside the scaffold, outside it, rising to the lift at "From left"
      const u0 = dout + 0.15,
        XR = (v) => xt - dir * v,
        Y = (v) => h * (1 - v / Lr),
        DD = (u) => u0 + u,
        rz = dir * th,
        ul = [-0.06, RW + 0.06];
      const nS = Math.max(1, Math.ceil(Lr / 1.8)),
        vS = [...Array(nS + 1).keys()].map((k) => 0.1 + ((Lr - 0.2) * k) / nS);
      ul.forEach((u, si) => {
        const sd = si ? "Outer" : "Inner",
          d = DD(u);
        vS.forEach((v, k) => {
          const x = XR(v),
            yy = Y(v),
            at = `${sd} side, standard ${k + 1}`;
          if (S.sole !== false)
            box([x, GD(x) + 0.02, d], [0.225, 0.038, 0.3], SOLE, SOLER, at, "sole");
          box(
            [x, GD(x) + 0.045, d],
            [0.15, 0.008, 0.15],
            "Base plate",
            "Under every standard",
            at,
            "plate",
          );
          run(
            [x, GD(x) + 0.05, d],
            1,
            Math.max(0.6, yy + 1.15 - GD(x) - 0.05),
            "Ramp standard",
            lab + ", " + at,
          );
        });
        tube(
          [XR(0), h - 0.09, d],
          [XR(Lr), 0.02, d],
          pick(TUBES, sl + 0.2),
          "Ramp ledger (sloping)",
          lab + `, ${sd.toLowerCase()} side`,
        );
        vS.forEach((v) =>
          fit([XR(v), Y(v) - 0.09, d], SW, "Sloping ledger to standard", lab, "sw"),
        );
        if (si === 1 || true)
          [
            [0.5, "Ramp middle guardrail"],
            [1.0, "Ramp main guardrail"],
          ].forEach(([o, nr]) => {
            const dd = d + (si ? 0.06 : -0.06);
            tube(
              [XR(0), h + o, dd],
              [XR(Lr), o, dd],
              pick(TUBES, sl + 0.2),
              nr + " (sloping)",
              lab,
            );
            vS.forEach((v) => fit([XR(v), Y(v) + o, dd], SW, "Guardrail to standard", lab, "sw"));
          });
        box(
          [XR(Lr / 2), h / 2 + 0.13, d + (si ? -0.04 : 0.04)],
          [sl, 0.15, 0.038],
          "Ramp toe board (sloping)",
          "Stops things rolling off the side",
          lab,
          "board",
          0,
          false,
          rz,
        );
        if (nS > 1) {
          const k = Math.max(1, Math.floor(nS / 2)),
            xa = XR(vS[k - 1]),
            xb = XR(vS[k]);
          tube(
            [xa, GD(xa) + 0.2, d + (si ? 0.1 : -0.1)],
            [xb, Y(vS[k]) - 0.2, d + (si ? 0.1 : -0.1)],
            pick(TUBES, Math.hypot(xb - xa, Y(vS[k]) - 0.4) + 0.3),
            "Ramp brace",
            lab,
          );
        }
      });
      const nT = Math.max(2, Math.ceil(Lr / 0.6));
      for (let k = 0; k <= nT; k++) {
        const v = (Lr * k) / nT;
        if (Y(v) < 0.12) continue;
        const x = XR(v);
        tube(
          [x, Y(v) - 0.06, DD(ul[0]) - 0.1],
          [x, Y(v) - 0.06, DD(ul[1]) + 0.1],
          pick(TUBES, RW + 0.45),
          "Ramp board bearer (0.6m centres)",
          lab,
        );
        ul.forEach((u) => fit([x, Y(v) - 0.06, DD(u)], PUT, "Bearer to ledger", lab, "put"));
      }
      const rows = Math.floor(RW / 0.225);
      let rem = sl,
        seg = 0;
      const sg2 = [];
      while (rem > 0.05) {
        const bt = pick(BOARDS, Math.min(rem, 3.9)),
          ln = Math.min(bt[0], rem);
        sg2.push([seg, ln, bt]);
        seg += ln;
        rem -= ln;
      }
      for (let r = 0; r < rows; r++) {
        const dd = DD(RW / 2 - (rows * 0.225) / 2 + 0.1125 + r * 0.225);
        sg2.forEach(([s0, ln, bt]) => {
          const mid = s0 + ln / 2,
            v = mid * Math.cos(th);
          box(
            [XR(v), Y(v) + 0.02, dd],
            [ln, 0.038, 0.22],
            bn(bt),
            "Ramp boards",
            lab,
            "board",
            0,
            false,
            rz,
          );
        });
      }
      for (let c = 0.3; c < sl - 0.1; c += 0.4) {
        const v = c * Math.cos(th);
        box(
          [XR(v), Y(v) + 0.06, DD(RW / 2)],
          [0.05, 0.025, rows * 0.225],
          "Ramp cleat (timber batten)",
          "Stops feet and barrow wheels slipping",
          lab,
          "sole",
          0,
          false,
          rz,
        );
      }
      // landing gap in the scaffold's outside guardrail at the top of the ramp
    });
    LDH.forEach((ac, a) => {
      const acc = `Ladder access ${a + 1}`;
      LADG[a].forEach((g) => {
        const len = ladPick(Math.hypot(g.h + 1.05 - g.y0, g.xTop - g.xFoot) + 0.05),
          lab = `${acc}, lift ${g.j + 1}`;
        lad(
          [g.xFoot, g.y0, zl],
          [g.xTop, g.h + 1.05, zl],
          `${len}m ladder`,
          "Access ladder, through a hole in the boards, 1m above the landing",
          lab,
        );
        [-0.22, 0.22].forEach((o) =>
          fit(
            [g.xTop, g.h + 0.3, zl + o],
            "Ladder clamp",
            "Ties ladder to the scaffold",
            `Lift ${g.j + 1}`,
            "clip",
          ),
        );
        if (boarded.some((x) => Math.abs(x - g.h) < 1e-6))
          box(
            [g.dir > 0 ? g.hs : g.he, g.h + 0.6, zl],
            [0.04, 0.9, 0.5],
            "Ladder gate",
            "Self-closing gate at the ladder hole",
            `Lift ${g.j + 1}`,
            "gate",
          );
      });
      const g0 = LADG[a][0];
      if (!g0) return;
      box(
        [g0.xFoot + g0.dir * 0.2, 1.0, zl],
        [0.03, 1.4, 0.52],
        "Ladder guard",
        "Locks the ladder out of hours",
        acc,
        "lguard",
      );
      box(
        [g0.xTop + 0.55, 1.5, dout + 0.06],
        [0.13, 0.19, 0.01],
        "Scafftag holder",
        "Shows the latest inspection",
        acc,
        "tag",
      );
      box(
        [g0.xTop - 0.6, 1.6, dout + 0.06],
        [0.4, 0.3, 0.01],
        "Safety sign",
        "Scaffold access sign",
        acc,
        "sign",
      );
    });
    // stair towers built onto the outside face, sharing the outside standards
    for (const st of STH) {
      const m = stM,
        i0 = stI(st),
        right = i0 + m / 2 > n / 2,
        TW = 1.3,
        dI = dout,
        dO = dout + TW,
        lab = "Stair tower";
      const tx = [...Array(m + 1).keys()].map((j) => X(i0 + j)),
        xa0 = tx[0],
        xa1 = tx[m],
        TL = xa1 - xa0;
      tx.forEach((x, i) => {
        if (S.sole !== false) box([x, 0.02, dO], [0.225, 0.038, 0.3], SOLE, SOLER, lab, "sole");
        box(
          [x, 0.045, dO],
          [0.15, 0.008, 0.15],
          "Base plate",
          "Under every standard",
          lab,
          "plate",
        );
        run([x, 0.05, dO], 1, H + 1.2, "Stair tower standard", `${lab}, outside standard ${i + 1}`);
      });
      const tt = pick(TUBES, TW + 0.3);
      all.forEach((h, j) => {
        const at = `${lab}, ${all[j] === 0.15 ? "base lift" : "lift at " + f1(h) + "m"}`;
        run([xa0 - 0.15, h, dO], 0, TL + 0.3, "Stair tower ledger", at);
        tx.forEach((x) => fit([x, h, dO], RA, "Ledger to standard", at, "ra"));
        tx.forEach((x, i) => {
          const xx = x + (i === m ? -0.13 : 0.13);
          tube(
            [xx, h + 0.06, dI - 0.15],
            [xx, h + 0.06, dI - 0.15 + tt[0]],
            tt,
            "Stair tower transom",
            at,
          );
          fit([xx, h + 0.06, dI], PUT, "Transom to scaffold ledger", at, "put");
          fit([xx, h + 0.06, dO], PUT, "Transom to ledger", at, "put");
        });
      });
      lv.forEach((h, j) => {
        const lo = j ? lv[j - 1] : 0,
          f = j % 2,
          xa = f ? xa1 - 0.3 : xa0 + 0.3,
          xb = f ? xa0 + 0.3 : xa1 - 0.3,
          dc = dO - 0.36,
          rise = h - lo,
          at = j ? `Lift ${j} to lift ${j + 1}` : "Ground to lift 1";
        P.push({
          k: "stair",
          a: [xa, lo + (lo ? 0.12 : 0.05), dc],
          b: [xb, h + 0.12, dc],
          wd: 0.6,
          name: `Aluminium stair unit with handrails (${f1(rise)}m rise)`,
          role: "Stair flight",
          at,
        });
        const lat = `${lab}, landing at ${f1(h)}m`;
        for (let r = 0; r < 3; r++)
          boardRun(
            xa0 - 0.1,
            TL + 0.2,
            h + 0.105,
            dI + 0.06 + 0.1125 + r * 0.225,
            "Stair landing boards (level with the platform)",
            lat,
          );
        [
          [0.55, "Stair tower middle guardrail"],
          [1.1, "Stair tower main guardrail"],
        ].forEach(([o, nm]) => {
          run([xa0 - 0.15, h + o, dO + 0.06], 0, TL + 0.3, nm, lat);
          tx.forEach((x) => fit([x, h + o, dO + 0.03], RA, "Guardrail to standard", lat, "ra"));
          [xa0 - 0.06, xa1 + 0.06].forEach((xe) => {
            tube([xe, h + o, dI - 0.1], [xe, h + o, dI - 0.1 + tt[0]], tt, nm, lat);
            fit([xe, h + o, dI], RA, "Guardrail to standard", lat, "ra");
            fit([xe, h + o, dO], RA, "Guardrail to standard", lat, "ra");
          });
        });
      });
      const sbl = [0.15, ...lv];
      for (let j = 1; j < sbl.length; j++) {
        const lo = sbl[j - 1],
          hi = sbl[j],
          f = j % 2,
          at = `${lab}, lift ${j}`;
        const a = [f ? xa0 : xa1, lo, dO + 0.1],
          c = [f ? xa1 : xa0, hi, dO + 0.1];
        tube(a, c, pick(TUBES, Math.hypot(TL, hi - lo) + 0.3), "Stair tower face brace", at);
        fit(a, SW, "Brace to standard", at, "sw");
        fit(c, SW, "Brace to standard", at, "sw");
        [xa0 - 0.1, xa1 + 0.1].forEach((x) => {
          const a2 = [x, lo, f ? dI : dO],
            b2 = [x, hi, f ? dO : dI];
          tube(a2, b2, pick(TUBES, Math.hypot(TW, hi - lo) + 0.2), "Stair tower end brace", at);
          fit(a2, RA, "Brace to standard", at, "ra");
          fit(b2, RA, "Brace to standard", at, "ra");
        });
      }
      const ge = right ? xa1 + 0.1 : xa0 - 0.1;
      box(
        [ge, 0.6, dO - 0.36],
        [0.04, 0.95, 0.6],
        "Stair tower gate",
        "Lockable gate at the foot of the stairs",
        lab,
        "gate",
      );
      box(
        [ge, 1.5, dO - 0.9],
        [0.01, 0.19, 0.13],
        "Scafftag holder",
        "Shows the latest inspection",
        lab,
        "tag",
      );
      box(
        [ge, 1.6, dO - 0.4],
        [0.01, 0.3, 0.4],
        "Safety sign",
        "Scaffold access sign",
        lab,
        "sign",
      );
    }
    return {
      P,
      kind: "run",
      L,
      H,
      n,
      bay,
      pairs,
      lv,
      all,
      boarded,
      liftWarn,
      w,
      din,
      dout,
      ground:
        dA > 0.05 || dB > 0.05
          ? [
              [0, -dA],
              [L, -dB],
            ]
          : null,
      dA,
      dB,
      ties: ties + TBL.length,
      nl,
      gap,
      tbl: TBL.length,
      caption: `${L.toFixed(2)}m · ${n} bays @ ${bay.toFixed(2)}m`,
    };
  }

  // ---------- MODEL: birdcage / loading bay (x along length, d across width) ----------
  function buildBird(b, load) {
    const K = kit(),
      { P, fit, box, run, boardRun, toe, lad } = K,
      nm = load ? "Loading bay" : "Birdcage";
    const L = num(b.len, 2.4),
      Wd = num(b.wid, 2),
      base = num0(b.base),
      ht = num(b.ht, load ? 2 : 3),
      top = base + ht,
      bayMax = load ? Math.min(num(S.bay, 2), 1.25) : num(S.bay, 2);
    const nx = Math.max(1, Math.ceil(L / bayMax - 1e-9)),
      nd = Math.max(1, Math.ceil(Wd / bayMax - 1e-9)),
      bx = L / nx,
      bd = Wd / nd;
    const xs = [...Array(nx + 1).keys()].map((i) => i * bx),
      ds = [...Array(nd + 1).keys()].map((j) => j * bd);
    const lvs = [];
    {
      let h = base + Math.min(num(S.lift1, 2), ht);
      while (h < top - 0.3) {
        lvs.push(+h.toFixed(2));
        h += num(S.lift, 2);
      }
      lvs.push(+top.toFixed(2));
    }
    const levels = S.baselift || load ? [base + 0.15, ...lvs] : lvs,
      rails = load || b.rails !== false;
    xs.forEach((x, i) =>
      ds.forEach((d, j) => {
        const at = `${nm} standard, row ${j + 1} no. ${i + 1}`;
        if (S.sole !== false)
          box([x, base + 0.02, d], [0.225, 0.038, 0.3], SOLE, SOLER, at, "sole");
        box(
          [x, base + 0.045, d],
          [0.15, 0.008, 0.15],
          "Base plate",
          "Under every standard",
          at,
          "plate",
        );
        run([x, base + 0.05, d], 1, top + (rails ? 1.2 : 0.3) - base - 0.05, `${nm} standard`, at);
      }),
    );
    levels.forEach((h) => {
      const lab = `${nm} lift at ${f1(h)}m`;
      ds.forEach((d) => {
        run([-0.15, h, d], 0, L + 0.3, `${nm} ledger`, lab);
        xs.forEach((x) => fit([x, h, d], RA, "Ledger to standard", lab, "ra"));
      });
      xs.forEach((x) => {
        const xx = x + (x >= L - 1e-6 ? -0.07 : 0.07);
        run([xx, h + 0.06, -0.15], 2, Wd + 0.3, `${nm} transom`, lab);
        ds.forEach((d) => fit([xx, h + 0.06, d], RA, "Transom to ledger", lab, "ra"));
      });
      if (load && h > base + 0.2) {
        xs.forEach((x) =>
          ds.forEach((d) =>
            fit(
              [x, h - 0.1, d],
              "Check coupler (under the ledger coupler)",
              "Extra coupler for strength — stops the ledger slipping under load",
              lab,
              "ra",
            ),
          ),
        );
        if (b.tie !== false)
          xs.forEach((x) => {
            fit(
              [x, h + 0.02, -0.12],
              "Ring bolt / tie anchor",
              "Ties the loading bay into the building",
              lab,
              "bolt",
            );
            K.tube(
              [x, h + 0.02, -0.12],
              [x, h + 0.02, ds[1] || Wd],
              pick(TUBES, (ds[1] || Wd) + 0.3),
              "Tie tube (loading bay)",
              lab,
            );
          });
      }
    });
    if (load)
      [base + 0.15, top].forEach((h, k) => {
        const lab = k ? "Plan bracing under the platform" : "Plan bracing at the base";
        for (let i = 0; i < xs.length - 1; i++)
          for (let j = 0; j < ds.length - 1; j++) {
            const f = (i + j) % 2,
              A = [xs[i], h + 0.1, f ? ds[j] : ds[j + 1]],
              B = [xs[i + 1], h + 0.1, f ? ds[j + 1] : ds[j]],
              Lb = Math.hypot(B[0] - A[0], B[2] - A[2]);
            K.tube(A, B, pick(TUBES, Lb + 0.3), "Plan brace", lab);
            fit(A, SW, "Plan brace to ledger", lab, "sw");
            fit(B, SW, "Plan brace to ledger", lab, "sw");
          }
      });
    const lab = `${nm} platform at ${f1(top)}m`,
      yb = top + 0.105,
      kk = Math.max(0, Math.ceil(bx / (load ? 0.6 : 1.2) - 1e-9) - 1);
    for (let i = 0; i < nx; i++)
      for (let j = 1; j <= kk; j++) {
        const x = xs[i] + (j * bx) / (kk + 1);
        run(
          [x, top + 0.06, -0.1],
          2,
          Wd + 0.2,
          load ? "Board bearer (at 0.6m for heavy loads)" : "Board bearer (boards span 1.2m max)",
          lab,
        );
        ds.forEach((d) => fit([x, top + 0.06, d], PUT, "Bearer to ledger", lab, "put"));
      }
    const rows = Math.max(1, Math.floor((Wd + 0.05) / 0.225));
    for (let r = 0; r < rows; r++) {
      const d = Wd / 2 - (rows * 0.225) / 2 + 0.1125 + r * 0.225;
      boardRun(-0.1, L + 0.2, yb, d, `${nm} platform boards`, lab);
      if (load) boardRun(-0.1, L + 0.2, yb + 0.04, d, "Loading bay boards (second layer)", lab);
    }
    if (rails) {
      const edges = [
          { ax: 0, v: 0, len: L, o: -1 },
          { ax: 0, v: Wd, len: L, o: 1 },
          { ax: 2, v: 0, len: Wd, o: -1 },
          { ax: 2, v: L, len: Wd, o: 1 },
        ],
        ey = yb + (load ? 0.04 : 0);
      edges.forEach((e, k) => {
        if (load && k < 2 && k === 0) return;
        const gateSide = load && k === 1;
        if (!gateSide)
          [
            [0.55, "Middle guardrail"],
            [1.1, "Main guardrail"],
          ].forEach(([o, nr]) => {
            const a =
              e.ax === 0 ? [-0.15, top + o, e.v + e.o * 0.06] : [e.v + e.o * 0.06, top + o, -0.15];
            run(a, e.ax, e.len + 0.3, nr, lab);
            (e.ax === 0 ? xs : ds).forEach((t) =>
              fit(
                e.ax === 0 ? [t, top + o, e.v + e.o * 0.03] : [e.v + e.o * 0.03, top + o, t],
                RA,
                "Guardrail to standard",
                lab,
                "ra",
              ),
            );
          });
        if (!gateSide) toe(-0.1, e.len + 0.1, ey, e.v - e.o * 0.04, e.ax, "Toe board", lab);
      });
      if (load)
        box(
          [L / 2, top + 0.7, Wd + 0.12],
          [L - 0.1, 1.2, 0.06],
          "Loading bay gate (up-and-over)",
          "Lifts up so materials can be landed, then closes",
          lab,
          "gate",
        );
    }
    const bL = [base + 0.15, ...lvs];
    [
      [0, "x"],
      [Wd, "x"],
      [0, "d"],
      [L, "d"],
    ].forEach(([v, dir], fi) => {
      const pts = dir === "x" ? xs : ds;
      for (let s = 0; s < pts.length - 1; s += load ? 1 : 2)
        for (let j = 1; j < bL.length; j++) {
          const lo = bL[j - 1],
            hi = bL[j],
            f = (j + s / 2) % 2,
            ia = f ? s : s + 1,
            ib = f ? s + 1 : s,
            off = v === 0 ? -0.11 : 0.11,
            A = dir === "x" ? [pts[ia], lo, v + off] : [v + off, lo, pts[ia]],
            B = dir === "x" ? [pts[ib], hi, v + off] : [v + off, hi, pts[ib]];
          K.tube(
            A,
            B,
            pick(TUBES, Math.hypot(pts[ib] - pts[ia], hi - lo) + 0.3),
            `${nm} brace`,
            `Face ${fi + 1}, lift ${j}`,
          );
          fit(A, SW, "Brace to standard", "", "sw");
          fit(B, SW, "Brace to standard", "", "sw");
        }
    });
    let nl = 0;
    if (!load && b.ladder !== false) {
      let prev = base;
      const x = bx / 2,
        dA = Math.min(bd * 0.8, Wd - 0.2),
        dB = Math.max(0.15, bd * 0.2);
      lvs.forEach((h, j) => {
        const len = ladPick(h - prev + 1.05);
        lad(
          [x, prev + (j ? 0.12 : 0.05), dA],
          [x, h + 1.05, dB],
          `${len}m ladder`,
          "Access ladder, 1m above landing",
          `${nm}, lift ${j + 1}`,
        );
        fit(
          [x - 0.22, h + 0.3, dB + 0.05],
          "Ladder clamp",
          "Ties ladder to the scaffold",
          "",
          "clip",
        );
        fit(
          [x + 0.22, h + 0.3, dB + 0.05],
          "Ladder clamp",
          "Ties ladder to the scaffold",
          "",
          "clip",
        );
        prev = h;
        nl++;
      });
      box(
        [x + 0.45, top + 0.6, dB + 0.3],
        [0.04, 0.9, 0.6],
        "Ladder gate",
        "Self-closing gate at the top of the ladder",
        lab,
        "gate",
      );
    }
    return {
      P,
      kind: load ? "load" : "bird",
      L,
      H: top,
      n: nx,
      bay: bx,
      lv: lvs,
      all: levels,
      boarded: [top],
      ties: 0,
      nl,
      din: 0,
      dout: Wd,
      caption: `${L.toFixed(2)}m × ${Wd.toFixed(2)}m · platform at ${f1(top)}m${load ? " · strengthened: bays " + bx.toFixed(2) + "m, check couplers, plan bracing, ties every lift" : ""}`,
    };
  }

  // ---------- MODEL: chimney scaffold standing on the roof round a stack ----------
  function buildChim(b) {
    const K = kit(),
      { P, fit, box, run, boardRun, toe, lad } = K,
      ch = chimById(b.chim);
    if (!ch)
      return {
        P,
        kind: "chim",
        err: "A chimney scaffold has lost its chimney: delete it and add it again.",
      };
    const wg = wingById(ch.wing),
      alongX = !wg || wg.ridge !== "z" || wg.roof === "hip";
    b.x = num0(ch.x);
    b.z = num0(ch.z);
    b.ry = alongX ? 0 : 90;
    const cw = alongX ? num(ch.w, 0.9) : num(ch.d, 0.6),
      cd = alongX ? num(ch.d, 0.6) : num(ch.w, 0.9),
      g = 0.3,
      nb = Math.max(2, Math.min(5, +b.boards || 3)),
      pw = nb * 0.225 + 0.04,
      Pt = num(ch.top, 8) - num(b.below, 1),
      lab = "Chimney scaffold";
    const xi0 = -cw / 2 - g,
      xi1 = cw / 2 + g,
      di0 = -cd / 2 - g,
      di1 = cd / 2 + g,
      xo0 = xi0 - pw,
      xo1 = xi1 + pw,
      do0 = di0 - pw,
      do1 = di1 + pw;
    const mids = (a, c) => {
      const k = Math.max(1, Math.ceil((c - a) / 2 - 1e-9));
      return [...Array(k - 1).keys()].map((q) => a + ((q + 1) * (c - a)) / k);
    };
    const XL = [xo0, xi0, ...mids(xi0, xi1), xi1, xo1],
      DL = [do0, di0, ...mids(di0, di1), di1, do1];
    const inner = (x, d) => x > xi0 + 1e-6 && x < xi1 - 1e-6 && d > di0 + 1e-6 && d < di1 - 1e-6,
      eav = wg ? num(wg.eaves, 3) : 0,
      ST = {};
    XL.forEach((x, i) =>
      DL.forEach((d, j) => {
        if (inner(x, d)) return;
        const q = toW(b, [x, 0, d]),
          y = roofYw(q[0], q[2]);
        ST[i + "," + j] = { x, d, i, j, base: (y == null ? eav : y) + 0.06 };
      }),
    );
    const SS = Object.values(ST),
      minB = Math.min(...SS.map((s) => s.base));
    SS.forEach((s, q) => {
      const at = `Chimney scaffold standard ${q + 1}`;
      box(
        [s.x, s.base - 0.03, s.d],
        [0.225, 0.038, 0.9],
        "Roof spreader board (laid across the tiles)",
        "Spreads the load over the roof",
        at,
        "sole",
      );
      box(
        [s.x, s.base - 0.005, s.d],
        [0.15, 0.008, 0.15],
        "Base plate",
        "Under every standard",
        at,
        "plate",
      );
      run([s.x, s.base, s.d], 1, Pt + 1.2 - s.base, "Chimney scaffold standard", at);
    });
    const lh = num(S.lift, 2),
      levels = [Pt];
    for (let h = Pt - lh; h > minB + 0.45; h -= lh) levels.push(+h.toFixed(2));
    if (levels[levels.length - 1] - minB > 1.2) levels.push(+(minB + 0.5).toFixed(2));
    const spans = (n, ok) => {
      const out = [];
      let s = -1;
      for (let j = 0; j < n; j++) {
        if (ok(j)) {
          if (s < 0) s = j;
        } else {
          if (s >= 0 && j - 1 > s) out.push([s, j - 1]);
          s = -1;
        }
      }
      if (s >= 0 && n - 1 > s) out.push([s, n - 1]);
      return out;
    };
    levels.forEach((h) => {
      const ll = h === Pt ? "Chimney platform" : `Chimney scaffold lacing at ${f1(h)}m`;
      XL.forEach((x, i) =>
        spans(DL.length, (j) => {
          const s = ST[i + "," + j];
          return s && s.base < h - 0.15;
        }).forEach(([s0, s1]) => {
          run([x, h + 0.06, DL[s0] - 0.1], 2, DL[s1] - DL[s0] + 0.2, "Chimney scaffold ledger", ll);
          for (let j = s0; j <= s1; j++)
            fit([x, h + 0.06, DL[j]], RA, "Ledger to standard", ll, "ra");
        }),
      );
      DL.forEach((d, j) =>
        spans(XL.length, (i) => {
          const s = ST[i + "," + j];
          return s && s.base < h - 0.15;
        }).forEach(([s0, s1]) => {
          run([XL[s0] - 0.1, h, d], 0, XL[s1] - XL[s0] + 0.2, "Chimney scaffold ledger", ll);
          for (let i = s0; i <= s1; i++) fit([XL[i], h, d], RA, "Ledger to standard", ll, "ra");
        }),
      );
    });
    const by = Pt + 0.165,
      pl = "Chimney platform";
    const band = (x0, x1, d0, d1, ax) => {
      const across = ax === 0 ? d1 - d0 : x1 - x0,
        rows = Math.max(1, Math.floor((across + 0.02) / 0.225));
      for (let r = 0; r < rows; r++) {
        const c = (ax === 0 ? d0 : x0) + across / 2 - (rows * 0.225) / 2 + 0.1125 + r * 0.225;
        if (ax === 0) boardRun(x0 - 0.05, x1 - x0 + 0.1, by, c, "Chimney platform boards", pl);
        else boardRun(d0 - 0.05, d1 - d0 + 0.1, by, c, "Chimney platform boards", pl, 0, 2);
      }
    };
    band(xo0, xo1, di1, do1, 0);
    band(xo0, xo1, do0, di0, 0);
    band(xo0, xi0, di0, di1, 2);
    band(xi1, xo1, di0, di1, 2);
    for (let i = 0; i < XL.length - 1; i++)
      if (XL[i + 1] - XL[i] > 1.2) {
        const xm = (XL[i] + XL[i + 1]) / 2;
        [
          [di1, do1],
          [do0, di0],
        ].forEach(([a, c]) => {
          run([xm, Pt + 0.06, a - 0.05], 2, c - a + 0.1, "Board bearer (boards span 1.2m max)", pl);
          fit([xm, Pt + 0.06, a], PUT, "Bearer to ledger", pl, "put");
          fit([xm, Pt + 0.06, c], PUT, "Bearer to ledger", pl, "put");
        });
      }
    for (let j = 0; j < DL.length - 1; j++)
      if (DL[j + 1] - DL[j] > 1.2 && DL[j] >= di0 - 1e-6 && DL[j + 1] <= di1 + 1e-6) {
        const dm = (DL[j] + DL[j + 1]) / 2;
        [
          [xo0, xi0],
          [xi1, xo1],
        ].forEach(([a, c]) => {
          run([a - 0.05, Pt, dm], 0, c - a + 0.1, "Board bearer (boards span 1.2m max)", pl);
          fit([a, Pt, dm], PUT, "Bearer to ledger", pl, "put");
          fit([c, Pt, dm], PUT, "Bearer to ledger", pl, "put");
        });
      }
    const onEdge = (s) =>
      Math.abs(s.d - do1) < 1e-6 ||
      Math.abs(s.d - do0) < 1e-6 ||
      Math.abs(s.x - xo0) < 1e-6 ||
      Math.abs(s.x - xo1) < 1e-6;
    [
      [0.55, "Middle guardrail"],
      [1.1, "Main guardrail"],
    ].forEach(([o, nm]) => {
      run([xo0 - 0.15, Pt + o, do1 + 0.06], 0, xo1 - xo0 + 0.3, nm, pl);
      run([xo0 - 0.15, Pt + o, do0 - 0.06], 0, xo1 - xo0 + 0.3, nm, pl);
      run([xo0 - 0.06, Pt + o, do0 - 0.15], 2, do1 - do0 + 0.3, nm, pl);
      run([xo1 + 0.06, Pt + o, do0 - 0.15], 2, do1 - do0 + 0.3, nm, pl);
      SS.forEach((s) => {
        if (onEdge(s)) fit([s.x, Pt + o, s.d], RA, "Guardrail to standard", pl, "ra");
      });
    });
    toe(xo0 - 0.1, xo1 + 0.1, by, do1 - 0.04, 0, "Toe board", pl);
    toe(xo0 - 0.1, xo1 + 0.1, by, do0 + 0.04, 0, "Toe board", pl);
    toe(do0 + 0.05, do1 - 0.05, by, xo0 + 0.04, 2, "Toe board", pl);
    toe(do0 + 0.05, do1 - 0.05, by, xo1 - 0.04, 2, "Toe board", pl);
    const face = (arr, off) => {
      if (arr.length < 2) return;
      const a = arr[0],
        c = arr[arr.length - 1],
        A = [a.x + off[0], Math.max(a.base, c.base) + 0.35, a.d + off[1]],
        B = [c.x + off[0], Pt, c.d + off[1]];
      K.tube(
        A,
        B,
        pick(TUBES, Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]) + 0.3),
        "Chimney scaffold brace",
        lab,
      );
      fit(A, SW, "Brace to standard", lab, "sw");
      fit(B, SW, "Brace to standard", lab, "sw");
    };
    face(
      SS.filter((s) => Math.abs(s.d - do1) < 1e-6).sort((p, q) => p.x - q.x),
      [0, 0.11],
    );
    face(
      SS.filter((s) => Math.abs(s.d - do0) < 1e-6).sort((p, q) => q.x - p.x),
      [0, -0.11],
    );
    face(
      SS.filter((s) => Math.abs(s.x - xo0) < 1e-6).sort((p, q) => p.d - q.d),
      [-0.11, 0],
    );
    face(
      SS.filter((s) => Math.abs(s.x - xo1) < 1e-6).sort((p, q) => q.d - p.d),
      [0.11, 0],
    );
    let nl = 0;
    if (wg && b.access !== "none") {
      const dP = alongX
          ? num0(wg.z) + num(wg.d, 1) - num0(ch.z)
          : num0(wg.x) + num(wg.w, 1) - num0(ch.x),
        dN = alongX ? num0(wg.z) - num0(ch.z) : num0(wg.x) - num0(ch.x),
        k = Math.abs(dP) <= Math.abs(dN) ? 1 : -1,
        dE = k > 0 ? dP : dN,
        dR = (k > 0 ? do1 : do0) + k * 0.15;
      const ry = (d) => {
          const q = toW(b, [0, 0, d]),
            y = roofYw(q[0], q[2]);
          return (y == null ? eav : y) + 0.08;
        },
        yA = ry(dE - k * 0.05),
        yB = ry(dR),
        len = Math.hypot(dR - dE, yB - yA),
        rl = RLADS.find((m) => m >= len - 0.05) || 8;
      lad(
        [0, yA, dE],
        [0, yB, dR],
        `Roof ladder with ridge hook (${rl}m)`,
        "Access over the roof from the main scaffold",
        "Chimney scaffold access",
      );
      const l2 = ladPick(Pt + 1.05 - yB);
      lad(
        [0, yB, dR + k * 0.45],
        [0, Pt + 1.05, dR - k * 0.15],
        `${l2}m ladder`,
        "Climbs from the roof up to the chimney platform",
        "Chimney scaffold access",
      );
      box(
        [0.45, Pt + 0.6, dR - k * 0.35],
        [0.04, 0.9, 0.6],
        "Ladder gate",
        "Self-closing gate at the platform",
        pl,
        "gate",
      );
      nl = 1;
    }
    return {
      P,
      kind: "chim",
      L: xo1 - xo0,
      H: Pt,
      n: XL.length - 1,
      bay: 0,
      lv: levels.slice().sort((p, q) => p - q),
      all: levels.slice().sort((p, q) => p - q),
      boarded: [Pt],
      ties: 0,
      nl,
      caption: `Platform at ${f1(Pt)}m round the chimney`,
    };
  }

  // ---------- MODEL: temporary roof (frame = the front run's frame) ----------
  function troofGeo(tb) {
    const wg = wingById(tb.wing);
    if (!wg) return { err: "A temporary roof has lost its building: delete it and add it again." };
    const alongX = wg.ridge !== "z",
      sF = alongX ? "front" : "right",
      sB = alongX ? "back" : "left";
    const rF = S.blocks.find((r) => r.type === "run" && r.wing === wg.id && r.side === sF),
      rB = S.blocks.find((r) => r.type === "run" && r.wing === wg.id && r.side === sB);
    if (!rF || !rB)
      return {
        err: `The temporary roof on ${wg.name} needs scaffold along its ${sF} and ${sB} first.`,
      };
    const { din, dout } = geomW(),
      L = num(rF.len, 1),
      B = alongX ? num(wg.d, 1) : num(wg.w, 1),
      p = Math.min(30, Math.max(3, num(tb.pitch, 15))) * DEG,
      tp = Math.tan(p),
      mono = tb.style === "mono",
      keder = tb.sheet === "keder";
    const dF = dout,
      dB = -B - dout,
      span = B + 2 * dout,
      ym = -B / 2,
      BT = beamType(S.beam, keder),
      dep = BT.dep,
      topLift = Math.max(num(rF.ht, 3), num(rB.ht, 3));
    let Y = topLift + num(tb.clear, 2);
    const chT = Math.max(
        0,
        ...(S.chims || []).filter((c) => c.wing === wg.id).map((c) => num(c.top, 0)),
      ),
      need = Math.max(ridgeOf(wg) + 0.6, chT ? chT + 0.8 : 0),
      atR = mono ? (ym - dB) * tp : (span / 2) * tp;
    if (Y + atR < need) Y = need - atR;
    const yb = (d) =>
      mono
        ? Y + 0.12 + (d - dB) * tp
        : d >= ym
          ? Y + 0.12 + (dF - d) * tp
          : Y + 0.12 + (d - dB) * tp;
    return { wg, rF, rB, L, B, p, tp, mono, keder, dF, dB, ym, yb, BT, dep, Y, din, dout, topLift };
  }
  function computeSup() {
    SUP = {};
    S.blocks
      .filter((b) => b.type === "troof")
      .forEach((tb) => {
        const G = troofGeo(tb);
        if (G.err) return;
        SUP[G.rF.id] = { yin: G.yb(G.din) - 0.05, yout: G.yb(G.dout) - 0.05 };
        SUP[G.rB.id] = { yin: G.yb(-G.B - G.din) - 0.05, yout: G.yb(-G.B - G.dout) - 0.05 };
      });
  }
  function buildTroof(b) {
    const K = kit(),
      { P, fit, box, run } = K,
      G = troofGeo(b);
    if (G.err) return { P, kind: "troof", err: G.err };
    b.x = G.rF.x;
    b.z = G.rF.z;
    b.ry = G.rF.ry;
    const { L, B, yb, dF, dB, ym, dep, BT, mono, keder, p, din, dout, topLift } = G,
      lab = "Temporary roof",
      sp = num(S.bay, 2);
    const nF = Math.max(1, Math.ceil((L + 2 * dout) / sp - 1e-9)),
      xs = [...Array(nF + 1).keys()].map((i) => -dout + (i * (L + 2 * dout)) / nF);
    const slopes = mono
        ? [[dF + 0.3, dB - 0.3]]
        : [
            [dF + 0.3, ym],
            [dB - 0.3, ym],
          ],
      xs0 = xs[0],
      xs1 = xs[nF],
      rl = xs1 - xs0 + 0.6;
    xs.forEach((x, i) => {
      const fr = `${lab}, frame ${i + 1}`;
      slopes.forEach(([a1, a2]) =>
        K.beamRun(BT, [x, yb(a1) + dep, a1], [x, yb(a2) + dep, a2], "Roof rafter beam", fr),
      );
      [din, dout, -B - din, -B - dout].forEach((d) =>
        fit([x, yb(d), d], "Beam coupler", "Fixes the roof beam to the support ledger", fr, "ra"),
      );
      if (!mono) {
        fit([x, yb(ym) + dep, ym], SW, "Ridge joint", fr, "sw");
        fit([x, yb(ym), ym], SW, "Ridge joint", fr, "sw");
      }
    });
    let sheets = 0,
      area = 0;
    slopes.forEach(([a1, a2]) => {
      const pl = Math.abs(a2 - a1),
        dir = Math.sign(a2 - a1),
        rise = yb(a2) - yb(a1),
        th = rise * dir > 0 ? -p : p,
        sl = pl / Math.cos(p);
      if (!keder) {
        const rows = Math.ceil(pl / 1.1) + 1;
        for (let r = 0; r < rows; r++) {
          const d = a1 + ((a2 - a1) * r) / (rows - 1),
            y = yb(d) + dep + 0.03;
          run([xs0 - 0.3, y, d], 0, rl, "Roof purlin", lab);
          xs.forEach((x) => fit([x, y, d], RA, "Purlin to beam", lab, "ra"));
        }
        const nr = Math.max(1, Math.ceil((sl - 0.15) / 2.25)),
          nc = Math.ceil(rl / 0.686);
        for (let r = 0; r < nr; r++) {
          const sc = Math.min(1.2 + r * 2.25, sl - 1.2),
            d = a1 + dir * sc * Math.cos(p),
            y = yb(d) + dep + 0.075;
          for (let c = 0; c < nc; c++) {
            box(
              [xs0 - 0.3 + 0.343 + c * 0.686, y, d],
              [0.762, 0.012, 2.4],
              "Corrugated tin roof sheet (8ft × 2ft 6in)",
              "Temporary roof sheeting",
              lab,
              "tin",
              th,
            );
            sheets++;
          }
        }
      } else
        for (let i = 0; i < nF; i++) {
          const d = a1 + dir * (sl / 2) * Math.cos(p),
            y = yb(d) + dep + 0.03;
          box(
            [(xs[i] + xs[i + 1]) / 2, y, d],
            [xs[i + 1] - xs[i] - 0.04, 0.01, sl],
            "Keder roof sheet (PVC, one bay)",
            "Slides into the keder beams",
            `${lab}, bay ${i + 1}`,
            "keder",
            th,
          );
        }
      [
        [0, 1],
        [nF, nF - 1],
      ].forEach(([i1, i2]) => {
        if (i2 < 0 || i2 > nF) return;
        const a = [xs[i1], yb(a1) + dep + 0.06, a1],
          c = [xs[i2], yb(a2) + dep + 0.06, a2];
        K.tube(
          a,
          c,
          pick(TUBES, Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]) + 0.2),
          "Roof plan brace",
          lab,
        );
        fit(a, SW, "Roof plan brace", lab, "sw");
        fit(c, SW, "Roof plan brace", lab, "sw");
      });
    });
    if (!mono && !keder)
      for (let c = 0; c < Math.ceil(rl / 1.6); c++)
        box(
          [xs0 - 0.3 + 0.9 + c * 1.6, yb(ym) + dep + 0.1, ym],
          [1.8, 0.02, 0.45],
          "Ridge capping (1.8m)",
          "Seals the ridge",
          lab,
          "tin",
        );
    if (sheets)
      P.push({
        k: "qty",
        name: "Roof sheet hook bolts / fixings",
        q: sheets * 6,
        role: "Fixing roof sheets to purlins",
      });
    if (keder)
      P.push({
        k: "qty",
        name: "Keder sheet tensioning straps",
        q: nF * slopes.length * 2,
        role: "Tensioning the keder sheets",
      });
    const y0 = topLift + 1.1;
    if (b.gables !== false)
      [xs0 - 0.05, xs1 + 0.05].forEach((x) => {
        const pts = mono
          ? [
              [x, y0, dF + 0.3],
              [x, yb(dF + 0.3) + dep, dF + 0.3],
              [x, yb(dB - 0.3) + dep, dB - 0.3],
              [x, y0, dB - 0.3],
            ]
          : [
              [x, y0, dF + 0.3],
              [x, yb(dF + 0.3) + dep, dF + 0.3],
              [x, yb(ym) + dep, ym],
              [x, yb(dB - 0.3) + dep, dB - 0.3],
              [x, y0, dB - 0.3],
            ];
        P.push({
          k: "tri",
          pts,
          name: "Gable end sheeting",
          role: "Closes in the gable end",
          at: lab,
          mat: "sheet",
          nc: true,
        });
        let a = 0;
        for (let i = 0; i < pts.length; i++) {
          const q = pts[i],
            r = pts[(i + 1) % pts.length];
          a += q[2] * r[1] - r[2] * q[1];
        }
        area += Math.abs(a) / 2;
      });
    if (b.skirts)
      [
        [dF + 0.32, yb(dF + 0.3) + dep],
        [dB - 0.32, yb(dB - 0.3) + dep],
      ].forEach(([d, y]) => {
        box(
          [(xs0 + xs1) / 2, y - 1.0, d],
          [rl, 2.0, 0.005],
          "Side skirt sheeting",
          "Closes in the eaves",
          lab,
          "sheet",
          0,
          true,
        );
        area += rl * 2;
      });
    if (area)
      P.push({
        k: "qty",
        name: "Monaflex sheeting roll (2m × 50m)",
        q: Math.ceil(area / 100),
        role: "Gable ends and skirts on the temporary roof",
      });
    return {
      P,
      kind: "troof",
      L: rl,
      H: yb(ym) + dep,
      n: nF,
      bay: sp,
      lv: [],
      all: [],
      boarded: [],
      ties: 0,
      nl: 0,
      caption: `${mono ? "Mono" : "Duo"}-pitch roof · ${nF} bays · span ${(B + 2 * dout).toFixed(2)}m`,
    };
  }

  // ---------- MODEL: site items ----------
  function buildProp(b) {
    const K = kit(),
      { P, fit, box } = K,
      k = b.kind;
    if (k === "person")
      P.push({
        k: "person",
        c: [0, 0, 0],
        pose: b.pose || "stand",
        wear: b.wear || "vest",
        name: "Person (1.8m tall)",
        role: "Shows the size of the scaffold",
        nc: true,
      });
    else if (k === "cone")
      P.push({
        k: "cone",
        c: [0, 0, 0],
        h: num(b.ch, 0.75),
        name: `Traffic cone (${Math.round(num(b.ch, 0.75) * 1000)}mm)`,
        role: "Marks off the work area",
      });
    else if (k === "sleeper")
      box(
        [0, 0.0625, 0],
        [2.4, 0.125, 0.25],
        "Timber sleeper (2.4m, kerb protection)",
        "Protects the scaffold base from vehicles",
        "",
        "sleeper",
      );
    else if (k === "road") {
      const L = num(b.len, 20),
        W = num(b.wid, 6.5);
      box([0, 0.012, 0], [L, 0.024, W], "Road", "Site layout", "", "road", 0, true);
      for (let x = -L / 2 + 0.5; x < L / 2 - 0.5; x += 3)
        box([x + 0.5, 0.026, 0], [1, 0.004, 0.1], "Road line", "Site layout", "", "line", 0, true);
      [-1, 1].forEach((sg) =>
        box(
          [0, 0.026, sg * (W / 2 - 0.25)],
          [L, 0.004, 0.1],
          "Road edge line",
          "Site layout",
          "",
          "line",
          0,
          true,
        ),
      );
    } else if (k === "path") {
      const L = num(b.len, 20),
        W = num(b.wid, 2);
      box([0, 0.03, 0], [L, 0.06, W], "Path / pavement", "Site layout", "", "slab", 0, true);
      box([0, 0.065, W / 2 + 0.075], [L, 0.13, 0.15], "Kerb", "Site layout", "", "kerb", 0, true);
    } else if (k === "crossing") {
      const W = num(b.wid, 6.5),
        D = num(b.dep, 2.4);
      for (let z = -W / 2 + 0.25; z < W / 2 - 0.2; z += 1)
        box(
          [0, 0.03, z + 0.25],
          [D, 0.006, 0.5],
          "Zebra crossing stripe",
          "Site layout",
          "",
          "line",
          0,
          true,
        );
      [-1, 1].forEach((sg) => {
        const z = sg * (W / 2 + 0.9);
        P.push({
          k: "beacon",
          c: [D / 2 + 0.3, 0, z],
          name: "Belisha beacon",
          role: "Site layout",
          nc: true,
        });
      });
    } else if (k === "fence") {
      const L = num(b.len, 10),
        ft = b.ftype || "heras",
        ours = b.ours !== false,
        NC = !ours,
        bx = (c, sz, nm, mat, nc) =>
          box(
            c,
            sz,
            nm,
            ft === "heras"
              ? "Temporary fencing round the site"
              : ft === "ch8"
                ? "Pedestrian barrier"
                : ft === "hoard"
                  ? "Site hoarding"
                  : "Fence on site",
            ft,
            mat,
            0,
            nc,
          );
      if (ft === "heras") {
        const n = Math.max(1, Math.ceil(L / 3.5)),
          pw = L / n;
        for (let i = 0; i < n; i++) {
          const x0 = -L / 2 + i * pw,
            xc = x0 + pw / 2;
          bx([xc, 1.0, 0], [pw - 0.07, 1.86, 0.012], "Heras fence panel (3.5m × 2m)", "mesh", NC);
          [0.12, 1.96].forEach((y) =>
            bx([xc, y, 0], [pw - 0.04, 0.04, 0.04], "Heras panel frame", "steel", true),
          );
          [x0 + 0.03, x0 + pw - 0.03].forEach((x) =>
            bx([x, 1.03, 0], [0.04, 1.9, 0.04], "Heras panel frame", "steel", true),
          );
        }
        for (let i = 0; i <= n; i++) {
          const x = -L / 2 + i * pw;
          bx([x, 0.07, 0], [0.65, 0.14, 0.2], "Heras fence foot (rubber block)", "rubber", NC);
          if (i > 0 && i < n) {
            bx([x, 0.45, 0], [0.08, 0.08, 0.08], "Heras fence clamp", "steel", NC);
            bx([x, 1.7, 0], [0.08, 0.08, 0.08], "Heras fence clamp", "steel", NC);
          }
        }
      } else if (ft === "ch8") {
        const n = Math.max(1, Math.ceil(L / 2)),
          pw = L / n;
        for (let i = 0; i < n; i++) {
          const x0 = -L / 2 + i * pw,
            xc = x0 + pw / 2;
          bx(
            [xc, 0.93, 0],
            [pw - 0.05, 0.15, 0.03],
            "Pedestrian barrier (2m, Chapter 8)",
            "ch8r",
            NC,
          );
          for (let k = 0; k < 8; k += 2)
            bx(
              [x0 + ((k + 0.5) * pw) / 8, 0.93, 0.017],
              [pw / 8, 0.15, 0.004],
              "Barrier stripe",
              "ch8w",
              true,
            );
          bx([xc, 0.25, 0], [pw - 0.05, 0.12, 0.03], "Barrier lower rail", "ch8w", true);
          [x0 + 0.08, x0 + pw - 0.08].forEach((x) => {
            bx([x, 0.5, 0], [0.04, 0.95, 0.04], "Barrier leg", "ch8r", true);
            bx([x, 0.03, 0], [0.12, 0.06, 0.5], "Barrier foot", "rubber", true);
          });
        }
      } else if (ft === "close") {
        const n = Math.max(1, Math.ceil(L / 1.8)),
          pw = L / n;
        for (let i = 0; i <= n; i++)
          bx([-L / 2 + i * pw, 0.95, -0.04], [0.1, 1.9, 0.1], "Fence post", "postT", NC);
        bx([0, 0.97, 0.02], [L, 1.65, 0.02], "Close-board fence panel", "closeb", NC);
        bx([0, 0.08, 0.02], [L, 0.15, 0.03], "Gravel board", "postT", true);
        [0.4, 1.5].forEach((y) => bx([0, y, -0.02], [L, 0.09, 0.04], "Fence rail", "postT", true));
      } else if (ft === "hoard") {
        const n = Math.max(1, Math.ceil(L / 1.22));
        for (let i = 0; i < n; i++) {
          const w2 = Math.min(1.22, L - i * 1.22);
          bx(
            [-L / 2 + i * 1.22 + w2 / 2, 1.27, 0],
            [w2 - 0.005, 2.44, 0.018],
            "Plywood hoarding sheet (8ft × 4ft)",
            "ply",
            NC,
          );
        }
        const np = Math.max(1, Math.ceil(L / 2.4));
        for (let i = 0; i <= np; i++)
          bx([-L / 2 + (i * L) / np, 1.25, -0.06], [0.08, 2.5, 0.08], "Hoarding post", "postT", NC);
        [0.3, 1.3, 2.3].forEach((y) =>
          bx([0, y, -0.05], [L, 0.07, 0.04], "Hoarding rail", "postT", true),
        );
      } else if (ft === "chain") {
        const n = Math.max(1, Math.ceil(L / 2.5)),
          pw = L / n;
        for (let i = 0; i <= n; i++)
          bx([-L / 2 + i * pw, 0.92, 0], [0.05, 1.84, 0.05], "Fence post", "pal", NC);
        bx([0, 0.92, 0.01], [L, 1.75, 0.008], "Chain-link mesh", "chain", NC);
        bx([0, 1.8, 0.01], [L, 0.02, 0.02], "Top wire", "pal", true);
      } else {
        const n = Math.max(1, Math.ceil(L / 2.75)),
          pw = L / n;
        for (let i = 0; i <= n; i++)
          bx([-L / 2 + i * pw, 1.0, -0.05], [0.1, 2.0, 0.1], "Palisade post", "pal", NC);
        [0.35, 1.6].forEach((y) =>
          bx([0, y, -0.01], [L, 0.06, 0.04], "Palisade rail", "pal", true),
        );
        for (let x = -L / 2 + 0.1; x < L / 2 - 0.05; x += 0.2)
          bx([x, 1.0, 0.02], [0.07, 1.98, 0.02], "Palisade pale", "pal", true);
      }
    } else if (k === "lamp") {
      P.push({
        k: "lamppost",
        c: [0, 0, 0],
        h: num(b.lh, 6),
        name: `Lamppost (${num(b.lh, 6)}m)`,
        role: "Site layout — keep the scaffold clear of it",
        nc: true,
      });
    } else if (k === "sign") {
      const y = num(b.y, 3),
        sw = num(b.sw, 2.4),
        sh = num(b.sh, 1.2);
      box(
        [0, y, 0],
        [sw, sh, 0.03],
        `Company sign board (${sw}m × ${sh}m)`,
        "Your company sign on the scaffold",
        "",
        "signb",
      );
      [-sw / 2 + 0.15, sw / 2 - 0.15].forEach((x) =>
        [-sh / 2 + 0.1, sh / 2 - 0.1].forEach((dy) =>
          fit(
            [x, y + dy, -0.04],
            "Sign board clamp",
            "Fixes the sign board to the scaffold",
            "",
            "clip",
          ),
        ),
      );
    }
    return { P, kind: "prop", L: 2.4, H: 1.8, lv: [], all: [], boarded: [], ties: 0, nl: 0 };
  }

  // ---------- build everything ----------
  function autoJoin() {
    const runs = (S.blocks || []).filter((b) => b.type === "run"),
      { din, dout } = geomW(),
      dm = (din + dout) / 2;
    runs.forEach((b) => {
      delete b._js;
      delete b._je;
      delete b._jeTie;
      delete b._setout;
      delete b._extS;
      delete b._extE;
      b._open = [];
    });
    // tall things in front of the wall (two-storey bays etc.) that can't be bridged: set the run out to clear them
    runs.forEach((b) => {
      if (b.autoBridge === false) return;
      const L = num(b.len, 1),
        H = num(b.ht, 3);
      let dmax = null;
      for (let t = 0.3; t <= L - 0.3; t += 0.1)
        for (let d = 0.02; d <= 4; d += 0.05) {
          const q = toW(b, [t, 0, d]),
            y = obstY(q[0], q[2], 0.05);
          if (
            (y != null && y > H - 0.4 && d <= din + 0.05) ||
            (y != null && y > H - 0.4 && dmax != null && d <= dmax + 0.06)
          ) {
            dmax = Math.max(dmax ?? 0, d);
          }
        }
      if (dmax != null && dmax > din - 0.25) b._setout = +(dmax - din + 0.2).toFixed(2);
    });
    const perp = (a, b) => {
      const d = Math.abs((((num0(a.ry) - num0(b.ry)) % 180) + 180) % 180);
      return Math.abs(d - 90) < 1;
    };
    const inBand = (B, P, m) => {
      const q = toL(B, P),
        Lb = num(B.len, 1);
      return q[2] > din - m && q[2] < dout + m && q[0] > -dout - m && q[0] < Lb + dout + m;
    };
    runs.forEach((A) => {
      const L = num(A.len, 1);
      runs.forEach((B) => {
        if (B === A || !perp(A, B)) return;
        const Lb = num(B.len, 1);
        [
          [0, "s"],
          [Lb, "e"],
        ].forEach(([bx, be]) => {
          const r = toL(A, toW(B, [bx, 0, dm])); // B's end, seen from A
          if (
            A._setout &&
            Math.abs(r[2]) < din + 0.3 &&
            (Math.abs(r[0] - -dout) < dout + 0.4 || Math.abs(r[0] - (L + dout)) < dout + 0.4)
          ) {
            if (be === "s") B._extS = A._setout;
            else B._extE = A._setout;
          }
          if (r[0] < -0.05 || r[0] > L + 0.05) return;
          if (r[2] < -1.2 || r[2] > din + 0.2) return; // B's end must butt into A's inside face
          const bandX = [toL(A, toW(B, [bx, 0, din]))[0], toL(A, toW(B, [bx, 0, dout]))[0]],
            xmin = Math.min(...bandX),
            xmax = Math.max(...bandX);
          const atEnd = xmax > L / 2,
            pastEnd = atEnd && L > xmax + 0.25,
            pastStart = !atEnd && xmin > 0.25;
          if (!pastEnd && !pastStart) return; // a normal corner: leave as drawn
          // A carries straight on past B: B ties into A's ledgers
          if (be === "e") {
            B._je = true;
            B._jeTie = true;
          } else B._js = true;
          if (xmax > L / 2) {
            if (pastEnd) A._je = false;
          } else if (pastStart) A._js = false;
        });
      });
    });
    // runs in a straight line, end to end: join them into one continuous scaffold
    runs.forEach((A) => {
      const L = num(A.len, 1);
      runs.forEach((B) => {
        if (B === A) return;
        const d = (((num0(A.ry) - num0(B.ry)) % 360) + 360) % 360;
        if (Math.min(d, 360 - d) > 1) return;
        const q = toL(A, toW(B, [0, 0, dm]));
        if (Math.abs(q[2] - dm) < 0.2 && Math.abs(q[0] - L) < 0.45) {
          A._je = true;
          A._jeTie = true;
          B._js = true;
        }
      });
    });
    // open inside faces (no wall and no other scaffold behind the inside line)
    runs.forEach((A) => {
      const so = num0(A._setout),
        eS = num0(A._extS),
        eE = num0(A._extE),
        L = num(A.len, 1) + eS + eE,
        stp = 0.1,
        ok = [];
      for (let x = -0.1; x <= L + 0.1; x += stp) {
        const P = toW(A, [x - eS, 0, so ? so + din - 0.15 : -0.15]),
          wall = roofYw(P[0], P[2]) != null,
          other = runs.some((B) => B !== A && inBand(B, P, din + 0.05));
        ok.push([x, !wall && !other]);
      }
      let st = null;
      ok.forEach(([x, o], i) => {
        if (o && st == null) st = x;
        if ((!o || i === ok.length - 1) && st != null) {
          const en = o ? x : x - stp;
          if (en - st > 0.25) A._open.push([Math.max(-0.15, st), Math.min(L + 0.15, en)]);
          st = null;
        }
      });
    });
  }
  function refit() {
    (S.blocks || []).forEach((b) => {
      if (b.type === "run" && b.fit !== false && b.wing && b.side) {
        const w = wingById(b.wing);
        if (w) Object.assign(b, SIDEF[b.side](w));
      }
    });
  }
  const ptsOf = (p) =>
    p.k === "fit"
      ? [p.p]
      : p.k === "box" ||
          p.k === "person" ||
          p.k === "cone" ||
          p.k === "beacon" ||
          p.k === "lamppost"
        ? [p.c]
        : p.k === "tri" || p.k === "poly"
          ? p.pts
          : p.k === "qty"
            ? []
            : [p.a, p.b];
  const f2s = (v) => (+v).toFixed(2);
  function obstY(X, Z, mg = 0) {
    let y = null;
    (S.wings || []).forEach((w) => {
      if (w.avoid === false) return;
      const x0 = num0(w.x),
        z0 = num0(w.z);
      if (
        X >= x0 - mg &&
        X <= x0 + num(w.w, 1) + mg &&
        Z >= z0 - mg &&
        Z <= z0 + num(w.d, 1) + mg
      ) {
        const h = roofH(
          w,
          Math.min(x0 + num(w.w, 1), Math.max(x0, X)),
          Math.min(z0 + num(w.d, 1), Math.max(z0, Z)),
          true,
        );
        if (y == null || h > y) y = h;
      }
    });
    return y;
  }
  function freeRuns(w) {
    const { dout } = geomW(),
      rs = traceRuns(w, ORD).filter((r) => {
        const t = runTrim(r);
        return !(t && t.blocked);
      });
    const has = (k) => rs.some((r) => r.side === k);
    rs.forEach((r) => {
      const i = ORD.indexOf(r.side);
      r.js = has(ORD[(i + 3) % 4]);
      r.je = has(ORD[(i + 1) % 4]);
    });
    return rs;
  }
  function runTrim(b0) {
    if (b0.autoBridge === false) return null;
    let b = b0;
    const so = num0(b0._setout),
      eS = num0(b0._extS),
      eE = num0(b0._extE);
    if (so || eS || eE) {
      const p = toW(b0, [-eS, 0, so]);
      b = {
        ...b0,
        x: +p[0].toFixed(3),
        z: +p[2].toFixed(3),
        len: +(num(b0.len, 1) + eS + eE).toFixed(2),
        _atShift: -eS,
      };
    }
    const L = num(b.len, 1),
      { din, dout } = geomW(),
      bl = (t) =>
        [din, (din + dout) / 2, dout].some((d) => {
          const q = toW(b, [t, 0, d]);
          return obstY(q[0], q[2], 0.08) != null;
        });
    let a = 0;
    while (a <= L && bl(a)) a += 0.05;
    let c = L;
    while (c >= a && bl(c)) c -= 0.05;
    const js = !!(b._js ?? b.js) && !bl(-dout * 0.5),
      je = !!(b._je ?? b.je) && !bl(L + dout * 0.5);
    if (a <= 0.001 && c >= L - 0.001 && js === !!(b._js ?? b.js) && je === !!(b._je ?? b.je))
      return b === b0 ? null : { ...b, _trim: [0, 0], _so: so };
    if (c - a < 0.6) return { blocked: true };
    const s0 = a > 0.001 ? a + 0.15 : 0,
      e0 = c < L - 0.001 ? c - 0.15 : L,
      p = toW(b, [s0, 0, 0]);
    return {
      ...b,
      x: +p[0].toFixed(3),
      z: +p[2].toFixed(3),
      len: +(e0 - s0).toFixed(2),
      _js: s0 > 0 ? false : js,
      _je: e0 < L ? false : je,
      _jeTie: e0 < L ? false : b._jeTie,
      _atShift: (b._atShift || 0) + s0,
      _trim: [s0, L - e0],
      _so: so,
    };
  }
  function buildBlock(b) {
    let m;
    const tr = b.type === "run" ? runTrim(b) : null;
    if (tr && tr.blocked)
      return {
        P: [],
        kind: "run",
        b,
        err: `${b.name || "A scaffold run"} is completely blocked by a building — move it, or untick "Adjust automatically" on the run.`,
        lv: [],
        all: [],
        boarded: [],
      };
    const bb = tr || b;
    try {
      m =
        b.type === "run"
          ? buildRun(bb)
          : b.type === "bird"
            ? buildBird(b, false)
            : b.type === "load"
              ? buildBird(b, true)
              : b.type === "chim"
                ? buildChim(b)
                : b.type === "troof"
                  ? buildTroof(b)
                  : buildProp(b);
    } catch (e) {
      console.error(e);
      m = {
        P: [],
        kind: b.type,
        err: `Couldn't draw ${b.name || TYPEN[b.type]}: check its sizes.`,
        lv: [],
        all: [],
        boarded: [],
      };
    }
    m.b = bb || b;
    if (tr) m.trim = tr._trim;
    const P = m.P,
      seen = {};
    P.forEach((p) => {
      const c = ptsOf(p)
        .flat()
        .map((v) => Math.round(v * 100))
        .join(",");
      const k = `${b.id}|${p.k}|${p.name}|${c}`;
      seen[k] = (seen[k] || 0) + 1;
      p.key = k + "#" + seen[k];
    });
    const rmv = new Set(S.removed || []);
    for (let q = P.length - 1; q >= 0; q--) if (rmv.has(P[q].key)) P.splice(q, 1);
    let x0 = 1e9,
      x1 = -1e9,
      d0 = 1e9,
      d1 = -1e9,
      y1 = 1.5;
    P.forEach((p) =>
      ptsOf(p).forEach((v) => {
        x0 = Math.min(x0, v[0]);
        x1 = Math.max(x1, v[0]);
        d0 = Math.min(d0, v[2]);
        d1 = Math.max(d1, v[2]);
        y1 = Math.max(y1, v[1]);
      }),
    );
    if (x0 > x1) {
      x0 = -0.5;
      x1 = 0.5;
      d0 = -0.5;
      d1 = 0.5;
    }
    Object.assign(m, { x0: x0 - 0.6, x1: x1 + 0.6, d0: d0 - 0.5, d1: d1 + 0.5, y1: y1 + 0.4 });
    return m;
  }

  // ---------- parts list from the model ----------
  const grp = (n) =>
    /tube \(/.test(n)
      ? "Tubes"
      : /beam|Beam|roof sheet|Ridge capping|Roof sheet|Keder|keder/.test(n)
        ? "Beams & roof"
        : /scaffold board/.test(n)
          ? "Boards"
          : /Base plate|Sole|spreader/.test(n)
            ? "Base"
            : /Ring bolt/.test(n)
              ? "Ties"
              : /stair|Stair/.test(n)
                ? "Stairs"
                : /ladder|Ladder|Brick|padding|lamp|sign|Sign|Scafftag|netting|sheeting|Sheeting|cone|sleeper|Loading bay gate/.test(
                      n,
                    )
                  ? "Access & safety"
                  : "Fittings";
  const GROUPS = [
    "Tubes",
    "Fittings",
    "Boards",
    "Base",
    "Ties",
    "Stairs",
    "Beams & roof",
    "Access & safety",
  ];
  function blockDesc(b, m) {
    m = m || MODELS.find((x) => x.b === b) || {};
    const nm = b.name || TYPEN[b.type];
    if (b.type === "run")
      return `${nm}: ${num(b.len, 0).toFixed(2)}m long, platform at ${f1(num(b.ht, 0))}m${m.tbl ? ", table lifts up the gable" : ""}`;
    if (b.type === "bird" || b.type === "load")
      return `${nm}: ${num(b.len, 0).toFixed(2)}m × ${num(b.wid, 0).toFixed(2)}m, platform at ${f1(num0(b.base) + num(b.ht, 0))}m`;
    if (b.type === "chim") return `${nm}: platform at ${f1(m.H || 0)}m round the chimney`;
    if (b.type === "troof")
      return `${nm}: ${b.style === "mono" ? "mono" : "duo"}-pitch, ${b.sheet === "keder" ? "keder sheets" : "tin sheets"}`;
    return PROPN[b.kind] || "Site item";
  }
  function totalsMap() {
    const T = {};
    MODELS.forEach((m) =>
      m.P.forEach((p) => {
        if (p.nc) return;
        const t = T[p.name] || (T[p.name] = { q: 0, why: new Set() });
        t.q += p.k === "qty" ? p.q : 1;
        t.why.add(p.role);
      }),
    );
    (S.extra || []).forEach((x) => {
      const t = T[x.name] || (T[x.name] = { q: 0, why: new Set() });
      t.q += +x.q || 0;
      t.why.add("Added by you");
    });
    return T;
  }
  const ftOf = (k) => {
    const m = k.match(/^(\d+)ft/);
    return m ? -m[1] : 0;
  };
  function list() {
    const T = totalsMap();
    let rows = "",
      txt =
        `SCAFFOLD PARTS LIST — ${S.job || "Job"}\n` +
        S.blocks
          .filter((b) => b.type !== "prop")
          .map((b) => blockDesc(b))
          .join("\n") +
        "\n";
    GROUPS.forEach((g) => {
      const ks = Object.keys(T)
        .filter((k) => grp(k) === g)
        .sort((a, b) => ftOf(a) - ftOf(b) || a.localeCompare(b));
      if (!ks.length) return;
      rows += `<tr class="grp"><td colspan="3">${g}</td></tr>`;
      txt += `\n${g.toUpperCase()}\n`;
      ks.forEach((k) => {
        rows += `<tr data-n="${esc(k)}"><td>${esc(k)}</td><td class="q">${T[k].q}</td><td class="why">${esc([...T[k].why].join("; "))}</td></tr>`;
        txt += `${T[k].q} x ${k}\n`;
      });
    });
    $("tb").innerHTML =
      rows ||
      '<tr><td colspan="3" class="sub">Nothing to list yet — add some scaffold on the plan.</td></tr>';
    $("copy").dataset.txt = txt;
    const W = [],
      has = (t) => S.blocks.some((b) => b.type === t),
      runs = MODELS.filter((m) => m.kind === "run");
    MODELS.forEach((m) => {
      if (m.err) W.push(esc(m.err));
      if (m.kind === "run" && m.liftWarn)
        W.push(
          `${esc(m.b.name)}: the top platform is at ${f2s(m.H)}m, so the lifts aren't all 2m (${m.lv.map(f2s).join("m, ")}m) – tap the run on the Plan to choose what to do.`,
        );
      if (m.kind === "run" && m.H > 20)
        W.push(
          `${esc(m.b.name)} is over 20m high — outside TG20 basic set-ups, needs a scaffold design.`,
        );
    });
    if (+S.bay > 2.1) W.push("Bays over 2.1m are beyond the usual general-purpose limit.");
    if (S.clad === "16" || S.blocks.some((b) => b.type === "run" && b.clad === "16"))
      W.push(
        "Sheeted scaffolds catch the wind: get a design and tie pattern from your scaffolder or a designer.",
      );
    if (runs.some((m) => m.nl && m.boarded.length < m.lv.length))
      W.push("Ladders need a boarded landing at every lift — set Boarded lifts to Every lift.");
    if (S.blocks.some((b) => b.type === "run" && b.pub))
      W.push(
        "Scaffolding on a public footpath or road needs a licence from the council's highways team before it goes up.",
      );
    if (S.blocks.some((b) => b.type === "run" && b.fan))
      W.push(
        "Pedestrian fans are outside the TG20 basic set-ups — ask your scaffolder for a design.",
      );
    if ((S.access || []).some((a) => a.type === "stair"))
      W.push("Stair units vary by make — check the rise and width against your supplier's units.");
    if (has("troof"))
      W.push(
        "Temporary roofs (NASC TG9) need a scaffold design, extra ties and checks for wind uplift.",
      );
    if (runs.some((m) => m.gap))
      W.push(
        "Bridged sections over gaps put extra load on the standards each side — get them checked by your scaffold designer.",
      );
    if (runs.some((m) => m.tbl))
      W.push(
        "Gable table lifts are tied into the gable wall at each lift; check the tie positions on site.",
      );
    if (has("chim"))
      W.push(
        "Chimney scaffolds stand on the roof: spread the load on boards across the tiles, check the roof can take it, and use roof ladders with ridge hooks.",
      );
    if (has("bird"))
      W.push(
        "Birdcages inside a house: check the floor can carry the load, especially on upper floors.",
      );
    if (has("load"))
      W.push(
        "Loading bays need a design for their load rating; mark the safe working load on the gate.",
      );
    if (S.blocks.some((b) => b.type === "run" && (b.js || b.je)))
      W.push(
        "Corners are joined with a corner bay, so ledgers, boards and guardrails carry round from one run to the next.",
      );
    $("warn").innerHTML =
      `<b>Use this for planning and pricing, not as the scaffold design.</b> The scaffold must be put up, inspected and signed off by CISRS-carded scaffolders. Ties must be tested. Add about 5–10% spares on fittings.` +
      (W.length ? `<ul>${W.map((w) => `<li>${w}</li>`).join("")}</ul>` : "");
  }

  // ---------- tooltip ----------
  const tip = $("tip");
  function showTip(p, cx, cy) {
    if (!p) {
      tip.style.display = "none";
      markRow(null);
      return;
    }
    const len = p.k === "tube" ? `Tube length ${p.name.match(/\(([^)]+)\)/)[1]}` : "";
    tip.innerHTML = `<b>${esc(p.name)}</b>${esc(p.role || "")}${p.at ? "<br>" + esc(p.at) : ""}${len ? "<br>" + esc(len) : ""}`;
    tip.style.display = "block";
    const r = $("stage").getBoundingClientRect(),
      tw = tip.offsetWidth,
      th = tip.offsetHeight;
    let x = cx - r.left + 14,
      y = cy - r.top + 14;
    if (x + tw > r.width - 6) x = cx - r.left - tw - 14;
    if (y + th > r.height - 6) y = cy - r.top - th - 14;
    tip.style.left = Math.max(6, x) + "px";
    tip.style.top = Math.max(6, y) + "px";
    markRow(p.name);
  }
  function markRow(n) {
    R.querySelectorAll("#tb tr.on").forEach((r) => r.classList.remove("on"));
    if (n)
      for (const r of R.querySelectorAll("#tb tr[data-n]"))
        if (r.dataset.n === n) r.classList.add("on");
  }

  // ---------- 2D drawing ----------
  function windowsFor(L, Hb) {
    const o = [],
      cols = Math.max(1, Math.floor(L / 2.6));
    for (let y = 0.9; y + 1.3 < Hb - 0.3; y += 2.8)
      for (let c = 0; c < cols; c++) o.push([((c + 0.5) * L) / cols, y, 1.0, 1.25]);
    return o;
  }
  const LAYERS = [
    ["tubes", "Tubes"],
    ["fittings", "Fittings"],
    ["boards", "Boards"],
    ["rails", "Guardrails"],
    ["bracing", "Bracing"],
    ["ties", "Ties"],
    ["access", "Stairs & ladders"],
    ["beams", "Beams & roof"],
    ["netting", "Netting"],
    ["safety", "Safety kit"],
    ["site", "Site items"],
  ];
  function layerOf(p) {
    const r = (p.role || "") + " " + p.name;
    if (
      p.k === "person" ||
      p.k === "cone" ||
      p.k === "beacon" ||
      p.k === "lamppost" ||
      [
        "road",
        "line",
        "slab",
        "kerb",
        "rubber",
        "ch8r",
        "ch8w",
        "postT",
        "closeb",
        "ply",
        "chain",
        "pal",
      ].includes(p.mat) ||
      p.at === "heras" ||
      p.at === "ch8" ||
      p.at === "close" ||
      p.at === "hoard" ||
      p.at === "chain" ||
      p.at === "pal" ||
      p.mat === "sleeper" ||
      p.mat === "signb" ||
      /Sign board/.test(p.name)
    )
      return "site";
    if (p.k === "beam" || p.k === "tri" || /[Rr]oof|Purlin|Ridge|Beam|beam|Keder|keder/.test(r))
      return "beams";
    if (p.k === "fit") return p.ft === "bolt" ? "ties" : p.ft === "lamp" ? "safety" : "fittings";
    if (p.k === "box")
      return p.mat === "board" || p.mat === "sole"
        ? "boards"
        : p.mat === "net" || p.mat === "sheet"
          ? "netting"
          : p.mat === "plate"
            ? "tubes"
            : "safety";
    if (p.k === "pad") return "safety";
    if (p.k === "lad" || p.k === "stair") return "access";
    if (/brace|Fan strut|Fan rake/i.test(r)) return "bracing";
    if (/^Tie|Tie-in/.test(p.role || "")) return "ties";
    if (/guardrail/i.test(r)) return "rails";
    return "tubes";
  }
  const shown = (p) => !(S.hide || []).includes(layerOf(p));
  function hullOf(P) {
    P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]),
      lo = [],
      up = [];
    for (const p of P) {
      while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
      lo.push(p);
    }
    for (const p of P.reverse()) {
      while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
      up.push(p);
    }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  const COL = {
    rubber: "#222",
    ch8r: "#d0262c",
    ch8w: "#ffffff",
    postT: "#8a6038",
    closeb: "#9a6b3e",
    ply: "#c9a873",
    chain: "#6f9a78",
    pal: "#2e5a3a",
    steel: "#9aa3aa",
    road: "#4a4e52",
    line: "#f4f4f0",
    slab: "#cdc9c0",
    kerb: "#a9a59c",
    tin: "#b9c1c8",
    keder: "#f1f4f6",
    pad: "#f2c200",
    lamp: "#ff3020",
    sign: "#ffd21f",
    signb: "#7F191D",
    sleeper: "#6e4a2a",
    tag: "#2e9e4f",
    lguard: "#2c3136",
    sheet: "#e8eef3",
    net: "#2f7d3a",
    tube: "#8c969e",
    hi: "#e6ebef",
    fit: "#2f363c",
    bolt: "#b3262c",
    board: "#c99050",
    boardE: "#7a4f22",
    sole: "#a37446",
    plate: "#3b4249",
    gate: "#e2b021",
    lad: "#c7ccd1",
  };
  // parts of other site items that stand in front of this block, moved into its frame
  function nearProps(M, mode, u0, u1) {
    const out = [];
    if (M.kind !== "run") {
      const c = toW(M.b, [(M.x0 + M.x1) / 2, 0, (M.d0 + M.d1) / 2]);
      if (roofYw(c[0], c[2]) != null) return out;
    }
    S.blocks.forEach((pb) => {
      if (pb.type !== "prop" || pb === M.b) return;
      const pm = MODELS.find((m) => m.b === pb);
      if (!pm) return;
      const c = toL(M.b, [num0(pb.x), 0, num0(pb.z)]),
        u = mode === "front" ? c[0] : c[2];
      if (u < u0 - 0.5 || u > u1 + 0.5) return;
      if (mode === "front" && (c[2] < -3 || c[2] > M.d1 + 10)) return;
      if (mode !== "front" && (c[0] < M.x0 - 3 || c[0] > M.x1 + 3)) return;
      const rel = (num0(pb.ry) - num0(M.b.ry)) * DEG,
        sw = Math.abs(Math.sin(rel)) > 0.7,
        mv = (v) => toL(M.b, toW(pb, v));
      pm.P.forEach((p) => {
        const q = { ...p };
        if (p.c) q.c = mv(p.c);
        if (p.p) q.p = mv(p.p);
        if (p.s && sw) q.s = [p.s[2], p.s[1], p.s[0]];
        out.push(q);
      });
    });
    // temporary roof over this building: show it on the run's elevation too
    if (M.kind === "run")
      S.blocks.forEach((tb) => {
        if (tb.type !== "troof" || tb.wing !== M.b.wing) return;
        const tm = MODELS.find((m) => m.b === tb);
        if (!tm || !tm.P) return;
        const mv = (v) => toL(M.b, toW(tb, v));
        tm.P.forEach((p) => {
          if (p.k === "qty") return;
          const q = { ...p, tr: 1 };
          if (p.a) q.a = mv(p.a);
          if (p.b) q.b = mv(p.b);
          if (p.p) q.p = mv(p.p);
          if (p.pts) q.pts = p.pts.map(mv);
          if (p.k === "box") {
            const ca = Math.cos(p.rx || 0),
              sa = Math.sin(p.rx || 0),
              cs = [];
            for (const a of [-1, 1])
              for (const o of [-1, 1])
                for (const z of [-1, 1]) {
                  const X0 = (a * p.s[0]) / 2,
                    Y0 = (o * p.s[1]) / 2,
                    Z0 = (z * p.s[2]) / 2;
                  cs.push(
                    mv([p.c[0] + X0, p.c[1] + Y0 * ca - Z0 * sa, p.c[2] + Y0 * sa + Z0 * ca]),
                  );
                }
            out.push({ k: "poly", pts: cs, mat: p.mat, name: p.name, role: p.role });
            return;
          }
          if (p.k === "beam") {
            const A = q.a,
              B = q.b;
            if (
              Math.abs(mode === "front" ? A[0] - B[0] : A[2] - B[2]) < 0.05 &&
              Math.abs(A[1] - B[1]) < 0.05
            ) {
              const c = [(A[0] + B[0]) / 2, A[1], (A[2] + B[2]) / 2];
              out.push({
                k: "poly",
                pts: [
                  [c[0] - 0.04, A[1], c[2] - 0.04],
                  [c[0] + 0.04, A[1] - p.dep, c[2] + 0.04],
                ],
                mat: "beamEnd",
                name: p.name,
              });
              return;
            }
          }
          out.push(q);
        });
      });
    return out;
  }
  function draw2D(svg, M, mode) {
    const W = svg.clientWidth,
      H = svg.clientHeight;
    if (!W || !H || !M) return;
    const pr = mode === "front" ? (p) => [p[0], p[1], p[2]] : (p) => [p[2], p[1], -p[0]];
    const keep =
      mode === "front" || M.kind !== "run"
        ? () => true
        : (p) =>
            Math.min(...ptsOf(p).map((v) => v[0])) <= 0.4 &&
            !(p.c && p.s && p.c[0] - p.s[0] / 2 > 0.4);
    const xmin = mode === "front" ? M.x0 : M.d0,
      xmax = mode === "front" ? M.x1 : M.d1;
    const extra = nearProps(M, mode, xmin, xmax);
    const gShift = (p) => {
      if (!M.ground || mode !== "front" || p.tr || !p.c) return p;
      const g = (() => {
        const t = Math.max(0, Math.min(1, p.c[0] / M.L));
        return M.ground[0][1] + (M.ground[1][1] - M.ground[0][1]) * t;
      })();
      return { ...p, c: [p.c[0], p.c[1] + g, p.c[2]] };
    };
    const items = M.P.map((p, i) => [p, i])
      .filter(([p]) => p.k !== "qty" && shown(p) && keep(p))
      .concat(extra.filter((p) => p.k === "poly" || shown(p)).map((p) => [gShift(p), null]));
    const ymax = Math.max(
      M.y1,
      ...extra.flatMap((p) => ptsOf(p)).map((v) => v[1] + 0.4),
      ...(S.wings || []).map((w) => ridgeOf(w) + 0.4),
      ...(S.chims || []).map((c) => num(c.top, 0) + 0.6),
    );
    const TECH = S.style === "tech",
      TS = S.ptxt || 1,
      DM = mode === "front" && (TECH || S.pdim !== false),
      FT = DM;
    $("ptv").textContent = Math.round(TS * 100) + "%";
    $("pdim").setAttribute("aria-pressed", S.pdim !== false);
    const pad = FT
      ? {
          l: 62 + 18 * TS,
          r: 46 + 16 * TS,
          t: TECH ? 30 + 14 * TS : 14,
          b: TECH ? 64 + 40 * TS : 52 + 32 * TS,
        }
      : mode === "front"
        ? { l: 44, r: 44, t: 14, b: 40 }
        : { l: 8, r: 8, t: TECH ? 30 + 14 * TS : 14, b: TECH ? 64 + 40 * TS : 40 };
    const YM = M.ground ? Math.min(0, ...M.ground.map((q) => q[1])) - 0.1 : 0,
      gAt = (x) => {
        if (!M.ground || mode !== "front") return 0;
        const t = Math.max(0, Math.min(1, x / M.L));
        return M.ground[0][1] + (M.ground[1][1] - M.ground[0][1]) * t;
      };
    const sc = Math.min(
      (W - pad.l - pad.r) / (xmax - xmin),
      (H - pad.t - pad.b) / (ymax - YM + 0.1),
    );
    const ox = pad.l + (W - pad.l - pad.r - (xmax - xmin) * sc) / 2,
      vy = Math.max(0, (H - pad.t - pad.b - (ymax - YM + 0.1) * sc) / 2),
      SX = (x) => ox + (x - xmin) * sc,
      SY = (y) => H - pad.b - vy - (y - YM) * sc;
    const tw = Math.max(TECH ? 1.3 : 2.2, 0.0483 * sc),
      bh = 0.075 * sc,
      bwid = 0.225 * sc;
    let g = `<defs><pattern id="brk${mode}" width="${bwid * 2}" height="${bh * 2}" patternUnits="userSpaceOnUse"><rect width="${bwid * 2}" height="${bh * 2}" fill="#a9573f"/><path d="M0 ${bh}H${bwid * 2}M0 ${bh * 2}H${bwid * 2}M${bwid} 0V${bh}M0 ${bh}V${bh * 2}M${bwid * 2} ${bh}V${bh * 2}" stroke="#d8c3b0" stroke-width="${Math.max(0.5, bh * 0.12)}"/></pattern>
  <pattern id="sla${mode}" width="${0.3 * sc}" height="${0.2 * sc}" patternUnits="userSpaceOnUse"><rect width="${0.3 * sc}" height="${0.2 * sc}" fill="#4d535b"/><path d="M0 ${0.2 * sc - 0.5}H${0.3 * sc}" stroke="#3a3f45" stroke-width="1"/></pattern>
  <pattern id="net${mode}" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="#2f7d3a" opacity=".25"/><path d="M0 0L5 5M5 0L0 5" stroke="#2f7d3a" stroke-width=".6"/></pattern><pattern id="msh${mode}" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0H6M0 0V6" stroke="#555" stroke-width=".7"/></pattern>
  <pattern id="tbr${mode}" width="${bwid * 2}" height="${bh * 2}" patternUnits="userSpaceOnUse"><rect width="${bwid * 2}" height="${bh * 2}" fill="#f6f2ec"/>${bh > 2.2 ? `<path d="M0 ${bh}H${bwid * 2}M0 ${bh * 2}H${bwid * 2}M${bwid} 0V${bh}M0 ${bh}V${bh * 2}" stroke="#ddd3c6" stroke-width=".6"/>` : ""}</pattern>
  <pattern id="tsl${mode}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#eceef0"/><line x1="0" y1="0" x2="0" y2="8" stroke="#c9ced3" stroke-width="1"/></pattern>
  <pattern id="tbd${mode}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#f5e6cc"/><line x1="0" y1="0" x2="0" y2="5" stroke="#c9a46c" stroke-width=".8"/></pattern>
  <pattern id="tgr${mode}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#fff"/><line x1="0" y1="0" x2="0" y2="10" stroke="#8d8273" stroke-width="1"/></pattern></defs>${TECH ? `<rect width="${W}" height="${H}" fill="#fff"/>` : ""}`;
    if (S.bldMode !== "hide") {
      const cIn = (() => {
          const c = toW(M.b, [(M.x0 + M.x1) / 2, 0, (M.d0 + M.d1) / 2]);
          return (
            M.kind !== "run" &&
            M.kind !== "troof" &&
            roofYw(c[0], c[2]) != null &&
            (M.H || 0) < (roofYw(c[0], c[2]) || 0)
          );
        })(),
        op = S.bldMode === "see" || cIn ? 0.3 : M.kind === "run" ? 0.9 : 0.6,
        N = Math.max(24, Math.min(220, Math.round((xmax - xmin) / 0.08))),
        loc = (u, t) => (mode === "front" ? [u, 0, t] : [t, 0, u]);
      const own = M.kind === "run" ? wingById(M.b.wing) : null,
        fr = {},
        sil = [],
        wall = [],
        t0 = mode === "front" ? 40 : -40,
        dt = mode === "front" ? -0.2 : 0.2;
      for (let k = 0; k <= N; k++) {
        const u = xmin + ((xmax - xmin) * k) / N;
        let mx = null,
          first = null,
          ownY = null,
          frontW = null;
        for (let i = 0, t = t0; i <= 400; i++, t += dt) {
          const q = toW(M.b, loc(u, t)),
            y = roofYw(q[0], q[2]);
          if (y != null) {
            if (first == null) first = y;
            if (mx == null || y > mx) mx = y;
          }
          if (own) {
            if (ownY == null && inWing(own, q[0], q[2])) ownY = roofH(own, q[0], q[2], true);
            if (ownY == null && frontW == null)
              (S.wings || []).forEach((w) => {
                if (w !== own && frontW == null && inWing(w, q[0], q[2]))
                  frontW = [w, roofH(w, q[0], q[2], true)];
              });
          }
        }
        sil.push([u, mx]);
        wall.push([u, own ? ownY : first]);
        if (own)
          (S.wings || []).forEach((w) => {
            if (w === own) return;
            (fr[w.id] || (fr[w.id] = { w, p: [] })).p.push([
              u,
              frontW && frontW[0] === w ? frontW[1] : null,
            ]);
          });
      }
      const polys = (arr) => {
        const out = [];
        let cur = [];
        arr.forEach(([u, y]) => {
          if (y == null) {
            if (cur.length > 1) out.push(cur);
            cur = [];
          } else cur.push([u, y]);
        });
        if (cur.length > 1) out.push(cur);
        return out.map(
          (c) =>
            `${SX(c[0][0])},${SY(YM)} ` +
            c.map(([u, y]) => `${SX(u)},${SY(y)}`).join(" ") +
            ` ${SX(c[c.length - 1][0])},${SY(YM)}`,
        );
      };
      const hasWall = true;
      polys(sil).forEach(
        (pt) =>
          (g += `<polygon points="${pt}" fill="${TECH ? `url(#tsl${mode})` : `url(#sla${mode})`}" opacity="${TECH ? Math.min(1, op + 0.1) : op}" stroke="${TECH ? "#6b737a" : "#3a3f45"}" stroke-width="1"/>`),
      );
      if (hasWall) {
        polys(wall).forEach(
          (pt) =>
            (g += `<polygon points="${pt}" fill="url(#${TECH ? "tbr" : "brk"}${mode})" opacity="${TECH ? Math.min(1, op + 0.1) : op}" ${TECH ? 'stroke="#6b737a" stroke-width="1"' : ""}/>`),
        );
        const wg = wingById(M.b.wing);
        const frontP = () =>
          Object.values(fr).forEach(({ w, p }) =>
            polys(p).forEach((pt) => {
              const gl = w.kind === "cons";
              g += `<polygon points="${pt}" fill="${gl ? "#d6e9f3" : TECH ? `url(#tbr${mode})` : `url(#brk${mode})`}" ${gl ? 'fill-opacity=".85" stroke="#f5f5f2" stroke-width="2"' : `stroke="#4d535b" stroke-width="1"`} opacity="${Math.min(1, op + 0.1)}"/>`;
              const top = p.filter((q) => q[1] != null);
              if (top.length > 1)
                g += `<polyline points="${top.map(([u, y]) => `${SX(u)},${SY(y)}`).join(" ")}" fill="none" stroke="${gl ? "#f5f5f2" : "#4d535b"}" stroke-width="${Math.max(3, 0.12 * sc)}"/>`;
            }),
          );
        if (mode === "front" && M.kind === "run" && wg && S.bldMode === "solid")
          windowsFor(M.L, num(wg.eaves, 3))
            .filter(
              ([x, y, ww, wh]) =>
                !Object.values(fr).some(({ p }) =>
                  p.some(([u, yy]) => yy != null && Math.abs(u - x) < ww / 2 + 0.2 && yy > y),
                ),
            )
            .forEach(([x, y, ww, wh]) => {
              g += TECH
                ? `<rect x="${SX(x - ww / 2)}" y="${SY(y + wh)}" width="${ww * sc}" height="${wh * sc}" fill="#fff" stroke="#6b737a" stroke-width="1"/><rect x="${SX(x - ww / 2) + 3}" y="${SY(y + wh) + 3}" width="${ww * sc - 6}" height="${wh * sc - 6}" fill="#eaf1f6" stroke="#9aa3aa" stroke-width=".6"/><line x1="${SX(x)}" x2="${SX(x)}" y1="${SY(y + wh)}" y2="${SY(y)}" stroke="#6b737a" stroke-width="1"/>`
                : `<rect x="${SX(x - ww / 2) - 2}" y="${SY(y + wh) - 2}" width="${ww * sc + 4}" height="${wh * sc + 4}" fill="#eef0f0"/><rect x="${SX(x - ww / 2)}" y="${SY(y + wh)}" width="${ww * sc}" height="${wh * sc}" fill="#3c4a57"/><line x1="${SX(x)}" x2="${SX(x)}" y1="${SY(y + wh)}" y2="${SY(y)}" stroke="#eef0f0" stroke-width="2"/>`;
            });
        frontP();
      }
      (S.chims || []).forEach((c) => {
        const cs = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ].map(([a, e]) =>
            toL(M.b, [num0(c.x) + (a * num(c.w, 0.9)) / 2, 0, num0(c.z) + (e * num(c.d, 0.6)) / 2]),
          ),
          us = cs.map((q) => (mode === "front" ? q[0] : q[2])),
          ua = Math.min(...us),
          ub = Math.max(...us);
        if (ub < xmin || ua > xmax) return;
        const yb = (roofYw(num0(c.x), num0(c.z)) ?? 0) - 0.1,
          yt = num(c.top, yb + 1);
        g += `<rect x="${SX(ua)}" y="${SY(yt)}" width="${(ub - ua) * sc}" height="${(yt - yb) * sc}" fill="url(#${TECH ? "tbr" : "brk"}${mode})" stroke="${TECH ? "#6b737a" : "#5a2c20"}" opacity="${Math.min(1, op + 0.1)}"/><rect x="${SX(ua) - 0.04 * sc}" y="${SY(yt + 0.08)}" width="${(ub - ua + 0.08) * sc}" height="${0.08 * sc}" fill="#777"${S.bldMode === "see" ? ' opacity="0.3"' : ""}/>`;
        [0.3, 0.7].forEach((f) => {
          const px = ua + (ub - ua) * f;
          g += `<rect x="${SX(px - 0.09)}" y="${SY(yt + 0.45)}" width="${0.18 * sc}" height="${0.37 * sc}" fill="#b5532f"${S.bldMode === "see" ? ' opacity="0.3"' : ""}/>`;
        });
      });
    }
    g += TECH
      ? `<rect x="${pad.l - 20}" y="${SY(0)}" width="${W - pad.l - pad.r + 40}" height="7" fill="url(#tgr${mode})"/><line x1="${pad.l - 20}" x2="${W - pad.r + 20}" y1="${SY(0)}" y2="${SY(0)}" stroke="#2b3036" stroke-width="2"/>`
      : M.ground && mode === "front"
        ? (() => {
            const xa = xmin - ox / sc,
              xb = xmin + (W - ox) / sc,
              pts = [];
            for (let k = 0; k <= 40; k++) {
              const x = xa + ((xb - xa) * k) / 40;
              pts.push(`${SX(x)},${SY(gAt(x))}`);
            }
            return `<polygon points="${SX(xa)},${H} ${pts.join(" ")} ${SX(xb)},${H}" fill="#c9b48e"/><polyline points="${pts.join(" ")}" fill="none" stroke="#7d6a4a" stroke-width="1.5"/><line x1="0" x2="${W}" y1="${SY(0)}" y2="${SY(0)}" stroke="#7d6a4a" stroke-width=".8" stroke-dasharray="6 4" opacity=".6"/>`;
          })()
        : `<rect x="0" y="${SY(0)}" width="${W}" height="${H - SY(0)}" fill="#c9b48e"/><line x1="0" x2="${W}" y1="${SY(0)}" y2="${SY(0)}" stroke="#7d6a4a" stroke-width="1.5"/>`;
    const depth = ([p]) => {
      const q = ptsOf(p);
      return (
        q.reduce((s, v) => s + pr(v)[2], 0) / Math.max(1, q.length) +
        (p.k === "fit" ? 100 : 0) +
        (p.mat === "net" || p.mat === "sheet" || p.k === "tri" ? 200 : 0)
      );
    };
    items
      .sort((a, b) => depth(a) - depth(b))
      .forEach(([p, i]) => {
        const dp = i == null ? "" : `data-p="${i}"`;
        if (p.k === "tube") {
          const a = pr(p.a),
            b = pr(p.b),
            x1 = SX(a[0]),
            y1 = SY(a[1]),
            x2 = SX(b[0]),
            y2 = SY(b[1]),
            L = Math.hypot(x2 - x1, y2 - y1);
          if (L < 1) {
            g += `<circle ${dp} cx="${x1}" cy="${y1}" r="${tw / 2 + 0.6}" fill="${COL.tube}" stroke="#4c555c" stroke-width=".8"/>`;
            return;
          }
          const nx = (-(y2 - y1) / L) * tw * 0.2,
            ny = ((x2 - x1) / L) * tw * 0.2;
          if (TECH) {
            const vert = Math.abs(x2 - x1) < 1,
              brace = Math.abs(x2 - x1) > 1 && Math.abs(y2 - y1) > 1,
              oc = brace ? "#2c5d8a" : "#1d2329";
            g += `<g ${dp}><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="12"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${oc}" stroke-width="${tw + 1.3}"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${brace ? "#e3edf6" : "#fff"}" stroke-width="${Math.max(0.7, tw - 1.1)}"/></g>`;
            return;
          }
          g += `<g ${dp}><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="transparent" stroke-width="12"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#5c666e" stroke-width="${tw + 1}"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${COL.tube}" stroke-width="${tw}"/><line x1="${x1 + nx}" y1="${y1 + ny}" x2="${x2 + nx}" y2="${y2 + ny}" stroke="${COL.hi}" stroke-width="${tw * 0.28}" opacity=".9"/></g>`;
        } else if (p.k === "fit") {
          const a = pr(p.p),
            x = SX(a[0]),
            y = SY(a[1]);
          g += `<circle ${dp} cx="${x}" cy="${y}" r="9" fill="transparent"/>`;
          const s = Math.max(
            TECH ? (sc < 60 ? 2.6 : 4) : p.ft === "clip" ? 4 : 6,
            (p.ft === "clip" ? 0.05 : p.ft === "put" ? 0.08 : 0.1) * sc,
          );
          if (p.ft === "lamp")
            g += `<circle ${dp} cx="${x}" cy="${y}" r="${Math.max(TECH && sc < 60 ? 2.2 : 4, 0.06 * sc)}" fill="${COL.lamp}" stroke="#600" stroke-width="1"/>`;
          else if (p.ft === "bolt")
            g += `<circle ${dp} cx="${x}" cy="${y}" r="${Math.max(TECH && sc < 60 ? 2 : 3.5, 0.04 * sc)}" fill="${COL.bolt}" stroke="#fff" stroke-width="1"/>`;
          else if (p.ft === "sw")
            g += `<circle ${dp} cx="${x}" cy="${y}" r="${s / 2}" fill="${TECH ? "#fff" : COL.fit}" stroke="#11161a" stroke-width="${TECH ? 1.3 : 1}"/>`;
          else if (TECH)
            g += `<rect ${dp} x="${x - s * 0.4}" y="${y - s * 0.4}" width="${s * 0.8}" height="${p.ft === "slv" ? s * 0.55 : s * 0.8}" fill="#1d2329"/>`;
          else
            g += `<g ${dp}><rect x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${p.ft === "slv" ? s * 0.7 : s}" rx="${s * 0.18}" fill="${COL.fit}" stroke="#11161a" stroke-width=".8"/><circle cx="${x + s * 0.2}" cy="${y - s * 0.15}" r="${Math.max(0.8, s * 0.12)}" fill="#a3abb2"/></g>`;
        } else if (p.k === "box") {
          const ca = Math.cos(p.rx || 0),
            sa = Math.sin(p.rx || 0),
            cz = Math.cos(p.rz || 0),
            sz = Math.sin(p.rz || 0),
            cs = [];
          for (const ox2 of [-1, 1])
            for (const oy of [-1, 1])
              for (const oz of [-1, 1]) {
                let X0 = (ox2 * p.s[0]) / 2,
                  Y0 = (oy * p.s[1]) / 2,
                  Z0 = (oz * p.s[2]) / 2;
                const X1 = X0 * cz - Y0 * sz,
                  Y1 = X0 * sz + Y0 * cz;
                X0 = X1;
                Y0 = Y1;
                const q = pr([p.c[0] + X0, p.c[1] + Y0 * ca - Z0 * sa, p.c[2] + Y0 * sa + Z0 * ca]);
                cs.push([SX(q[0]), SY(q[1])]);
              }
          const bx = Math.min(...cs.map((q) => q[0])),
            bX = Math.max(...cs.map((q) => q[0])),
            by0 = Math.min(...cs.map((q) => q[1])),
            bY = Math.max(...cs.map((q) => q[1]));
          const f =
              p.mat === "mesh"
                ? `url(#msh${mode})`
                : p.mat === "net"
                  ? `url(#net${mode})`
                  : TECH && (p.mat === "board" || p.mat === "sole")
                    ? `url(#tbd${mode})`
                    : TECH && p.mat === "plate"
                      ? "#1d2329"
                      : COL[p.mat] || "#888",
            st =
              p.mat === "board" || p.mat === "sole"
                ? TECH
                  ? "#6b5030"
                  : COL.boardE
                : p.mat === "sign"
                  ? "#c0282e"
                  : "#222";
          const minp = p.mat === "board" ? 3 : 2,
            cx = (bx + bX) / 2,
            cy = (by0 + bY) / 2,
            ww = Math.max(minp, bX - bx),
            hh = Math.max(minp, bY - by0);
          const shape =
            (!p.rx && !p.rz) || bX - bx < minp || bY - by0 < minp
              ? `<rect x="${cx - ww / 2}" y="${cy - hh / 2}" width="${ww}" height="${hh}"`
              : `<polygon points="${hullOf(cs)
                  .map((q) => q.join(","))
                  .join(" ")}"`;
          g += `${shape} ${dp} fill="${f}" stroke="${p.mat === "net" || p.mat === "sheet" || p.mat === "keder" ? "none" : st}" stroke-width=".8"${p.mat === "mesh" ? ' opacity=".7"' : p.mat === "sheet" ? ' opacity=".55" pointer-events="none"' : p.mat === "keder" ? ' opacity=".75"' : p.mat === "net" ? ' pointer-events="none"' : ""}/>`;
          if (p.mat === "signb" && S.co.signImg && ww > 8)
            g += `<image href="${S.co.signImg}" x="${cx - ww / 2}" y="${cy - hh / 2}" width="${ww}" height="${hh}" preserveAspectRatio="none" pointer-events="none"/>`;
          else if (p.mat === "signb" && ww > 40 && hh > 14) {
            const fs = Math.min(hh * 0.26, ww / (String(S.co.name || "").length * 0.55 + 1));
            g += `<text x="${cx}" y="${cy + fs * 0.1}" text-anchor="middle" font-size="${fs}" font-weight="700" fill="#fff" pointer-events="none">${esc(S.co.name || "")}</text><text x="${cx}" y="${cy + fs * 1.1}" text-anchor="middle" font-size="${fs * 0.55}" fill="#fff" pointer-events="none">${esc(S.co.tel || "")}  ${esc(S.co.web || "")}</text>`;
          }
          const x = cx - ww / 2,
            y = cy - hh / 2;
          if (p.mat === "sleeper" && ww > 10) {
            let gl = "";
            for (let q = 1; q < 4; q++) {
              const yy = y + (hh * q) / 4 + (q % 2 ? 1 : -1) * hh * 0.06;
              gl += `<path d="M${x + 2} ${yy} Q${x + ww * 0.3} ${yy - hh * 0.08} ${x + ww * 0.55} ${yy} T${x + ww - 2} ${yy}" stroke="rgba(40,22,10,.55)" stroke-width=".7" fill="none"/>`;
            }
            g += `<g pointer-events="none">${gl}<rect x="${x}" y="${y}" width="${ww}" height="${hh}" rx="${Math.min(3, hh * 0.15)}" fill="none" stroke="#3b2414" stroke-width="1"/></g>`;
          }
          if (p.mat === "board" && !p.rx && ww > 18 && hh > 3 && !TECH)
            g += `<rect x="${x}" y="${y}" width="${Math.min(4, ww * 0.05)}" height="${hh}" fill="#666" pointer-events="none"/><rect x="${x + ww - Math.min(4, ww * 0.05)}" y="${y}" width="${Math.min(4, ww * 0.05)}" height="${hh}" fill="#666" pointer-events="none"/>`;
        } else if (p.k === "poly") {
          const pts = p.pts.map((q) => {
              const r = pr(q);
              return [SX(r[0]), SY(r[1])];
            }),
            h = hullOf(pts);
          if (h.length < 3) {
            const xs = pts.map((q) => q[0]),
              ys = pts.map((q) => q[1]);
            g += `<rect x="${Math.min(...xs)}" y="${Math.min(...ys)}" width="${Math.max(2, Math.max(...xs) - Math.min(...xs))}" height="${Math.max(2, Math.max(...ys) - Math.min(...ys))}" fill="#8c969e" pointer-events="none"/>`;
          } else {
            const f =
              p.mat === "beamEnd"
                ? "#8c969e"
                : p.mat === "tin"
                  ? "#b9c1c8"
                  : p.mat === "keder"
                    ? "#f1f4f6"
                    : p.mat === "sheet"
                      ? COL.sheet
                      : COL[p.mat] || "#9aa2a9";
            g += `<polygon points="${h.map((q) => q.join(",")).join(" ")}" fill="${f}" ${p.mat === "sheet" ? 'opacity=".5"' : p.mat === "tin" || p.mat === "keder" ? 'opacity=".92"' : ""} stroke="#5c666e" stroke-width=".6" pointer-events="none"/>`;
          }
        } else if (p.k === "tri") {
          const pts = p.pts.map((q) => {
            const r = pr(q);
            return [SX(r[0]), SY(r[1])];
          });
          g += `<polygon points="${hullOf(pts)
            .map((q) => q.join(","))
            .join(
              " ",
            )}" fill="${COL.sheet}" opacity=".45" stroke="#9aa5ad" pointer-events="none"/>`;
        } else if (p.k === "person") {
          const c = pr(p.c),
            x = SX(c[0]),
            y = SY(c[1]),
            k = sc,
            P2 = (a, b) => `${(x + a * k).toFixed(1)},${(y - b * k).toFixed(1)}`,
            hv = p.wear === "orange" ? "#ff6a10" : "#d9f020",
            top = p.wear === "orange" ? "#ff6a10" : "#1f2733",
            wk = p.pose === "walk" ? 0.14 : 0;
          const leg = (s2) =>
            `<path d="M${P2(s2 * 0.035, 0.92)} L${P2(s2 * 0.17, 0.92)} L${P2(s2 * 0.15 + s2 * wk, 0.1)} L${P2(s2 * 0.05 + s2 * wk, 0.1)} Z" fill="#2f3640" stroke="#1a1f25" stroke-width=".6"/><path d="M${P2(s2 * 0.03 + s2 * wk, 0.12)} L${P2(s2 * 0.16 + s2 * wk, 0.12)} L${P2(s2 * 0.2 + s2 * wk, 0.02)} L${P2(s2 * 0.2 + s2 * wk, 0)} L${P2(s2 * 0.02 + s2 * wk, 0)} Z" fill="#2a2018"/><rect x="${x + (s2 > 0 ? 0.06 : -0.15) * k + s2 * wk * k}" y="${y - 0.55 * k}" width="${0.09 * k}" height="${0.1 * k}" rx="${0.02 * k}" fill="#15191e"/>`;
          const arm = (s2) => {
            let e = [s2 * 0.25, 1.13],
              w = [s2 * 0.26, 0.88];
            if (p.pose === "point" && s2 > 0) {
              e = [0.36, 1.34];
              w = [0.6, 1.42];
            }
            if (p.pose === "carry" && s2 > 0) {
              e = [0.3, 1.52];
              w = [0.2, 1.74];
            }
            return `<path d="M${P2(s2 * 0.2, 1.42)} L${P2(e[0], e[1])} L${P2(w[0], w[1])}" fill="none" stroke="${top}" stroke-width="${0.1 * k}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${x + w[0] * k}" cy="${y - w[1] * k}" r="${0.045 * k}" fill="#6d7680"/>`;
          };
          g += `<g ${dp}>${leg(-1)}${leg(1)}${arm(-1)}${arm(1)}<path d="M${P2(-0.16, 0.92)} L${P2(-0.2, 1.36)} Q${P2(-0.2, 1.46)} ${P2(-0.08, 1.48)} L${P2(0.08, 1.48)} Q${P2(0.2, 1.46)} ${P2(0.2, 1.36)} L${P2(0.16, 0.92)} Z" fill="${top}"/>
        <path d="M${P2(-0.165, 0.97)} L${P2(-0.2, 1.36)} Q${P2(-0.2, 1.45)} ${P2(-0.1, 1.47)} L${P2(-0.05, 1.47)} L${P2(-0.04, 1.1)} L${P2(0.04, 1.1)} L${P2(0.05, 1.47)} L${P2(0.1, 1.47)} Q${P2(0.2, 1.45)} ${P2(0.2, 1.36)} L${P2(0.165, 0.97)} Z" fill="${hv}" stroke="rgba(0,0,0,.25)" stroke-width=".5"/>
        <rect x="${x - 0.18 * k}" y="${y - 1.1 * k}" width="${0.36 * k}" height="${0.04 * k}" fill="#d8dde0"/><rect x="${x - 0.19 * k}" y="${y - 1.19 * k}" width="${0.38 * k}" height="${0.04 * k}" fill="#d8dde0"/><rect x="${x - 0.11 * k}" y="${y - 1.47 * k}" width="${0.04 * k}" height="${0.28 * k}" fill="#d8dde0"/><rect x="${x + 0.07 * k}" y="${y - 1.47 * k}" width="${0.04 * k}" height="${0.28 * k}" fill="#d8dde0"/>
        <rect x="${x - 0.17 * k}" y="${y - 0.99 * k}" width="${0.34 * k}" height="${0.035 * k}" fill="#111"/><rect x="${x - 0.035 * k}" y="${y - 1.57 * k}" width="${0.07 * k}" height="${0.1 * k}" fill="#d9a47e"/>
        <ellipse cx="${x}" cy="${y - 1.64 * k}" rx="${0.088 * k}" ry="${0.11 * k}" fill="#d9a47e"/><rect x="${x - 0.075 * k}" y="${y - 1.68 * k}" width="${0.15 * k}" height="${0.032 * k}" rx="${0.01 * k}" fill="#222a30"/>
        <path d="M${P2(-0.125, 1.685)} L${P2(0.125, 1.685)} L${P2(0.125, 1.695)} L${P2(0.108, 1.7)} Q${P2(0.1, 1.81)} ${P2(0, 1.81)} Q${P2(-0.1, 1.81)} ${P2(-0.108, 1.7)} L${P2(-0.125, 1.695)} Z" fill="#f6f6f4" stroke="#b9bcbf" stroke-width=".6"/></g>`;
        } else if (p.k === "lamppost" || p.k === "beacon") {
          const c = pr(p.c),
            x = SX(c[0]),
            y = SY(c[1]),
            k = sc;
          if (p.k === "lamppost") {
            const h = p.h || 6;
            g += `<g ${dp}><rect x="${x - 0.09 * k}" y="${y - 0.5 * k}" width="${0.18 * k}" height="${0.5 * k}" fill="#3d4a44"/><path d="M${x - 0.06 * k} ${y - 0.5 * k} L${x - 0.04 * k} ${y - h * k} L${x + 0.04 * k} ${y - h * k} L${x + 0.06 * k} ${y - 0.5 * k}Z" fill="#4f5d56"/><path d="M${x} ${y - (h - 0.1) * k} q${0.2 * k} ${-0.35 * k} ${0.9 * k} ${-0.3 * k}" fill="none" stroke="#4f5d56" stroke-width="${Math.max(1.5, 0.06 * k)}"/><rect x="${x + 0.75 * k}" y="${y - (h - 0.45) * k}" width="${0.55 * k}" height="${0.14 * k}" rx="${0.05 * k}" fill="#3a3f44"/><rect x="${x + 0.8 * k}" y="${y - (h - 0.57) * k}" width="${0.45 * k}" height="${0.04 * k}" fill="#ffe9a8"/></g>`;
          } else
            g += `<g ${dp}>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${x - 0.04 * k}" y="${y - 0.3 * (i + 1) * k}" width="${0.08 * k}" height="${0.3 * k}" fill="${i % 2 ? "#fff" : "#111"}"/>`).join("")}<circle cx="${x}" cy="${y - 2.55 * k}" r="${0.16 * k}" fill="#ff9a1a" stroke="#c46800"/></g>`;
        } else if (p.k === "cone") {
          const c = pr(p.c),
            x = SX(c[0]),
            y = SY(c[1]),
            k = sc,
            h = p.h || 0.75,
            f = h / 0.75,
            b0 = 0.055 * f,
            top = h,
            r = (t) => 0.15 * f - 0.122 * f * t,
            yy = (t) => b0 + (top - 0.02 * f - b0) * t,
            Q = (t, s2) => `${(x + s2 * r(t) * k).toFixed(1)},${(y - yy(t) * k).toFixed(1)}`;
          const band = (a, b2) =>
            `<polygon points="${Q(a, -1)} ${Q(a, 1)} ${Q(b2, 1)} ${Q(b2, -1)}" fill="#f4f6f6" stroke="#bfc6c8" stroke-width=".4"/>`;
          g += `<g ${dp}><rect x="${x - 0.2 * f * k}" y="${y - 0.035 * f * k}" width="${0.4 * f * k}" height="${0.035 * f * k}" rx="${0.008 * k}" fill="#1c1c1c"/><rect x="${x - 0.17 * f * k}" y="${y - b0 * k}" width="${0.34 * f * k}" height="${(b0 - 0.035 * f) * k}" fill="#2a2a2a"/>
        <path d="M${Q(0, -1)} L${Q(1, -1)} Q${x},${y - (top + 0.005 * f) * k} ${Q(1, 1)} L${Q(0, 1)} Z" fill="#ff5a14" stroke="#b83d0a" stroke-width=".6"/>${band(0.33, 0.47)}${h > 0.8 ? band(0.58, 0.66) : ""}<path d="M${Q(0.05, 0.55)} L${Q(0.9, 0.2)}" stroke="rgba(255,255,255,.35)" stroke-width="${Math.max(1, 0.02 * k)}"/></g>`;
        } else if (p.k === "beam") {
          const A = pr(p.a),
            B = pr(p.b),
            lw = Math.max(2, 0.045 * sc),
            col = p.lat === "z" ? "#cfd5da" : "#8c969e",
            dn = (v) => [v[0], v[1] - p.dep, v[2]],
            Lb = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]),
            st = p.lat === "z" ? 0.75 : 0.3,
            nn = Math.max(1, Math.round(Lb / st));
          const ln = (u, v, w2) => {
            const q1 = pr(u),
              q2 = pr(v);
            return `<line x1="${SX(q1[0])}" y1="${SY(q1[1])}" x2="${SX(q2[0])}" y2="${SY(q2[1])}" stroke="${col}" stroke-width="${w2}"/>`;
          };
          let s = `<g ${dp}><line x1="${SX(A[0])}" y1="${SY(A[1])}" x2="${SX(B[0])}" y2="${SY(B[1])}" stroke="transparent" stroke-width="14"/>`;
          for (let t = 0; t <= nn; t++) {
            const u = [0, 1, 2].map((k) => p.a[k] + ((p.b[k] - p.a[k]) * t) / nn);
            if (p.lat === "z" && t < nn) {
              const v = [0, 1, 2].map((k) => p.a[k] + ((p.b[k] - p.a[k]) * (t + 1)) / nn);
              s += t % 2 ? ln(dn(u), v, lw * 0.6) : ln(u, dn(v), lw * 0.6);
            }
            if (p.lat !== "z" || t === 0 || t === nn) s += ln(u, dn(u), lw * 0.6);
          }
          s += ln(p.a, p.b, lw) + ln(dn(p.a), dn(p.b), lw);
          g += s + "</g>";
        } else if (p.k === "pad") {
          const a = pr(p.a),
            b = pr(p.b),
            pw = Math.max(5, 0.13 * sc);
          g += `<line ${dp} x1="${SX(a[0])}" y1="${SY(a[1])}" x2="${SX(b[0])}" y2="${SY(b[1])}" stroke="${COL.pad}" stroke-width="${pw}" stroke-linecap="round"/>`;
        } else if (p.k === "stair") {
          const hw = p.wd / 2,
            A = pr(p.a),
            B = pr(p.b),
            lw = Math.max(3, 0.08 * sc);
          let s = `<g ${dp}><line x1="${SX(A[0])}" y1="${SY(A[1])}" x2="${SX(B[0])}" y2="${SY(B[1])}" stroke="transparent" stroke-width="14"/>`;
          const steps = Math.max(4, Math.round((p.b[1] - p.a[1]) / 0.2));
          for (let t = 0; t <= steps; t++) {
            const f = t / steps,
              c = [p.a[0] + (p.b[0] - p.a[0]) * f, p.a[1] + (p.b[1] - p.a[1]) * f, p.a[2]];
            const dx = Math.sign(p.b[0] - p.a[0]) * 0.13;
            const u = pr([c[0] - dx, c[1], c[2] - hw]),
              v = pr([c[0] + dx, c[1], c[2] + hw]);
            s += `<line x1="${SX(u[0])}" y1="${SY(u[1])}" x2="${SX(v[0])}" y2="${SY(v[1])}" stroke="#9aa2a9" stroke-width="${Math.max(2, lw * 0.6)}"/>`;
          }
          [-hw, hw].forEach((o) => {
            const u = pr([p.a[0], p.a[1], p.a[2] + o]),
              v = pr([p.b[0], p.b[1], p.b[2] + o]),
              u2 = pr([p.a[0], p.a[1] + 0.9, p.a[2] + o]),
              v2 = pr([p.b[0], p.b[1] + 0.9, p.b[2] + o]);
            s += `<line x1="${SX(u[0])}" y1="${SY(u[1])}" x2="${SX(v[0])}" y2="${SY(v[1])}" stroke="#aeb5bb" stroke-width="${lw}"/><line x1="${SX(u2[0])}" y1="${SY(u2[1])}" x2="${SX(v2[0])}" y2="${SY(v2[1])}" stroke="#d3d8dc" stroke-width="${lw * 0.55}"/>`;
            for (const f of [0.05, 0.5, 0.95]) {
              const m = [
                  p.a[0] + (p.b[0] - p.a[0]) * f,
                  p.a[1] + (p.b[1] - p.a[1]) * f,
                  p.a[2] + o,
                ],
                q1 = pr(m),
                q2 = pr([m[0], m[1] + 0.9, m[2]]);
              s += `<line x1="${SX(q1[0])}" y1="${SY(q1[1])}" x2="${SX(q2[0])}" y2="${SY(q2[1])}" stroke="#d3d8dc" stroke-width="${lw * 0.45}"/>`;
            }
          });
          g += s + "</g>";
        } else if (p.k === "lad") {
          const dx = p.b[0] - p.a[0],
            dz = p.b[2] - p.a[2],
            hl = Math.hypot(dx, dz) || 1,
            ux = (-dz / hl) * 0.21,
            uz = (dx / hl) * 0.21,
            offA = Math.abs(dz) >= Math.abs(dx) ? [0.21, 0] : [ux, uz];
          const r1a = pr([p.a[0] - offA[0], p.a[1], p.a[2] - offA[1]]),
            r1b = pr([p.b[0] - offA[0], p.b[1], p.b[2] - offA[1]]),
            r2a = pr([p.a[0] + offA[0], p.a[1], p.a[2] + offA[1]]),
            r2b = pr([p.b[0] + offA[0], p.b[1], p.b[2] + offA[1]]);
          const lw = Math.max(2, 0.05 * sc);
          let s = `<g ${dp}><line x1="${SX(r1a[0])}" y1="${SY(r1a[1])}" x2="${SX(r1b[0])}" y2="${SY(r1b[1])}" stroke="${COL.lad}" stroke-width="${lw}"/><line x1="${SX(r2a[0])}" y1="${SY(r2a[1])}" x2="${SX(r2b[0])}" y2="${SY(r2b[1])}" stroke="${COL.lad}" stroke-width="${lw}"/>`;
          const Ll = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]);
          for (let t = 0.28; t < Ll; t += 0.28) {
            const f = t / Ll,
              u = [0, 1, 2].map((k) => p.a[k] + (p.b[k] - p.a[k]) * f),
              q1 = pr([u[0] - offA[0], u[1], u[2] - offA[1]]),
              q2 = pr([u[0] + offA[0], u[1], u[2] + offA[1]]);
            if (Math.hypot(SX(q1[0]) - SX(q2[0]), SY(q1[1]) - SY(q2[1])) > 1.5)
              s += `<line x1="${SX(q1[0])}" y1="${SY(q1[1])}" x2="${SX(q2[0])}" y2="${SY(q2[1])}" stroke="${COL.lad}" stroke-width="${lw * 0.7}"/>`;
          }
          g += s + "</g>";
        }
      });
    if (TECH || DM) {
      const fs = 11 * TS,
        DC = "#1f4e79",
        yG = SY(Math.min(0, YM + 0.1)),
        xL = SX(xmin),
        xR = SX(xmax),
        f2 = (v) => v.toFixed(2);
      // standards along the front line
      let sx = [];
      M.P.forEach((p) => {
        if (p.k !== "tube" || Math.abs(p.a[1] - p.b[1]) < 0.5) return;
        const a = pr(p.a),
          b = pr(p.b);
        if (Math.abs(a[0] - b[0]) > 1e-3) return;
        if (mode !== "front" && M.kind === "run" && Math.min(p.a[0], p.b[0]) > 0.4) return;
        sx.push(+a[0].toFixed(3));
      });
      sx = [...new Set(sx)]
        .sort((a, b) => a - b)
        .filter((v, i, a) => i === 0 || v - a[i - 1] > 0.12);
      const topY = Math.max(
        M.y1 || 0,
        ...M.P.filter((p) => p.k === "tube").map((p) => Math.max(p.a[1], p.b[1])),
      );
      const lt = (t) =>
        t < 26
          ? String.fromCharCode(65 + t)
          : String.fromCharCode(65 + Math.floor(t / 26) - 1) + String.fromCharCode(65 + (t % 26));
      const ann = [];
      const T2 = (x, y, t, o = {}) =>
        `<text x="${x}" y="${y}" font-size="${o.fs || fs}" ${o.a ? `text-anchor="${o.a}"` : ""} ${o.b ? 'font-weight="700"' : ""} fill="${o.c || DC}" paint-order="stroke" stroke="#fff" stroke-width="3">${t}</text>`;
      const by = Math.max(pad.t * 0.55, SY(Math.max(topY, ymax)) - fs * 1.6);
      let lastX = -1e9;
      if (TECH)
        sx.forEach((x, i) => {
          const X = SX(x);
          if (X - lastX < fs * 1.75) return;
          lastX = X;
          ann.push(
            `<line x1="${X}" x2="${X}" y1="${by + fs * 0.8}" y2="${yG}" stroke="${DC}" stroke-width=".6" stroke-dasharray="10 3 2 3" opacity=".45"/><circle cx="${X}" cy="${by}" r="${fs * 0.8}" fill="#fff" stroke="${DC}" stroke-width="1.2"/>${T2(X, by + fs * 0.36, mode === "front" ? lt(i) : String(i + 1), { a: "middle", b: 1 })}`,
          );
        });
      const tick = (x, y) =>
        `<line x1="${x - 4}" y1="${y + 4}" x2="${x + 4}" y2="${y - 4}" stroke="${DC}" stroke-width="1.5"/>`;
      const chainH = (xs, y, lab) => {
        let o = `<line x1="${SX(xs[0])}" x2="${SX(xs[xs.length - 1])}" y1="${y}" y2="${y}" stroke="${DC}" stroke-width="1"/>`;
        xs.forEach((x) => {
          o +=
            tick(SX(x), y) +
            `<line x1="${SX(x)}" x2="${SX(x)}" y1="${yG + 4}" y2="${y + 5}" stroke="${DC}" stroke-width=".6"/>`;
        });
        for (let i = 0; i < xs.length - 1; i++) {
          const w = SX(xs[i + 1]) - SX(xs[i]);
          const t = lab ? lab : f2(xs[i + 1] - xs[i]);
          if (w > t.length * fs * 0.55)
            o += T2((SX(xs[i]) + SX(xs[i + 1])) / 2, y - 4, t, { a: "middle" });
        }
        return o;
      };
      if (sx.length > 1) {
        ann.push(chainH(sx, yG + 14 + fs, null));
        ann.push(
          chainH(
            [sx[0], sx[sx.length - 1]],
            yG + 22 + fs * 2.3,
            "Overall " + f2(sx[sx.length - 1] - sx[0]) + "m",
          ),
        );
      }
      // levels
      const lv = [
        ...new Set([
          0,
          ...(M.all || []).filter((h) => h > 0.15).map((h) => +h.toFixed(2)),
          +topY.toFixed(2),
        ]),
      ].sort((a, b) => a - b);
      const xl = xL - 10;
      if (mode === "front")
        lv.forEach((h) => {
          const Y = SY(h);
          ann.push(
            `<line x1="${xl - 6}" x2="${xL - 2}" y1="${Y}" y2="${Y}" stroke="${DC}" stroke-width=".8"/><path d="M${xl - 6} ${Y} l-5 -7 h10 z" fill="${DC}"/>${T2(xl - 12, Y + fs * 0.35, (h === 0 ? "±" : "+") + f2(h), { a: "end", fs: fs * 0.95 })}`,
          );
        });
      const xr = xR + 14;
      let vc = `<line x1="${xr}" x2="${xr}" y1="${SY(0)}" y2="${SY(topY)}" stroke="${DC}" stroke-width="1"/>`;
      lv.forEach((h) => {
        const Y = SY(h);
        vc +=
          `<line x1="${xR + 3}" x2="${xr + 5}" y1="${Y}" y2="${Y}" stroke="${DC}" stroke-width=".6"/>` +
          tick(xr, Y);
      });
      for (let i = 0; i < lv.length - 1; i++) {
        const Y1 = SY(lv[i]),
          Y2 = SY(lv[i + 1]);
        if (Y1 - Y2 > fs * 2.6) {
          const my = (Y1 + Y2) / 2;
          vc += `<text x="${xr + 4}" y="${my}" font-size="${fs * 0.95}" fill="${DC}" transform="rotate(-90 ${xr + 4} ${my})" text-anchor="middle" dy="${fs}" paint-order="stroke" stroke="#fff" stroke-width="3">${f2(lv[i + 1] - lv[i])}</text>`;
        }
      }
      if (mode === "front") ann.push(vc);
      // title block
      if (mode === "front" && TECH) {
        const tbH = Math.max(30, fs * 2.8),
          ty = H - tbH - 4,
          tx = 6,
          twd = W - 12,
          c1 = twd * 0.34,
          c2 = twd * 0.36,
          c3 = twd * 0.15;
        const title =
          (mode === "front" ? "Elevation" : "End view") +
          " — " +
          ((M.b && M.b.name) || TYPEN[M.kind] || "");
        ann.push(`<g><rect x="${tx}" y="${ty}" width="${twd}" height="${tbH}" fill="#fff" stroke="#1d2329" stroke-width="1.2"/>${[c1, c1 + c2, c1 + c2 + c3].map((c) => `<line x1="${tx + c}" x2="${tx + c}" y1="${ty}" y2="${ty + tbH}" stroke="#1d2329" stroke-width=".8"/>`).join("")}
      <text x="${tx + 8}" y="${ty + tbH * 0.42}" font-size="${fs * 1.05}" font-weight="700" fill="#1d2329">${esc(S.co.name || "")}</text><text x="${tx + 8}" y="${ty + tbH * 0.82}" font-size="${fs * 0.8}" fill="#555">${esc([S.job || "", S.co.tel || ""].filter(Boolean).join(" · "))}</text>
      <text x="${tx + c1 + 8}" y="${ty + tbH * 0.42}" font-size="${fs}" font-weight="700" fill="#1d2329">${esc(title)}</text><text x="${tx + c1 + 8}" y="${ty + tbH * 0.82}" font-size="${fs * 0.8}" fill="#555">${esc(M.caption || "")}</text>
      <text x="${tx + c1 + c2 + 8}" y="${ty + tbH * 0.42}" font-size="${fs * 0.75}" fill="#777">Scale</text><text x="${tx + c1 + c2 + 8}" y="${ty + tbH * 0.82}" font-size="${fs * 0.9}" fill="#1d2329">NTS · m</text>
      <text x="${tx + c1 + c2 + c3 + 8}" y="${ty + tbH * 0.42}" font-size="${fs * 0.75}" fill="#777">Date</text><text x="${tx + c1 + c2 + c3 + 8}" y="${ty + tbH * 0.82}" font-size="${fs * 0.9}" fill="#1d2329">${new Date().toLocaleDateString("en-GB")}</text></g>`);
      }
      if (!TECH && M.caption)
        ann.push(
          `<text x="${(xL + xR) / 2}" y="${H - 8}" text-anchor="middle" font-size="${12 * TS}" fill="#3a2f20">${esc(M.caption)}</text>`,
        );
      g += `<g pointer-events="none">${ann.join("")}</g>`;
    } else if (mode === "front") {
      (M.all || []).forEach((h) => {
        if (h > 0.2)
          g += `<text x="${SX(xmin) - 4}" y="${SY(h) + 4}" text-anchor="end" font-size="11" fill="currentColor" opacity=".6">${f1(h)}</text>`;
      });
      if (M.caption)
        g += `<text x="${(SX(xmin) + SX(xmax)) / 2}" y="${H - 12}" text-anchor="middle" font-size="13" fill="#3a2f20">${esc(M.caption)}</text>`;
    } else
      g += `<text x="${W / 2}" y="${H - 12}" text-anchor="middle" font-size="12" fill="#3a2f20">End view</text>`;
    const z = VZ[svg.id];
    svg.innerHTML = z
      ? `<g class="vp" transform="translate(${z.x} ${z.y}) scale(${z.k})">${g}</g>`
      : g;
    svg.style.color = "var(--ink)";
    if (lens.dataset.src === svg.id && !lens.hidden) $("lsv").innerHTML = svg.innerHTML;
  }

  // ---------- 3D ----------
  let T = null,
    MAG = false;
  const VZ = { sv: { k: 1, x: 0, y: 0 }, ss: { k: 1, x: 0, y: 0 } },
    LS = () => (innerWidth < 600 ? 150 : 210);
  const lens = $("lens");
  function loadThree() {
    return host.loadThree();
  }
  function canvasTex(fn, rx, ry) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    fn(c.getContext("2d"));
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rx) t.repeat.set(rx, ry);
    return t;
  }
  const brickDraw = (x) => {
    x.fillStyle = "#cdbba8";
    x.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 8; r++)
      for (let k = -1; k < 4; k++) {
        const h = 18 + ((r * 7 + k * 13) % 5) * 6;
        x.fillStyle = `rgb(${150 + h},${68 + h / 2},${50 + h / 3})`;
        x.fillRect(k * 64 + (r % 2 ? 32 : 0) + 2, r * 32 + 2, 60, 28);
      }
  };
  const slateDraw = (x) => {
    x.fillStyle = "#3c4148";
    x.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 8; r++)
      for (let k = -1; k < 5; k++) {
        const v = 70 + ((r * 5 + k * 11) % 4) * 8;
        x.fillStyle = `rgb(${v - 8},${v - 4},${v + 2})`;
        x.fillRect(k * 52 + (r % 2 ? 26 : 0) + 2, r * 32 + 3, 48, 27);
      }
  };
  const groundDraw = (x) => {
    x.fillStyle = "#b8a47e";
    x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
      const v = 150 + ((i * 97) % 60);
      x.fillStyle = `rgba(${v},${v - 15},${v - 45},.5)`;
      x.fillRect((i * 53) % 256, (i * 131 + i * i) % 256, 2, 2);
    }
  };
  // ---------- detailed site items (3D) ----------
  const PROP3 = {};
  function woodDraw(x, w, h, end) {
    const r = (a, b) => a + Math.random() * (b - a);
    if (end) {
      x.fillStyle = "#8a6038";
      x.fillRect(0, 0, w, h);
      const cx = w * r(0.35, 0.65),
        cy = h * r(0.6, 1.1);
      for (let i = 40; i > 0; i--) {
        x.strokeStyle = i % 2 ? "rgba(70,40,18,.35)" : "rgba(200,150,95,.25)";
        x.lineWidth = r(2, 5);
        x.beginPath();
        x.ellipse(cx, cy, (i * w) / 40, (i * h) / 30, 0, 0, Math.PI * 2);
        x.stroke();
      }
      for (let i = 0; i < 5; i++) {
        x.strokeStyle = "rgba(30,18,8,.55)";
        x.lineWidth = r(1.5, 3);
        x.beginPath();
        x.moveTo(cx, cy);
        x.lineTo(cx + r(-1, 1) * w, cy - r(0.2, 1) * h);
        x.stroke();
      }
      return;
    }
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#6f4a2a");
    g.addColorStop(0.5, "#7d5532");
    g.addColorStop(1, "#634024");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      let y = r(0, h);
      x.strokeStyle =
        Math.random() < 0.5 ? `rgba(40,22,10,${r(0.15, 0.45)})` : `rgba(175,130,85,${r(0.1, 0.3)})`;
      x.lineWidth = r(0.8, 3);
      x.beginPath();
      x.moveTo(0, y);
      for (let s = 0; s <= w; s += w / 16) {
        y += r(-1.2, 1.2);
        x.lineTo(s, y);
      }
      x.stroke();
    }
    for (let i = 0; i < 4; i++) {
      const kx = r(0.05, 0.95) * w,
        ky = r(0.15, 0.85) * h,
        kr = r(6, 14);
      for (let j = 6; j > 0; j--) {
        x.strokeStyle = `rgba(45,25,10,${0.25 + j * 0.06})`;
        x.lineWidth = 2;
        x.beginPath();
        x.ellipse(kx, ky, (kr * j) / 3, (kr * j) / 7, 0, 0, Math.PI * 2);
        x.stroke();
      }
    }
    for (let i = 0; i < 7; i++) {
      const sx = r(0, w),
        sy = r(0, h);
      x.strokeStyle = "rgba(20,10,4,.7)";
      x.lineWidth = r(1, 2.2);
      x.beginPath();
      x.moveTo(sx, sy);
      x.lineTo(sx + r(60, 260), sy + r(-3, 3));
      x.stroke();
    }
    for (let i = 0; i < 3500; i++) {
      x.fillStyle = `rgba(${Math.random() < 0.5 ? "30,18,8" : "190,160,120"},${r(0.03, 0.12)})`;
      x.fillRect(r(0, w), r(0, h), r(1, 3), r(1, 2));
    }
  }
  function propMats() {
    if (PROP3.M) return PROP3.M;
    const SM = (o) => new THREE.MeshStandardMaterial(o);
    const tex = (f, w, h) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      f(c.getContext("2d"), w, h);
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      return t;
    };
    const side = tex((x, w, h) => woodDraw(x, w, h, false), 1024, 128),
      end = tex((x, w, h) => woodDraw(x, w, h, true), 256, 160);
    PROP3.M = {
      wood: SM({ map: side, roughness: 0.92 }),
      woodEnd: SM({ map: end, roughness: 0.95 }),
      navy: SM({ color: 0x1f2733, roughness: 0.85 }),
      cargo: SM({ color: 0x2f3640, roughness: 0.9 }),
      boot: SM({ color: 0x2a2018, roughness: 0.6 }),
      sole: SM({ color: 0x111111, roughness: 0.9 }),
      yel: SM({ color: 0xd9f020, roughness: 0.65, emissive: 0x262a00 }),
      org: SM({ color: 0xff6a10, roughness: 0.65, emissive: 0x2a0e00 }),
      refl: SM({ color: 0xd8dde0, metalness: 0.6, roughness: 0.25 }),
      skin: SM({ color: 0xd9a47e, roughness: 0.7 }),
      hair: SM({ color: 0x3a2a1e, roughness: 0.9 }),
      hat: SM({ color: 0xf6f6f4, roughness: 0.35 }),
      glove: SM({ color: 0x6d7680, roughness: 0.8 }),
      lens: SM({ color: 0x222a30, metalness: 0.4, roughness: 0.1 }),
      cone: SM({ color: 0xff5a14, roughness: 0.45 }),
      coneW: SM({ color: 0xf4f6f6, metalness: 0.3, roughness: 0.25 }),
      cbase: SM({ color: 0x1c1c1c, roughness: 0.85 }),
      kneepad: SM({ color: 0x15191e, roughness: 0.7 }),
    };
    return PROP3.M;
  }
  function limb(mat, a, b, r0, r1) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
      L = d.length(),
      m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, L, 14), mat);
    m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return m;
  }
  function ball(mat, p, s) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14), mat);
    m.position.set(...p);
    m.scale.set(...s);
    return m;
  }
  function lathe(mat, prof, seg, zs) {
    const g = new THREE.LatheGeometry(
        prof.map(([r, y]) => new THREE.Vector2(r, y)),
        seg || 28,
      ),
      m = new THREE.Mesh(g, mat);
    if (zs) m.scale.z = zs;
    return m;
  }
  function makePerson(pose, wear) {
    const M = propMats(),
      g = new THREE.Group(),
      hv = wear === "orange" ? M.org : M.yel,
      top = wear === "orange" ? M.org : M.navy,
      add = (o) => {
        g.add(o);
        return o;
      };
    const walk = pose === "walk",
      point = pose === "point",
      carry = pose === "carry";
    // legs (hip -> knee -> ankle), walking pose swings them
    [-1, 1].forEach((s) => {
      const sw = walk ? s * 0.16 : 0,
        hip = [s * 0.095, 0.92, 0],
        knee = [s * 0.1, 0.5, sw * 1.1 + (walk && s > 0 ? 0.03 : 0)],
        ank = [s * 0.1, 0.09, sw * 1.9 - (walk && s < 0 ? 0.05 : 0)];
      add(limb(M.cargo, hip, knee, 0.082, 0.066));
      add(limb(M.cargo, knee, ank, 0.063, 0.05));
      add(ball(M.cargo, knee, [0.066, 0.07, 0.066]));
      add(ball(M.kneepad, [knee[0], knee[1], knee[2] + 0.05], [0.055, 0.075, 0.03]));
      add(ball(M.cargo, [s * 0.105, 0.68, 0.02 + sw * 0.8], [0.03, 0.07, 0.05]));
      const bt = new THREE.Group();
      bt.position.set(ank[0], 0, ank[2]);
      if (walk) bt.rotation.x = s > 0 ? -0.15 : 0.2;
      g.add(bt);
      const up = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.15), M.boot);
      up.position.set(0, 0.1, 0);
      bt.add(up);
      const toe = ball(M.boot, [0, 0.055, 0.09], [0.058, 0.05, 0.1]);
      bt.add(toe);
      const so = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.3), M.sole);
      so.position.set(0, 0.015, 0.035);
      bt.add(so);
    });
    // pelvis + belt
    add(
      lathe(
        M.cargo,
        [
          [0, 0.86],
          [0.15, 0.86],
          [0.165, 0.92],
          [0.16, 1.0],
          [0, 1.0],
        ],
        28,
        0.68,
      ),
    );
    add(
      lathe(
        M.sole,
        [
          [0.163, 0.965],
          [0.168, 0.97],
          [0.168, 1.0],
          [0.163, 1.005],
        ],
        28,
        0.7,
      ),
    );
    // torso (shirt / jacket)
    add(
      lathe(
        top,
        [
          [0, 0.99],
          [0.155, 0.99],
          [0.16, 1.08],
          [0.175, 1.22],
          [0.19, 1.36],
          [0.17, 1.44],
          [0.1, 1.49],
          [0.055, 1.5],
          [0, 1.5],
        ],
        30,
        0.66,
      ),
    );
    // hi-vis vest over the top + reflective bands + braces
    if (wear !== "orange")
      add(
        lathe(
          hv,
          [
            [0.163, 0.97],
            [0.168, 1.08],
            [0.183, 1.22],
            [0.197, 1.35],
            [0.178, 1.43],
            [0.115, 1.475],
          ],
          30,
          0.69,
        ),
      );
    [1.08, 1.17].forEach((y) =>
      add(
        lathe(
          M.refl,
          [
            [0.172 + (y - 1.08) * 0.12, y - 0.022],
            [0.176 + (y - 1.08) * 0.12, y],
            [0.172 + (y - 1.08) * 0.12, y + 0.022],
          ],
          30,
          0.7,
        ),
      ),
    );
    [-1, 1].forEach((s) => {
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.36, 0.27), M.refl);
      br.position.set(s * 0.085, 1.33, 0);
      br.scale.z = 1;
      g.add(br);
    });
    // neck + head
    add(limb(M.skin, [0, 1.47, 0], [0, 1.57, 0.005], 0.05, 0.047));
    const hd = new THREE.Group();
    hd.position.set(0, 1.64, 0.01);
    g.add(hd);
    hd.add(ball(M.skin, [0, 0, 0], [0.087, 0.11, 0.1]));
    hd.add(ball(M.skin, [0, -0.06, 0.03], [0.07, 0.05, 0.07]));
    hd.add(ball(M.skin, [0, 0.0, 0.098], [0.014, 0.022, 0.018]));
    [-1, 1].forEach((s) => hd.add(ball(M.skin, [s * 0.086, 0, 0], [0.014, 0.028, 0.02])));
    hd.add(ball(M.hair, [0, 0.01, -0.03], [0.088, 0.095, 0.085]));
    const gl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.01), M.lens);
    gl.position.set(0, 0.025, 0.095);
    hd.add(gl);
    // hard hat: dome + peak + brim
    const hat = lathe(
      M.hat,
      [
        [0, 0.165],
        [0.05, 0.16],
        [0.09, 0.13],
        [0.105, 0.08],
        [0.108, 0.055],
        [0.125, 0.05],
        [0.125, 0.042],
        [0, 0.042],
      ],
      32,
      1.15,
    );
    hat.position.y = 0.0;
    hd.add(hat);
    const pk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.01, 24, 1, false, -Math.PI / 2.4, Math.PI / 1.2),
      M.hat,
    );
    pk.position.set(0, 0.047, 0.045);
    pk.scale.z = 1.3;
    hd.add(pk);
    const rib = lathe(
      M.hat,
      [
        [0.012, 0.168],
        [0.012, 0.08],
      ],
      8,
    );
    rib.scale.set(1, 1, 9);
    hd.add(rib);
    // arms
    [-1, 1].forEach((s) => {
      const sh = [s * 0.205, 1.4, 0];
      let el = [s * 0.235, 1.13, walk ? -s * 0.08 : 0.02],
        wr = [s * 0.24, 0.88, walk ? -s * 0.12 : 0.08];
      if (point && s > 0) {
        el = [0.3, 1.36, 0.15];
        wr = [0.38, 1.45, 0.4];
      }
      if (carry && s > 0) {
        el = [0.25, 1.5, -0.02];
        wr = [0.18, 1.72, 0.02];
      }
      if (carry && s < 0) {
        el = [-0.24, 1.15, 0.05];
        wr = [-0.2, 0.95, 0.2];
      }
      add(ball(top, sh, [0.072, 0.075, 0.075]));
      add(limb(top, sh, el, 0.064, 0.052));
      add(ball(top, el, [0.05, 0.05, 0.05]));
      add(limb(top, el, wr, 0.05, 0.042));
      if (wear === "orange") {
        const mid = [0, 1, 2].map((k) => (el[k] + wr[k]) / 2);
        add(
          limb(
            M.refl,
            [0, 1, 2].map((k) => mid[k] - (wr[k] - el[k]) * 0.08),
            [0, 1, 2].map((k) => mid[k] + (wr[k] - el[k]) * 0.08),
            0.053,
            0.047,
          ),
        );
      }
      const d = [wr[0] - el[0], wr[1] - el[1], wr[2] - el[2]],
        l = Math.hypot(...d);
      add(
        ball(
          M.glove,
          [wr[0] + (d[0] / l) * 0.06, wr[1] + (d[1] / l) * 0.06, wr[2] + (d[2] / l) * 0.06],
          [0.04, 0.055, 0.045],
        ),
      );
    });
    if (carry) {
      const t = limb(
        new THREE.MeshStandardMaterial({ color: 0xc9d1d7, metalness: 0.35, roughness: 0.38 }),
        [0.15, 1.78, -1.7],
        [0.2, 1.78, 1.6],
        0.024,
        0.024,
      );
      g.add(t);
    }
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return g;
  }
  function makeBeacon() {
    const g = new THREE.Group(),
      SM = (o) => new THREE.MeshStandardMaterial(o),
      bk = SM({ color: 0x151515, roughness: 0.5 }),
      wh = SM({ color: 0xf6f6f6, roughness: 0.5 });
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 14), i % 2 ? wh : bk);
      m.position.y = 0.15 + i * 0.3;
      g.add(m);
    }
    const gl = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 20, 14),
      SM({ color: 0xff9a1a, emissive: 0xb55a00, roughness: 0.3 }),
    );
    gl.position.y = 2.55;
    g.add(gl);
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    return g;
  }
  function makeLamp(h) {
    const g = new THREE.Group(),
      SM = (o) => new THREE.MeshStandardMaterial(o),
      pm = SM({ color: 0x4f5d56, metalness: 0.5, roughness: 0.45 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 16), pm);
    base.position.y = 0.25;
    g.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, h - 0.5, 16), pm);
    pole.position.y = 0.5 + (h - 0.5) / 2;
    g.add(pole);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 10), pm);
    arm.rotation.z = Math.PI / 2 - 0.25;
    arm.position.set(0.48, h - 0.02, 0);
    g.add(arm);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.12, 0.28),
      SM({ color: 0x3a3f44, metalness: 0.4, roughness: 0.5 }),
    );
    head.position.set(1.0, h + 0.08, 0);
    g.add(head);
    const lens = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.02, 0.22),
      SM({ color: 0xffefb8, emissive: 0x8a7a40 }),
    );
    lens.position.set(1.0, h + 0.01, 0);
    g.add(lens);
    g.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    return g;
  }
  function makeCone(h) {
    const M = propMats(),
      g = new THREE.Group(),
      k = h / 0.75;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.4 * k, 0.035 * k, 0.4 * k), M.cbase);
    base.position.y = 0.0175 * k;
    g.add(base);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.34 * k, 0.02 * k, 0.34 * k), M.cbase);
    lip.position.y = 0.045 * k;
    g.add(lip);
    const r = (y) => 0.15 * k - (0.15 * k - 0.028 * k) * (y / (h - 0.07 * k)),
      y0 = 0.055 * k,
      P = [[0.155 * k, y0]];
    for (let y = 0; y <= h - 0.09 * k; y += h / 30) P.push([r(y), y0 + y]);
    P.push([0.024 * k, h - 0.015 * k], [0.012 * k, h], [0, h]);
    g.add(
      lathe(
        M.cone,
        P.map(([a, b]) => [a, b]),
        36,
      ),
    );
    const band = (y1, y2) =>
      g.add(
        lathe(
          M.coneW,
          [
            [r(y1 - y0) + 0.003, y1],
            [r(y2 - y0) + 0.003, y2],
          ],
          36,
        ),
      );
    band(y0 + (h - y0) * 0.33, y0 + (h - y0) * 0.47);
    if (h > 0.8) band(y0 + (h - y0) * 0.58, y0 + (h - y0) * 0.66);
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return g;
  }
  function makeSleeper(L, W, H) {
    const M = propMats(),
      s = new THREE.Shape(),
      r = 0.012,
      w = W / 2,
      h = H / 2;
    s.moveTo(-w + r, -h);
    s.lineTo(w - r, -h);
    s.quadraticCurveTo(w, -h, w, -h + r);
    s.lineTo(w, h - r);
    s.quadraticCurveTo(w, h, w - r, h);
    s.lineTo(-w + r, h);
    s.quadraticCurveTo(-w, h, -w, h - r);
    s.lineTo(-w, -h + r);
    s.quadraticCurveTo(-w, -h, -w + r, -h);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: L,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.006,
      bevelSegments: 2,
      curveSegments: 3,
    });
    geo.translate(0, 0, -L / 2);
    // UVs: caps use end grain, sides run along the length
    const pos = geo.attributes.position,
      uv = geo.attributes.uv,
      n = geo.groups;
    geo.computeVertexNormals();
    const nr = geo.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i),
        z = pos.getZ(i);
      if (Math.abs(nr.getZ(i)) > 0.7) uv.setXY(i, (x + w) / W, (y + h) / H);
      else {
        const t = Math.abs(nr.getY(i)) > Math.abs(nr.getX(i)) ? (x + w) / W : (y + h) / H;
        uv.setXY(i, (z + L / 2) / L, t * 0.9 + (nr.getX(i) > 0 ? 0.05 : 0));
      }
    }
    uv.needsUpdate = true;
    const m = new THREE.Mesh(geo, [M.woodEnd, M.wood]);
    m.rotation.y = Math.PI / 2;
    const g = new THREE.Group();
    m.position.y = h + 0.008;
    g.add(m);
    // two coach-screw holes and a little rust
    [-0.85, 0.85].forEach((x) => {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.005, 12), M.cbase);
      d.position.set(x, H + 0.016, 0);
      g.add(d);
    });
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return g;
  }
  function init3D() {
    const st = $("stage"),
      r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.setPixelRatio(Math.min(2, devicePixelRatio));
    st.prepend(r.domElement);
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 600),
      SM = (o) => new THREE.MeshStandardMaterial(o);
    const M = {
      steel: SM({ color: 0xc9d1d7, metalness: 0.35, roughness: 0.38 }),
      fit: SM({ color: 0x5d666d, metalness: 0.45, roughness: 0.45 }),
      band: SM({ color: 0x7b838a, metalness: 0.5, roughness: 0.4 }),
      board1: SM({ color: 0xc48a4e, roughness: 0.85 }),
      board2: SM({ color: 0xd9a466, roughness: 0.85 }),
      glass: SM({ color: 0x31404d, metalness: 0.3, roughness: 0.15 }),
      frame: SM({ color: 0xf2f2f0, roughness: 0.6 }),
      board: SM({ color: 0xd29a5a, roughness: 0.85 }),
      sole: SM({ color: 0xa37446, roughness: 0.9 }),
      plate: SM({ color: 0x40474d, metalness: 0.4, roughness: 0.6 }),
      gate: SM({ color: 0xe2b021, roughness: 0.6 }),
      mesh: SM({ color: 0x555555, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
      bolt: SM({ color: 0xc0282e }),
      lad: SM({ color: 0xd5dadf, metalness: 0.5, roughness: 0.4 }),
      ground: SM({ color: 0xcfc4ae, roughness: 1 }),
      brick: SM({ color: 0xffffff, roughness: 0.95, side: THREE.DoubleSide }),
      slate: SM({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide }),
      brickC: SM({ color: 0xffffff, roughness: 0.95 }),
      cap: SM({ color: 0x8a8d90, roughness: 0.8 }),
      pot: SM({ color: 0xb5532f, roughness: 0.8 }),
      pad: SM({ color: 0xf2c200, roughness: 0.7 }),
      lamp: SM({ color: 0xff3020, emissive: 0xaa1000 }),
      sign: SM({ color: 0xffd21f }),
      tag: SM({ color: 0x2e9e4f }),
      lguard: SM({ color: 0x2c3136, metalness: 0.4, roughness: 0.5 }),
      net: SM({
        color: 0x2f7d3a,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      sheet: SM({
        color: 0xe8eef3,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      keder: SM({ color: 0xf4f6f8, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
      stair: SM({ color: 0xc5cbd0, metalness: 0.5, roughness: 0.4 }),
      tin: SM({ color: 0xb4bcc3, metalness: 0.55, roughness: 0.35, side: THREE.DoubleSide }),
      sleeper: SM({ color: 0x6e4a2a, roughness: 0.95 }),
      signSide: SM({ color: 0x5a1215, roughness: 0.7 }),
      hivis: SM({ color: 0xf26a1b, roughness: 0.7 }),
      trousers: SM({ color: 0x2b3440, roughness: 0.9 }),
      skin: SM({ color: 0xe2b48f, roughness: 0.8 }),
      hat: SM({ color: 0xffffff, roughness: 0.5 }),
      cone: SM({ color: 0xf2581b, roughness: 0.6 }),
      white: SM({ color: 0xffffff, roughness: 0.6 }),
      black: SM({ color: 0x222222, roughness: 0.8 }),
      hl: SM({ color: 0xff3b3b, emissive: 0x8a1010, roughness: 0.4 }),
      hit: new THREE.MeshBasicMaterial({ visible: false }),
    };
    M.brick.map = canvasTex(brickDraw, 1 / 0.9, 1 / 0.6);
    M.slate.map = canvasTex(slateDraw, 1, 1);
    M.brickC.map = canvasTex(brickDraw, 1, 3);
    M.ground.map = canvasTex(groundDraw, 12, 12);
    M.road = SM({ color: 0xffffff, roughness: 0.95 });
    M.road.map = canvasTex(
      (x) => {
        x.fillStyle = "#45494d";
        x.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 5000; i++) {
          const v = 50 + Math.random() * 60;
          x.fillStyle = `rgba(${v},${v},${v + 4},.6)`;
          x.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
        }
      },
      6,
      6,
    );
    M.slab = SM({ color: 0xffffff, roughness: 0.9 });
    M.slab.map = canvasTex(
      (x) => {
        x.fillStyle = "#cfcbc2";
        x.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 1500; i++) {
          x.fillStyle = `rgba(90,85,75,${Math.random() * 0.12})`;
          x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
        }
        x.strokeStyle = "#9d988d";
        x.lineWidth = 3;
        x.strokeRect(0, 0, 256, 256);
      },
      1 / 0.6,
      1 / 0.6,
    );
    M.line = SM({ color: 0xf6f6f2, roughness: 0.6 });
    M.rubber = SM({ color: 0x1e1e1e, roughness: 0.9 });
    M.ch8r = SM({ color: 0xd0262c, roughness: 0.5 });
    M.ch8w = SM({ color: 0xffffff, roughness: 0.5 });
    M.postT = SM({ color: 0x7a5532, roughness: 0.9 });
    M.closeb = SM({ color: 0xffffff, roughness: 0.9 });
    M.closeb.map = canvasTex(
      (x) => {
        x.fillStyle = "#9a6b3e";
        x.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 256; i += 21) {
          x.fillStyle = "rgba(60,35,15,.55)";
          x.fillRect(i, 0, 3, 256);
          x.fillStyle = "rgba(210,170,120,.18)";
          x.fillRect(i + 4, 0, 6, 256);
        }
      },
      4,
      1,
    );
    M.ply = SM({ color: 0xc9a873, roughness: 0.85 });
    M.chain = SM({
      color: 0x4f7a58,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    M.pal = SM({ color: 0x2e5a3a, metalness: 0.3, roughness: 0.5 });
    M.mesh2 = M.mesh;
    M.kerb = SM({ color: 0xaaa69d, roughness: 0.9 });
    M.brickSee = M.brick.clone();
    Object.assign(M.brickSee, { transparent: true, opacity: 0.2, depthWrite: false });
    M.slateSee = M.slate.clone();
    Object.assign(M.slateSee, { transparent: true, opacity: 0.18, depthWrite: false });
    M.brickCSee = M.brickC.clone();
    Object.assign(M.brickCSee, { transparent: true, opacity: 0.25, depthWrite: false });
    // SiteHQ: the chimney's cap and pots fade with the building too (James, Nov 2026: the pots stayed when the building went)
    M.capSee = M.cap.clone();
    Object.assign(M.capSee, { transparent: true, opacity: 0.25, depthWrite: false });
    M.potSee = M.pot.clone();
    Object.assign(M.potSee, { transparent: true, opacity: 0.25, depthWrite: false });
    const G = {
      cyl: new THREE.CylinderGeometry(0.0242, 0.0242, 1, 14),
      hit: new THREE.CylinderGeometry(0.08, 0.08, 1, 6),
      box: new THREE.BoxGeometry(1, 1, 1),
      rung: new THREE.CylinderGeometry(0.014, 0.014, 1, 6),
      pot: new THREE.CylinderGeometry(0.09, 0.11, 0.4, 12),
      head: new THREE.SphereGeometry(0.11, 16, 12),
      hat: new THREE.SphereGeometry(0.14, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      cone: new THREE.ConeGeometry(0.17, 0.72, 16),
      cband: new THREE.CylinderGeometry(0.085, 0.105, 0.1, 16),
    };
    T = {
      r,
      cam,
      M,
      G,
      scene: null,
      pick: [],
      theta: 0.6,
      phi: 1.05,
      rad: 30,
      tgt: new THREE.Vector3(),
      hl: null,
    };
    const ro = new ResizeObserver(() => {
      size3D();
      render3D();
    });
    ro.observe(st);
    const ptr = new Map();
    let moved = 0,
      pinch = 0,
      mid = null,
      panBtn = false;
    const el = r.domElement;
    const lensXY = (e) => {
      const rc = el.getBoundingClientRect();
      T.lens = { x: e.clientX - rc.left, y: e.clientY - rc.top };
      render3D();
    };
    el.addEventListener("contextmenu", (e) => e.preventDefault());
    const gnd = (e, y) => {
      const rc = el.getBoundingClientRect(),
        R = ray();
      R.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rc.left) / rc.width) * 2 - 1,
          (-(e.clientY - rc.top) / rc.height) * 2 + 1,
        ),
        T.cam,
      );
      const pt = new THREE.Vector3();
      return R.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), pt) ? pt : null;
    };
    let drag = null;
    el.addEventListener("pointerdown", (e) => {
      if (!MAG && e.button !== 2 && !e.shiftKey && ptr.size === 0) {
        const rc = el.getBoundingClientRect(),
          R = ray();
        R.setFromCamera(
          new THREE.Vector2(
            ((e.clientX - rc.left) / rc.width) * 2 - 1,
            (-(e.clientY - rc.top) / rc.height) * 2 + 1,
          ),
          T.cam,
        );
        const hs = R.intersectObjects(T.pick, false),
          u = hs[0] && hs[0].object.userData,
          m = u && MODELS[u.e];
        if (m && m.b.type === "prop" && m.b.kind !== "sign") {
          const y = 0,
            st0 = gnd(e, y),
            roots = new Set();
          u.vis.forEach((o) => {
            let q = o;
            while (q.parent && q.parent !== T.scene) q = q.parent;
            roots.add(q);
          });
          drag = {
            b: m.b,
            st0,
            y,
            roots: [...roots].map((o) => [o, o.position.clone()]),
            dx: 0,
            dz: 0,
          };
        }
      }
      el.setPointerCapture(e.pointerId);
      ptr.set(e.pointerId, [e.clientX, e.clientY]);
      moved = 0;
      panBtn = e.button === 2 || e.shiftKey;
      if (ptr.size > 1) drag = null;
      if (ptr.size === 2) {
        const [a, b] = [...ptr.values()];
        pinch = Math.hypot(a[0] - b[0], a[1] - b[1]);
        mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      }
      if (MAG) lensXY(e);
    });
    el.addEventListener("pointermove", (e) => {
      if (MAG && (e.pointerType === "mouse" || ptr.has(e.pointerId)) && ptr.size < 2) lensXY(e);
      if (ptr.has(e.pointerId)) {
        const p = ptr.get(e.pointerId);
        ptr.set(e.pointerId, [e.clientX, e.clientY]);
        if (ptr.size === 2) {
          const [a, b] = [...ptr.values()],
            d = Math.hypot(a[0] - b[0], a[1] - b[1]),
            mm = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          if (pinch) T.rad = Math.min(200, Math.max(2, (T.rad * pinch) / d));
          if (mid) pan3D(mm[0] - mid[0], mm[1] - mid[1]);
          pinch = d;
          mid = mm;
          moved += 10;
          render3D();
          return;
        }
        const dx = e.clientX - p[0],
          dy = e.clientY - p[1];
        moved += Math.abs(dx) + Math.abs(dy);
        if (drag && drag.st0) {
          const q = gnd(e, drag.y);
          if (q && moved > 4) {
            drag.dx = q.x - drag.st0.x;
            drag.dz = q.z - drag.st0.z;
            drag.roots.forEach(([o, p0]) => o.position.set(p0.x + drag.dx, p0.y, p0.z + drag.dz));
            el.style.cursor = "grabbing";
            showTip(null);
            render3D();
          }
          return;
        }
        if (MAG && !panBtn) {
          if (moved > 5) showTip(null);
          return;
        }
        if (moved > 5) {
          if (panBtn) pan3D(dx, dy);
          else {
            T.theta -= dx * 0.008;
            T.phi = Math.min(1.5, Math.max(0.15, T.phi - dy * 0.006));
            render3D();
          }
          showTip(null);
        }
        return;
      }
      if (e.pointerType === "mouse") pickAt(e);
    });
    el.addEventListener("pointerup", (e) => {
      ptr.delete(e.pointerId);
      if (ptr.size < 2) {
        pinch = 0;
        mid = null;
      }
      if (drag) {
        const d = drag;
        drag = null;
        el.style.cursor = "";
        if (moved > 4 && (d.dx || d.dz)) {
          const r5 = (v) => Math.round(v * 20) / 20;
          d.b.x = r5(num0(d.b.x) + d.dx);
          d.b.z = r5(num0(d.b.z) + d.dz);
          save();
          update(true);
          if (typeof propsUI === "function") propsUI();
          return;
        }
      }
      if (moved < 6) pickAt(e, true);
    });
    el.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse" && !ptr.size) {
        setHL(null);
        showTip(null);
        if (MAG) {
          T.lens = null;
          lens.hidden = true;
          render3D();
        }
      }
    });
    el.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        T.rad = Math.min(200, Math.max(2, T.rad * (1 + Math.sign(e.deltaY) * 0.1)));
        render3D();
      },
      { passive: false },
    );
  }
  const ray = () => T.ray || (T.ray = new THREE.Raycaster());
  function pickAt(e, click) {
    const rc = T.r.domElement.getBoundingClientRect(),
      v = new THREE.Vector2(
        ((e.clientX - rc.left) / rc.width) * 2 - 1,
        (-(e.clientY - rc.top) / rc.height) * 2 + 1,
      );
    const R = ray();
    R.setFromCamera(v, T.cam);
    const hs = R.intersectObjects(T.pick, false);
    if (!hs.length) {
      setHL(null);
      showTip(null);
      if (click) hideSel();
      return;
    }
    let h = hs[0];
    const fh = hs.find((x) => x.object.userData.k === "fit" && x.distance < hs[0].distance + 0.3);
    if (fh) h = fh;
    const u = h.object.userData,
      p = MODELS[u.e] && MODELS[u.e].P[u.i];
    setHL(u.vis);
    showTip(p, e.clientX, e.clientY);
    if (click) showSel(p, MODELS[u.e]);
  }
  function setHL(list) {
    if (!T) return;
    if (T.hl) T.hl.forEach((m) => (m.material = m.userData.mat));
    T.hl = list;
    if (list) list.forEach((m) => (m.material = T.M.hl));
    render3D();
  }
  function size3D() {
    const st = $("stage"),
      w = st.clientWidth,
      h = st.clientHeight;
    if (!w || !h || !T) return;
    T.r.setSize(w, h, false);
    T.cam.aspect = w / h;
    T.cam.updateProjectionMatrix();
  }
  function render3D() {
    if (!T || view !== "3d" || !T.scene) return;
    const { cam, tgt } = T,
      r = T.r;
    cam.position.set(
      tgt.x + T.rad * Math.sin(T.phi) * Math.sin(T.theta),
      tgt.y + T.rad * Math.cos(T.phi),
      tgt.z + T.rad * Math.sin(T.phi) * Math.cos(T.theta),
    );
    cam.lookAt(tgt);
    r.render(T.scene, cam);
    if (MAG && T.lens) {
      const cv = r.domElement,
        W = cv.clientWidth,
        H = cv.clientHeight,
        s = LS(),
        m = 3;
      let lx = T.lens.x - s / 2,
        ly = T.lens.y - s - 24;
      if (ly < 4) ly = T.lens.y + 24;
      lx = Math.max(4, Math.min(W - s - 4, lx));
      ly = Math.max(4, Math.min(H - s - 4, ly));
      cam.setViewOffset(W, H, T.lens.x - s / (2 * m), T.lens.y - s / (2 * m), s / m, s / m);
      r.setScissorTest(true);
      r.setScissor(lx, H - ly - s, s, s);
      r.setViewport(lx, H - ly - s, s, s);
      r.setClearColor(0xe4ebf1, 1);
      r.clear();
      r.render(T.scene, cam);
      r.setScissorTest(false);
      r.setViewport(0, 0, W, H);
      r.setClearColor(0x000000, 0);
      cam.clearViewOffset();
      lens.classList.add("sq");
      lens.style.width = lens.style.height = s + "px";
      lens.style.left = lx + "px";
      lens.style.top = ly + "px";
      lens.hidden = false;
      $("lsv").style.display = "none";
    }
  }
  function pan3D(dx, dy) {
    const c = T.cam,
      k = T.rad * 0.0016,
      right = new THREE.Vector3().setFromMatrixColumn(c.matrix, 0),
      up = new THREE.Vector3().setFromMatrixColumn(c.matrix, 1);
    T.tgt.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
    render3D();
  }
  function reset3D() {
    if (!T || !T.def) return;
    T.theta = 0.6;
    T.phi = 1.05;
    T.tgt.copy(T.def.tgt);
    T.rad = T.def.rad;
    render3D();
  }
  function sceneBounds() {
    let x0 = 1e9,
      x1 = -1e9,
      z0 = 1e9,
      z1 = -1e9,
      y1 = 3;
    const add = (X, Z) => {
      x0 = Math.min(x0, X);
      x1 = Math.max(x1, X);
      z0 = Math.min(z0, Z);
      z1 = Math.max(z1, Z);
    };
    (S.wings || []).forEach((w) => {
      add(num0(w.x), num0(w.z));
      add(num0(w.x) + num(w.w, 1), num0(w.z) + num(w.d, 1));
      y1 = Math.max(y1, ridgeOf(w));
    });
    MODELS.forEach((m) => {
      if (m.x0 == null || m.b.type === "prop") return;
      [
        [m.x0, m.d0],
        [m.x1, m.d0],
        [m.x0, m.d1],
        [m.x1, m.d1],
      ].forEach(([x, d]) => {
        const q = toW(m.b, [x, 0, d]);
        add(q[0], q[2]);
      });
      y1 = Math.max(y1, m.y1 || 0);
    });
    if (x0 > x1) {
      x0 = -5;
      x1 = 5;
      z0 = -5;
      z1 = 5;
    }
    return { x0, x1, z0, z1, y1 };
  }
  let signCache = { key: "", mat: null };
  function signMat() {
    const co = S.co,
      key = [co.name, co.tel, co.web, co.logo.length, (co.signImg || "").length].join("|");
    if (signCache.key === key && signCache.mat) return signCache.mat;
    if (co.signImg) {
      const tl = new THREE.TextureLoader(),
        t = tl.load(co.signImg, () => render3D());
      t.anisotropy = 4;
      const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 });
      signCache = { key, mat: m };
      return m;
    }
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 512;
    const x = c.getContext("2d"),
      draw = (img) => {
        x.fillStyle = "#7F191D";
        x.fillRect(0, 0, 1024, 512);
        x.fillStyle = "#fff";
        x.fillRect(18, 18, 988, 476);
        x.fillStyle = "#7F191D";
        x.fillRect(30, 30, 964, 452);
        let tx = 512,
          al = "center";
        if (img) {
          const h = 300,
            w = Math.min(380, (h * img.width) / img.height);
          x.fillStyle = "#fff";
          x.fillRect(56, 106, w + 28, h + 28);
          x.drawImage(img, 70, 120, w, h);
          tx = 70 + w + 40 + (1024 - 110 - w - 40) / 2;
        }
        x.fillStyle = "#fff";
        x.textAlign = al;
        let fs = 88;
        x.font = `700 ${fs}px Oswald, Arial Narrow, sans-serif`;
        while (x.measureText(co.name || "").width > (img ? 560 : 900) && fs > 30) {
          fs -= 4;
          x.font = `700 ${fs}px Oswald, Arial Narrow, sans-serif`;
        }
        x.fillText(co.name || "", tx, 220);
        x.font = "500 54px Barlow, Arial, sans-serif";
        x.fillText(co.tel || "", tx, 320);
        x.font = "500 44px Barlow, Arial, sans-serif";
        x.fillText(co.web || "", tx, 400);
      };
    draw(null);
    const t = new THREE.CanvasTexture(c),
      m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
    if (co.logo) {
      const im = new Image();
      im.onload = () => {
        draw(im);
        t.needsUpdate = true;
        render3D();
      };
      im.src = co.logo;
    }
    signCache = { key, mat: m };
    return m;
  }
  function groundAt(X, Z) {
    let g = 0;
    MODELS.forEach((m) => {
      if (!m.ground || m.b.type !== "run") return;
      const q = toL(m.b, [X, 0, Z]),
        L = m.L;
      if (q[0] < -m.dout - 0.6 || q[0] > L + m.dout + 0.6 || q[2] < -0.05 || q[2] > m.dout + 6)
        return;
      const t = Math.max(0, Math.min(1, q[0] / L)),
        gd = -(m.dA + (m.dB - m.dA) * t),
        f = q[2] <= m.dout + 1 ? 1 : Math.max(0, 1 - (q[2] - m.dout - 1) / 5);
      g = Math.min(g, gd * f);
    });
    return g;
  }
  function buildingMeshes(sc, see) {
    const { M, G } = T,
      mb = see ? M.brickSee : M.brick,
      mr = see ? M.slateSee : M.slate;
    if (!M.cons) {
      M.cons = new THREE.MeshStandardMaterial({
        color: 0xcfe6f2,
        metalness: 0.2,
        roughness: 0.08,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      M.consF = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.5 });
      M.consB = M.brick;
    }
    (S.wings || []).forEach((w) => {
      const W_ = num(w.w, 1),
        D = num(w.d, 1),
        e = num(w.eaves, 3),
        x0 = num0(w.x),
        z0 = num0(w.z),
        glass = w.kind === "cons";
      if (glass) {
        const dw = 0.6;
        [
          [x0, z0 + D, 1, 0, W_],
          [x0 + W_, z0 + D, 0, -1, D],
          [x0 + W_, z0, -1, 0, W_],
          [x0, z0, 0, 1, D],
        ].forEach(([sx, sz, dx, dz, len]) => {
          const ry = Math.atan2(-dz, dx);
          const dwm = new THREE.Mesh(G.box, M.brickC);
          dwm.scale.set(len, dw, 0.22);
          dwm.rotation.y = ry;
          dwm.position.set(sx + (dx * len) / 2, dw / 2, sz + (dz * len) / 2);
          dwm.castShadow = true;
          sc.add(dwm);
          const sh = new THREE.Shape();
          sh.moveTo(0, dw);
          for (let i = 0; i <= 16; i++) {
            const t = (i / 16) * len;
            sh.lineTo(t, roofH(w, sx + dx * t, sz + dz * t, true));
          }
          sh.lineTo(len, dw);
          sh.lineTo(0, dw);
          const gm = new THREE.Mesh(new THREE.ShapeGeometry(sh), M.cons);
          gm.position.set(sx, 0, sz);
          gm.rotation.y = ry;
          sc.add(gm);
          const np = Math.max(1, Math.round(len / 0.75));
          for (let k = 0; k <= np; k++) {
            const t = (k / np) * len,
              top = roofH(w, sx + dx * t, sz + dz * t, true),
              pm = new THREE.Mesh(G.box, M.consF);
            pm.scale.set(0.06, top - dw, 0.08);
            pm.rotation.y = ry;
            pm.position.set(sx + dx * t, (top + dw) / 2, sz + dz * t);
            pm.castShadow = true;
            sc.add(pm);
          }
        });
        const pg = new THREE.PlaneGeometry(W_ + 0.2, D + 0.2, 12, 12);
        pg.rotateX(-Math.PI / 2);
        const pos = pg.attributes.position,
          cx = x0 + W_ / 2,
          cz = z0 + D / 2;
        for (let i = 0; i < pos.count; i++) {
          pos.setY(i, roofH(w, cx + pos.getX(i), cz + pos.getZ(i), false) + 0.03);
        }
        pg.computeVertexNormals();
        const rm = new THREE.Mesh(pg, M.cons);
        rm.position.set(cx, 0, cz);
        sc.add(rm);
        const nb = Math.max(2, Math.round(W_ / 0.7));
        for (let k = 0; k <= nb; k++) {
          const X = x0 - 0.1 + ((W_ + 0.2) * k) / nb,
            a = [X, roofH(w, X, z0 - 0.1, false) + 0.05, z0 - 0.1],
            bq = [X, roofH(w, X, z0 + D + 0.1, false) + 0.05, z0 + D + 0.1],
            d = new THREE.Vector3(bq[0] - a[0], bq[1] - a[1], bq[2] - a[2]),
            L = d.length(),
            bar = new THREE.Mesh(G.box, M.consF);
          bar.scale.set(0.05, 0.06, L);
          bar.position.set((a[0] + bq[0]) / 2, (a[1] + bq[1]) / 2, (a[2] + bq[2]) / 2);
          bar.lookAt(bq[0], bq[1], bq[2]);
          sc.add(bar);
        }
        return;
      }
      const gmin = Math.min(0, ...MODELS.filter((m) => m.ground).map((m) => -Math.max(m.dA, m.dB)));
      [
        [x0, z0 + D, 1, 0, W_],
        [x0 + W_, z0 + D, 0, -1, D],
        [x0 + W_, z0, -1, 0, W_],
        [x0, z0, 0, 1, D],
      ].forEach(([sx, sz, dx, dz, len]) => {
        const sh = new THREE.Shape();
        sh.moveTo(0, gmin);
        for (let i = 0; i <= 24; i++) {
          const t = (i / 24) * len;
          sh.lineTo(t, roofH(w, sx + dx * t, sz + dz * t, true));
        }
        sh.lineTo(len, gmin);
        sh.lineTo(0, gmin);
        const ry = Math.atan2(-dz, dx),
          m = new THREE.Mesh(new THREE.ShapeGeometry(sh), mb);
        m.position.set(sx, 0, sz);
        m.rotation.y = ry;
        m.castShadow = !see;
        m.receiveShadow = true;
        sc.add(m);
        if (!see)
          windowsFor(len, e).forEach(([x, y, ww, wh]) => {
            [
              [M.frame, ww + 0.12, wh + 0.12, 0.03],
              [M.glass, ww, wh, 0.05],
            ].forEach(([mt, a, c2, z2]) => {
              const q = new THREE.Mesh(G.box, mt);
              q.scale.set(a, c2, z2);
              q.rotation.y = ry;
              q.position.set(sx + dx * x, y + wh / 2, sz + dz * x);
              sc.add(q);
            });
          });
      });
      const ov = w.roof === "flat" && num0(w.parapet) > 0.15 ? 0 : Math.max(0, num(w.ov, 0.3)),
        pg = new THREE.PlaneGeometry(W_ + 2 * ov, D + 2 * ov, 24, 24);
      pg.rotateX(-Math.PI / 2);
      const pos = pg.attributes.position,
        uv = pg.attributes.uv,
        cx = x0 + W_ / 2,
        cz = z0 + D / 2;
      for (let i = 0; i < pos.count; i++) {
        const X = cx + pos.getX(i),
          Z = cz + pos.getZ(i);
        pos.setY(i, roofH(w, X, Z, false) + 0.03);
        uv.setXY(i, X / 1.6, Z / 1.0);
      }
      pg.computeVertexNormals();
      const rm = new THREE.Mesh(pg, mr);
      rm.position.set(cx, 0, cz);
      rm.castShadow = !see;
      rm.receiveShadow = true;
      sc.add(rm);
      if (w.roof === "flat" && num0(w.parapet) > 0.15) {
        const cp = new THREE.Mesh(G.box, M.cap);
        [
          [W_ / 2, 0, W_],
          [W_ / 2, D, W_],
          [0, D / 2, D, 1],
          [W_, D / 2, D, 1],
        ].forEach(([a2, b2, l2, rot]) => {
          const q = new THREE.Mesh(G.box, see ? M.capSee : M.cap);
          q.scale.set(rot ? 0.3 : l2 + 0.3, 0.06, rot ? l2 : 0.3);
          q.position.set(x0 + a2, e + num0(w.parapet) + 0.03, z0 + b2);
          sc.add(q);
        });
      }
      // dormers on the front and back slopes
      if (
        !see &&
        (w.roof === "gable" || w.roof === "hip" || w.roof === "halfhip") &&
        w.ridge !== "z"
      )
        [
          ["dormF", 1],
          ["dormB", -1],
        ].forEach(([k, sg]) => {
          const nd = Math.max(0, Math.min(6, Math.round(num0(w[k]))));
          for (let i = 0; i < nd; i++) {
            const xc = x0 + (W_ * (i + 1)) / (nd + 1),
              vf = sg > 0 ? D - 1.0 : 1.0,
              zf = z0 + vf,
              yb = roofH(w, xc, zf, true) - 0.15,
              dh = 1.35,
              dd = Math.abs(D / 2 - 1.0) - 0.2,
              zc = zf - (sg * dd) / 2;
            const body = new THREE.Mesh(G.box, M.brickC);
            body.scale.set(1.5, dh, dd);
            body.position.set(xc, yb + dh / 2, zc);
            body.castShadow = true;
            sc.add(body);
            const top = new THREE.Mesh(G.box, M.slate);
            top.scale.set(1.7, 0.1, dd + 0.15);
            top.position.set(xc, yb + dh + 0.05, zc + sg * 0.05);
            top.castShadow = true;
            sc.add(top);
            [
              [M.frame, 1.1, 0.95, 0.04],
              [M.glass, 0.95, 0.8, 0.06],
            ].forEach(([mt, a2, b2, c2]) => {
              const q = new THREE.Mesh(G.box, mt);
              q.scale.set(a2, b2, c2);
              q.position.set(xc, yb + 0.2 + 0.55, zf + sg * 0.01);
              sc.add(q);
            });
          }
        });
    });
    (S.chims || []).forEach((c) => {
      const w = wingById(c.wing),
        X = num0(c.x),
        Z = num0(c.z),
        base = (w ? roofH(w, X, Z, true) : 0) - 0.4,
        top = num(c.top, base + 1),
        cw = num(c.w, 0.9),
        cd = num(c.d, 0.6),
        mm = see ? M.brickCSee : M.brickC;
      const m = new THREE.Mesh(G.box, mm);
      m.scale.set(cw, top - base, cd);
      m.position.set(X, (top + base) / 2, Z);
      m.castShadow = !see;
      sc.add(m);
      const cap = new THREE.Mesh(G.box, see ? M.capSee : M.cap);
      cap.scale.set(cw + 0.08, 0.08, cd + 0.08);
      cap.position.set(X, top + 0.04, Z);
      sc.add(cap);
      [-1, 1].forEach((s) => {
        const pot = new THREE.Mesh(G.pot, see ? M.potSee : M.pot);
        pot.position.set(X + (s * cw) / 4, top + 0.28, Z);
        pot.castShadow = !see;
        sc.add(pot);
      });
    });
  }
  function build3D(keepCam) {
    if (!T) return;
    T.dirty = false;
    const { M, G } = T,
      sc = new THREE.Scene();
    T.pick = [];
    T.hl = null;
    sc.add(new THREE.HemisphereLight(0xf4f7fb, 0x8a7a60, 0.62));
    const dl = new THREE.DirectionalLight(0xfff6e8, 0.85),
      dl2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dl2.position.set(-15, 10, -10);
    sc.add(dl2);
    const bb = sceneBounds(),
      cx = (bb.x0 + bb.x1) / 2,
      cz = (bb.z0 + bb.z1) / 2,
      span = Math.max(bb.x1 - bb.x0, bb.z1 - bb.z0, bb.y1),
      ext = span / 2 + 8;
    dl.position.set(cx + ext * 0.6, ext * 1.6, cz + ext * 0.9);
    dl.target.position.set(cx, 0, cz);
    sc.add(dl, dl.target);
    dl.castShadow = true;
    dl.shadow.mapSize.set(2048, 2048);
    Object.assign(dl.shadow.camera, {
      left: -ext,
      right: ext,
      top: ext,
      bottom: -ext,
      near: 1,
      far: ext * 5,
    });
    dl.shadow.bias = -0.0006;
    const gW = bb.x1 - bb.x0 + 26,
      gD = bb.z1 - bb.z0 + 26,
      sloped = MODELS.some((m) => m.ground),
      gg = new THREE.PlaneGeometry(
        gW,
        gD,
        sloped ? Math.min(160, Math.ceil(gW / 0.3)) : 1,
        sloped ? Math.min(160, Math.ceil(gD / 0.3)) : 1,
      );
    if (sloped) {
      const pa = gg.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        const X = cx + pa.getX(i),
          Z = cz - pa.getY(i);
        pa.setZ(i, groundAt(X, Z));
      }
      gg.computeVertexNormals();
    }
    const gr = new THREE.Mesh(gg, M.ground);
    gr.rotation.x = -Math.PI / 2;
    gr.position.set(cx, -0.01, cz);
    gr.receiveShadow = true;
    sc.add(gr);
    if (S.style === "tech") {
      if (!M.groundT) {
        M.groundT = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 1 });
      }
      gr.material = M.groundT;
      gr.userData.mat = M.groundT;
      const gsz = Math.ceil(Math.max(bb.x1 - bb.x0, bb.z1 - bb.z0) + 26),
        gh = new THREE.GridHelper(gsz, gsz, 0xb4bcc4, 0xd5dade);
      gh.position.set(cx, 0.002, cz);
      sc.add(gh);
      const g5 = new THREE.GridHelper(gsz, Math.round(gsz / 5), 0x8f99a3, 0x8f99a3);
      g5.position.set(cx, 0.003, cz);
      sc.add(g5);
    }
    if (S.bldMode !== "hide") buildingMeshes(sc, S.bldMode === "see");
    MODELS.forEach((m, ei) => {
      const b = m.b,
        ry = num0(b.ry) * DEG,
        W = (p) => {
          const q = toW(b, p);
          return new THREE.Vector3(q[0], q[1], q[2]);
        };
      const add = (mesh, mat, ud, pickable) => {
        mesh.userData.mat = mat;
        mesh.castShadow = mat !== M.net && mat !== M.sheet && mat !== M.hit;
        mesh.receiveShadow =
          mat === M.board1 || mat === M.board2 || mat === M.sole || mat === M.board;
        sc.add(mesh);
        if (pickable) {
          Object.assign(mesh.userData, { k: ud.k, e: ud.e, i: ud.i, vis: ud.vis });
          T.pick.push(mesh);
        }
        return mesh;
      };
      const cyl = (A, B, geo, mat) => {
        const d = new THREE.Vector3().subVectors(B, A),
          L = d.length(),
          mh = new THREE.Mesh(geo, mat);
        mh.scale.set(1, L, 1);
        mh.position.copy(A).addScaledVector(d, 0.5);
        mh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
        return mh;
      };
      const group = (ud, parts, pos, rot) => {
        const g2 = new THREE.Group();
        g2.position.copy(pos);
        g2.rotation.y = rot;
        parts.forEach(([geo, mat, x, y, z, sx, sy, sz]) => {
          const q = new THREE.Mesh(geo, mat);
          q.position.set(x, y, z);
          if (sx) q.scale.set(sx, sy, sz);
          q.castShadow = true;
          q.userData.mat = mat;
          g2.add(q);
        });
        sc.add(g2);
        g2.children.forEach((ch) => {
          ud.vis.push(ch);
          Object.assign(ch.userData, { k: ud.k, e: ud.e, i: ud.i, vis: ud.vis });
          T.pick.push(ch);
        });
      };
      m.P.forEach((p, i) => {
        if (p.k === "qty" || !shown(p)) return;
        const ud = { e: ei, i, vis: [], k: p.k };
        if (p.k === "tube") {
          const A = W(p.a),
            B = W(p.b),
            v = cyl(A, B, G.cyl, M.steel);
          ud.vis.push(v);
          add(v, M.steel);
          add(cyl(A, B, G.hit, M.hit), M.hit, ud, true);
        } else if (p.k === "fit") {
          const mat = p.ft === "bolt" ? M.bolt : p.ft === "lamp" ? M.lamp : M.fit,
            sz = p.ft === "clip" ? 0.05 : p.ft === "put" ? 0.075 : p.ft === "sw" ? 0.085 : 0.095,
            mh = new THREE.Mesh(G.box, mat);
          mh.scale.set(sz, p.ft === "slv" ? 0.13 : sz, sz);
          mh.rotation.y = ry;
          mh.position.copy(W(p.p));
          ud.vis.push(mh);
          add(mh, mat, ud, false);
          const hp = new THREE.Mesh(G.box, M.hit);
          hp.scale.set(0.17, 0.17, 0.17);
          hp.position.copy(mh.position);
          add(hp, M.hit, ud, true);
        } else if (p.k === "box" && p.mat !== "sleeper") {
          const mat =
              p.mat === "signb"
                ? [M.signSide, M.signSide, M.signSide, M.signSide, signMat(), M.signSide]
                : p.mat === "board"
                  ? i % 3 === 0
                    ? M.board
                    : i % 3 === 1
                      ? M.board1
                      : M.board2
                  : M[p.mat] || M.fit,
            mh = new THREE.Mesh(G.box, mat);
          mh.scale.set(...p.s);
          mh.rotation.set(p.rx || 0, ry, p.rz || 0, "YXZ");
          mh.position.copy(W(p.c));
          ud.vis.push(mh);
          add(mh, mat, ud, !p.nc);
          if (p.mat === "board" && p.s[0] > 0.5)
            [-1, 1].forEach((sg) => {
              const bd = new THREE.Mesh(G.box, M.band);
              bd.scale.set(0.03 / p.s[0], 1.12, 1.06);
              bd.position.x = sg * (0.5 - 0.02 / p.s[0]);
              mh.add(bd);
            });
          if (p.mat === "board" && p.s[2] > 0.5)
            [-1, 1].forEach((sg) => {
              const bd = new THREE.Mesh(G.box, M.band);
              bd.scale.set(1.06, 1.12, 0.03 / p.s[2]);
              bd.position.z = sg * (0.5 - 0.02 / p.s[2]);
              mh.add(bd);
            });
        } else if (p.k === "tri") {
          const v = p.pts.map((q) => W(q)),
            arr = [];
          for (let k = 1; k < v.length - 1; k++)
            [v[0], v[k], v[k + 1]].forEach((q) => arr.push(q.x, q.y, q.z));
          const geo = new THREE.BufferGeometry();
          geo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
          geo.computeVertexNormals();
          add(new THREE.Mesh(geo, M.sheet), M.sheet, ud, false);
        } else if (
          p.k === "person" ||
          p.k === "cone" ||
          p.k === "beacon" ||
          p.k === "lamppost" ||
          (p.k === "box" && p.mat === "sleeper")
        ) {
          const g2 =
            p.k === "person"
              ? makePerson(p.pose, p.wear)
              : p.k === "cone"
                ? makeCone(p.h || 0.75)
                : p.k === "beacon"
                  ? makeBeacon()
                  : p.k === "lamppost"
                    ? makeLamp(p.h || 6)
                    : makeSleeper(p.s[0], p.s[2], p.s[1]);
          const c = p.k === "box" ? [p.c[0], p.c[1] - p.s[1] / 2, p.c[2]] : p.c;
          g2.position.copy(W(c));
          g2.position.y += groundAt(g2.position.x, g2.position.z);
          g2.rotation.y = ry;
          sc.add(g2);
          g2.traverse((ch) => {
            if (!ch.isMesh) return;
            ch.userData.mat = ch.material;
            ud.vis.push(ch);
          });
          g2.traverse((ch) => {
            if (ch.isMesh) {
              Object.assign(ch.userData, { k: ud.k, e: ud.e, i: ud.i, vis: ud.vis });
              T.pick.push(ch);
            }
          });
        } else if (p.k === "beam") {
          const mat = p.lat === "z" ? M.lad : M.steel,
            dn = (v) => [v[0], v[1] - p.dep, v[2]],
            Lb = Math.hypot(p.b[0] - p.a[0], p.b[1] - p.a[1], p.b[2] - p.a[2]),
            st = p.lat === "z" ? 0.75 : 0.3,
            nn = Math.max(1, Math.round(Lb / st)),
            at = (t) => [0, 1, 2].map((k) => p.a[k] + ((p.b[k] - p.a[k]) * t) / nn);
          const seg = (u, v, s2) => {
            const m2 = cyl(W(u), W(v), G.cyl, mat);
            m2.scale.x = m2.scale.z = s2;
            ud.vis.push(m2);
            add(m2, mat, ud, true);
          };
          seg(p.a, p.b, 1.5);
          seg(dn(p.a), dn(p.b), 1.5);
          for (let t = 0; t <= nn; t++) {
            const u = at(t);
            if (p.lat === "z" && t < nn) {
              const v = at(t + 1);
              t % 2 ? seg(dn(u), v, 0.8) : seg(u, dn(v), 0.8);
            }
            if (p.lat !== "z" || t === 0 || t === nn) seg(u, dn(u), 0.7);
          }
        } else if (p.k === "pad") {
          const v = cyl(W(p.a), W(p.b), G.cyl, M.pad);
          v.scale.x = v.scale.z = 2.6;
          ud.vis.push(v);
          add(v, M.pad, ud, true);
        } else if (p.k === "stair") {
          const hw = p.wd / 2,
            steps = Math.max(4, Math.round((p.b[1] - p.a[1]) / 0.2));
          [-hw, hw].forEach((o) => {
            const v = cyl(
              W([p.a[0], p.a[1], p.a[2] + o]),
              W([p.b[0], p.b[1], p.b[2] + o]),
              G.cyl,
              M.stair,
            );
            v.scale.x = v.scale.z = 2.2;
            ud.vis.push(v);
            add(v, M.stair, ud, true);
            const r2 = cyl(
              W([p.a[0], p.a[1] + 0.9, p.a[2] + o]),
              W([p.b[0], p.b[1] + 0.9, p.b[2] + o]),
              G.cyl,
              M.stair,
            );
            r2.scale.x = r2.scale.z = 1.3;
            ud.vis.push(r2);
            add(r2, M.stair, ud, true);
            for (const f of [0.05, 0.5, 0.95]) {
              const q = [
                  p.a[0] + (p.b[0] - p.a[0]) * f,
                  p.a[1] + (p.b[1] - p.a[1]) * f,
                  p.a[2] + o,
                ],
                pp = cyl(W(q), W([q[0], q[1] + 0.9, q[2]]), G.cyl, M.stair);
              ud.vis.push(pp);
              add(pp, M.stair, ud, true);
            }
          });
          for (let t = 1; t < steps; t++) {
            const f = t / steps,
              mh = new THREE.Mesh(G.box, M.stair);
            mh.scale.set(0.24, 0.035, p.wd);
            mh.rotation.y = ry;
            mh.position.copy(
              W([p.a[0] + (p.b[0] - p.a[0]) * f, p.a[1] + (p.b[1] - p.a[1]) * f, p.a[2]]),
            );
            ud.vis.push(mh);
            add(mh, M.stair, ud, true);
          }
        } else if (p.k === "lad") {
          const dx = p.b[0] - p.a[0],
            dz = p.b[2] - p.a[2],
            hl = Math.hypot(dx, dz) || 1,
            off = Math.abs(dz) >= Math.abs(dx) ? [0.21, 0] : [(-dz / hl) * 0.21, (dx / hl) * 0.21];
          [-1, 1].forEach((sg) => {
            const A = W([p.a[0] + sg * off[0], p.a[1], p.a[2] + sg * off[1]]),
              B = W([p.b[0] + sg * off[0], p.b[1], p.b[2] + sg * off[1]]),
              v = cyl(A, B, G.cyl, M.lad);
            v.scale.x = v.scale.z = 1.3;
            ud.vis.push(v);
            add(v, M.lad, ud, true);
          });
          const Ll = Math.hypot(dx, p.b[1] - p.a[1], dz);
          for (let t = 0.28; t < Ll; t += 0.28) {
            const f = t / Ll,
              u = [0, 1, 2].map((k) => p.a[k] + (p.b[k] - p.a[k]) * f),
              v = cyl(
                W([u[0] - off[0], u[1], u[2] - off[1]]),
                W([u[0] + off[0], u[1], u[2] + off[1]]),
                G.rung,
                M.lad,
              );
            ud.vis.push(v);
            add(v, M.lad, ud, true);
          }
        }
      });
    });
    T.scene = sc;
    size3D();
    T.def = {
      tgt: new THREE.Vector3(cx, Math.min(bb.y1, 9) * 0.42, cz),
      rad: (span * 1.55 + 6) * Math.max(1, 1.25 / T.cam.aspect),
    };
    if (!keepCam) {
      T.tgt.copy(T.def.tgt);
      T.rad = T.def.rad;
    }
    render3D();
  }
  function faceBlock(b) {
    const m = MODELS.find((x) => x.b === b);
    if (!T || !m) return;
    const c = toW(b, [(m.x0 + m.x1) / 2, 0, (m.d0 + m.d1) / 2]);
    T.tgt.set(c[0], Math.min(m.y1, 9) * 0.45, c[2]);
    T.theta = num0(b.ry) * DEG + 0.35;
    T.phi = 1.15;
    T.rad = Math.max(m.x1 - m.x0, m.y1, 6) * 1.5 + 4;
    render3D();
  }

  // ---------- plan view ----------
  const PV = { s: 0, ox: 0, oy: 0, fit: true };
  let SELB = null;
  function fitPlan() {
    const svg = $("pl"),
      W = svg.clientWidth,
      H = svg.clientHeight;
    if (!W || !H) return;
    const bb = sceneBounds(),
      m = 1.2;
    PV.s = Math.min(W / (bb.x1 - bb.x0 + 2 * m), H / (bb.z1 - bb.z0 + 2 * m));
    PV.ox = W / 2 - ((bb.x0 + bb.x1) / 2) * PV.s;
    PV.oy = H / 2 - ((bb.z0 + bb.z1) / 2) * PV.s;
    PV.fit = false;
  }
  const PX = (X) => PV.ox + X * PV.s,
    PZ = (Z) => PV.oy + Z * PV.s;
  function footprint(m) {
    if (m.x0 == null) return null;
    const sh = 0.45;
    return [
      [m.x0 + sh, m.d0 + sh],
      [m.x1 - sh, m.d0 + sh],
      [m.x1 - sh, m.d1 - sh],
      [m.x0 + sh, m.d1 - sh],
    ].map(([x, d]) => toW(m.b, [x, 0, d]));
  }
  const isSel = (t, id) => SELB && SELB.t === t && SELB.id === id;
  function drawPlan() {
    const svg = $("pl"),
      W = svg.clientWidth,
      H = svg.clientHeight;
    if (!W || !H) return;
    if (PV.fit || !PV.s) fitPlan();
    const s = PV.s,
      TS = S.ptxt || 1,
      showD = S.pdim !== false;
    $("ptv").textContent = Math.round(TS * 100) + "%";
    $("pdim").setAttribute("aria-pressed", showD);
    let g = `<defs><pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#efe6dc"/><line x1="0" y1="0" x2="0" y2="9" stroke="#cdb9a6" stroke-width="2.5"/></pattern></defs><rect width="${W}" height="${H}" fill="var(--sheet)"/>`;
    const step = s > 28 ? 1 : s > 9 ? 5 : 10,
      X0 = -PV.ox / s,
      X1 = (W - PV.ox) / s,
      Z0 = -PV.oy / s,
      Z1 = (H - PV.oy) / s;
    for (let x = Math.ceil(X0 / step) * step; x <= X1; x += step)
      g += `<line x1="${PX(x)}" x2="${PX(x)}" y1="0" y2="${H}" stroke="var(--line)" stroke-width="${Math.round(x) % 5 === 0 ? 1.2 : 0.5}"/>`;
    for (let z = Math.ceil(Z0 / step) * step; z <= Z1; z += step)
      g += `<line y1="${PZ(z)}" y2="${PZ(z)}" x1="0" x2="${W}" stroke="var(--line)" stroke-width="${Math.round(z) % 5 === 0 ? 1.2 : 0.5}"/>`;
    if (S.bgimg && S.bg && S.bg.show !== false)
      g += `<image href="${S.bgimg}" x="${PX(S.bg.x)}" y="${PZ(S.bg.z)}" width="${S.bg.w * s}" height="${S.bg.h * s}" opacity="${S.bg.op ?? 0.55}" preserveAspectRatio="none" pointer-events="none"/>`;
    if (TR.pts.length)
      TR.pts.forEach(
        (q) =>
          (g += `<circle cx="${PX(q[0])}" cy="${PZ(q[1])}" r="7" fill="none" stroke="#d0262c" stroke-width="2.5"/><circle cx="${PX(q[0])}" cy="${PZ(q[1])}" r="2" fill="#d0262c"/>`),
      );
    if (TR.mode === "trace" && TR.pts.length === 1 && TR.hov) {
      const a = TR.pts[0],
        b = TR.hov;
      g += `<rect x="${PX(Math.min(a[0], b[0]))}" y="${PZ(Math.min(a[1], b[1]))}" width="${Math.abs(b[0] - a[0]) * s}" height="${Math.abs(b[1] - a[1]) * s}" fill="rgba(208,38,44,.12)" stroke="#d0262c" stroke-width="2" stroke-dasharray="6 4"/><text x="${PX((a[0] + b[0]) / 2)}" y="${PZ((a[1] + b[1]) / 2)}" text-anchor="middle" font-size="13" font-weight="700" fill="#d0262c" paint-order="stroke" stroke="#fff" stroke-width="4">${Math.abs(b[0] - a[0]).toFixed(2)} × ${Math.abs(b[1] - a[1]).toFixed(2)}m</text>`;
    }
    if (TR.mode === "scale" && TR.pts.length === 2) {
      const [a, b] = TR.pts;
      g += `<line x1="${PX(a[0])}" y1="${PZ(a[1])}" x2="${PX(b[0])}" y2="${PZ(b[1])}" stroke="#d0262c" stroke-width="2.5"/>`;
    }
    g += "<!--U-->";
    (S.wings || []).forEach((w) => {
      const x = num0(w.x),
        z = num0(w.z),
        ww = num(w.w, 1),
        dd = num(w.d, 1),
        sel = isSel("w", w.id),
        L = (a, b, c, d, dash) =>
          `<line x1="${PX(a)}" y1="${PZ(b)}" x2="${PX(c)}" y2="${PZ(d)}" stroke="#8a6f5c" stroke-width="1.5" ${dash ? 'stroke-dasharray="5 4"' : ""}/>`;
      g += `<g data-sel="w:${w.id}" style="cursor:move"><rect x="${PX(x)}" y="${PZ(z)}" width="${ww * s}" height="${dd * s}" fill="url(#hatch)" stroke="${sel ? "#d0262c" : "#6b5a4c"}" stroke-width="${sel ? 3.5 : 2}"/>`;
      if (w.roof === "gable")
        g +=
          w.ridge === "z"
            ? L(x + ww / 2, z, x + ww / 2, z + dd, 1)
            : L(x, z + dd / 2, x + ww, z + dd / 2, 1);
      else if (w.roof === "hip") {
        const h = Math.min(ww, dd) / 2;
        if (ww >= dd)
          g +=
            L(x + h, z + h, x + ww - h, z + h, 1) +
            L(x, z, x + h, z + h, 1) +
            L(x, z + dd, x + h, z + h, 1) +
            L(x + ww, z, x + ww - h, z + h, 1) +
            L(x + ww, z + dd, x + ww - h, z + h, 1);
        else
          g +=
            L(x + h, z + h, x + h, z + dd - h, 1) +
            L(x, z, x + h, z + h, 1) +
            L(x + ww, z, x + h, z + h, 1) +
            L(x, z + dd, x + h, z + dd - h, 1) +
            L(x + ww, z + dd, x + h, z + dd - h, 1);
      } else if (w.roof === "mono")
        g += `<text x="${PX(x + ww / 2)}" y="${w.high === "front" ? PZ(z + dd) - 6 : PZ(z) + 14}" text-anchor="middle" font-size="${11 * TS}" fill="#6b5a4c">▲ high side</text>`;
      if (s * TS > 10 && (!w.parent || ww * s > 70))
        g += `<text x="${PX(x + ww / 2)}" y="${PZ(z + dd / 2) + (w.roof === "gable" && w.ridge !== "z" ? -6 * TS : 4 * TS)}" text-anchor="middle" font-size="${13 * TS}" font-weight="600" fill="#4a3a2e">${esc(w.name || "Building")}</text><text x="${PX(x + ww / 2)}" y="${PZ(z + dd / 2) + (w.roof === "gable" && w.ridge !== "z" ? 12 * TS : 20 * TS)}" text-anchor="middle" font-size="${11 * TS}" fill="#6b5a4c">${ww.toFixed(2)} × ${dd.toFixed(2)}m</text>`;
      g += "</g>";
    });
    const order = { troof: 0, run: 1, bird: 2, load: 3, chim: 4, prop: 5 },
      COLB = {
        run: "#5f6f7d",
        bird: "#3e74a6",
        load: "#c58b2a",
        chim: "#b0442f",
        troof: "#3c8c5a",
      };
    MODELS.slice()
      .sort((a, b) => order[a.b.type] - order[b.b.type])
      .forEach((m) => {
        const b = m.b,
          sel = isSel("b", b.id);
        if (b.type === "prop") {
          const X = PX(num0(b.x)),
            Z = PZ(num0(b.z)),
            r = Math.max(5, 0.3 * s),
            col = sel ? "#d0262c" : "#222";
          let ic = "";
          const a = (-num0(b.ry) * Math.PI) / 180,
            rs = Math.max(4, 0.25 * s);
          if (b.kind === "person")
            ic = `<g transform="translate(${X},${Z}) rotate(${-num0(b.ry)})"><ellipse rx="${rs * 0.95}" ry="${rs * 0.5}" fill="${b.wear === "orange" ? "#ff6a10" : "#d9f020"}" stroke="${col}" stroke-width="1.2"/><circle cy="${rs * 0.08}" r="${rs * 0.45}" fill="#f6f6f4" stroke="#999" stroke-width=".8"/><path d="M${-rs * 0.3} ${rs * 0.4} Q0 ${rs * 0.75} ${rs * 0.3} ${rs * 0.4}" fill="#f6f6f4" stroke="#999" stroke-width=".8"/></g>`;
          else if (b.kind === "cone") {
            const cr = Math.max(4, (0.2 * s * num(b.ch, 0.75)) / 0.75);
            ic = `<g transform="translate(${X},${Z}) rotate(${-num0(b.ry)})"><rect x="${-cr}" y="${-cr}" width="${cr * 2}" height="${cr * 2}" rx="${cr * 0.15}" fill="#1c1c1c" stroke="${col}" stroke-width="1"/><circle r="${cr * 0.78}" fill="#ff5a14"/><circle r="${cr * 0.5}" fill="#f4f6f6"/><circle r="${cr * 0.3}" fill="#ff5a14"/><circle r="${cr * 0.1}" fill="#b83d0a"/></g>`;
          } else if (b.kind === "fence") {
            const L = num(b.len, 10),
              a1 = toW(b, [-L / 2, 0, 0]),
              a2 = toW(b, [L / 2, 0, 0]),
              cc = {
                heras: "#9aa3aa",
                ch8: "#d0262c",
                close: "#8a6038",
                hoard: "#b08a50",
                chain: "#4f7a58",
                pal: "#2e5a3a",
              }[b.ftype || "heras"];
            ic = `<line x1="${PX(a1[0])}" y1="${PZ(a1[2])}" x2="${PX(a2[0])}" y2="${PZ(a2[2])}" stroke="transparent" stroke-width="16"/><line x1="${PX(a1[0])}" y1="${PZ(a1[2])}" x2="${PX(a2[0])}" y2="${PZ(a2[2])}" stroke="${sel ? col : cc}" stroke-width="${Math.max(3, 0.12 * s)}" ${b.ftype === "ch8" ? `stroke-dasharray="${0.25 * s} ${0.25 * s}"` : ""}/><line x1="${PX(a1[0])}" y1="${PZ(a1[2])}" x2="${PX(a2[0])}" y2="${PZ(a2[2])}" stroke="${b.ftype === "ch8" ? "#fff" : "rgba(255,255,255,.5)"}" stroke-width="${Math.max(1, 0.04 * s)}" stroke-dasharray="${0.25 * s} ${0.25 * s}" stroke-dashoffset="${0.25 * s}"/>`;
            g += `<g data-sel="b:${b.id}" style="cursor:move">${ic}</g>`;
            return;
          } else if (b.kind === "lamp") {
            ic = `<circle cx="${X}" cy="${Z}" r="${Math.max(5, 0.18 * s)}" fill="#4f5d56" stroke="${col}" stroke-width="1.5"/><circle cx="${X}" cy="${Z}" r="${Math.max(2, 0.07 * s)}" fill="#ffe9a8"/>`;
          } else if (b.kind === "road" || b.kind === "path" || b.kind === "crossing") {
            const Lx = b.kind === "crossing" ? num(b.dep, 2.4) : num(b.len, 20),
              Wz = num(b.wid, b.kind === "path" ? 2 : 6.5),
              cs = [
                [-1, -1],
                [1, -1],
                [1, 1],
                [-1, 1],
              ].map(([a, e]) => toW(b, [(a * Lx) / 2, 0, (e * Wz) / 2])),
              poly = cs.map((q) => PX(q[0]) + "," + PZ(q[2])).join(" ");
            if (b.kind === "road") {
              const a1 = toW(b, [-Lx / 2, 0, 0]),
                a2 = toW(b, [Lx / 2, 0, 0]);
              ic = `<polygon points="${poly}" fill="#4a4e52" stroke="${sel ? col : "#2c2f32"}" stroke-width="${sel ? 3 : 1}"/><line x1="${PX(a1[0])}" y1="${PZ(a1[2])}" x2="${PX(a2[0])}" y2="${PZ(a2[2])}" stroke="#f4f4f0" stroke-width="${Math.max(1, 0.1 * s)}" stroke-dasharray="${s} ${2 * s}"/>`;
            } else if (b.kind === "path") {
              const k1 = toW(b, [-Lx / 2, 0, Wz / 2]),
                k2 = toW(b, [Lx / 2, 0, Wz / 2]);
              ic = `<polygon points="${poly}" fill="#d8d4cb" stroke="${sel ? col : "#9d988d"}" stroke-width="${sel ? 3 : 1}"/><line x1="${PX(k1[0])}" y1="${PZ(k1[2])}" x2="${PX(k2[0])}" y2="${PZ(k2[2])}" stroke="#8d897f" stroke-width="${Math.max(2, 0.15 * s)}"/>`;
            } else {
              let st = "";
              for (let z = -Wz / 2 + 0.25; z < Wz / 2 - 0.2; z += 1) {
                const q = [
                  [-1, z],
                  [1, z],
                  [1, z + 0.5],
                  [-1, z + 0.5],
                ].map(([a, zz]) => toW(b, [(a * Lx) / 2, 0, zz]));
                st += `<polygon points="${q.map((v) => PX(v[0]) + "," + PZ(v[2])).join(" ")}" fill="#f4f4f0"/>`;
              }
              ic = `<polygon points="${poly}" fill="#4a4e52" stroke="${sel ? col : "none"}" stroke-width="3"/>${st}`;
            }
            g = g.replace(
              "<!--U-->",
              `<g data-sel="b:${b.id}" style="cursor:move">${ic}</g><!--U-->`,
            );
            return;
          } else {
            const sz = b.kind === "sleeper" ? [2.4, 0.25] : [num(b.sw, 2.4), 0.12],
              cs = [
                [-1, -1],
                [1, -1],
                [1, 1],
                [-1, 1],
              ].map(([a, e]) => toW(b, [(a * sz[0]) / 2, 0, (e * sz[1]) / 2]));
            ic =
              `<polygon points="${cs.map((q) => PX(q[0]) + "," + PZ(q[2])).join(" ")}" fill="${b.kind === "sleeper" ? "#7d5532" : "#7F191D"}" stroke="${b.kind === "sleeper" && !sel ? "#3b2414" : col}" stroke-width="${sel ? 3 : 1}"/>` +
              (b.kind === "sleeper"
                ? [0.3, 0.55, 0.75]
                    .map((f, q) => {
                      const p1 = toW(b, [-1.15, 0, (f - 0.5) * 0.25]),
                        p2 = toW(b, [1.15, 0, (f - 0.5) * 0.25 + (q % 2 ? 0.02 : -0.02)]);
                      return `<line x1="${PX(p1[0])}" y1="${PZ(p1[2])}" x2="${PX(p2[0])}" y2="${PZ(p2[2])}" stroke="rgba(40,22,10,.6)" stroke-width=".8"/>`;
                    })
                    .join("")
                : "");
          }
          g += `<g data-sel="b:${b.id}" style="cursor:move"><circle cx="${X}" cy="${Z}" r="${Math.max(12, r * 1.6)}" fill="transparent"/>${ic}</g>`;
          return;
        }
        const fp = footprint(m);
        if (!fp) return;
        const col = COLB[b.type] || "#555";
        g += `<g data-sel="b:${b.id}" style="cursor:${b.type === "troof" ? "pointer" : "move"}"><polygon points="${fp.map((q) => PX(q[0]) + "," + PZ(q[2])).join(" ")}" fill="${col}" fill-opacity="${b.type === "troof" ? 0.07 : 0.22}" stroke="${sel ? "#d0262c" : col}" stroke-width="${sel ? 3.5 : 1.6}" ${b.type === "troof" ? 'stroke-dasharray="7 5"' : ""}/>`;
        const seen = new Set();
        m.P.forEach((p) => {
          if (
            p.k !== "tube" ||
            Math.abs(p.a[0] - p.b[0]) > 1e-3 ||
            Math.abs(p.a[2] - p.b[2]) > 1e-3 ||
            Math.abs(p.a[1] - p.b[1]) < 0.5
          )
            return;
          const k = Math.round(p.a[0] * 20) + "," + Math.round(p.a[2] * 20);
          if (seen.has(k)) return;
          seen.add(k);
          const q = toW(b, p.a);
          g += `<circle cx="${PX(q[0])}" cy="${PZ(q[2])}" r="${Math.max(1.6, 0.05 * s)}" fill="${col}"/>`;
        });
        if (s * TS > 12 && b.type !== "troof") {
          const c = toW(b, [(m.x0 + m.x1) / 2, 0, (m.d0 + m.d1) / 2]);
          g += `<text x="${PX(c[0])}" y="${PZ(c[2]) + 4}" text-anchor="middle" font-size="${11 * TS}" font-weight="600" fill="${col}" paint-order="stroke" stroke="var(--sheet)" stroke-width="3">${esc(b.name || TYPEN[b.type])}</text>`;
        }
        g += "</g>";
      });
    (S.chims || []).forEach((c) => {
      const sel = isSel("c", c.id),
        cw = num(c.w, 0.9),
        cd = num(c.d, 0.6);
      g += `<rect data-sel="c:${c.id}" style="cursor:move" x="${PX(num0(c.x) - cw / 2)}" y="${PZ(num0(c.z) - cd / 2)}" width="${Math.max(6, cw * s)}" height="${Math.max(5, cd * s)}" fill="#9b4b3a" stroke="${sel ? "#d0262c" : "#4d241b"}" stroke-width="${sel ? 3 : 1.5}"/>`;
    });
    // SiteHQ: ladders on the Plan – drag one along its run, or onto another run, and the scaffold follows
    {
      const { din: ld0, dout: ld1 } = geomW();
      (S.access || []).forEach((ac, i) => {
        if (ac.type === "stair" || ac.type === "ramp") return;
        const b = blockById(ac.block);
        if (!b) return;
        const q = toW(b, [num0(ac.at), 0, (ld0 + ld1) / 2]),
          r = Math.max(9, 0.35 * s);
        g += `<g data-lad="${i}" style="cursor:grab"><circle cx="${PX(q[0])}" cy="${PZ(q[2])}" r="${r + 8}" fill="transparent"/><circle cx="${PX(q[0])}" cy="${PZ(q[2])}" r="${r}" fill="#fff" stroke="#1f4e79" stroke-width="2.5"/><text x="${PX(q[0])}" y="${PZ(q[2]) + 4}" text-anchor="middle" font-size="${11 * TS}" font-weight="700" fill="#1f4e79">L${i + 1}</text></g>`;
      });
    }
    if (showD) {
      const fs = 12 * TS,
        DC = "#1f4e79",
        DIM = (A, B, off, lab, ref) => {
          const ax = PX(A[0]),
            ay = PZ(A[1]),
            bx = PX(B[0]),
            by = PZ(B[1]),
            L = Math.hypot(bx - ax, by - ay);
          if (L < fs * 1.2) return "";
          const ux = (bx - ax) / L,
            uy = (by - ay) / L;
          let nx = -uy,
            ny = ux;
          if (ref) {
            const rx = PX(ref[0]),
              ry = PZ(ref[1]);
            if (((ax + bx) / 2 - rx) * nx + ((ay + by) / 2 - ry) * ny < 0) {
              nx = -nx;
              ny = -ny;
            }
          }
          const o = off,
            p1 = [ax + nx * o, ay + ny * o],
            p2 = [bx + nx * o, by + ny * o],
            t = 5,
            ang = (Math.atan2(uy, ux) * 180) / Math.PI,
            ra = ang > 90 || ang < -90 ? ang + 180 : ang,
            mx = (p1[0] + p2[0]) / 2,
            my = (p1[1] + p2[1]) / 2;
          const tk = (p) =>
            `<line x1="${p[0] - (ux + nx) * t}" y1="${p[1] - (uy + ny) * t}" x2="${p[0] + (ux + nx) * t}" y2="${p[1] + (uy + ny) * t}" stroke="${DC}" stroke-width="1.6"/>`;
          return `<g pointer-events="none"><line x1="${ax + nx * o * 0.15}" y1="${ay + ny * o * 0.15}" x2="${p1[0] + nx * Math.sign(o) * 5}" y2="${p1[1] + ny * Math.sign(o) * 5}" stroke="${DC}" stroke-width=".8"/><line x1="${bx + nx * o * 0.15}" y1="${by + ny * o * 0.15}" x2="${p2[0] + nx * Math.sign(o) * 5}" y2="${p2[1] + ny * Math.sign(o) * 5}" stroke="${DC}" stroke-width=".8"/><line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" stroke="${DC}" stroke-width="1.1"/>${tk(p1)}${tk(p2)}<text x="${mx}" y="${my}" dy="${-fs * 0.35}" transform="rotate(${ra} ${mx} ${my})" text-anchor="middle" font-size="${fs}" font-weight="700" fill="${DC}" paint-order="stroke" stroke="var(--sheet)" stroke-width="${3 + TS}">${lab}</text></g>`;
        };
      const mm = (v) => (v >= 10 ? v.toFixed(1) + "m" : v.toFixed(2) + "m"),
        gap = Math.max(16, fs * 1.6);
      (S.wings || []).forEach((w) => {
        if (w.parent) return;
        const x = num0(w.x),
          z = num0(w.z),
          ww = num(w.w, 1),
          dd = num(w.d, 1);
        const wc = [x + ww / 2, z + dd / 2];
        g +=
          DIM([x, z], [x + ww, z], -gap * 0.9, mm(ww), wc) +
          DIM([x, z], [x, z + dd], -gap * 0.9, mm(dd), wc);
      });
      let X0 = 1e9,
        X1 = -1e9,
        Z0 = 1e9,
        Z1 = -1e9;
      const ext = (q) => {
        X0 = Math.min(X0, q[0]);
        X1 = Math.max(X1, q[0]);
        Z0 = Math.min(Z0, q[2]);
        Z1 = Math.max(Z1, q[2]);
      };
      MODELS.forEach((m) => {
        const b = m.b;
        if (b.type === "prop" || b.type === "troof" || m.x0 == null) return;
        const fp = footprint(m);
        if (fp) fp.forEach(ext);
        const sh = 0.45,
          xa = m.x0 + sh,
          xb = m.x1 - sh,
          out = m.d1 - sh,
          inn = m.d0 + sh,
          A = toW(b, [xa, 0, out]),
          B = toW(b, [xb, 0, out]),
          C = toW(b, [xb, 0, inn]),
          BC = toW(b, [(xa + xb) / 2, 0, (out + inn) / 2]),
          bc = [BC[0], BC[2]];
        g += DIM([A[0], A[2]], [B[0], B[2]], gap, mm(xb - xa), bc);
        if (b.type !== "run" || s * (out - inn) > fs * 2.2)
          g += DIM([B[0], B[2]], [C[0], C[2]], gap * 0.7, mm(out - inn), bc);
      });
      (S.wings || []).forEach((w) => {
        ext([num0(w.x), 0, num0(w.z)]);
        ext([num0(w.x) + num(w.w, 1), 0, num0(w.z) + num(w.d, 1)]);
      });
      if (X1 > X0) {
        const o2 = gap * 2.5,
          oc = [(X0 + X1) / 2, (Z0 + Z1) / 2];
        g +=
          DIM([X0, Z1], [X1, Z1], o2, "Overall " + mm(X1 - X0), oc) +
          DIM([X1, Z0], [X1, Z1], o2, "Overall " + mm(Z1 - Z0), oc);
      }
    }
    g += `<g transform="translate(${W - 70},${H - 24})"><line x1="0" x2="${s * 2}" y1="0" y2="0" stroke="var(--ink)" stroke-width="2"/><text x="${s}" y="-6" text-anchor="middle" font-size="${11 * TS}" fill="var(--ink)">2m</text></g>`;
    {
      const o = selObj();
      if (o && SELB.t === "b" && o.type === "run") {
        const { din, dout } = geomW(),
          dm = (din + dout) / 2,
          L = num(o.len, 1),
          hr = Math.max(9, 12 * (S.ptxt || 1));
        [
          [0, "s"],
          [L, "e"],
        ].forEach(([x, k]) => {
          const q = toW(o, [x, 0, dm]);
          g += `<g data-rh="${k}" style="cursor:ew-resize"><circle cx="${PX(q[0])}" cy="${PZ(q[2])}" r="${hr + 8}" fill="transparent"/><circle cx="${PX(q[0])}" cy="${PZ(q[2])}" r="${hr}" fill="#fff" stroke="#d0262c" stroke-width="3"/><path d="M${PX(q[0]) - hr * 0.5} ${PZ(q[2])}h${hr}" stroke="#d0262c" stroke-width="2.5"/></g>`;
        });
        const c = toW(o, [L / 2, 0, dout + 0.9]);
        g += `<text x="${PX(c[0])}" y="${PZ(c[2])}" text-anchor="middle" font-size="${12 * (S.ptxt || 1)}" font-weight="700" fill="#d0262c" paint-order="stroke" stroke="#fff" stroke-width="4" pointer-events="none">Drag the red ends to resize</text>`;
      }
    }
    svg.innerHTML = g;
    const o = selObj(),
      pb = $("psb");
    if (TR.mode && view === "plan") {
      pb.innerHTML = trBar();
      pb.hidden = false;
      const inp = $("trd");
      if (inp && !inp.dataset.f) {
        inp.dataset.f = 1;
        setTimeout(() => inp.focus(), 30);
      }
    } else if (o && view === "plan") {
      const nm =
        SELB.t === "w"
          ? o.name || "Building"
          : SELB.t === "c"
            ? "Chimney"
            : o.type === "prop"
              ? PROPN[o.kind]
              : o.name || TYPEN[o.type];
      pb.innerHTML = `<b>${esc(nm)}</b>${o.type === "prop" ? `<button data-pturn="${o.id}">Turn 45°</button><button data-pdup="${o.id}">Copy</button>` : ""}<button class="danger" data-act="delete">Delete</button><button data-act="desel">Done</button>`;
      pb.hidden = false;
    } else pb.hidden = true;
  }
  function zoomPlan(px, py, f) {
    const s2 = Math.min(400, Math.max(3, PV.s * f));
    PV.ox = px - ((px - PV.ox) * s2) / PV.s;
    PV.oy = py - ((py - PV.oy) * s2) / PV.s;
    PV.s = s2;
    drawPlan();
  }
  let schT = 0;
  const schedule = () => {
    cancelAnimationFrame(schT);
    schT = requestAnimationFrame(() => update(true));
  };
  (() => {
    const svg = $("pl"),
      pts = new Map();
    let drag = null,
      moved = 0,
      pinch = 0;
    const world = (e) => {
      const r = svg.getBoundingClientRect();
      return [(e.clientX - r.left - PV.ox) / PV.s, (e.clientY - r.top - PV.oy) / PV.s];
    };
    svg.addEventListener("pointerdown", (e) => {
      svg.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      moved = 0;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a[0] - b[0], a[1] - b[1]);
        drag = null;
        return;
      }
      const ld = e.target.closest("[data-lad]");
      if (ld) {
        drag = { lad: +ld.dataset.lad };
        return;
      }
      const rh = e.target.closest("[data-rh]"),
        ro = selObj();
      if (rh && ro && ro.type === "run") {
        drag = {
          rh: rh.dataset.rh,
          run: ro,
          L0: num(ro.len, 1),
          x0: num0(ro.x),
          z0: num0(ro.z),
          start: world(e),
        };
        return;
      }
      const el = e.target.closest("[data-sel]");
      if (!el) {
        drag = { pan: true };
        return;
      }
      const [t, id] = el.dataset.sel.split(":"),
        obj = t === "w" ? wingById(id) : t === "c" ? chimById(id) : blockById(id);
      if (!obj) {
        drag = { pan: true };
        return;
      }
      let mv = obj;
      if (t === "b" && obj.type === "chim") mv = chimById(obj.chim) || obj;
      drag = {
        t,
        id,
        mv,
        start: world(e),
        ox: num0(mv.x),
        oz: num0(mv.z),
        kids:
          t === "w"
            ? [
                ...S.chims.filter((c) => c.wing === id),
                ...S.wings.filter((c) => c.parent === id),
                ...S.blocks.filter(
                  (b) =>
                    b.wing === id &&
                    (["bird", "load", "prop"].includes(b.type) ||
                      (b.type === "run" && b.fit === false)),
                ),
              ].map((o) => [o, num0(o.x), num0(o.z)])
            : [],
      };
    });
    svg.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()],
          d = Math.hypot(a[0] - b[0], a[1] - b[1]),
          r = svg.getBoundingClientRect();
        if (pinch) zoomPlan((a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, d / pinch);
        pinch = d;
        moved += 10;
        return;
      }
      const dx = e.clientX - p[0],
        dy = e.clientY - p[1];
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved < 6 || !drag) return;
      if (drag.pan) {
        PV.ox += dx;
        PV.oy += dy;
        drawPlan();
        return;
      }
      if (drag.lad != null) {
        const ac = (S.access || [])[drag.lad];
        if (!ac) return;
        const w1 = world(e),
          { din: ld0, dout: ld1 } = geomW();
        let best = null;
        S.blocks
          .filter((b) => b.type === "run")
          .forEach((b) => {
            const L = toL(b, [w1[0], 0, w1[1]]),
              len = num(b.len, 1),
              t = Math.max(0, Math.min(len, L[0])),
              dd = Math.hypot(L[0] - t, L[2] - (ld0 + ld1) / 2);
            if (!best || dd < best.dd) best = { b, t, dd };
          });
        if (!best) return;
        ac.block = best.b.id;
        ac.at = Math.round(best.t * 10) / 10;
        schedule();
        return;
      }
      if (drag.rh) {
        const w1 = world(e),
          r = drag.run,
          a = num0(r.ry) * DEG,
          ux = Math.cos(a),
          uz = -Math.sin(a),
          t = Math.round(((w1[0] - drag.start[0]) * ux + (w1[1] - drag.start[1]) * uz) * 10) / 10;
        r.fit = false;
        if (drag.rh === "e") r.len = +Math.max(1, drag.L0 + t).toFixed(2);
        else {
          const tt = Math.min(t, drag.L0 - 1);
          r.len = +(drag.L0 - tt).toFixed(2);
          r.x = +(drag.x0 + ux * tt).toFixed(3);
          r.z = +(drag.z0 + uz * tt).toFixed(3);
        }
        schedule();
        return;
      }
      if (drag.t === "b" && drag.mv.type === "troof") return;
      const w1 = world(e),
        sn = (v) => Math.round(v * 20) / 20,
        ddx = w1[0] - drag.start[0],
        ddz = w1[1] - drag.start[1];
      drag.mv.x = sn(drag.ox + ddx);
      drag.mv.z = sn(drag.oz + ddz);
      if (drag.t === "b" && drag.mv.type === "run") drag.mv.fit = false;
      drag.kids.forEach(([o, x, z]) => {
        o.x = sn(x + ddx);
        o.z = sn(z + ddz);
      });
      schedule();
    });
    svg.addEventListener("pointerup", (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
      if (drag && drag.rh) {
        drag = null;
        propsUI();
        drawPlan();
        return;
      }
      if (drag && drag.lad != null) {
        if (moved < 6) toast("Drag the ladder to move it – along this side, or onto another side");
        drag = null;
        accUI();
        drawPlan();
        return;
      }
      if (moved < 6 && drag) {
        if (drag.pan) SELB = null;
        else SELB = { t: drag.t, id: drag.id };
        propsUI();
        drawPlan();
      } else if (drag && !drag.pan) {
        propsUI();
      }
      drag = null;
    });
    svg.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const r = svg.getBoundingClientRect();
        zoomPlan(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.2 : 1 / 1.2);
      },
      { passive: false },
    );
  })();

  // ---------- properties panel for the selected building / block ----------
  const F = (lbl, f, v, o = {}) =>
    `<div${o.wide ? ' class="wide"' : ""}><label>${lbl}</label><input data-pf="${f}" type="${o.text ? "text" : "number"}" ${o.text ? "" : `step="${o.step || 0.05}" inputmode="decimal"`} value="${esc(v ?? "")}" ${o.ph ? `placeholder="${esc(o.ph)}"` : ""}></div>`;
  const SEL = (lbl, f, v, opts) =>
    `<div><label>${lbl}</label><select data-pf="${f}">${opts.map(([a, t]) => `<option value="${a}" ${String(v ?? "") === String(a) ? "selected" : ""}>${t}</option>`).join("")}</select></div>`;
  const CHK = (lbl, f, v) =>
    `<label class="chk wide"><input type="checkbox" data-pf="${f}" ${v ? "checked" : ""}> ${lbl}</label>`;
  function selObj() {
    if (!SELB) return null;
    return SELB.t === "w"
      ? wingById(SELB.id)
      : SELB.t === "c"
        ? chimById(SELB.id)
        : blockById(SELB.id);
  }
  function propsUI() {
    const o = selObj(),
      el = $("props");
    if (!o) {
      SELB = null;
      el.innerHTML =
        '<div class="sub">Tap the building, a chimney or a scaffold block on the <b>Plan</b> to change it or move it, or add something with the buttons above.</div>';
      return;
    }
    let h = "",
      btn = "";
    if (SELB.t === "w") {
      const kids = S.wings.filter((c) => c.parent === o.id);
      h = `<h3>Building: ${esc(o.name || "")}</h3><div class="pgrid">${F("Name", "name", o.name, { text: 1 })}${SEL("Type", "kind", o.kind || "", BTYPES)}${F("Width (m)", "w", o.w)}${F("Depth (m)", "d", o.d)}${F("Eaves height (m)", "eaves", o.eaves)}${SEL(
        "Roof",
        "roof",
        o.roof,
        [
          ["gable", "Gable"],
          ["hip", "Hipped"],
          ["halfhip", "Half-hipped"],
          ["flat", "Flat"],
          ["mono", "Lean-to (mono-pitch)"],
        ],
      )}${o.roof !== "flat" ? F("Roof pitch (°)", "pitch", o.pitch, { step: 1 }) : F("Parapet wall height (m above roof)", "parapet", o.parapet ?? "", { ph: "0 = none" })}${
        o.roof === "gable" || o.roof === "halfhip"
          ? SEL("Ridge runs", "ridge", o.ridge, [
              ["x", "Along the width"],
              ["z", "Along the depth"],
            ])
          : ""
      }${
        o.roof === "mono"
          ? SEL("High side", "high", o.high || "back", [
              ["back", "Back (top of the plan)"],
              ["front", "Front (bottom of the plan)"],
            ])
          : ""
      }${o.roof !== "flat" ? F("Eaves overhang (m)", "ov", o.ov ?? 0.3, { step: 0.05 }) : ""}${(o.roof === "gable" || o.roof === "hip" || o.roof === "halfhip") && o.ridge !== "z" ? F("Dormers at the front", "dormF", o.dormF ?? 0, { step: 1 }) + F("Dormers at the back", "dormB", o.dormB ?? 0, { step: 1 }) : ""}${F("Position X (m)", "x", o.x)}${F("Position Z (m)", "z", o.z)}${CHK("Scaffold works round this building (untick if the scaffold may stand on or over it as drawn)", "avoid", o.avoid !== false)}</div><div class="sub">Ridge height ${f1(ridgeOf(o))}m.${num(o.ov, 0.3) > geomW().din - 0.05 && o.roof !== "flat" ? ` <b>The ${num(o.ov, 0.3)}m overhang reaches the inside standards (${geomW().din}m off the wall): set the top lift below the gutter, or use hop-up brackets.</b>` : ""}</div>
    <div class="pbtn" style="margin-top:8px"><button data-act="addBay">Add bay window</button><button data-act="addBay2">Add 2-storey bay</button><button data-act="addPorch">Add porch</button>${kids.length ? `<span class="sub">${kids.length} attached: ${kids.map((c) => esc(c.name)).join(", ")}</span>` : ""}</div>`;
      btn = `<button data-act="trace" class="pri">Scaffold all round</button><select id="traceSide" aria-label="Side">${ORD.map((s) => `<option>${s}</option>`).join("")}</select><button data-act="traceOne">Scaffold this side</button><button data-act="addChim">Add chimney</button><button data-act="addRoof">Add temporary roof</button><button data-act="addBird">Add birdcage inside</button>`;
    } else if (SELB.t === "c") {
      const has = S.blocks.some((b) => b.type === "chim" && b.chim === o.id);
      h = `<h3>Chimney</h3><div class="pgrid">${F("Width (m)", "w", o.w)}${F("Depth (m)", "d", o.d)}${F("Top of stack (m)", "top", o.top)}${F("Position X (m)", "x", o.x)}${F("Position Z (m)", "z", o.z)}</div>`;
      btn = has ? "" : `<button data-act="addChimScaf" class="pri">Add chimney scaffold</button>`;
    } else {
      const b = o;
      h = `<h3>${esc(b.type === "prop" ? PROPN[b.kind] : b.name || TYPEN[b.type])}</h3><div class="pgrid">`;
      if (b.type === "run") {
        const wg = wingById(b.wing),
          opts = [
            ["", "Main setting"],
            ["1", "Top lift only"],
            ["2", "Top two"],
            ["99", "Every lift"],
          ];
        const tm = MODELS.find((m) => m.b.id === b.id);
        h +=
          (tm && tm.b._so
            ? `<div class="wide note" style="margin:4px 0 6px">Set out ${f2s(tm.b._so)}m from the wall to clear a tall bay or projection — inside guardrails are added where the gap is open. Untick "Adjust automatically" to override.</div>`
            : "") +
          (tm && tm.trim && (tm.trim[0] > 0.01 || tm.trim[1] > 0.01)
            ? `<div class="wide note" style="margin:4px 0 6px">Adjusted automatically: stopped ${tm.trim[0] > 0.01 ? f2s(tm.trim[0]) + "m short at the left end" : ""}${tm.trim[0] > 0.01 && tm.trim[1] > 0.01 ? " and " : ""}${tm.trim[1] > 0.01 ? f2s(tm.trim[1]) + "m short at the right end" : ""} to clear a building. Untick "Adjust automatically" below to override.</div>`
            : "") +
          F("Name", "name", b.name, { text: 1 }) +
          F("Length (m)", "len", b.len) +
          F("Top platform height (m)", "ht", b.ht) +
          liftsHtml(b) +
          (wg
            ? CHK(`Follow the ${esc(b.side || "")} wall of ${esc(wg.name)}`, "fit", b.fit !== false)
            : "") +
          (b.fit === false || !wg
            ? F("Position X (m)", "x", b.x) +
              F("Position Z (m)", "z", b.z) +
              F("Angle (°)", "ry", b.ry, { step: 5 })
            : "") +
          CHK("Carry round the corner at the start", "js", b.js) +
          CHK("Carry round the corner at the end", "je", b.je) +
          (wg ? CHK("Table lifts stepping up the gable", "table", b.table) : "") +
          CHK("Public footpath: padding, lamps and signs", "pub", b.pub) +
          CHK("Pedestrian fan", "fan", b.fan) +
          F("Bay length (m)", "bay", b.bay, { ph: "Main: " + S.bay }) +
          SEL("Boarded lifts", "boarded", b.boarded || "", opts) +
          `<div class="wide sub" style="margin-top:10px"><b>Uneven ground</b> — how far the ground is below the house floor at each end. The scaffold builds up from the low side so the lifts stay level.</div>` +
          F("Ground drop at left end (m)", "dropA", b.dropA, { ph: "0" }) +
          F("Ground drop at right end (m)", "dropB", b.dropB, { ph: "0" }) +
          SEL("Sheeting on this side", "clad", b.clad || "", [
            ["", "Same as whole scaffold"],
            ["32", "None"],
            ["25", "Debris netting"],
            ["16", "Sheeted (Monaflex)"],
          ]) +
          `<div class="wide sub" style="margin-top:10px"><b>Beams over a conservatory, extension or gap</b> — standards that would land on a lower roof are bridged automatically. Or set a gap yourself:</div>` +
          F("Bridge a gap from (m)", "gapAt", b.gapAt, { ph: "e.g. 2.0" }) +
          F("Gap width (m)", "gapW", b.gapW, { ph: "0 = none" }) +
          SEL("Beams at", "gapLift", String(b.gapLift || ""), [
            ["", "Lowest lift that clears the roof"],
            ["1", "Lift 1"],
            ["2", "Lift 2"],
            ["3", "Lift 3"],
            ["4", "Lift 4"],
          ]) +
          CHK(
            "Adjust automatically round buildings, extensions and conservatories (stop short at the ends, bridge on beams in the middle). Untick to set it all yourself.",
            "autoBridge",
            b.autoBridge !== false,
          );
        btn = `<button data-act="addLadder">Add ladder</button><button data-act="addStair">Add stair tower</button><button data-act="addLoad">Add loading bay</button><button data-act="addSign">Add sign board</button>`;
      } else if (b.type === "bird" || b.type === "load")
        h +=
          (b.type === "bird" ? F("Name", "name", b.name, { text: 1 }) : "") +
          F(b.type === "load" ? "Width along the scaffold (m)" : "Length (m)", "len", b.len) +
          F(b.type === "load" ? "Depth out from the scaffold (m)" : "Width (m)", "wid", b.wid) +
          F("Floor level it stands on (m)", "base", b.base) +
          F("Platform height above that (m)", "ht", b.ht) +
          F("Position X (m)", "x", b.x) +
          F("Position Z (m)", "z", b.z) +
          F("Angle (°)", "ry", b.ry, { step: 5 }) +
          (b.type === "bird"
            ? CHK("Guardrails round the platform", "rails", b.rails !== false) +
              CHK("Ladder access", "ladder", b.ladder !== false)
            : "");
      else if (b.type === "chim")
        h +=
          F("Platform below the top of the stack (m)", "below", b.below) +
          SEL("Platform width", "boards", b.boards, [
            [2, "2 boards"],
            [3, "3 boards"],
            [4, "4 boards"],
            [5, "5 boards"],
          ]) +
          CHK("Roof ladder from the main scaffold", "access", b.access !== "none");
      else if (b.type === "troof")
        h +=
          SEL("Roof shape", "style", b.style, [
            ["duo", "Duo-pitch (ridge)"],
            ["mono", "Mono-pitch"],
          ]) +
          F("Pitch (°)", "pitch", b.pitch, { step: 1 }) +
          F("Headroom above the top lift (m)", "clear", b.clear) +
          SEL("Sheeting", "sheet", b.sheet, [
            ["tin", "Corrugated tin on purlins"],
            ["keder", "Keder PVC sheets in the beams"],
          ]) +
          CHK("Sheet in the gable ends", "gables", b.gables !== false) +
          CHK("Side skirts down from the eaves", "skirts", b.skirts);
      else if (b.type === "prop")
        h +=
          SEL("Item", "kind", b.kind, Object.entries(PROPN)) +
          F("Position X (m)", "x", b.x) +
          F("Position Z (m)", "z", b.z) +
          F("Angle (°)", "ry", b.ry, { step: 5 }) +
          (b.kind === "sign"
            ? F("Height of the sign centre (m)", "y", b.y) +
              F("Sign width (m)", "sw", b.sw ?? 2.4, { step: 0.1 }) +
              F("Sign height (m)", "sh", b.sh ?? 1.2, { step: 0.1 }) +
              `<div style="grid-column:1/-1"><button data-signup>${S.co.signImg ? "Change sign picture" : "Upload your sign board"}</button>${S.co.signImg ? " <button data-rmsign>Use the made-up sign</button>" : ""}</div>`
            : "") +
          (b.kind === "person"
            ? SEL("Pose", "pose", b.pose || "stand", [
                ["stand", "Standing"],
                ["walk", "Walking"],
                ["point", "Pointing"],
                ["carry", "Carrying a tube"],
              ]) +
              SEL("Clothing", "wear", b.wear || "vest", [
                ["vest", "Yellow hi-vis vest"],
                ["orange", "Orange hi-vis jacket"],
              ])
            : "") +
          (b.kind === "road" || b.kind === "path"
            ? F("Length (m)", "len", b.len ?? 20) +
              F("Width (m)", "wid", b.wid ?? (b.kind === "path" ? 2 : 6.5))
            : "") +
          (b.kind === "crossing"
            ? F("Road width (m)", "wid", b.wid ?? 6.5) +
              F("Crossing depth (m)", "dep", b.dep ?? 2.4)
            : "") +
          (b.kind === "lamp" ? F("Height (m)", "lh", b.lh ?? 6) : "") +
          (b.kind === "fence"
            ? SEL("Fence type", "ftype", b.ftype || "heras", Object.entries(FENCEN)) +
              F("Length (m)", "len", b.len ?? 10) +
              CHK("Ours — put it on the picking list", "ours", b.ours !== false)
            : "") +
          (b.kind === "cone"
            ? SEL("Cone size", "ch", String(b.ch || 0.75), [
                ["0.5", "500mm"],
                ["0.75", "750mm"],
                ["1", "1000mm"],
              ])
            : "");
      h += "</div>";
    }
    el.innerHTML =
      h +
      `<div class="pbtn">${btn}<button data-act="delete" class="danger">Delete</button><button data-act="desel">Done</button></div>`;
  }
  const REPROPS = ["fit", "roof", "kind", "type", "ridge", "ftype"];
  // the run's lifts: a row each – height, boards, take out – and ＋ Add a lift; when worked-out lifts aren't 2m apart,
  // what James wants to do about it
  const liftRowsOf = (o) => {
    const m = MODELS.find((x) => x.b && x.b.id === o.id && x.kind === "run");
    return (
      liftRows(o) ||
      (m ? m.lv.map((h) => ({ h, b: m.boarded.some((x) => Math.abs(x - h) < 1e-6) })) : [])
    );
  };
  function liftsHtml(b) {
    const m = MODELS.find((x) => x.b && x.b.id === b.id && x.kind === "run"),
      own = !!liftRows(b),
      rows = liftRowsOf(b),
      W = m && m.liftWarn;
    return `<div class="wide lifts" id="liftsbox"><label>Lifts${own ? "" : " (worked out – change any to set your own)"}</label>
      ${W ? `<div class="note liftwarn">⚠ The top platform is at ${f2s(W.H)}m, so the lifts can't all be 2m (now ${W.lv.map(f2s).join("m, ")}m). What do you want to do?${W.choices.map((c, i) => `<button data-lopt="${i}">${esc(c.t)}</button>`).join("")}<button data-lopt="keep">Keep it as it is</button></div>` : ""}
      ${rows
        .map(
          (r, i) =>
            `<div class="lrow"><span>Lift ${i + 1}</span><input data-lh="${i}" type="number" step="0.1" min="0.5" inputmode="decimal" value="${r.h}" aria-label="Lift ${i + 1} height (m)"><label class="chk"><input type="checkbox" data-lb="${i}" ${r.b ? "checked" : ""}> Boards</label><button data-lx="${i}" aria-label="Take out lift ${i + 1}">✕</button></div>`,
        )
        .join("")}
      <div class="bar"><button data-ladd>＋ Add a lift</button>${own ? "<button data-lauto>Work them out again</button>" : ""}</div></div>`;
  }
  let liftT = 0;
  function liftEdit(fn) {
    const o = selObj();
    if (!o || o.type !== "run") return;
    const rows = fn(liftRowsOf(o).map((r) => ({ ...r })));
    if (rows === null) delete o.lifts;
    else {
      o.lifts = rows;
      const R = liftRows(o);
      if (R) o.ht = R[R.length - 1].h;
      else delete o.lifts;
    }
    update(true);
    propsUI();
  }
  function setField(o, f, t) {
    if (f === "kind" && o && o.eaves !== undefined && BPRE[t.value]) {
      Object.assign(o, BPRE[t.value]);
      if (o.roof === "flat" && o.parapet == null) o.parapet = 0;
    }
    if (t.type === "checkbox") o[f] = f === "access" ? (t.checked ? "auto" : "none") : t.checked;
    else if (t.type === "number") {
      o[f] = t.value === "" ? "" : parseFloat(t.value);
    } else o[f] = t.value;
  }
  function addBlock(b, sel = true) {
    b.id = b.id || uid();
    S.blocks.push(b);
    if (sel) SELB = { t: "b", id: b.id };
    accUI();
    update(true);
    propsUI();
    return b;
  }
  function firstRun() {
    const s = selObj();
    if (SELB && SELB.t === "b" && s && s.type === "run") return s;
    return S.blocks.find((b) => b.type === "run");
  }
  function onFace(run, x, off) {
    const { dout } = geomW(),
      q = toW(run, [x, 0, dout + (off || 0)]);
    return { x: +q[0].toFixed(2), z: +q[2].toFixed(2), ry: num0(run.ry) };
  }
  function act(a) {
    const o = selObj(),
      W0 = (S.wings || [])[0];
    if (a === "desel") {
      SELB = null;
      propsUI();
      drawPlan();
      return;
    }
    if (a === "delete") {
      if (!SELB) return;
      const { t, id } = SELB;
      if (t === "w") {
        const ch = S.chims.filter((c) => c.wing === id).map((c) => c.id);
        S.wings = S.wings.filter((w) => w.id !== id && w.parent !== id);
        S.chims = S.chims.filter((c) => c.wing !== id);
        S.blocks = S.blocks.filter(
          (b) =>
            !(b.wing === id && b.type !== "prop") && !(b.type === "chim" && ch.includes(b.chim)),
        );
      } else if (t === "c") {
        S.chims = S.chims.filter((c) => c.id !== id);
        S.blocks = S.blocks.filter((b) => !(b.type === "chim" && b.chim === id));
      } else S.blocks = S.blocks.filter((b) => b.id !== id);
      S.access = (S.access || []).filter((x) => blockById(x.block));
      SELB = null;
      propsUI();
      accUI();
      update(true);
      toast("Deleted");
      return;
    }
    if ((a === "addBay" || a === "addBay2" || a === "addPorch") && o && o.eaves !== undefined) {
      const W = num(o.w, 1),
        D = num(o.d, 1),
        bay = a !== "addPorch",
        bw = bay ? 2.4 : 2.0,
        bd = bay ? 0.8 : 1.5,
        c = {
          id: uid(),
          parent: o.id,
          name: bay ? (a === "addBay2" ? "Two-storey bay" : "Bay window") : "Porch",
          kind: bay ? "bay" : "porch",
          x: +(num0(o.x) + (bay ? W * 0.25 : W * 0.6) - bw / 2).toFixed(2),
          z: +(num0(o.z) + D).toFixed(2),
          w: bw,
          d: bd,
          eaves: a === "addBay2" ? Math.max(2.6, num(o.eaves, 5) - 0.4) : 2.5,
          roof: bay ? "hip" : "gable",
          pitch: bay ? 30 : 35,
          ridge: "z",
        };
      S.wings.push(c);
      SELB = { t: "w", id: c.id };
      update(true);
      propsUI();
      toast(
        `${c.name} added on the front — drag it along the wall. The scaffold ${a === "addBay2" ? "sets out to clear it" : "bridges over it"} automatically.`,
      );
      return;
    }
    if (a === "addCons") {
      const m = W0;
      if (!m) {
        toast("Draw the house first");
        return;
      }
      const w = {
        id: uid(),
        name: "Conservatory",
        kind: "cons",
        x: +(num0(m.x) + num(m.w, 1) / 2 - 2).toFixed(2),
        z: +(num0(m.z) - 3).toFixed(2),
        w: 4,
        d: 3,
        eaves: 2.2,
        roof: "mono",
        pitch: 15,
        ridge: "x",
        high: "front",
      };
      S.wings.push(w);
      SELB = { t: "w", id: w.id };
      PV.fit = true;
      update(true);
      propsUI();
      toast("Conservatory added behind the house — drag it where it goes");
      return;
    }
    if (a === "addWing") {
      const last = S.wings[S.wings.length - 1],
        w = {
          id: uid(),
          name: S.wings.length ? "Extension" : "House",
          x: last ? num0(last.x) + num(last.w, 1) : 0,
          z: last ? num0(last.z) + Math.max(0, num(last.d, 1) - 3.5) : 0,
          w: last ? 4 : 9.6,
          d: last ? 3.5 : 6,
          eaves: last ? 2.6 : 5.4,
          roof: last ? "mono" : "gable",
          pitch: last ? 15 : 35,
          ridge: "x",
        };
      S.wings.push(w);
      SELB = { t: "w", id: w.id };
      PV.fit = true;
      update(true);
      propsUI();
      return;
    }
    if (a === "trace" && o) {
      S.blocks = S.blocks.filter((b) => !(b.type === "run" && b.wing === o.id));
      S.blocks.push(...freeRuns(o));
      S.access = (S.access || []).filter((x) => blockById(x.block));
      accUI();
      PV.fit = true;
      update(true);
      toast("Scaffold added all round " + o.name);
      return;
    }
    if (a === "traceOne" && o) {
      const side = $("traceSide").value;
      if (S.blocks.some((b) => b.type === "run" && b.wing === o.id && b.side === side)) {
        toast("There is already scaffold on that side");
        return;
      }
      const r = traceRuns(o, [side])[0],
        i = ORD.indexOf(side),
        nb = (s) => S.blocks.find((b) => b.type === "run" && b.wing === o.id && b.side === s),
        pv = nb(ORD[(i + 3) % 4]),
        nx = nb(ORD[(i + 1) % 4]);
      r.js = !!pv;
      r.je = !!nx;
      if (pv) pv.je = true;
      if (nx) nx.js = true;
      S.blocks.push(r);
      accUI();
      update(true);
      toast(`Scaffold added to the ${side}`);
      return;
    }
    if (a === "addChim" && o) {
      const alongX = o.ridge !== "z",
        c = {
          id: uid(),
          wing: o.id,
          x: +(num0(o.x) + num(o.w, 1) * (alongX ? 0.75 : 0.5)).toFixed(2),
          z: +(num0(o.z) + num(o.d, 1) * (alongX ? 0.5 : 0.75)).toFixed(2),
          w: 0.9,
          d: 0.6,
          top: 0,
        };
      c.top = +(roofH(o, c.x, c.z, true) + 1.2).toFixed(2);
      S.chims.push(c);
      SELB = { t: "c", id: c.id };
      update(true);
      propsUI();
      return;
    }
    if (a === "addChimScaf" && o) {
      addBlock({ type: "chim", name: "Chimney scaffold", chim: o.id, below: 1.0, boards: 3 });
      return;
    }
    if (a === "addRoof" && o) {
      if (S.blocks.some((b) => b.type === "troof" && b.wing === o.id)) {
        toast("This building already has a temporary roof");
        return;
      }
      addBlock({
        type: "troof",
        name: "Temporary roof",
        wing: o.id,
        style: "duo",
        pitch: 15,
        clear: 2,
        sheet: "tin",
        gables: true,
        skirts: false,
      });
      return;
    }
    if (a === "addBird") {
      const w = o && SELB.t === "w" ? o : W0;
      addBlock({
        type: "bird",
        name: "Birdcage",
        wing: w ? w.id : "",
        x: w ? +(num0(w.x) + 1).toFixed(2) : 0,
        z: w ? +(num0(w.z) + 1).toFixed(2) : 0,
        ry: 0,
        len: 3.2,
        wid: 2.4,
        base: 0,
        ht: 2.4,
        rails: true,
        ladder: true,
      });
      return;
    }
    if (a === "addLoad") {
      const r = firstRun();
      if (!r) {
        toast("Add a scaffold run first");
        return;
      }
      const L = num(r.len, 1),
        p = onFace(r, Math.max(0, L / 2 - 1.2));
      addBlock({
        type: "load",
        name: "Loading bay",
        ...p,
        len: 2.4,
        wid: 2.0,
        base: 0,
        ht: levelsFor(num(r.ht, 2))[0],
      });
      return;
    }
    if (a === "addLadder" || a === "addStair") {
      const r = firstRun();
      if (!r) {
        toast("Add a scaffold run first");
        return;
      }
      S.access = [
        ...(S.access || []),
        {
          type: a === "addStair" ? "stair" : "ladder",
          block: r.id,
          at: +(num(r.len, 4) / 2).toFixed(1),
        },
      ];
      accUI();
      update(true);
      toast(
        a === "addStair"
          ? "Stair tower added — set its position under Access"
          : "Ladder added — set its position under Access",
      );
      return;
    }
    if (a === "addFence") {
      const r = firstRun();
      const L = r ? num(r.len, 1) : 10,
        p = r ? onFace(r, L / 2, 4.2) : { x: 0, z: 10, ry: 0 };
      addBlock({
        type: "prop",
        kind: "fence",
        ftype: "heras",
        ...p,
        len: Math.ceil(L + 4),
        ours: true,
      });
      toast("Fence added — choose its type and length, and drag it into place");
      return;
    }
    if (a === "addRoad" || a === "addPath" || a === "addCrossing" || a === "addLamp") {
      const kind = { addRoad: "road", addPath: "path", addCrossing: "crossing", addLamp: "lamp" }[
          a
        ],
        r = firstRun();
      let p = { x: 0, z: 10, ry: 0 };
      const L = r ? num(r.len, 1) : 10;
      if (r)
        p =
          kind === "road"
            ? onFace(r, L / 2, 6.5)
            : kind === "path"
              ? onFace(r, L / 2, 2.2)
              : kind === "crossing"
                ? onFace(r, L + 3, 6.5)
                : onFace(r, L + 1.5, 3.6);
      const ex =
        kind === "road"
          ? { len: Math.max(20, Math.ceil(L + 12)), wid: 6.5 }
          : kind === "path"
            ? { len: Math.max(20, Math.ceil(L + 12)), wid: 2 }
            : kind === "crossing"
              ? { wid: 6.5, dep: 2.4 }
              : { lh: 6 };
      addBlock({ type: "prop", kind, ...p, ...ex });
      toast(PROPN[kind] + " added — drag it into place on the Plan");
      return;
    }
    if (a === "addSign" || a === "addPerson" || a === "addCone" || a === "addSleeper") {
      const kind = { addSign: "sign", addPerson: "person", addCone: "cone", addSleeper: "sleeper" }[
          a
        ],
        r = firstRun();
      let p = { x: 0, z: 0, ry: 0 };
      if (r) {
        const L = num(r.len, 1);
        p =
          kind === "sign"
            ? onFace(r, Math.min(L - 1.3, 1.3), 0.16)
            : onFace(
                r,
                L / 2 + (Math.random() - 0.5) * 2,
                kind === "sleeper" ? 3.2 : kind === "cone" ? 1.0 : 1.8,
              );
      } else if (W0) p = { x: num0(W0.x) + 1, z: num0(W0.z) + num(W0.d, 1) + 2, ry: 0 };
      addBlock({ type: "prop", kind, ...p, ...(kind === "sign" ? { y: 3 } : {}) });
      return;
    }
  }

  // ---------- UI ----------
  function accUI() {
    const runs = S.blocks.filter((b) => b.type === "run");
    $("acc").innerHTML =
      (S.access || [])
        .map(
          (a, i) => `<div class="arow">
   <div>${i ? "" : "<label>Type</label>"}<select data-ai="${i}" data-af="type" aria-label="Access type"><option value="ladder" ${a.type === "ladder" || !a.type ? "selected" : ""}>Ladder</option><option value="stair" ${a.type === "stair" ? "selected" : ""}>Stair tower</option><option value="ramp" ${a.type === "ramp" ? "selected" : ""}>Ramp to lift 1 (1 in 4, runs alongside)</option></select></div>
   <div>${i ? "" : "<label>Scaffold run</label>"}<select data-ai="${i}" data-af="block" aria-label="Scaffold run">${runs.map((r) => `<option value="${r.id}" ${a.block === r.id ? "selected" : ""}>${esc(r.name || "Run")}</option>`).join("")}</select></div>
   <div>${i ? "" : "<label>From left (m)</label>"}<input data-ai="${i}" data-af="at" type="number" step="0.1" min="0" inputmode="decimal" value="${esc(a.at)}" aria-label="Distance from left end"></div>
   ${a.type === "stair" || a.type === "ramp" ? "<div></div>" : `<div>${i ? "" : "<label>Climbs</label>"}<select data-ai="${i}" data-af="dir" aria-label="Which way the ladder climbs"><option value="1" ${!(parseFloat(a.dir) < 0) ? "selected" : ""}>Towards the right →</option><option value="-1" ${parseFloat(a.dir) < 0 ? "selected" : ""}>← Towards the left</option></select></div>`}
   <button class="x" data-arm="${i}" aria-label="Remove access point">×</button></div>`,
        )
        .join("") || '<div class="sub">No access added yet.</div>';
  }
  const money = (v) =>
    "£" + (+v || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function costCalc() {
    const c = S.cost,
      m2 = c.basis === "m2",
      runs = S.blocks.filter((b) => b.type === "run"),
      qty = runs.reduce((t, b) => t + (m2 ? num(b.len, 0) * num(b.ht, 0) : num(b.len, 0)), 0),
      rate = +c.rate || 0,
      base = qty * rate,
      ex = (c.extras || []).filter((x) => x.d || +x.a),
      exT = ex.reduce((t, x) => t + (+x.a || 0), 0),
      sub = base + exT,
      vat = c.vat ? sub * 0.2 : 0;
    return { qty, unit: m2 ? "m²" : "m", rate, base, ex, sub, vat, total: sub + vat };
  }
  function costRows() {
    $("cx").innerHTML = (S.cost.extras || [])
      .map(
        (x, i) =>
          `<div class="cxrow"><input data-ci="${i}" data-cf="d" value="${esc(x.d || "")}" placeholder="e.g. Chimney scaffold, temporary roof, licence" aria-label="Extra description"><input data-ci="${i}" data-cf="a" type="number" step="0.01" inputmode="decimal" value="${esc(x.a || "")}" placeholder="£" aria-label="Extra amount"><button class="x" data-cxrm="${i}" aria-label="Remove extra">×</button></div>`,
      )
      .join("");
  }
  function costTot() {
    const k = costCalc();
    $("ctot").innerHTML =
      `<table class="ctab"><tr><td>${k.qty.toFixed(1)} ${k.unit} of scaffold runs @ ${money(k.rate)} per ${k.unit}</td><td>${money(k.base)}</td></tr>${k.ex.map((x) => `<tr><td>${esc(x.d || "Extra")}</td><td>${money(x.a)}</td></tr>`).join("")}<tr><td>Subtotal</td><td>${money(k.sub)}</td></tr>${S.cost.vat ? `<tr><td>VAT 20%</td><td>${money(k.vat)}</td></tr>` : ""}<tr class="tot"><td>Total</td><td>${money(k.total)}</td></tr></table>`;
  }
  function pdfUI() {
    const p = S.pdf;
    R.querySelectorAll("[data-pw]").forEach((e) => (e.value = p[e.dataset.pw] || ""));
    $("pdfsecs").innerHTML = (p.sections || [])
      .map(
        (s, i) =>
          `<div class="psec"><input data-ps="${i}" data-pk="h" value="${esc(s.h || "")}" placeholder="Heading, e.g. Hire period" aria-label="Section heading"><textarea data-ps="${i}" data-pk="t" rows="3" placeholder="Text. Start a line with - to make it a bullet." aria-label="Section text">${esc(s.t || "")}</textarea><button class="x" data-psrm="${i}" aria-label="Remove section">×</button></div>`,
      )
      .join("");
  }
  function layersUI() {
    $("layers").innerHTML =
      "<span>Show:</span>" +
      LAYERS.map(
        ([k, t]) =>
          `<button data-layer="${k}" aria-pressed="${!(S.hide || []).includes(k)}">${t}</button>`,
      ).join("");
  }
  function stockUI() {
    $("stockT").innerHTML = ALLT.map(
      (t) =>
        `<label><input type="checkbox" data-stock="t:${t[1]}" ${(S.notube || []).includes(t[1]) ? "" : "checked"}>${t[1]}ft</label>`,
    ).join("");
    $("stockB").innerHTML = ALLB.map(
      (t) =>
        `<label><input type="checkbox" data-stock="b:${t[1]}" ${(S.noboard || []).includes(t[1]) ? "" : "checked"}>${t[1]}ft</label>`,
    ).join("");
  }
  function sync() {
    layersUI();
    stockUI();
    pdfUI();
    $("cbasis").value = S.cost.basis;
    $("crate").value = S.cost.rate || "";
    $("cvat").checked = !!S.cost.vat;
    $("cpdf").checked = !!S.cost.inpdf;
    costRows();
    [
      "beam",
      "hop",
      "brace",
      "tiearea",
      "job",
      "bay",
      "boards",
      "lift1",
      "lift",
      "boarded",
      "clad",
      "client",
      "site",
      "ref",
      "pdate",
      "notes",
    ].forEach((k) => ($(k).value = S[k] ?? ""));
    R.querySelectorAll("[data-co]").forEach((e) => (e.value = S.co[e.dataset.co] || ""));
    logoPrev();
    signPrev();
    ["brick", "sole", "baselift"].forEach((k) => ($(k).checked = S[k] !== false && !!S[k]));
    $("autolift").checked = !!S.autolift;
    $("lift1").disabled = $("lift").disabled = !!S.autolift;
    accUI();
    propsUI();
  }
  const viewBlocks = () => S.blocks.filter((b) => VIEWT.includes(b.type));
  function tabs() {
    const vb = viewBlocks();
    if (!vb.some((b) => b.id === curId)) curId = vb[0]?.id || null;
    $("tabs").innerHTML =
      view === "plan"
        ? ""
        : vb
            .map(
              (b) =>
                `<button aria-pressed="${view === "2d" && b.id === curId}" data-t="${b.id}">${esc(b.name || TYPEN[b.type])}</button>`,
            )
            .join("");
  }
  const curModel = () => MODELS.find((m) => m.b.id === curId);
  function drawView() {
    if (view === "2d") {
      const m = curModel();
      draw2D($("sv"), m, "front");
      draw2D($("ss"), m, "end");
    } else if (view === "plan") drawPlan();
    else render3D();
    const m = view === "2d" ? curModel() : null,
      R = MODELS.filter((x) => x.b.type !== "prop"),
      runs = R.filter((x) => x.kind === "run");
    const st = m
      ? [
          ["Bays", m.n || 0],
          ["Lifts", (m.lv || []).length],
          ["Boarded", (m.boarded || []).length],
          ["Ties", m.ties || 0],
          ["Parts", m.P.length],
        ]
      : [
          ["Blocks", R.length],
          ["Runs", runs.length],
          ["Metres of run", runs.reduce((s, x) => s + x.L, 0).toFixed(1)],
          ["Ties", R.reduce((s, x) => s + (x.ties || 0), 0)],
          [
            "Parts",
            MODELS.reduce((s, x) => s + x.P.filter((p) => !p.nc && p.k !== "qty").length, 0),
          ],
        ];
    $("stats").innerHTML = st
      .map((a) => `<div><b>${a[1]}</b>${a[0]}${m ? "" : " (all)"}</div>`)
      .join("");
  }
  let rb = 0;
  function update(keepCam = true) {
    hideSel();
    const tt = ALLT.filter((t) => !(S.notube || []).includes(t[1])),
      bb = ALLB.filter((t) => !(S.noboard || []).includes(t[1]));
    TUBES = tt.length ? tt : ALLT;
    BOARDS = bb.length ? bb : ALLB;
    $("sty").textContent = S.style === "tech" ? "Style: technical" : "Style: realistic";
    $("bld").textContent = {
      solid: "Building: solid",
      see: "Building: see-through",
      hide: "Building: hidden",
    }[S.bldMode || "solid"];
    refit();
    autoJoin();
    computeSup();
    MODELS = S.blocks.map(buildBlock);
    $("jobsub").textContent = S.job || "";
    list();
    rmUI();
    extraUI();
    costTot();
    tabs();
    save();
    if (T) {
      if (view === "3d") {
        cancelAnimationFrame(rb);
        rb = requestAnimationFrame(() => build3D(keepCam));
      } else T.dirty = true;
    }
    drawView();
  }
  function setView(v) {
    view = v;
    ["vP", "v3", "v2"].forEach((id) =>
      $(id).setAttribute("aria-pressed", { vP: "plan", v3: "3d", v2: "2d" }[id] === v),
    );
    $("d2").hidden = v !== "2d";
    $("pl").toggleAttribute("hidden", v !== "plan");
    $("ptx").toggleAttribute("hidden", v !== "plan" && v !== "2d");
    if (v !== "plan") $("psb").hidden = true;
    if (T) T.r.domElement.style.display = v === "3d" ? "block" : "none";
    $("load").style.display = v === "3d" && !T ? "grid" : "none";
    $("zui").hidden = false;
    if (v === "3d" && T && T.dirty) build3D(true);
    $("hint").textContent = MAG
      ? "Magnifier on — move over the drawing (drag on a phone)"
      : v === "3d"
        ? "Drag to turn · right-drag or two fingers to move · tap a part · drag a person, cone or sleeper to move it"
        : v === "plan"
          ? "Tap to select · drag to move · pinch or scroll to zoom"
          : "Scroll or pinch to zoom · drag to move · tap a part";
    showTip(null);
    lens.hidden = true;
    tabs();
    drawView();
  }

  R.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.dataset.lb !== undefined) {
      const i = +t.dataset.lb;
      liftEdit((r) => {
        if (r[i]) r[i].b = t.checked;
        return r;
      });
      return;
    }
    if (t.dataset.lh !== undefined) {
      const v = parseFloat(t.value),
        i = +t.dataset.lh;
      if (!isFinite(v) || v < 0.5) return;
      clearTimeout(liftT);
      liftT = setTimeout(
        () =>
          liftEdit((r) => {
            if (r[i]) r[i].h = v;
            return r;
          }),
        600,
      );
      return;
    }
    if (t.dataset.pf) {
      const o = selObj();
      if (!o) return;
      setField(o, t.dataset.pf, t);
      if (SELB.t === "b" && o.type === "run" && ["x", "z", "ry", "len"].includes(t.dataset.pf))
        o.fit = false;
      if (t.dataset.pf === "fit" && o.fit) refit();
      // the lifts follow a new height straight away (and say if they can't all be 2m)
      if (o.type === "run" && t.dataset.pf === "ht") {
        update(true);
        if ($("liftsbox")) $("liftsbox").outerHTML = liftsHtml(o);
      }
      if (t.dataset.pf === "name") {
        accUI();
        tabs();
      }
      update(true);
      if (REPROPS.includes(t.dataset.pf)) propsUI();
      return;
    }
    if (t.dataset.pw) {
      S.pdf[t.dataset.pw] = t.value;
      save();
      return;
    }
    if (t.dataset.ps) {
      S.pdf.sections[+t.dataset.ps][t.dataset.pk] = t.value;
      save();
      return;
    }
    if (t.dataset.stock) {
      const [kd, ft] = t.dataset.stock.split(":"),
        key = kd === "t" ? "notube" : "noboard",
        a = new Set(S[key] || []);
      t.checked ? a.delete(+ft) : a.add(+ft);
      S[key] = [...a];
      update();
      return;
    }
    if (t.id === "xname") {
      $("xother").hidden = t.value !== "__other";
      return;
    }
    if (["xq", "xother", "traceSide"].includes(t.id)) return;
    if (t.dataset.af) {
      const a = S.access[+t.dataset.ai];
      a[t.dataset.af] = t.value;
      update();
      return;
    }
    if (t.dataset.cf) {
      S.cost.extras[+t.dataset.ci][t.dataset.cf] = t.value;
      save();
      costTot();
      return;
    }
    if (t.id === "cbasis" || t.id === "crate") {
      S.cost[t.id === "cbasis" ? "basis" : "rate"] = t.value;
      save();
      costTot();
      return;
    }
    if (t.id === "cvat" || t.id === "cpdf") {
      S.cost[t.id === "cvat" ? "vat" : "inpdf"] = t.checked;
      save();
      costTot();
      return;
    }
    if (t.dataset.co) {
      S.co[t.dataset.co] = t.value;
      signCache.key = "";
      save();
      return;
    }
    if (["client", "site", "ref", "pdate", "notes", "job"].includes(t.id)) {
      S[t.id] = t.value;
      save();
      $("jobsub").textContent = S.job || "";
      return;
    }
    if (t.id === "autolift") {
      S.autolift = t.checked;
      $("lift1").disabled = $("lift").disabled = t.checked;
      update();
      return;
    }
    if (t.type === "checkbox" && t.id in S) {
      S[t.id] = t.checked;
      update();
      return;
    }
    if (t.id in S) {
      S[t.id] = t.value;
      update();
    }
  });
  R.addEventListener("click", (ev) => {
    const t = ev.target.closest("button");
    if (!t) return;
    if (t.dataset.lopt !== undefined) {
      const o = selObj(),
        m = o && MODELS.find((x) => x.b && x.b.id === o.id && x.kind === "run");
      if (t.dataset.lopt === "keep") liftEdit((r) => r);
      else if (m && m.liftWarn && m.liftWarn.choices[+t.dataset.lopt]) {
        const c = m.liftWarn.choices[+t.dataset.lopt];
        liftEdit(() => c.rows.map((x) => ({ ...x })));
      }
      return;
    }
    if (t.dataset.lx !== undefined) {
      const i = +t.dataset.lx;
      liftEdit((r) => (r.length > 1 ? r.filter((_, k) => k !== i) : r));
      return;
    }
    if (t.dataset.ladd !== undefined) {
      liftEdit((r) => [...r, { h: +((r.length ? r[r.length - 1].h : 0) + 2).toFixed(2), b: true }]);
      return;
    }
    if (t.dataset.lauto !== undefined) {
      liftEdit(() => null);
      return;
    }
    if (t.dataset.act) {
      act(t.dataset.act);
      return;
    }
    if (t.dataset.t) {
      curId = t.dataset.t;
      const b = blockById(curId);
      if (b) {
        SELB = { t: "b", id: b.id };
        propsUI();
      }
      ["sv", "ss"].forEach((id) => {
        const z = VZ[id];
        z.k = 1;
        z.x = 0;
        z.y = 0;
      });
      if (view === "3d") faceBlock(b);
      else {
        tabs();
        drawView();
      }
    } else if (t.dataset.layer) {
      const h = new Set(S.hide || []);
      h.has(t.dataset.layer) ? h.delete(t.dataset.layer) : h.add(t.dataset.layer);
      S.hide = [...h];
      layersUI();
      update(true);
    } else if (t.id === "ptp" || t.id === "ptm") {
      S.ptxt =
        Math.round(Math.min(3, Math.max(0.7, (S.ptxt || 1) + (t.id === "ptp" ? 0.2 : -0.2))) * 10) /
        10;
      save();
      view === "plan" ? drawPlan() : update(true);
    } else if (t.id === "pdim") {
      S.pdim = S.pdim === false;
      save();
      view === "plan" ? drawPlan() : update(true);
    } else if (t.id === "zin") zoomBy(1.35);
    else if (t.id === "zout") zoomBy(1 / 1.35);
    else if (t.id === "zreset") zoomReset();
    else if (t.id === "mag") {
      MAG = !MAG;
      t.setAttribute("aria-pressed", MAG);
      lens.hidden = true;
      if (T) {
        T.lens = null;
        render3D();
      }
      setView(view);
    } else if (t.dataset.rm && SELP) {
      S.removed = [...(S.removed || []), SELP.key];
      hideSel();
      showTip(null);
      update(true);
      toast("Part removed");
    } else if (t.dataset.selx) hideSel();
    else if (t.dataset.pturn) {
      const b = blockById(t.dataset.pturn);
      if (b) {
        b.ry = (num0(b.ry) + 45) % 360;
        save();
        update(true);
        propsUI();
      }
    } else if (t.dataset.pdup) {
      const b = blockById(t.dataset.pdup);
      if (b) {
        const c = {
          ...b,
          id: uid(),
          x: num0(b.x) + (b.kind === "sleeper" ? 2.5 : 0.8),
          z: num0(b.z),
        };
        S.blocks.push(c);
        save();
        update(true);
        propsUI();
        toast("Copied - drag it into place");
      }
    } else if (t.dataset.pdel) {
      const b = blockById(t.dataset.pdel);
      if (b) {
        S.blocks = S.blocks.filter((x) => x !== b);
        S.access = (S.access || []).filter((x) => blockById(x.block));
        if (SELB && SELB.id === b.id) SELB = null;
        hideSel();
        accUI();
        save();
        update(true);
        propsUI();
        toast("Deleted");
      }
    } else if (t.dataset.selblk) {
      const b = blockById(t.dataset.selblk);
      hideSel();
      if (b) {
        SELB = { t: "b", id: b.id };
        propsUI();
        $("props").scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    } else if (t.id === "undo") {
      (S.removed || []).pop();
      update(true);
    } else if (t.id === "restore") {
      S.removed = [];
      update(true);
    } else if (t.id === "xadd") {
      const o = $("xname").value === "__other",
        nm = (o ? $("xother").value : $("xname").value).trim(),
        q = Math.max(1, Math.round(+$("xq").value || 1));
      if (!nm) {
        toast("Type a name for the part");
        return;
      }
      S.extra = [...(S.extra || []), { name: nm.slice(0, 80), q }];
      $("xother").value = "";
      update(true);
      toast("Part added to the list");
    } else if (t.dataset.xrm) {
      S.extra.splice(+t.dataset.xrm, 1);
      update(true);
    } else if (t.id === "cxadd") {
      S.cost.extras = [...(S.cost.extras || []), { d: "", a: "" }];
      costRows();
      save();
    } else if (t.dataset.cxrm) {
      S.cost.extras.splice(+t.dataset.cxrm, 1);
      costRows();
      costTot();
      save();
    } else if (t.id === "addsec") {
      S.pdf.sections = [...(S.pdf.sections || []), { h: "", t: "" }];
      pdfUI();
      save();
    } else if (t.dataset.psrm) {
      S.pdf.sections.splice(+t.dataset.psrm, 1);
      pdfUI();
      save();
    } else if (t.id === "pdfreset") {
      S.pdf = { ...PDFDEF, sections: S.pdf.sections || [] };
      pdfUI();
      save();
      toast("Standard wording put back");
    } else if (t.id === "addacc") {
      const r = firstRun();
      if (!r) {
        toast("Add a scaffold run first");
        return;
      }
      S.access = [...(S.access || []), { type: "ladder", block: r.id, at: 1 }];
      accUI();
      update(true);
    } else if (t.dataset.arm) {
      S.access.splice(+t.dataset.arm, 1);
      accUI();
      update(true);
    } else if (t.id === "gundo") histGo(-1);
    else if (t.id === "gredo") histGo(1);
    else if (t.id === "sty") {
      S.style = S.style === "tech" ? "real" : "tech";
      save();
      update(true);
    } else if (t.id === "bld") {
      S.bldMode = { solid: "see", see: "hide", hide: "solid" }[S.bldMode || "solid"];
      update(true);
    } else if (t.id === "v3") setView("3d");
    else if (t.id === "v2") setView("2d");
    else if (t.id === "vP") setView("plan");
    else if (t.id === "pdfPick") runPdf(t, pickingPDF);
    else if (t.id === "pdfClient") runPdf(t, clientPDF);
    else if (t.dataset.rmsign !== undefined) {
      S.co.signImg = "";
      signCache.key = "";
      save();
      signPrev();
      update(true);
    } else if (t.dataset.signup !== undefined) {
      $("signimg").click();
    } else if (t.dataset.rmlogo !== undefined) {
      S.co.logo = "";
      signCache.key = "";
      save();
      logoPrev();
      signPrev();
    } else if (t.id === "newdesign" || t.id === "gstart") {
      // SiteHQ: also ↺ Start over next to Undo (James, Nov 2026: "i need a start over button"); Undo brings it back
      if (confirmNew !== t.id) {
        confirmNew = t.id;
        t.textContent = "Tap again to clear it";
        setTimeout(() => {
          if (confirmNew === t.id) confirmNew = false;
          t.textContent = t.dataset.lbl;
        }, 3000);
        return;
      }
      confirmNew = false;
      t.textContent = t.dataset.lbl;
      S.wings = [];
      S.chims = [];
      S.blocks = [];
      S.access = [];
      S.removed = [];
      SELB = null;
      PV.fit = true;
      accUI();
      propsUI();
      update(false);
      setView("plan");
      toast("Cleared — add a building to start (Undo brings it back)");
    } else if (t.id === "jobopen") {
      if (host.pickOpen) host.pickOpen();
    } else if (t.id === "jobfrom") {
      host.pickCopy(copyFrom);
    } else if (t.id === "copy") {
      navigator.clipboard.writeText(t.dataset.txt || "").then(
        () => toast("Parts list copied"),
        () => toast("Copy blocked — select the table instead"),
      );
    }
  });
  let confirmNew = false;
  const svgPick = (e, click) => {
    const el = R.elementFromPoint(e.clientX, e.clientY),
      g = el && el.closest && el.closest("#d2 [data-p]"),
      m = curModel();
    if (!g || !m) {
      showTip(null);
      if (click) hideSel();
      return;
    }
    const p = m.P[+g.dataset.p];
    showTip(p, e.clientX, e.clientY);
    if (click) showSel(p, m);
  };
  function lensAt(svg, e) {
    const r = svg.getBoundingClientRect(),
      st = $("stage").getBoundingClientRect(),
      px = e.clientX - r.left,
      py = e.clientY - r.top,
      s = LS(),
      m = 3,
      ls = $("lsv");
    if (lens.dataset.src !== svg.id || lens.hidden) {
      ls.innerHTML = svg.innerHTML;
      lens.dataset.src = svg.id;
    }
    ls.style.display = "block";
    lens.classList.remove("sq");
    ls.setAttribute("viewBox", `${px - s / (2 * m)} ${py - s / (2 * m)} ${s / m} ${s / m}`);
    let lx = e.clientX - st.left - s / 2,
      ly = e.clientY - st.top - s - 24;
    if (ly < 4) ly = e.clientY - st.top + 24;
    lx = Math.max(4, Math.min(st.width - s - 4, lx));
    ly = Math.max(4, Math.min(st.height - s - 4, ly));
    Object.assign(lens.style, {
      left: lx + "px",
      top: ly + "px",
      width: s + "px",
      height: s + "px",
    });
    lens.hidden = false;
  }
  function bindZoom(svg) {
    const z = VZ[svg.id],
      pts = new Map();
    let moved = 0,
      pinch = 0;
    const apply = () => {
      const vp = svg.querySelector(".vp");
      if (vp) vp.setAttribute("transform", `translate(${z.x} ${z.y}) scale(${z.k})`);
      if (lens.dataset.src === svg.id && !lens.hidden) $("lsv").innerHTML = svg.innerHTML;
    };
    svg._zoomAt = (px, py, f) => {
      const k2 = Math.min(12, Math.max(1, z.k * f));
      z.x = px - ((px - z.x) * k2) / z.k;
      z.y = py - ((py - z.y) * k2) / z.k;
      z.k = k2;
      if (k2 === 1) {
        z.x = 0;
        z.y = 0;
      }
      apply();
    };
    svg._reset = () => {
      z.k = 1;
      z.x = 0;
      z.y = 0;
      apply();
    };
    svg.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const r = svg.getBoundingClientRect();
        svg._zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.2 : 1 / 1.2);
      },
      { passive: false },
    );
    svg.addEventListener("pointerdown", (e) => {
      svg.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      moved = 0;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = Math.hypot(a[0] - b[0], a[1] - b[1]);
      }
      if (MAG) lensAt(svg, e);
    });
    svg.addEventListener("pointermove", (e) => {
      if (MAG && (e.pointerType === "mouse" || pts.has(e.pointerId)) && pts.size < 2)
        lensAt(svg, e);
      if (pts.has(e.pointerId)) {
        const p = pts.get(e.pointerId);
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        if (pts.size === 2) {
          const [a, b] = [...pts.values()],
            d = Math.hypot(a[0] - b[0], a[1] - b[1]),
            r = svg.getBoundingClientRect();
          if (pinch) svg._zoomAt((a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, d / pinch);
          pinch = d;
          moved += 10;
          return;
        }
        const dx = e.clientX - p[0],
          dy = e.clientY - p[1];
        moved += Math.abs(dx) + Math.abs(dy);
        /* SiteHQ: 3D-only drag lines removed here (they threw) */ if (
          !MAG &&
          moved > 5 &&
          z.k > 1
        ) {
          z.x += dx;
          z.y += dy;
          apply();
          showTip(null);
        }
        if (!MAG || moved < 6) return;
      }
      if (e.pointerType === "mouse" || MAG) svgPick(e);
    });
    svg.addEventListener("pointerup", (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
      if (moved < 6) svgPick(e, true);
    });
    svg.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") {
        showTip(null);
        if (MAG) lens.hidden = true;
      }
    });
  }
  ["sv", "ss"].forEach((id) => bindZoom($(id)));
  function zoomBy(f) {
    if (view === "3d") {
      if (T) {
        T.rad = Math.min(200, Math.max(2, T.rad / f));
        render3D();
      }
    } else if (view === "plan") {
      const s = $("pl");
      zoomPlan(s.clientWidth / 2, s.clientHeight / 2, f);
    } else {
      const sv = $("sv");
      sv._zoomAt(sv.clientWidth / 2, sv.clientHeight / 2, f);
    }
  }
  function zoomReset() {
    if (view === "3d") reset3D();
    else if (view === "plan") {
      PV.fit = true;
      drawPlan();
    } else {
      $("sv")._reset();
      $("ss")._reset();
    }
  }
  const st2 = document.createElement("style");
  st2.textContent =
    "#d2 [data-p]:hover>*:not(:first-child),#d2 [data-p]:hover{filter:drop-shadow(0 0 2px #ff3b3b) brightness(1.15)}";
  R.appendChild(st2);
  function logoPrev() {} // SiteHQ: the logo comes from Setup
  function signPrev() {
    $("signprev").innerHTML = S.co.signImg
      ? `<img alt="Your sign board" src="${esc(S.co.signImg)}"><button data-rmsign>Remove</button>`
      : '<span class="sub">No sign uploaded — a board is made from your name, phone, website and logo.</span>';
  }
  $("signimg").addEventListener("change", async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    try {
      const img = await createImageBitmap(f),
        k = Math.min(1, 1400 / Math.max(img.width, img.height)),
        c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      S.co.signImg = c.toDataURL("image/jpeg", 0.85);
      S.co.signAR = img.width / img.height;
      S.blocks
        .filter((b) => b.type === "prop" && b.kind === "sign")
        .forEach((b) => {
          const w = num(b.sw, 2.4);
          b.sh = +(w / S.co.signAR).toFixed(2);
        });
      signCache.key = "";
      save();
      signPrev();
      update(true);
      propsUI();
      toast("Sign board added");
    } catch (e) {
      toast("Couldn't read that image");
    }
    ev.target.value = "";
  });
  let SELP = null;
  function showSel(p, m) {
    if (!p || p.k === "qty") return;
    SELP = p;
    const b = m && m.b;
    $("selp").innerHTML =
      `<b>${esc(p.name)}</b><div>${esc(p.role || "")}</div>${p.at ? `<div class="sub">${esc(p.at)}</div>` : ""}${b ? `<div class="sub">Part of: ${esc(b.type === "prop" ? PROPN[b.kind] : b.name || TYPEN[b.type])}</div>` : ""}${b && b.type === "prop" ? `<div class="sub">Drag it in the 3D model or on the Plan to move it.</div>` : ""}<div class="selb">${b && b.type === "prop" ? `<button data-pturn="${b.id}">Turn 45°</button><button data-pdup="${b.id}">Copy</button><button class="pri" data-pdel="${b.id}">Delete</button>` : `<button class="pri" data-rm="1">Remove this part</button>${b ? `<button class="danger" data-pdel="${b.id}">Delete whole ${esc((b.name || TYPEN[b.type] || "block").toLowerCase())}</button>` : ""}`}${b ? `<button data-selblk="${b.id}">Edit ${b.type === "prop" ? "item" : "block"}</button>` : ""}<button data-selx="1">Close</button></div>`;
    $("selp").hidden = false;
  }
  function hideSel() {
    SELP = null;
    $("selp").hidden = true;
  }
  function rmUI() {
    const n = (S.removed || []).length;
    $("rmbar").innerHTML = n
      ? `<span>${n} part${n > 1 ? "s" : ""} removed</span><button id="undo">Put last part back</button><button id="restore">Restore all</button>`
      : "";
  }
  const CAT = () => [
    ...ALLT.map(tn),
    RA,
    PUT,
    SW,
    SLV,
    "Toe board clip",
    "Beam coupler",
    "Beam joiner (spigot set)",
    "Base plate",
    SOLE,
    "Roof spreader board (laid across the tiles)",
    ...ALLB.map(bn),
    "Ring bolt / tie anchor",
    "Steel ladder beam 21ft (6.4m)",
    "Steel ladder beam 16ft (4.8m)",
    "Steel ladder beam 13ft (3.9m)",
    "Steel ladder beam 10ft (3m)",
    "Aluminium unit beam 750mm (6m)",
    "Aluminium unit beam 750mm (4m)",
    "Aluminium unit beam 750mm (3m)",
    ...LADS.map((m) => `${m}m ladder`),
    ...RLADS.map((m) => `Roof ladder with ridge hook (${m}m)`),
    "Ladder gate",
    "Ladder clamp",
    "Ladder guard",
    "Brick guard",
    "Safety sign",
    "Scafftag holder",
    "Warning lamp (red)",
    "Standard padding (2m)",
    "Traffic cone",
    "Timber sleeper (2.4m, kerb protection)",
    "Company sign board (2.4m × 1.2m)",
    "Loading bay gate (up-and-over)",
    "Corrugated tin roof sheet (8ft × 2ft 6in)",
    "Keder roof sheet (PVC, one bay)",
    "Debris netting roll (2m × 50m)",
    "Monaflex sheeting roll (2m × 50m)",
  ];
  function extraUI() {
    if (!$("xname").options.length)
      $("xname").innerHTML =
        CAT()
          .map((c) => `<option>${esc(c)}</option>`)
          .join("") + '<option value="__other">Other — type a name</option>';
    $("xlist").innerHTML = (S.extra || [])
      .map(
        (x, i) =>
          `<div class="xrow"><span><b>${esc(x.q)}</b> × ${esc(x.name)}</span><button class="x" data-xrm="${i}" aria-label="Remove added part">×</button></div>`,
      )
      .join("");
  }
  function toast(m) {
    const e = $("toast");
    e.textContent = m;
    e.classList.add("on");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => e.classList.remove("on"), 2200);
  }
  new ResizeObserver(() => {
    if (view === "2d" || view === "plan") drawView();
  }).observe($("stage"));

  // ---------- PDFs ----------
  async function loadPDF() {
    await host.loadPdf();
  }
  const pdate = () => {
    const d = new Date(S.pdate || Date.now());
    return isNaN(d)
      ? ""
      : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  };
  const RED = host.brand();
  // SiteHQ: the room the firm's letterhead leaves on each page (sales/letterhead-setup.js); without one, the designer's own header and footer
  let PG = { top: 20, bot: 275, lh: null };
  const fill = (t) =>
    String(t || "")
      .replaceAll("{company}", S.co.name || "we")
      .replaceAll("{site}", S.site || "the site")
      .replaceAll("{client}", S.client || "you");
  const lines = (t) =>
    fill(t)
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  function letterhead(doc, title) {
    const co = S.co,
      pw = doc.internal.pageSize.getWidth();
    if (PG.lh) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(25);
      doc.text(title, 15, PG.top + 2);
      return PG.top + 8;
    }
    doc.setFillColor(...RED);
    doc.rect(0, 0, pw, 5, "F");
    if (co.logo) {
      try {
        const p = doc.getImageProperties(co.logo),
          h = 18,
          w = Math.min(60, (h * p.width) / p.height);
        doc.addImage(co.logo, "PNG", 15, 10, w, h);
      } catch (e) {}
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(...RED);
      doc.text(co.name || "", 15, 21);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(70);
    [co.logo ? co.name : "", co.addr, co.tel && "Tel " + co.tel, co.email, co.web]
      .filter(Boolean)
      .forEach((t, i) => doc.text(String(t), pw - 15, 12 + i * 4, { align: "right" }));
    doc.setDrawColor(220);
    doc.line(15, 33, pw - 15, 33);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(25);
    doc.text(title, 15, 43);
    return 49;
  }
  function footers(doc) {
    const n = doc.getNumberOfPages(),
      pw = doc.internal.pageSize.getWidth(),
      ph = doc.internal.pageSize.getHeight(),
      co = S.co;
    if (PG.lh) {
      host.finish(doc, PG.lh);
      for (let i = 1; i <= n; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(140);
        doc.text(`Page ${i} of ${n}`, pw - 15, 293, { align: "right" });
      }
      return;
    }
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(220);
      doc.line(15, ph - 14, pw - 15, ph - 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(110);
      doc.text([co.name, co.tel, co.email, co.web].filter(Boolean).join("  ·  "), 15, ph - 9);
      doc.text(`Page ${i} of ${n}`, pw - 15, ph - 9, { align: "right" });
    }
  }
  function metaTable(doc, y, rows) {
    doc.autoTable({
      startY: y,
      body: rows.filter((r) => r[1]),
      theme: "plain",
      styles: { fontSize: 9.5, cellPadding: { top: 1, bottom: 1, left: 0, right: 2 } },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 32, textColor: 90 } },
      margin: { left: 15, right: 15, top: PG.top, bottom: Math.max(12, 297 - PG.bot) },
    });
    return doc.lastAutoTable.finalY;
  }
  async function pickingPDF() {
    await loadPDF();
    PG = await host.frame();
    const doc = new jspdf.jsPDF({ unit: "mm", format: "a4" });
    let y = letterhead(doc, "Scaffold picking list");
    y = metaTable(doc, y, [
      ["Job", S.job],
      ["Client", S.client],
      ["Site", S.site],
      ["Ref", S.ref],
      ["Date", pdate()],
      [
        "Scaffold",
        S.blocks
          .filter((b) => b.type !== "prop")
          .map((b) => blockDesc(b))
          .join("\n"),
      ],
    ]);
    const T = totalsMap(),
      body = [];
    GROUPS.forEach((g) => {
      const ks = Object.keys(T)
        .filter((k) => grp(k) === g)
        .sort((a, b) => ftOf(a) - ftOf(b) || a.localeCompare(b));
      if (!ks.length) return;
      body.push([
        {
          content: g.toUpperCase(),
          colSpan: 5,
          styles: { fillColor: [244, 236, 236], textColor: RED, fontStyle: "bold" },
        },
      ]);
      ks.forEach((k) => body.push(["", T[k].q, k, "", ""]));
    });
    doc.autoTable({
      startY: y + 4,
      head: [["Picked", "Qty", "Item", "Loaded", "Returned"]],
      body,
      theme: "grid",
      margin: { left: 15, right: 15, top: PG.top, bottom: Math.max(20, 297 - PG.bot) },
      headStyles: { fillColor: RED, textColor: 255, fontSize: 9 },
      styles: { fontSize: 9.5, cellPadding: 2, lineColor: [210, 210, 210] },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 16, halign: "right", fontStyle: "bold" },
        3: { cellWidth: 18 },
        4: { cellWidth: 20 },
      },
      didDrawCell: (d) => {
        if (d.section === "body" && [0, 3].includes(d.column.index) && d.row.raw.length === 5) {
          const s = 4.2;
          doc.setDrawColor(90);
          doc.rect(d.cell.x + (d.cell.width - s) / 2, d.cell.y + (d.cell.height - s) / 2, s, s);
        }
      },
    });
    y = doc.lastAutoTable.finalY + 8;
    if (y > PG.bot - 30) {
      doc.addPage();
      y = PG.top;
    }
    doc.setFontSize(8.5);
    doc.setTextColor(90);
    const nl = doc.splitTextToSize(fill(S.pdf.pickNote), 180);
    doc.text(nl, 15, y);
    y += nl.length * 4 + 6;
    doc.setFontSize(10);
    doc.setTextColor(30);
    ["Picked by", "Checked by", "Delivered / received by"].forEach((l, i) => {
      const yy = y + i * 12;
      doc.text(l, 15, yy);
      doc.setDrawColor(120);
      doc.line(60, yy + 1, 130, yy + 1);
      doc.text("Date", 137, yy);
      doc.line(148, yy + 1, 195, yy + 1);
    });
    footers(doc);
    return savePdf(doc, `Picking list - ${S.job || "scaffold"}.pdf`);
  }
  async function snap3D() {
    if (!T) return null;
    if (!T.scene || T.dirty) build3D(true);
    setHL(null);
    const s = { t: T.theta, p: T.phi, r: T.rad, g: T.tgt.clone() },
      bg = T.scene.background,
      was = view;
    view = "3d";
    T.scene.background = new THREE.Color(0xe4ebf1);
    T.r.setSize(1600, 1000, false);
    T.cam.aspect = 1.6;
    T.cam.updateProjectionMatrix();
    T.tgt.copy(T.def.tgt);
    T.theta = 0.6;
    T.phi = 1.08;
    T.rad = (T.def.rad * 0.92) / Math.max(1, 1.25 / 1.6);
    const cam = T.cam,
      tg = T.tgt;
    cam.position.set(
      tg.x + T.rad * Math.sin(T.phi) * Math.sin(T.theta),
      tg.y + T.rad * Math.cos(T.phi),
      tg.z + T.rad * Math.sin(T.phi) * Math.cos(T.theta),
    );
    cam.lookAt(tg);
    T.r.render(T.scene, cam);
    const url = T.r.domElement.toDataURL("image/jpeg", 0.9);
    T.scene.background = bg;
    T.theta = s.t;
    T.phi = s.p;
    T.rad = s.r;
    T.tgt.copy(s.g);
    view = was;
    size3D();
    render3D();
    return url;
  }
  async function snap2D(m, W = 1500, H = 850) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = `position:fixed;left:-6000px;top:0;width:${W}px;height:${H}px`;
    document.body.appendChild(svg);
    draw2D(svg, m, "front");
    svg.removeAttribute("style");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    const txt = new XMLSerializer()
      .serializeToString(svg)
      .replaceAll("currentColor", "#444")
      .replaceAll("var(--ink)", "#222");
    svg.remove();
    const url = URL.createObjectURL(new Blob([txt], { type: "image/svg+xml" })),
      img = new Image();
    await new Promise((ok, no) => {
      img.onload = ok;
      img.onerror = no;
      img.src = url;
    });
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    x.fillRect(0, 0, W, H);
    x.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    return c.toDataURL("image/jpeg", 0.9);
  }
  async function clientPDF() {
    await loadPDF();
    PG = await host.frame();
    const doc = new jspdf.jsPDF({ unit: "mm", format: "a4" }),
      pw = 210,
      co = S.co;
    let y = letterhead(doc, fill(S.pdf.title) || "Scaffold specification");
    y = metaTable(doc, y, [
      ["Prepared for", S.client],
      ["Site", S.site],
      ["Job", S.job],
      ["Our ref", S.ref],
      ["Date", pdate()],
    ]);
    const para = (t, yy, sz = 10) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(sz);
      doc.setTextColor(40);
      const l = doc.splitTextToSize(t, pw - 30);
      if (yy + l.length * 4.8 > PG.bot) {
        doc.addPage();
        yy = PG.top;
      }
      doc.text(l, 15, yy);
      return yy + l.length * 4.8 + 1;
    };
    const head = (t, yy) => {
      if (yy > PG.bot - 20) {
        doc.addPage();
        yy = PG.top;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...RED);
      doc.text(t, 15, yy);
      return yy + 6;
    };
    const bullets = (arr, yy) => {
      arr.forEach((t) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(40);
        const l = doc.splitTextToSize(t, pw - 36);
        if (yy + l.length * 4.8 > PG.bot) {
          doc.addPage();
          yy = PG.top;
        }
        doc.text("•", 17, yy);
        doc.text(l, 21, yy);
        yy += l.length * 4.8 + 1;
      });
      return yy;
    };
    const mixed = (t, yy) => {
      lines(t).forEach((l) => {
        yy = /^[-•*]\s*/.test(l) ? bullets([l.replace(/^[-•*]\s*/, "")], yy) : para(l, yy);
      });
      return yy;
    };
    if (S.pdf.intro) y = mixed(S.pdf.intro, y + 4);
    const runs = MODELS.filter((m) => m.kind === "run"),
      acc = [],
      nS = (S.access || []).filter((a) => a.type === "stair").length,
      nL = (S.access || []).length - nS,
      sc = [];
    if (nS)
      acc.push(
        `${nS > 1 ? nS + " stair towers" : "a stair tower"} with handrails and landings at every lift`,
      );
    if (nL > 0) acc.push(`${nL} ladder access point${nL > 1 ? "s" : ""} with self-closing gates`);
    if (runs.length)
      sc.push(
        `Independent tied tube and fitting scaffold: ${runs.length} run${runs.length > 1 ? "s" : ""}, ${runs.reduce((s, m) => s + m.L, 0).toFixed(1)}m in all, with working platforms up to ${f1(Math.max(...runs.map((m) => m.H)))}m.`,
        `Platforms ${S.boards} boards wide (about ${(+S.boards * 0.225).toFixed(2)}m), lifts at about ${f1(num(S.lift, 2))}m.`,
      );
    if (runs.some((m) => m.tbl))
      sc.push("Table lifts stepping up the gable end so the whole gable can be reached.");
    MODELS.filter((m) => m.kind === "chim").forEach((m) =>
      sc.push(
        `A chimney scaffold round the stack with a working platform at about ${f1(m.H)}m, standing on boards spread across the roof${m.nl ? " and reached by roof ladder from the main scaffold" : ""}.`,
      ),
    );
    MODELS.filter((m) => m.kind === "bird").forEach((m) =>
      sc.push(
        `${m.b.name || "Birdcage"}: a birdcage platform ${num(m.b.len, 0).toFixed(1)}m × ${num(m.b.wid, 0).toFixed(1)}m at about ${f1(m.H)}m.`,
      ),
    );
    MODELS.filter((m) => m.kind === "load").forEach((m) =>
      sc.push(`A loading bay with an up-and-over gate at ${f1(m.H)}m.`),
    );
    if (acc.length) sc.push(`Access by ${acc.join(" and ")}.`);
    if (runs.length)
      sc.push(
        `Tied into the building at ${runs.reduce((s, m) => s + (m.ties || 0), 0)} points; every tie is tested.`,
      );
    MODELS.filter((m) => m.kind === "troof" && !m.err).forEach((m) =>
      sc.push(
        `A temporary ${m.b.style === "mono" ? "mono-pitch" : "duo-pitch"} roof on ${m.b.sheet === "keder" ? "aluminium keder beams with PVC sheets" : (S.beam === "unit" ? "aluminium unit beams" : "steel ladder beams") + " with corrugated sheets"}${m.b.gables !== false ? ", with the gable ends sheeted in" : ""}, to keep the works dry.`,
      ),
    );
    if (runs.some((m) => m.gap))
      sc.push("Beams bridge over the openings shown on the drawings, so access below stays clear.");
    y = head("The scaffold", y + 3);
    y = bullets([...sc, ...lines(S.pdf.scaffoldExtra)], y);
    const vb = MODELS.filter((m) => VIEWT.includes(m.b.type) && !m.err);
    if (vb.length) {
      doc.autoTable({
        startY: y + 2,
        head: [["Part of the scaffold", "Type", "Size", "Platform height"]],
        body: vb.map((m) => {
          const b = m.b;
          return [
            b.name || TYPEN[b.type],
            TYPEN[b.type],
            b.type === "run"
              ? `${num(b.len, 0).toFixed(2)}m long`
              : b.type === "bird" || b.type === "load"
                ? `${num(b.len, 0).toFixed(1)} × ${num(b.wid, 0).toFixed(1)}m`
                : b.type === "troof"
                  ? `${m.n} bays`
                  : "Round the stack",
            b.type === "troof" ? "—" : `${f1(m.H)}m`,
          ];
        }),
        theme: "striped",
        headStyles: { fillColor: RED },
        styles: { fontSize: 9.5 },
        margin: { left: 15, right: 15, top: PG.top, bottom: Math.max(12, 297 - PG.bot) },
      });
      y = doc.lastAutoTable.finalY + 6;
    }
    const img3 = await snap3D();
    if (img3) {
      const h = 112;
      if (y + h > PG.bot) {
        doc.addPage();
        y = PG.top;
      }
      doc.addImage(img3, "JPEG", 15, y, 180, h);
      y += h + 3;
      doc.setFontSize(8.5);
      doc.setTextColor(110);
      doc.text("3D view of the proposed scaffold", 15, y + 1);
      y += 7;
    }
    for (const m of vb.filter((m) => m.b.type !== "troof")) {
      const im = await snap2D(m),
        h = (180 * 850) / 1500;
      if (y + h + 10 > PG.bot) {
        doc.addPage();
        y = PG.top;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30);
      doc.text(`${m.b.name || TYPEN[m.b.type]}`, 15, y);
      doc.addImage(im, "JPEG", 15, y + 3, 180, h);
      y += h + 10;
    }
    const saf = [
      "Guardrails at about 1m and a middle rail, plus toe boards, on every working platform.",
    ];
    if (S.brick) saf.push("Brick guards on working platforms to stop materials falling.");
    {
      const rs = S.blocks.filter((b) => b.type === "run"),
        cl = (b) => String(b.clad || S.clad || "32"),
        nm = (k) => rs.filter((b) => cl(b) === k).map((b) => b.name),
        all = (k) => rs.length && rs.every((b) => cl(b) === k);
      if (all("25")) saf.push("Debris netting to the outside face of the whole scaffold.");
      else if (nm("25").length)
        saf.push("Debris netting to the outside face of: " + nm("25").join(", ") + ".");
      if (all("16"))
        saf.push(
          "Sheeting to the outside face of the whole scaffold (designed and tied for wind load).",
        );
      else if (nm("16").length)
        saf.push(
          "Sheeting to the outside face of: " +
            nm("16").join(", ") +
            " (designed and tied for wind load).",
        );
    }
    if (S.blocks.some((b) => b.type === "run" && b.pub))
      saf.push(
        "Public footpath protection: padded standards, red warning lamps at night and warning signs.",
      );
    if (S.blocks.some((b) => b.type === "run" && b.fan))
      saf.push("A pedestrian fan over the footpath to catch falling debris.");
    if (S.blocks.some((b) => b.type === "prop" && b.kind === "sleeper"))
      saf.push("Timber sleepers along the kerb to protect the scaffold from vehicles.");
    if (S.blocks.some((b) => b.type === "prop" && b.kind === "cone"))
      saf.push("Traffic cones marking off the work area.");
    if ((S.access || []).length)
      saf.push("Ladder access locked out of hours with ladder guards; gates at each landing.");
    saf.push("Scafftag inspection tags at each access point.");
    y = head("Safety measures", y + 2);
    y = bullets([...saf, ...lines(S.pdf.safetyExtra)], y);
    if (lines(S.pdf.inspection).length) {
      y = head("Inspection and handover", y + 3);
      y = bullets(lines(S.pdf.inspection), y);
    }
    const yours = lines(S.pdf.note);
    if (S.blocks.some((b) => b.type === "run" && b.pub))
      yours.push(
        "A licence from the council's highways team is needed before scaffolding goes on a public footpath or road; we will arrange this.",
      );
    if (yours.length) {
      y = head("Please note", y + 3);
      y = bullets(yours, y);
    }
    (S.pdf.sections || []).forEach((s) => {
      if (!s.h && !s.t) return;
      if (s.h) y = head(fill(s.h), y + 3);
      y = mixed(s.t, y);
    });
    if (S.notes) {
      y = head("Notes", y + 3);
      y = mixed(S.notes, y);
    }
    if (S.cost.inpdf && (+S.cost.rate || (S.cost.extras || []).length)) {
      const k = costCalc();
      if (y > PG.bot - 60) {
        doc.addPage();
        y = PG.top;
      }
      y = head("Price", y + 3);
      const rows = [
        [
          `Scaffold as described: ${k.qty.toFixed(1)} ${k.unit} @ ${money(k.rate)} per ${k.unit}`,
          money(k.base),
        ],
        ...k.ex.map((x) => [x.d || "Extra", money(x.a)]),
        ["Subtotal", money(k.sub)],
        ...(S.cost.vat ? [["VAT 20%", money(k.vat)]] : []),
        ["Total", money(k.total)],
      ];
      doc.autoTable({
        startY: y,
        body: rows,
        theme: "plain",
        styles: { fontSize: 10, cellPadding: 1.6 },
        columnStyles: { 1: { halign: "right", cellWidth: 35 } },
        margin: { left: 15, right: 15, top: PG.top, bottom: Math.max(12, 297 - PG.bot) },
        didParseCell: (d) => {
          if (d.row.index === rows.length - 1) {
            d.cell.styles.fontStyle = "bold";
            d.cell.styles.fontSize = 11.5;
          }
        },
      });
      y = doc.lastAutoTable.finalY + 2;
    }
    if (y > PG.bot - 40) {
      doc.addPage();
      y = PG.top;
    }
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30);
    doc.text(fill(S.pdf.accept) || "Accepted", 15, y);
    y += 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    [
      ["Signed (client)", "Date"],
      ["Print name", ""],
      [`Signed for ${co.name || "the contractor"}`, "Date"],
    ].forEach(([a, b2], i) => {
      const yy = y + i * 11;
      doc.text(a, 15, yy);
      doc.setDrawColor(120);
      doc.line(88, yy + 1, 140, yy + 1);
      if (b2) {
        doc.text(b2, 146, yy);
        doc.line(156, yy + 1, 195, yy + 1);
      }
    });
    footers(doc);
    return savePdf(
      doc,
      `${fill(S.pdf.title) || "Scaffold specification"} - ${S.job || "scaffold"}.pdf`,
    );
  }
  async function savePdf(doc, fn) {
    const blob = doc.output("blob");
    window._lastPdf = blob;
    try {
      await host.savePdf(blob, fn.replace(/[\\/:*?"<>|]/g, ""));
      toast("PDF saved");
    } catch (e) {
      toast(e && e.code === "declined" ? "Download cancelled" : "Couldn't save the PDF");
    }
  }
  async function runPdf(btn, fn) {
    const t = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Making PDF…";
    try {
      await fn();
    } catch (e) {
      toast("Couldn't make the PDF");
      console.error(e);
    }
    btn.disabled = false;
    btn.textContent = t;
  }

  // ---------- a photo or PDF of a drawing as a picture (for Trace a drawing) ----------
  async function toBlob(file) {
    let c = document.createElement("canvas");
    if (file.type === "application/pdf") {
      await host.loadPdfJs();
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise,
        pg = await pdf.getPage(1),
        v0 = pg.getViewport({ scale: 1 }),
        vp = pg.getViewport({ scale: Math.min(3, 2000 / Math.max(v0.width, v0.height)) });
      c.width = vp.width;
      c.height = vp.height;
      await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
    } else {
      const img = await createImageBitmap(file),
        f = Math.min(1, 2000 / Math.max(img.width, img.height));
      c.width = img.width * f;
      c.height = img.height * f;
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    }
    return new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.9));
  }

  // SiteHQ: "Copy scaffold design from another job" – that job's drawing, keeping this job's details, costing and the firm's settings (Undo puts it back)
  function copyFrom(d) {
    const keep = {};
    ["job", "client", "site", "ref", "pdate", "notes", "cost", ...SHARED].forEach((k) => {
      if (S[k] !== undefined) keep[k] = S[k];
    });
    S = Object.assign(freshState(), d, keep);
    SELB = null;
    S.removed = S.removed || [];
    S.access = S.access || [];
    signCache.key = "";
    sync();
    accUI();
    propsUI();
    PV.fit = true;
    update(false);
    toast("Scaffold design copied — Undo puts yours back");
  }

  // ---------- trace a drawing (no AI): picture behind the Plan, set the scale, tap the corners ----------
  const TR = { mode: null, pts: [], hov: null, drag: null };
  function trBar() {
    const n = (S.wings || []).length;
    if (TR.mode === "scale")
      return TR.pts.length < 2
        ? `<b>Set the scale: tap both ends of a size you know on the drawing (${TR.pts.length}/2)</b><button data-tr="cancel">Cancel</button>`
        : `<b>That length is</b><input id="trd" type="number" step="0.01" inputmode="decimal" placeholder="m" style="width:90px;min-height:40px"><button class="pri" data-tr="applyscale">Set scale</button><button data-tr="cancel">Cancel</button>`;
    if (TR.mode === "trace")
      return `<b>${TR.pts.length ? "Now tap the opposite corner" : "Tap one corner of the building"}</b><button data-tr="scafall">Scaffold round them</button><button data-tr="done">Done${n ? ` (${n} drawn)` : ""}</button><button data-tr="moveimg">Move drawing</button>`;
    if (TR.mode === "move")
      return `<b>Drag the drawing into place</b><button data-tr="trace">Back to tracing</button><button data-tr="done">Done</button>`;
    return `<b>Drawing</b><button data-tr="scale">Set scale</button><button data-tr="trace">Trace buildings</button><button data-tr="moveimg">Move</button><button data-tr="fade">Fade ${Math.round((S.bg.op ?? 0.55) * 100)}%</button><button data-tr="hide">${S.bg.show === false ? "Show" : "Hide"}</button><button data-tr="remove" class="danger">Remove</button><button data-tr="close">Close</button>`;
  }
  function trSet(m) {
    TR.mode = m;
    TR.pts = [];
    TR.hov = null;
    SELB = null;
    propsUI();
    drawPlan();
  }
  $("tracebtn").addEventListener("click", () => {
    if (S.bgimg) {
      setView("plan");
      trSet("menu");
      return;
    }
    $("tracefile").click();
  });
  $("tracefile").addEventListener("change", async (ev) => {
    const f = ev.target.files[0];
    ev.target.value = "";
    if (!f) return;
    try {
      const bl = await toBlob(f),
        img = await createImageBitmap(bl),
        k = Math.min(1, 1600 / Math.max(img.width, img.height)),
        c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      S.bgimg = c.toDataURL("image/jpeg", 0.75);
      const w0 = 20;
      S.bg = { x: -2, z: -2, w: w0, h: (w0 * c.height) / c.width, op: 0.55, show: true };
      save();
      setView("plan");
      PV.fit = false;
      trSet("scale");
      setTimeout(() => fitPlanTo(S.bg), 60);
      toast("Drawing added — now set the scale");
    } catch (e) {
      toast("Couldn't open that file");
    }
  });
  R.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tr]");
    if (!t) return;
    const a = t.dataset.tr;
    if (a === "cancel" || a === "close" || a === "done") {
      trSet(null);
      if (a === "done") toast('Tap a building, then "Scaffold all round" to put scaffold on it');
      return;
    }
    if (a === "scale" || a === "trace") return trSet(a);
    if (a === "moveimg") return trSet("move");
    if (a === "menu") return trSet("menu");
    if (a === "scafall") {
      let k = 0;
      (S.wings || []).forEach((w) => {
        if (w.kind === "cons" || S.blocks.some((b) => b.type === "run" && b.wing === w.id)) return;
        S.blocks.push(...freeRuns(w));
        k++;
      });
      accUI();
      update(true);
      trSet(null);
      setView("3d");
      toast(
        k ? `Scaffold added round ${k} building${k > 1 ? "s" : ""}` : "They already have scaffold",
      );
      return;
    }
    if (a === "fade") {
      const o = S.bg.op ?? 0.55;
      S.bg.op = o > 0.8 ? 0.3 : +(o + 0.25).toFixed(2);
      save();
      drawPlan();
      return;
    }
    if (a === "hide") {
      S.bg.show = S.bg.show === false;
      save();
      drawPlan();
      return;
    }
    if (a === "remove") {
      S.bgimg = "";
      S.bg = null;
      save();
      trSet(null);
      return;
    }
    if (a === "applyscale") {
      const v = num($("trd").value, 0);
      if (!(v > 0)) {
        toast("Type the real length in metres");
        return;
      }
      const [p, q] = TR.pts,
        dm = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (dm < 1e-3) return;
      const k = v / dm;
      S.bg.x = p[0] + (S.bg.x - p[0]) * k;
      S.bg.z = p[1] + (S.bg.z - p[1]) * k;
      S.bg.w *= k;
      S.bg.h *= k;
      save();
      PV.fit = false;
      fitPlanTo(S.bg);
      trSet("trace");
      toast("Scale set — now tap two opposite corners of each building");
    }
  });
  R.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.id === "trd") {
      e.preventDefault();
      R.querySelector('[data-tr="applyscale"]').click();
    }
  });
  function fitPlanTo(r) {
    const svg = $("pl"),
      W = svg.clientWidth,
      H = svg.clientHeight;
    if (!W) return;
    PV.s = Math.min(W / (r.w + 2), H / (r.h + 2));
    PV.ox = W / 2 - (r.x + r.w / 2) * PV.s;
    PV.oy = H / 2 - (r.z + r.h / 2) * PV.s;
    drawPlan();
  }
  (() => {
    const svg = $("pl"),
      wp = (e) => {
        const r = svg.getBoundingClientRect();
        return [(e.clientX - r.left - PV.ox) / PV.s, (e.clientY - r.top - PV.oy) / PV.s];
      },
      sn = (v) => Math.round(v * 20) / 20;
    svg.addEventListener(
      "pointerdown",
      (e) => {
        if (!TR.mode || TR.mode === "menu") return;
        if (e.target.closest("[data-tr]")) return;
        e.stopImmediatePropagation();
        e.preventDefault();
        svg.setPointerCapture(e.pointerId);
        const p = wp(e);
        if (TR.mode === "move") {
          TR.drag = { p, x: S.bg.x, z: S.bg.z };
          return;
        }
        if (TR.mode === "scale") {
          if (TR.pts.length >= 2) TR.pts = [];
          TR.pts.push(p);
          drawPlan();
          return;
        }
        if (TR.mode === "trace") {
          const q = [sn(p[0]), sn(p[1])];
          if (!TR.pts.length) {
            TR.pts = [q];
            drawPlan();
            return;
          }
          const a = TR.pts[0],
            x = Math.min(a[0], q[0]),
            z = Math.min(a[1], q[1]),
            w = Math.abs(q[0] - a[0]),
            d = Math.abs(q[1] - a[1]);
          TR.pts = [];
          TR.hov = null;
          if (w < 1 || d < 1) {
            toast("Too small — tap opposite corners");
            drawPlan();
            return;
          }
          const n = (S.wings || []).length,
            rf = $("q_roof").value;
          S.wings.push({
            id: uid(),
            name: n ? "Building " + (n + 1) : "House",
            x: +x.toFixed(2),
            z: +z.toFixed(2),
            w: +w.toFixed(2),
            d: +d.toFixed(2),
            eaves: num($("q_e").value, 5.4),
            roof: rf === "gx" || rf === "gz" ? "gable" : rf,
            pitch: num($("q_p").value, 35),
            ridge: rf === "gz" ? "z" : w >= d ? "x" : "z",
          });
          update(true);
          toast(
            `Building drawn: ${w.toFixed(2)} × ${d.toFixed(2)}m — set its height and roof when you tap it`,
          );
          drawPlan();
        }
      },
      true,
    );
    svg.addEventListener(
      "pointermove",
      (e) => {
        if (!TR.mode || TR.mode === "menu") return;
        e.stopImmediatePropagation();
        const p = wp(e);
        if (TR.mode === "move" && TR.drag) {
          S.bg.x = TR.drag.x + p[0] - TR.drag.p[0];
          S.bg.z = TR.drag.z + p[1] - TR.drag.p[1];
          drawPlan();
          return;
        }
        if (TR.mode === "trace" && TR.pts.length === 1) {
          TR.hov = [sn(p[0]), sn(p[1])];
          drawPlan();
        }
      },
      true,
    );
    svg.addEventListener(
      "pointerup",
      (e) => {
        if (!TR.mode || TR.mode === "menu") return;
        e.stopImmediatePropagation();
        if (TR.drag) {
          TR.drag = null;
          save();
        }
      },
      true,
    );
  })();
  function qPreset() {
    const st = $("q_style").value,
      n = +$("q_storeys").value;
    $("q_rowf").hidden = st !== "row";
    $("q_weach").hidden = st !== "row";
    if (st === "row" && num($("q_w").value, 9.6) > 7) $("q_w").value = 5.2;
    if (st === "bung") {
      $("q_storeys").value = "1";
    }
    $("q_e").value = { 1: 2.6, 2: 5.4, 3: 8.1 }[st === "bung" ? 1 : n];
    if (st === "flat") {
      $("q_roof").value = "flat";
    }
    const party = { semi: ["l"], end: ["l"], mid: ["l", "r"] }[st] || [];
    [
      ["l", "q_sl"],
      ["r", "q_sr"],
    ].forEach(([k, id]) => ($(id).checked = !party.includes(k)));
    $("q_tbl").checked = $("q_roof").value.startsWith("g");
  }
  ["q_style", "q_storeys", "q_roof"].forEach((id) => $(id).addEventListener("change", qPreset));
  $("q_kind").addEventListener("change", () => {
    const p = BPRE[$("q_kind").value] || { eaves: 5.4, pitch: 35, roof: "gable" };
    $("q_e").value = p.eaves;
    if (p.pitch != null) $("q_p").value = p.pitch;
    $("q_roof").value = p.roof === "gable" ? "gx" : p.roof;
    $("q_par").value = p.parapet || 0;
    $("q_dormF").value = p.dormF || 0;
    $("q_storeys").value = p.eaves < 3 ? "1" : p.eaves < 6 ? "2" : "3";
    if ($("q_kind").value === "flats" || $("q_kind").value === "comm") {
      $("q_w").value = $("q_kind").value === "flats" ? 18 : 20;
      $("q_d").value = $("q_kind").value === "flats" ? 12 : 15;
    }
    $("q_tbl").checked = $("q_roof").value.startsWith("g");
  });
  function quickDesign(auto) {
    const st = $("q_style").value,
      W = num($("q_w").value, 9.6),
      D = num($("q_d").value, 6),
      E = num($("q_e").value, 5.4),
      rf = $("q_roof").value,
      pt = num($("q_p").value, 35);
    const roof = rf === "gx" || rf === "gz" ? "gable" : rf,
      kd = $("q_kind").value,
      w = {
        id: uid(),
        name:
          {
            bung: "Bungalow",
            chalet: "Bungalow",
            town: "Townhouse",
            flats: "Flats",
            comm: "Unit",
            church: "Building",
          }[kd] || "House",
        kind: kd,
        x: 0,
        z: 0,
        w: W,
        d: D,
        eaves: E,
        roof,
        pitch: roof === "flat" ? 0 : pt,
        ridge: rf === "gz" ? "z" : "x",
        ov: num($("q_ov").value, 0.3),
        parapet: roof === "flat" ? num0($("q_par").value) : 0,
        dormF: Math.round(num0($("q_dormF").value)),
        dormB: Math.round(num0($("q_dormB").value)),
      };
    const wings = [w],
      chims = [],
      blocks = [],
      access = [];
    const nb = (s2) =>
      wings.push({
        id: uid(),
        name: "Neighbour",
        x: s2 < 0 ? -W : W,
        z: 0,
        w: W,
        d: D,
        eaves: E,
        roof,
        pitch: w.pitch,
        ridge: w.ridge,
      });
    if (st === "semi" || st === "end" || st === "mid") nb(-1);
    if (st === "mid") nb(1);
    if ($("q_ext").checked)
      wings.push({
        id: uid(),
        name: "Extension",
        x: +(W * 0.15).toFixed(2),
        z: -3.5,
        w: +Math.min(W * 0.6, 5).toFixed(2),
        d: 3.5,
        eaves: 2.6,
        roof: "mono",
        pitch: 12,
        ridge: "x",
        high: "front",
      });
    if ($("q_cons").checked) {
      const cw = Math.min(4, W * 0.4);
      wings.push({
        id: uid(),
        name: "Conservatory",
        kind: "cons",
        x: +(W - cw - 0.5).toFixed(2),
        z: -3,
        w: +cw.toFixed(2),
        d: 3,
        eaves: 2.2,
        roof: "mono",
        pitch: 15,
        ridge: "x",
        high: "front",
      });
    }
    if ($("q_ch").value !== "none" && roof !== "flat") {
      const ridgeX = w.ridge !== "z",
        cx = $("q_ch").value === "gable" ? (ridgeX ? 0.6 : W / 2) : ridgeX ? W * 0.75 : W / 2,
        cz = $("q_ch").value === "gable" ? (ridgeX ? D / 2 : 0.5) : ridgeX ? D / 2 : D * 0.7;
      const c = {
        id: uid(),
        wing: w.id,
        x: +cx.toFixed(2),
        z: +cz.toFixed(2),
        w: 0.9,
        d: 0.6,
        top: 0,
      };
      S.wings = wings;
      c.top = +(roofH(w, c.x, c.z, true) + 1.2).toFixed(2);
      chims.push(c);
    }
    const addFront = (host) => {
      const bv = $("q_bay").value,
        HW = num(host.w, 1),
        Dh = num(host.d, 1);
      const bay = (xc, two) =>
        wings.push({
          id: uid(),
          parent: host.id,
          name: two ? "Two-storey bay" : "Bay window",
          kind: "bay",
          x: +(num0(host.x) + xc - 1.2).toFixed(2),
          z: +(num0(host.z) + Dh).toFixed(2),
          w: 2.4,
          d: 0.8,
          eaves: two ? Math.max(2.6, num(host.eaves, 5) - 0.4) : 2.5,
          roof: "hip",
          pitch: 30,
          ridge: "z",
        });
      if (bv === "1") bay(HW * 0.28, false);
      if (bv === "2") bay(HW * 0.28, true);
      if (bv === "11") {
        bay(HW * 0.22, false);
        bay(HW * 0.78, false);
      }
      if ($("q_porch").checked)
        wings.push({
          id: uid(),
          parent: host.id,
          name: "Porch",
          kind: "porch",
          x: +(num0(host.x) + HW * (bv === "11" ? 0.5 : 0.62) - 1).toFixed(2),
          z: +(num0(host.z) + Dh).toFixed(2),
          w: 2,
          d: 1.5,
          eaves: 2.4,
          roof: "gable",
          pitch: 35,
          ridge: "z",
        });
    };
    const sides = [
      ["front", "q_sf"],
      ["right", "q_sr"],
      ["back", "q_sb"],
      ["left", "q_sl"],
    ]
      .filter(([, id]) => $(id).checked)
      .map(([k]) => k);
    if (!sides.length) {
      toast("Tick at least one side for the scaffold");
      return;
    }
    let runs;
    if (st === "row") {
      const n = Math.max(2, Math.min(12, Math.round(num($("q_n").value, 4)))),
        f = Math.max(1, Math.min(n, Math.round(num($("q_from").value, 1)))),
        t = Math.max(f, Math.min(n, Math.round(num($("q_to").value, n))));
      wings.length = 0;
      chims.length = 0;
      const hs = [...Array(n).keys()].map((i) => ({
        id: uid(),
        name: "House " + (i + 1),
        x: +(i * W).toFixed(2),
        z: 0,
        w: W,
        d: D,
        eaves: E,
        roof,
        pitch: w.pitch,
        ridge: w.ridge,
        ov: w.ov,
        parapet: w.parapet,
        dormF: w.dormF,
        dormB: w.dormB,
        kind: w.kind,
      }));
      wings.push(...hs);
      if ($("q_ch").value !== "none" && roof !== "flat")
        hs.forEach((h, i) => {
          if (i === 0) return;
          chims.push({
            id: uid(),
            wing: h.id,
            x: +(i * W + 0.05).toFixed(2),
            z: +(D / 2).toFixed(2),
            w: 0.9,
            d: 0.6,
            top: +(roofH(h, i * W + 0.45, D / 2, true) + 1.2).toFixed(2),
          });
        });
      if ($("q_ext").checked)
        wings.push({
          id: uid(),
          name: "Extension",
          x: +((f - 1) * W + W * 0.15).toFixed(2),
          z: -3.5,
          w: +Math.min(W * 0.7, 4.5).toFixed(2),
          d: 3.5,
          eaves: 2.6,
          roof: "mono",
          pitch: 12,
          ridge: "x",
          high: "front",
        });
      if ($("q_cons").checked)
        wings.push({
          id: uid(),
          name: "Conservatory",
          kind: "cons",
          x: +((t - 1) * W + 0.3).toFixed(2),
          z: -3,
          w: +Math.min(W - 0.6, 4).toFixed(2),
          d: 3,
          eaves: 2.2,
          roof: "mono",
          pitch: 15,
          ridge: "x",
          high: "front",
        });
      const lE = f === 1 && sides.includes("left"),
        rE = t === n && sides.includes("right"),
        span = (t - f + 1) * W,
        x0 = (f - 1) * W,
        x1 = t * W,
        hf = hs[f - 1],
        ht = hs[t - 1],
        nm = f === t ? `House ${f}` : `Houses ${f}–${t}`;
      runs = [];
      if (sides.includes("front"))
        runs.push({
          id: uid(),
          type: "run",
          name: nm + " front",
          wing: hf.id,
          side: "front",
          fit: false,
          x: x0,
          z: D,
          ry: 0,
          len: +span.toFixed(2),
          ht: E,
          js: lE,
          je: rE,
        });
      if (sides.includes("right") && rE)
        runs.push({
          id: uid(),
          type: "run",
          name: nm + " right",
          wing: ht.id,
          side: "right",
          fit: true,
          ...SIDEF.right(ht),
          ht: E,
          js: sides.includes("front"),
          je: sides.includes("back"),
        });
      if (sides.includes("back"))
        runs.push({
          id: uid(),
          type: "run",
          name: nm + " back",
          wing: ht.id,
          side: "back",
          fit: false,
          x: x1,
          z: 0,
          ry: 180,
          len: +span.toFixed(2),
          ht: E,
          js: rE,
          je: lE,
        });
      if (sides.includes("left") && lE)
        runs.push({
          id: uid(),
          type: "run",
          name: nm + " left",
          wing: hf.id,
          side: "left",
          fit: true,
          ...SIDEF.left(hf),
          ht: E,
          js: sides.includes("back"),
          je: sides.includes("front"),
        });
      Object.assign(w, hf);
      if (!runs.length) {
        toast("Tick front or back for a mid-row house");
        return;
      }
    } else
      runs = traceRuns(
        w,
        ORD.filter((k) => sides.includes(k)),
        E,
      );
    addFront(st === "row" ? wings.find((x) => x.id === w.id) || w : w);
    runs.forEach((r) => {
      if (
        $("q_tbl").checked &&
        roof === "gable" &&
        ((w.ridge === "x" && (r.side === "left" || r.side === "right")) ||
          (w.ridge === "z" && (r.side === "front" || r.side === "back")))
      )
        r.table = true;
      if (r.side === "front" && $("q_pub").checked) {
        r.pub = true;
        r.fan = true;
      }
    });
    blocks.push(...runs);
    if ($("q_chs").checked && chims.length)
      blocks.push({
        id: uid(),
        type: "chim",
        name: "Chimney scaffold",
        chim: chims[0].id,
        below: 1.0,
        boards: 3,
      });
    if ($("q_tr").checked)
      blocks.push({
        id: uid(),
        type: "troof",
        name: "Temporary roof",
        wing: w.id,
        style: "duo",
        pitch: 15,
        clear: 2,
        sheet: "tin",
        gables: true,
        skirts: false,
      });
    const fr = runs.find((r) => r.side === "front") || runs[0],
      L = num(fr.len, 1),
      acc = $("q_acc").value;
    if (acc === "stair")
      access.push({ type: "stair", block: fr.id, at: +Math.max(0, L / 2 - 1.3).toFixed(1) });
    else {
      access.push({ type: "ladder", block: fr.id, at: 1 });
      if (acc === "ramp")
        access.push({
          type: "ramp",
          block: fr.id,
          at: +Math.max(0.8, L - 1.5).toFixed(1),
          lift: 1,
        });
    }
    S.wings = wings;
    S.chims = chims;
    S.blocks = [...blocks, ...S.blocks.filter((b) => b.type === "prop")];
    S.access = access;
    S.removed = [];
    S.boards = $("q_bw").value;
    $("boards").value = S.boards;
    SELB = null;
    PV.fit = true;
    accUI();
    propsUI();
    update(false);
    if (!auto) {
      setView("3d");
      reset3D && reset3D();
      toast("Drawn — check the sizes, then fine-tune on the Plan");
    } else if (view === "plan") setView("3d");
    qdSnap = qdSig();
    qdNote();
  }
  // SiteHQ (James, Nov 2026: "instead of draw this every time I add or remove something it automatically does it"):
  // changing anything in Building & scaffold redraws straight away – while the drawing is still the one this form
  // made. Once it's been changed by hand on the Plan, it isn't wiped: the button redraws (Undo brings it back).
  let qdSnap = null,
    qdT = 0;
  const qdSig = () =>
    JSON.stringify(snapOf([S.wings, S.chims, S.blocks, S.access, S.removed, S.boards]));
  const qdOwn = () => !(S.wings || []).length || (qdSnap != null && qdSig() === qdSnap);
  function qdNote() {
    const n = $("q_note");
    if (n)
      n.textContent = qdOwn()
        ? "Changes here redraw it straight away. Fine-tune anything afterwards on the Plan."
        : "You've changed the drawing by hand, so this won't redraw by itself – tap the button to redraw (it replaces your changes; Undo brings them back).";
  }
  $("q_go").addEventListener("click", () => quickDesign(false));
  ["change", "input"].forEach((ev) =>
    $("qd").addEventListener(ev, (e) => {
      if (!e.target.closest("input,select") || e.target.id === "q_go") return;
      clearTimeout(qdT);
      qdT = setTimeout(
        () => {
          if (qdOwn()) quickDesign(true);
          else qdNote();
        },
        ev === "input" ? 700 : 250,
      );
    }),
  );
  qdNote();
  docOn("keydown", (e) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      !/INPUT|SELECT|TEXTAREA/.test((R.activeElement || document.activeElement).tagName) &&
      (e.key === "z" || e.key === "Z" || e.key === "y")
    ) {
      e.preventDefault();
      histGo(e.key === "y" || e.shiftKey ? 1 : -1);
    }
  });
  docOn("keydown", (e) => {
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      view === "plan" &&
      SELB &&
      !/INPUT|SELECT|TEXTAREA/.test((R.activeElement || document.activeElement).tagName)
    ) {
      e.preventDefault();
      act("delete");
    }
  });
  window.__scaf = { models: () => MODELS, state: () => S, T: () => T, H: () => HIST, PV: () => PV };
  sync();
  update();
  // SiteHQ: a blank design opens on the Plan, ready to add a building
  const blankStart = !(S.wings || []).length && !(S.blocks || []).length;
  setView(blankStart ? "plan" : "3d");
  loadThree()
    .then(() => {
      init3D();
      $("load").style.display = "none";
      build3D(false);
      if (blankStart) setView("plan");
    })
    .catch(() => {
      $("load").textContent = "3D model couldn't load here — showing the plan.";
      setTimeout(() => setView("plan"), 1200);
    });
  // SiteHQ: closing – keys stop, a change not yet saved is saved, and the 3D view lets go of the graphics card
  const flush = () => {
    if (jobT) {
      clearTimeout(jobT);
      return storeJob();
    }
    return null;
  };
  return {
    state: () => S,
    flush,
    // SiteHQ: save now (the house details changed)
    saveNow: () => {
      clearTimeout(jobT);
      return storeJob();
    },
    destroy() {
      OFF.forEach((f) => f());
      const p = flush();
      try {
        if (T && T.r) {
          T.r.dispose();
          if (T.r.forceContextLoss) T.r.forceContextLoss();
        }
      } catch (e) {}
      return p;
    },
  };
}
