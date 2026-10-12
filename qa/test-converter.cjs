"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),http=require("node:http");
const root=path.resolve(__dirname,".."),context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"js/unit-converter.js"),"utf8"),context);
const api=context.window.TPXConverter;
let checks=0;
function check(name,fn){fn();checks++;console.log("PASS "+name);}
function close(actual,expected,message){assert.ok(Math.abs(actual-expected)<=Math.max(1,Math.abs(expected))*1e-10,`${message}: expected ${expected}, received ${actual}`);}
function error(code,fn){assert.throws(fn,e=>e.code===code);}
const freezing={celsius:0,fahrenheit:32,kelvin:273.15,reaumur:0,rankine:491.67,delisle:150,newton:0,romer:7.5};
const boiling={celsius:100,fahrenheit:212,kelvin:373.15,reaumur:80,rankine:671.67,delisle:0,newton:33,romer:60};
const absolute={celsius:-273.15,fahrenheit:-459.67,kelvin:0,reaumur:-218.52,rankine:0,delisle:559.725,newton:-90.1395,romer:-135.90375};
for(const [name,reference] of Object.entries({freezing,boiling,absolute}))check(`Temperature ${name} for every direction`,()=>{for(const [from,value] of Object.entries(reference))for(const [to,expected] of Object.entries(reference))close(api.convert("temperature",value,from,to),expected,`${from} -> ${to}`);});
check("All 64 temperature unit pairs roundtrip across a physical range",()=>{for(const from of Object.keys(freezing))for(const to of Object.keys(freezing))for(const kelvin of [0,.001,200,273.15,300,373.15,1000,1000000]){const value=api.convert("temperature",kelvin,"kelvin",from);close(api.convert("temperature",api.convert("temperature",value,from,to),to,from),value,`${from} -> ${to} at ${kelvin} K`);}});
check("All eight scales reject temperature below absolute zero",()=>{for(const [unit,value] of Object.entries(absolute))error("absolute",()=>api.convert("temperature",value+(unit==="delisle"?1:-1),unit,"kelvin"));});
check("Kelvin and Celsius boundaries remain valid in the same unit",()=>{assert.equal(api.convert("temperature",0,"kelvin","kelvin"),0);assert.equal(api.convert("temperature",-273.15,"celsius","celsius"),-273.15);error("absolute",()=>api.convert("temperature",-1,"kelvin","kelvin"));});
check("All pressure and volume unit pairs roundtrip and preserve same units",()=>{for(const kind of ["pressure","volume"]){for(const from of Object.keys(api.groups[kind]))for(const to of Object.keys(api.groups[kind]))for(const value of [0,.001,1,22.4,10000])close(api.convert(kind,api.convert(kind,value,from,to),to,from),value,`${kind} ${from} -> ${to}`);assert.equal(api.convert(kind,12.345678901234,"l" in api.groups[kind]?"l":"pa","l" in api.groups[kind]?"l":"pa"),12.345678901234);}});
check("Pressure and volume retain original conversions and exact gallon distinctions",()=>{assert.equal(api.convert("pressure",1,"atm","pa"),101325);assert.equal(api.convert("pressure",101325,"pa","atm"),1);assert.equal(api.convert("volume",1,"l","m3"),.001);assert.equal(api.convert("volume",1,"m3","l"),1000);close(api.convert("volume",1,"galus","l"),3.785411784,"US gallon");close(api.convert("volume",1,"galuk","l"),4.54609,"imperial gallon");});
check("Empty, nonfinite, overflow, invalid units, and negative physical quantities fail",()=>{for(const value of [""," ",null,undefined])error("empty",()=>api.convert("temperature",value,"celsius","kelvin"));for(const value of ["Infinity",Infinity,NaN,"1e999","12foo","0x10",{},[]])error(value instanceof Array?"empty":"finite",()=>api.convert("temperature",value,"celsius","kelvin"));error("overflow",()=>api.convert("pressure",Number.MAX_VALUE,"atm","pa"));error("overflow",()=>api.convert("volume",Number.MAX_VALUE,"m3","ml"));error("negative",()=>api.convert("pressure",-1,"pa","atm"));error("negative",()=>api.convert("volume",-1,"l","m3"));error("unit",()=>api.convert("temperature",1,"celsius","fake"));});
check("Decimal and scientific numbers parse, rounding is readable, negative zero is removed",()=>{assert.equal(api.parse(" 1.2e2 "),120);assert.equal(api.parse("-.5"),-.5);assert.equal(api.format(273.15000000000003),"273.15");assert.equal(api.format(1e-20),"1e-20");assert.equal(api.format(-0),"0");assert.equal(api.convert("pressure",-0,"pa","pa"),0);});
async function browserChecks(){
let playwright;try{playwright=require("playwright");}catch(_){console.log("Browser checks skipped: install Playwright to run them.");return;}
const server=http.createServer((req,res)=>{let url;try{url=new URL(req.url,"http://localhost");}catch(_){res.writeHead(400).end();return;}const file=path.resolve(root,"."+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}const ext=path.extname(file);res.setHeader("Content-Type",({".html":"text/html",".js":"text/javascript",".css":"text/css"})[ext]||"application/octet-stream");fs.createReadStream(file).pipe(res);});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let browser;
try{
const executable=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(fs.existsSync("/usr/bin/chromium")?"/usr/bin/chromium":undefined);
browser=await playwright.chromium.launch({headless:true,executablePath:executable,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:1440,height:950}}),errors=[];
page.on("pageerror",e=>errors.push(e.message));
await page.route("https://fonts.googleapis.com/**",route=>route.abort());
await page.route("https://fonts.gstatic.com/**",route=>route.abort());
await page.goto(`http://127.0.0.1:${server.address().port}/converters.html`);
await page.locator(".tpx-page-transition").waitFor({state:"hidden"});
assert.equal(await page.locator("#uc-temperature-from option").count(),8);
await page.locator("#uc-temperature-form .uc-submit").click();
assert.equal(await page.locator("#uc-temperature-output").textContent(),"298.15 K");checks++;console.log("PASS Real DOM submits the temperature form");
await page.locator("#uc-temperature-swap").click();
assert.equal(await page.locator("#uc-temperature-from").inputValue(),"kelvin");assert.equal(await page.locator("#uc-temperature-to").inputValue(),"celsius");assert.equal(await page.locator("#uc-temperature-input").inputValue(),"298.15");assert.equal(await page.locator("#uc-temperature-output").textContent(),"25 °C");checks++;console.log("PASS Swap preserves the physical value and recalculates");
await page.locator("#uc-temperature-input").fill("-1");await page.locator("#uc-temperature-form .uc-submit").click();assert.equal(await page.locator("#uc-temperature-input").getAttribute("aria-invalid"),"true");assert.match(await page.locator("#uc-temperature-error").textContent(),/absolute zero/);assert.equal(await page.locator("#uc-temperature-output").textContent(),"—");checks++;console.log("PASS Invalid Kelvin input produces an accessible inline error");
await page.locator("#uc-temperature-input").fill("");await page.locator("#uc-temperature-form .uc-submit").click();assert.match(await page.locator("#uc-temperature-error").textContent(),/Enter a value/);checks++;console.log("PASS Empty DOM input is not coerced to zero");
await page.locator("#uc-temperature-from").selectOption("fahrenheit");await page.locator("#uc-temperature-to").selectOption("celsius");await page.locator("#uc-temperature-input").fill("32");await page.locator("#uc-temperature-input").press("Enter");assert.equal(await page.locator("#uc-temperature-output").textContent(),"0 °C");checks++;console.log("PASS Native selectors and keyboard form submit work");
await page.locator("#uc-temperature-to").selectOption("fahrenheit");assert.equal(await page.locator("#uc-temperature-output").textContent(),"32 °F");checks++;console.log("PASS Changing units after a result recalculates, including identical units");
for(const [kind,expected] of [["pressure","101325 Pa"],["volume","0.001 m³"]]){await page.locator(`#uc-${kind}-form .uc-submit`).click();assert.equal(await page.locator(`#uc-${kind}-output`).textContent(),expected);}checks++;console.log("PASS Pressure and volume work in the real DOM");
await page.evaluate(()=>window.TPX.setLanguage("id"));assert.equal(await page.locator("main h1").textContent(),"Konverter Satuan");assert.equal(await page.locator("label[for=uc-temperature-from]").textContent(),"Dari");await page.locator("#uc-temperature-input").fill("-999");await page.locator("#uc-temperature-form .uc-submit").click();assert.match(await page.locator("#uc-temperature-error").textContent(),/nol mutlak/);checks++;console.log("PASS Indonesian labels and validation messages respond to language changes");
await page.locator("#themeToggle").click();assert.equal(await page.locator("body").evaluate(el=>el.classList.contains("light-mode")),true);assert.equal(await page.evaluate(()=>localStorage.getItem("thermpyx-theme")),"light");await page.locator("#uc-temperature-from").focus();assert.equal(await page.locator("#uc-temperature-from").evaluate(el=>getComputedStyle(el).outlineStyle),"solid");checks++;console.log("PASS Shared theme persists and native selectors retain visible keyboard focus");
for(const width of [1440,1100,768,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`No overflow at ${width}px`);assert.equal(await page.locator(".uc-select-shell select").evaluateAll(els=>els.every(el=>el.getBoundingClientRect().width>70)),true,`Selectors readable at ${width}px`);}checks++;console.log("PASS Desktop, tablet, and mobile widths have readable controls and no overflow");
assert.deepEqual(errors,[]);checks++;console.log("PASS No browser runtime errors");
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
browserChecks().then(()=>console.log(`CONVERTER SUITE: ${checks}/${checks} passed`)).catch(error=>{console.error(error);process.exitCode=1;});
