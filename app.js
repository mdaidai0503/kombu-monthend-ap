import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
const cfg=window.MONTHEND_CONFIG,$=id=>document.getElementById(id);
const state={prev:null,curr:null,diffKeys:new Set(),cache:{}};

function initMonths(){const d=new Date(),cm=d.getMonth()+1,pm=cm===1?12:cm-1;for(const id of["prevMonth","currMonth"]){const s=$(id);for(let m=1;m<=12;m++){const o=document.createElement("option");o.value=m;o.textContent=m+"月";s.appendChild(o)}}$("prevMonth").value=pm;$("currMonth").value=cm}
function status(s,append=true){if(!append)$("status").textContent=s;else $("status").textContent+=( $("status").textContent?"\n":"")+s}
function canonicalCompany(text,category){const t=String(text||"").replace(/\s/g,"");if(category==="hidaka")return"";if(/河田トレーディング/.test(t))return"河田トレーディング";if(/丸ヨ海産|マルヨ海産|丸よ海産/.test(t))return"マルヨ海産";if(/サイチ村上物産|村上物産/.test(t))return"村上物産";if(/ぎょれん販売/.test(t))return"ぎょれん販売";if(/ぎょれん北光|㈱ぎょれん北光|（北光）|\(北光\)|北光/.test(t))return"北光";if(/山三商事/.test(t))return"山三商事";return"その他"}
function detectCategory(text){if(/釧路産棹前昆布/.test(text))return"sanmae";if(/日高産昆布|日\s*高\s*昆\s*布/.test(text))return"hidaka";if(/根室産昆布/.test(text))return"nemuro";if(/釧路産昆布/.test(text))return"kushiro";return"other"}
function detectYear(text){const m=text.match(/[ＲR]\s*\.?\s*(\d+)\s*年度/i);return m?Number(m[1]):-1}
function keyOf(p){return`${p.category}|${p.year}|${p.company}`}
function rankCompany(p){const a=cfg.companyOrder[p.category]||[],i=a.indexOf(p.company);return i<0?999:i}
function sortPages(pages){return[...pages].sort((a,b)=>{const ca=cfg.categoryOrder.indexOf(a.category),cb=cfg.categoryOrder.indexOf(b.category);if(ca!==cb)return ca-cb;if(a.year!==b.year)return b.year-a.year;const ra=rankCompany(a),rb=rankCompany(b);if(ra!==rb)return ra-rb;return a.index-b.index})}
function numericValue(str){const s=String(str||"").trim().replaceAll(",","");return /^-?\d+$/.test(s)?Number(s):null}
function quantitySignature(items){const nums=[];for(const it of items){const y=it.transform?.[5]??9999;if(y<cfg.dataMinY)continue;const v=numericValue(it.str);if(v!==null)nums.push(v)}nums.sort((a,b)=>a-b);return nums.join(",")}
function itemCenter(it){return{x:(it.transform?.[4]||0)+(Number(it.width)||0)/2,y:(it.transform?.[5]||0)}}
function cellKey(it){const c=itemCenter(it);return`${Math.round(c.x*2)/2}|${Math.round(c.y*2)/2}`}
function extractCells(items){const m=new Map();for(const it of items){const y=it.transform?.[5]??9999;if(y<cfg.dataMinY)continue;const s=String(it.str||"").trim().replaceAll(",","");if(s!=="-"&&!/^-?\d+$/.test(s))continue;const v=s==="-"?0:Number(s);m.set(cellKey(it),{value:v,item:it})}return m}

