const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
const seed='store["sheets/emp1"]={name:"Sam Test",details:{fullName:"Sam Test",confirmedAt:1,empType:"cis",nokName:"x",nokPhone:"1"}};store["settings/matcalc"]={lists:[{id:"b",name:"Bricks (half-brick wall)",basis:"m2",waste:5,items:[{name:"Bricks",per:60,unit:"each"}]},{id:"c",name:"Concrete",basis:"m3",waste:5,items:[{name:"Ready-mix concrete",per:1,unit:"m³"}]}]};';
(async()=>{const b=await chromium.launch();
 for(const owner of [false,true]){const p=await (await b.newContext({viewport:{width:400,height:900}})).newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(owner).replace('const ns={',seed+'const ns={')+page_src+'</body></html>');await p.waitForTimeout(700);await p.keyboard.press('Escape');
 await p.click('.tab[data-t="calc"]');await p.click('.calcmodes [data-m=mat]');await p.fill('#ms-l','6');await p.fill('#ms-w','2.4');
 console.log(owner?'O':'E',await p.innerText('#ms-sum'),'|',(await p.innerText('#mc-out')).replace(/\s+/g,' '));
 await p.selectOption('#mc-list','c');await p.waitForTimeout(100);console.log((await p.innerText('#mc-out')).replace(/\s+/g,' '));await p.fill('#ms-d','100');console.log(await p.innerText('#ms-sum'),'|',(await p.innerText('#mc-out')).replace(/\s+/g,' '));
 await p.screenshot({path:'mc3.png'});}
 await b.close();})();
