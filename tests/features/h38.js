const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
const seed='store["sheets/emp1"]={name:"Sam Test",details:{fullName:"Sam Test",confirmedAt:1,empType:"cis",nokName:"x",nokPhone:"1",trade:"Groundworker"}};store["sheets/emp1/signoffs/td-1"]={type:"todo",text:"Clear rear garden",done:false,created:1,due:"2026-10-30"};store["todos/a"]={text:"Order skip",done:false,created:1};';
(async()=>{const b=await chromium.launch();
 for(const owner of [false,true]){const p=await (await b.newContext({viewport:{width:400,height:900}})).newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await p.setContent('<!doctype html><html><head><meta charset=utf8></head><body>'+fake(owner).replace('const ns={',seed+'const ns={')+page_src+'</body></html>');await p.waitForTimeout(700);await p.keyboard.press('Escape');
 console.log(owner?'OWNER':'EMP','tabs',await p.$$eval('.tab',x=>x.map(t=>t.textContent).join('|')));
 await p.click('.tab[data-t="jobs"]');await p.waitForTimeout(200);console.log((await p.innerText('#main')).replace(/\s+/g,' ').slice(0,330));
 if(!owner){await p.check('#td-trade .td-chk');await p.waitForTimeout(400);console.log('after tick',(await p.innerText('#main')).replace(/\s+/g,' ').slice(0,140));}
 else{await p.click('.tab[data-t="todo"]');await p.waitForTimeout(200);console.log('TODO',(await p.innerText('#main')).replace(/\s+/g,' ').slice(0,300));await p.click('#td-send');await p.waitForTimeout(200);console.log('sender',await p.innerText('#sheettitle'))}
 }
 await b.close();})();
