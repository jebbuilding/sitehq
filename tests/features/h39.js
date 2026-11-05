const fs=require('fs');const {chromium}=require('playwright');
let src=fs.readFileSync('harness8src.js','utf8');
eval(src.slice(src.indexOf('const fake='),src.indexOf('(async()=>{\n  const b=await chromium.launch();')).replace('const fake=','global.fake='));
const page_src=fs.readFileSync('timesheets.html','utf8');
const seed='store["sheets/emp1"]={name:"Sam Test",details:{fullName:"Sam Test",confirmedAt:1,empType:"cis",nokName:"x",nokPhone:"1",trade:"Groundworker"}};';
async function mk(b,owner,wx){const p=await (await b.newContext({viewport:{width:400,height:900}})).newPage();p.on('pageerror',e=>console.log('ERR',e.message));
 await p.route('https://app.test/**',r=>r.fulfill({body:'<!doctype html><html><head><meta charset=utf8></head><body>'+fake(owner).replace('const ns={',seed+'const ns={')+page_src+'</body></html>',contentType:'text/html'}));
 await p.route('https://api.open-meteo.com/**',r=>wx?r.fulfill({body:JSON.stringify({current:{temperature_2m:11.6,weather_code:3,wind_speed_10m:9}}),contentType:'application/json',headers:{'access-control-allow-origin':'*'}}):r.abort());
 await p.goto('https://app.test/');await p.waitForTimeout(900);await p.keyboard.press('Escape');return p}
(async()=>{const b=await chromium.launch();
 let p=await mk(b,true,true);console.log('BAR',await p.innerText('#nowbar'));
 await p.click('.tab[data-t="calc"]');await p.click('.calcmodes [data-m=mat]');await p.waitForTimeout(200);console.log((await p.innerText('#calcbody')).replace(/\s+/g,' ').slice(0,200));
 await p.click('#mc-new');await p.fill('#mce-name','Stud wall boarding');await p.fill('.mce-n','Plasterboard 2400x1200');await p.fill('.mce-p','0.35');await p.selectOption('.mce-u','sheets');
 await p.click('#mce-add');const n=await p.$$('.mce-n');await n[1].fill('Drywall screws');await (await p.$$('.mce-p'))[1].fill('30');await p.fill('#mce-waste','10');await p.screenshot({path:'mced.png'});
 await p.click('#f-save');await p.waitForTimeout(500);await p.fill('#mc-amt','24');await p.waitForTimeout(100);console.log('OUT',(await p.innerText('#mc-out')).replace(/\s+/g,' '));
 await p.screenshot({path:'mcout.png'});await p.click('#mc-send');await p.waitForTimeout(300);console.log('SEND',(await p.innerText('#form')).replace(/\s+/g,' ').slice(0,400));
 p=await mk(b,false,false);console.log('BAR fail',await p.innerText('#nowbar'));await p.screenshot({path:'nowbar.png'});
 await b.close();})();