async function parsePdf(file,month,label){const ab=await file.arrayBuffer(),bytes=new Uint8Array(ab),pdf=await pdfjsLib.getDocument({data:bytes.slice()}).promise,pages=[];for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),tc=await page.getTextContent(),text=tc.items.map(x=>x.str).join("\n"),category=detectCategory(text),year=detectYear(text),company=canonicalCompany(text,category);pages.push({index:i-1,pageNo:i,category,year,company,text,items:tc.items,qtySig:quantitySignature(tc.items),cells:extractCells(tc.items)});status(`${label}: ${i}/${pdf.numPages}ページ解析`)}return{file,bytes,month:Number(month),pages,sorted:sortPages(pages),pdf}}
function compare(prev,curr){const pm=new Map(prev.pages.map(p=>[keyOf(p),p])),cm=new Map(curr.pages.map(p=>[keyOf(p),p])),diff=new Set();for(const k of pm.keys()){if(!cm.has(k))continue;if(pm.get(k).qtySig!==cm.get(k).qtySig)diff.add(k)}return diff}
function labelCategory(k){return cfg.categories[k]?.label||k}
function render(){const r=[];for(const[label,d]of[["前月",state.prev],["当月",state.curr]])for(const p of(d?.sorted||[])){const diff=state.diffKeys.has(keyOf(p));r.push(`<tr><td>${label} ${d.month}月</td><td>${p.pageNo}</td><td>${labelCategory(p.category)}</td><td>${p.year>0?`R${p.year}`:"-"}</td><td>${p.company||"-"}</td><td>${diff?'<span class="warn">差異あり</span>':'-'}</td></tr>`)}$("resultBody").innerHTML=r.join("")}
function setButtons(on){for(const id of["downloadPrevSortedMarked","downloadCurrSortedMarked","downloadAggregate","downloadIndexCsv","downloadZip"])$(id).disabled=!on}
function mmToPt(mm){return mm*72/25.4}function hexToRgb(h){const x=h.replace("#","");return{r:parseInt(x.slice(0,2),16),g:parseInt(x.slice(2,4),16),b:parseInt(x.slice(4,6),16)}}
async function buildPdf(data,pages,markDiffOnly=false){
  const src=await PDFLib.PDFDocument.load(data.bytes);
  const out=await PDFLib.PDFDocument.create();
  const copied=await out.copyPages(src,pages.map(p=>p.index));
  copied.forEach(p=>out.addPage(p));

  if(markDiffOnly){
    const rgb=hexToRgb(cfg.monthColors[data.month]||"#cccccc");
    const w=mmToPt(cfg.edgeWidthMm);
    const outPages=out.getPages();

    for(let i=0;i<pages.length;i++){
      if(!state.diffKeys.has(keyOf(pages[i]))) continue;
      const p=outPages[i];
      const s=p.getSize();
      p.drawRectangle({
        x:s.width-w,y:0,width:w,height:s.height,
        color:PDFLib.rgb(rgb.r/255,rgb.g/255,rgb.b/255),
        opacity:cfg.edgeOpacity
      });
    }
  }
  return await out.save()
}
function companyRegex(s){return /山三商事|ぎょれん北光|北光|ぎょれん販売|サイチ村上物産|村上物産|丸ヨ海産|マルヨ海産|丸よ海産|河田トレーディング/.test(s)}
function aggregateGroups(data){const map=new Map();for(const p of data.sorted){if(!cfg.aggregateCategories.includes(p.category)||p.year<0||p.company==="その他")continue;const k=`${p.category}|${p.year}`;if(!map.has(k))map.set(k,[]);map.get(k).push(p)}return [...map.entries()].map(([k,pages])=>({key:k,category:pages[0].category,year:pages[0].year,pages})).sort((a,b)=>{const ca=cfg.categoryOrder.indexOf(a.category),cb=cfg.categoryOrder.indexOf(b.category);return ca!==cb?ca-cb:b.year-a.year})}
async function renderAggregatePage(data,group){const template=group.pages[0],page=await data.pdf.getPage(template.pageNo),scale=cfg.aggregateRenderScale,viewport=page.getViewport({scale}),canvas=document.createElement("canvas");canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const ctx=canvas.getContext("2d",{alpha:false});await page.render({canvasContext:ctx,viewport}).promise;
  const sums=new Map(),positions=new Map();for(const p of group.pages){for(const[k,o]of p.cells){sums.set(k,(sums.get(k)||0)+o.value);if(!positions.has(k))positions.set(k,o.item)}}
  const ttc=await page.getTextContent();ctx.save();ctx.fillStyle="#fff";
  for(const it of ttc.items){const yPdf=it.transform?.[5]??0;const isVal=yPdf>=cfg.dataMinY&&(String(it.str).trim()==="-"||numericValue(it.str)!==null);const isCompany=companyRegex(String(it.str||""));if(!isVal&&!isCompany)continue;const tr=pdfjsLib.Util.transform(viewport.transform,it.transform),fh=Math.max(8,Math.hypot(tr[2],tr[3])),x=tr[4],y=tr[5]-fh,w=Math.max(7,(Number(it.width)||6)*scale);ctx.fillRect(x-2,y-2,w+4,fh+4)}
  ctx.textAlign="center";ctx.textBaseline="middle";for(const[k,total]of sums){const it=positions.get(k),tr=pdfjsLib.Util.transform(viewport.transform,it.transform),fh=Math.max(9,Math.hypot(tr[2],tr[3])),cx=tr[4]+((Number(it.width)||6)*scale)/2,cy=tr[5]-fh/2;ctx.font=`${Math.max(9,fh)}px sans-serif`;ctx.fillStyle="#111";ctx.fillText(total===0?"-":String(total),cx,cy)}
  const companyItems=ttc.items.filter(it=>companyRegex(String(it.str||"")));for(const it of companyItems){const tr=pdfjsLib.Util.transform(viewport.transform,it.transform),fh=Math.max(11,Math.hypot(tr[2],tr[3])),cx=tr[4]+((Number(it.width)||20)*scale)/2,cy=tr[5]-fh/2;ctx.font=`bold ${Math.max(11,fh)}px sans-serif`;ctx.fillStyle="#111";ctx.fillText("各社合計",cx,cy)}ctx.restore();return canvas}
