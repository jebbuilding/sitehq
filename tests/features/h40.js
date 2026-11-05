const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
const seed='store["sheets/emp1"]={name:"Sam Test",details:{fullName:"Sam Test",confirmedAt:1,empType:"cis",nokName:"x",nokPhone:"1",trade:"Groundworker"}};store["settings/matcalc"]={lists:[{id:"b",name:"Half-brick wall",basis:"m2",waste:5,items:[{name:"Bricks",per:60,unit:"each"}]},{id:"c",name:"Concrete",basis:"m3",waste:5,items:[{name:"Ready-mix concrete",per:1,unit:"m³"}]}]};';
(async()=>{const b=await chromium.launch();
 for(const owner of [false,true]){const p=await (await b.newContext({viewport:{width:400,height:1000}})).newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(owner).replace('const ns={',seed+'const ns={')+page_src+'</body></html>');await p.waitForTimeout(700);await p.keyboard.press('Escape');
 await p.click('.tab[data-t="calc"]');await p.click('.calcmodes [data-m=mat]');
 await p.fill('.c-l','6');await p.fill('.c-w','2.4');await p.click('#md-add');await (await p.$$('.c-l'))[1].fill('0.9');await (await p.$$('.c-w'))[1].fill('2.1');await (await p.$$('.c-minus'))[1].check();
 await p.click('#mc-pick [data-v=b]');await p.click('#mc-pick [data-v=c]');await p.waitForTimeout(100);
 console.log(owner?'OWNER':'EMP',(await p.innerText('#md-tot')).replace(/\s+/g,' '),'|',(await p.innerText('#mc-out')).replace(/\s+/g,' '));
 await p.fill('.c-d','100');console.log('with depth',(await p.innerText('#mc-out')).replace(/\s+/g,' ').slice(-120));
 if(owner)await p.screenshot({path:'mc2.png',fullPage:true});
 await p.click('#mc-send');await p.waitForTimeout(200);console.log('send items',await p.$$eval('#mt-items input',x=>x.map(i=>i.value).filter(Boolean).join('|')));}
 await b.close();})();