async function buildAggregatePdf(data){const out=await PDFLib.PDFDocument.create(),groups=aggregateGroups(data);for(let i=0;i<groups.length;i++){status(`各社合計PDF作成: ${i+1}/${groups.length}（${labelCategory(groups[i].category)} R${groups[i].year}）`);const canvas=await renderAggregatePage(data,groups[i]),png=await out.embedPng(canvas.toDataURL("image/png")),page=out.addPage([841.92,595.32]);page.drawImage(png,{x:0,y:0,width:841.92,height:595.32})}return await out.save()}
function csvEscape(v){const s=String(v??"");return/[",\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s}function csvBytes(){const rows=[["月","元ページ","産地","年度","会社","差異"]];for(const[label,d]of[["前月",state.prev],["当月",state.curr]])for(const p of d.sorted)rows.push([`${label}${d.month}月`,p.pageNo,labelCategory(p.category),p.year>0?`R${p.year}`:"",p.company,state.diffKeys.has(keyOf(p))?"あり":""]);return new TextEncoder().encode("\uFEFF"+rows.map(r=>r.map(csvEscape).join(",")).join("\r\n"))}
function downloadBytes(bytes,name,type="application/pdf"){const blob=new Blob([bytes],{type}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
async function getOutput(name){
  if(state.cache[name])return state.cache[name];
  let v;
  if(name==="prevSortedMarked")v=await buildPdf(state.prev,state.prev.sorted,true);
  if(name==="currSortedMarked")v=await buildPdf(state.curr,state.curr.sorted,true);
  if(name==="aggregate")v=await buildAggregatePdf(state.curr);
  if(name==="csv")v=csvBytes();
  state.cache[name]=v;
  return v
}

$("runBtn").addEventListener("click",async()=>{const pf=$("prevFile").files[0],cf=$("currFile").files[0];if(!pf||!cf){alert("前月PDFと当月PDFを両方選択してください。");return}try{setButtons(false);state.cache={};status("月末処理を開始します。",false);state.prev=await parsePdf(pf,$("prevMonth").value,"前月");state.curr=await parsePdf(cf,$("currMonth").value,"当月");state.diffKeys=compare(state.prev,state.curr);render();status(`② 並べ替え準備完了：前月 ${state.prev.pages.length}ページ / 当月 ${state.curr.pages.length}ページ`);status(`③ 数量差異：${state.diffKeys.size}件（並べ替え順を維持し、該当ページだけ色付け）`);const groups=aggregateGroups(state.curr);status(`④ 各社合計：${groups.length}年度分を作成可能`);const unknown=state.curr.pages.filter(p=>cfg.aggregateCategories.includes(p.category)&&p.company==="その他");if(unknown.length)status(`注意：会社判定できないページ ${unknown.length}件。集計対象外です。`);setButtons(true);status("処理準備完了。各PDFまたは結果一式ZIPを保存できます。") }catch(e){console.error(e);status("エラー: "+(e?.message||e))}});
$("resetBtn").addEventListener("click",()=>location.reload());
$("downloadPrevSortedMarked").addEventListener("click",async()=>downloadBytes(await getOutput("prevSortedMarked"),`${state.prev.month}月末_並べ替え済_差異ページ色付け.pdf`));
$("downloadCurrSortedMarked").addEventListener("click",async()=>downloadBytes(await getOutput("currSortedMarked"),`${state.curr.month}月末_並べ替え済_差異ページ色付け.pdf`));
$("downloadAggregate").addEventListener("click",async()=>downloadBytes(await getOutput("aggregate"),`${state.curr.month}月末_3種昆布_生産年度別_各社合計.pdf`));
$("downloadIndexCsv").addEventListener("click",async()=>downloadBytes(await getOutput("csv"),`${state.curr.month}月末_分類一覧.csv`,"text/csv"));
$("downloadZip").addEventListener("click",async()=>{try{status("結果ZIPを作成しています…");const z=new JSZip();z.file(`${state.prev.month}月末_並べ替え済_差異ページ色付け.pdf`,await getOutput("prevSortedMarked"));z.file(`${state.curr.month}月末_並べ替え済_差異ページ色付け.pdf`,await getOutput("currSortedMarked"));z.file(`${state.curr.month}月末_3種昆布_生産年度別_各社合計.pdf`,await getOutput("aggregate"));z.file(`${state.curr.month}月末_分類一覧.csv`,await getOutput("csv"));const blob=await z.generateAsync({type:"blob"});downloadBytes(await blob.arrayBuffer(),`${state.curr.month}月末_月末在庫処理_結果一式.zip`,"application/zip");status("結果ZIPを作成しました。") }catch(e){status("ZIP作成エラー: "+(e?.message||e))}});
initMonths();if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});