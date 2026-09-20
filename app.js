const KEY="shudhu-baki-hisab-v2",IDB_NAME="shudhu-baki-hisab-offline-v2",IDB_STORE="app";
let db=JSON.parse(localStorage.getItem(KEY)||"null")||{customers:[],settings:{}};db.customers??=[];db.settings??={};let selectedPage="home",accessToken=null,driveFolderId=null,tokenClient=null,driveBusy=false,backupDirty=localStorage.getItem("shudhu-baki-backup-dirty")==="1",historyCustomerId=null,driveConnected=localStorage.getItem("shudhu-baki-drive-connected")==="1",driveTokenExpiresAt=Number(localStorage.getItem("shudhu-baki-drive-expiry")||0);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], money=n=>"৳"+Number(n||0).toLocaleString("bn-BD",{maximumFractionDigits:2}), esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])), today=new Date().toISOString().slice(0,10);
const fmtDMY=d=>{let [y,m,day]=(d||today).split("-");return `${day}-${m}-${y}`};
const bnWeekdays=["রবিবার","সোমবার","মঙ্গলবার","বুধবার","বৃহস্পতিবার","শুক্রবার","শনিবার"];
const weekdayBn=d=>{let [y,m,day]=(d||today).split("-").map(Number);return bnWeekdays[new Date(y,m-1,day).getDay()]};
const fmtDateFull=d=>`${fmtDMY(d)} (${weekdayBn(d)})`;
function halDate(){return db.settings?.halKhataDate||today}
function dueAsOf(c,date){return (c.ledger||[]).reduce((s,x)=>{if(!x.date||x.date>date)return s;return s+(x.type==="due"?Number(x.amount):-Number(x.amount))},0)}
function dueBefore(c,date){return (c.ledger||[]).reduce((s,x)=>{if(!x.date||x.date>=date)return s;return s+(x.type==="due"?Number(x.amount):-Number(x.amount))},0)}
function halDates(){return Array.isArray(db.settings?.halKhataDates)?[...new Set(db.settings.halKhataDates.filter(Boolean))].sort():((db.settings?.halKhataConfigured&&db.settings?.halKhataDate)?[db.settings.halKhataDate]:[])}
function halCycles(){let dates=halDates();return dates.map((date,i)=>({date,previousDate:dates[i-1]||null,nextDate:dates[i+1]||null}))}
function halDateReached(date){return today>=date}
function halEligible(c,date){return halDateReached(date)&&dueBefore(c,date)>0}
function halPaidAfterDate(c,date){return halDateReached(date)&&(c.ledger||[]).some(x=>x.type==='paid'&&x.date>=date&&Number(x.amount)>0)}
function activeHalCycle(){let dates=halDates().filter(d=>d<=today);return dates.length?dates[dates.length-1]:null}
function normalize(){db.settings??={};db.settings.halKhataDates=halDates();db.settings.halKhataConfigured=Boolean(db.settings.halKhataConfigured);db.settings.halKhataDate=db.settings.halKhataDate||db.settings.halKhataDates.at(-1)||today;db.customers.forEach(c=>{c.id??=Date.now()+Math.random();c.name??="";c.phone??="";c.father??="";c.address??="";c.ledger??=[]})}normalize();
function dueOf(c){return (c.ledger||[]).reduce((s,x)=>s+(x.type==="due"?Number(x.amount):-Number(x.amount)),0)}
function totalDue(){return db.customers.reduce((s,c)=>s+Math.max(0,dueOf(c)),0)} function findCustomer(id){return db.customers.find(c=>String(c.id)===String(id))}
function toast(t){let x=document.createElement("div");x.className="toast";x.textContent=t;document.body.appendChild(x);setTimeout(()=>x.remove(),2200)}
function openIDB(){return new Promise(resolve=>{if(!indexedDB)return resolve(null);let r=indexedDB.open(IDB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(IDB_STORE))r.result.createObjectStore(IDB_STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null)})}
async function saveIDB(){let d=await openIDB();if(!d)return;await new Promise((res,rej)=>{let t=d.transaction(IDB_STORE,"readwrite");t.objectStore(IDB_STORE).put(JSON.parse(JSON.stringify(db)),"db");t.oncomplete=res;t.onerror=rej}).catch(()=>{})}
async function hydrate(){let d=await openIDB();if(d){let x=await new Promise(r=>{let q=d.transaction(IDB_STORE,"readonly").objectStore(IDB_STORE).get("db");q.onsuccess=()=>r(q.result);q.onerror=()=>r(null)});if(x?.customers){db=x;localStorage.setItem(KEY,JSON.stringify(db))}}render()}
async function save(){localStorage.setItem(KEY,JSON.stringify(db));backupDirty=true;localStorage.setItem("shudhu-baki-backup-dirty","1");await saveIDB();scheduleAutoBackup()}
function go(page){selectedPage=page;$$('.page').forEach(x=>x.classList.add('hidden'));$('#page-'+page)?.classList.remove('hidden');$$('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===page));if(page==='customers')renderCustomers();if(page==='memo')initMemo();if(page==='payment')resetPayment();if(page==='hal')resetHal();if(page==='hal-all')renderHalAll();if(page==='history')renderHistory(historyCustomerId);window.scrollTo({top:0,behavior:'smooth'})}
$$('[data-page]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.page)));
function getBaseShopConfig(){
  const base=(typeof SHOP_CONFIG==='object'&&SHOP_CONFIG)?SHOP_CONFIG:{};
  return {name:String(base.name||''),owner:String(base.owner||''),phone:String(base.phone||''),address:String(base.address||'')};
}
const SHOP_PROFILE_KEY_PREFIX='shudhu-baki-shop-profile-v1:';
function getCurrentSiteId(){
  return String(window.SITE_ID||SITE_ID||'default').trim()||'default';
}
function getShopProfileStorageKey(){
  return SHOP_PROFILE_KEY_PREFIX+getCurrentSiteId();
}
function readStoredShopProfile(){
  try{
    const raw=localStorage.getItem(getShopProfileStorageKey());
    if(!raw)return null;
    const p=JSON.parse(raw);
    return p&&typeof p==='object'?p:null;
  }catch(e){return null}
}
function currentShopProfile(){
  const base=getBaseShopConfig();
  const saved=readStoredShopProfile()||db.settings?.shopProfiles?.[getCurrentSiteId()]||{};
  return {
    name:String(saved.name??base.name),
    owner:String(saved.owner??base.owner),
    phone:String(saved.phone??base.phone),
    address:String(saved.address??base.address)
  };
}
function saveShopProfile(profile){
  const site=getCurrentSiteId();
  const clean={name:String(profile.name||'').trim(),owner:String(profile.owner||'').trim(),phone:String(profile.phone||'').trim(),address:String(profile.address||'').trim()};
  // Primary profile storage: isolated per SITE_ID.
  localStorage.setItem(SHOP_PROFILE_KEY_PREFIX+site,JSON.stringify(clean));
  // Keep a copy inside the app backup as well.
  db.settings??={};db.settings.shopProfiles??={};
  db.settings.shopProfiles[site]=clean;
}
function render(){ const shop=currentShopProfile(); $('#shopName').textContent=shop.name||'শুধু বাকি হিসাব';$('#totalDue').textContent=money(totalDue());$('#dueCustomerCount').textContent=db.customers.filter(c=>dueOf(c)>0).length.toLocaleString('bn-BD');renderHomeResults();if(selectedPage==='customers')renderCustomers() }
function customerMatches(q){q=q.trim().toLowerCase();return db.customers.filter(c=>(c.name+' '+c.phone+' '+c.father+' '+c.address).toLowerCase().includes(q))}
function renderHomeResults(){let q=$('#homeSearch').value||'';let a=q.trim()?customerMatches(q):[];$('#homeResults').innerHTML=a.map(c=>`<div class="result-row"><div><div class="customer-name-line"><b>${esc(c.name)}${(activeHalCycle()&&halEligible(c,activeHalCycle())&&!halPaidAfterDate(c,activeHalCycle()))?' <span class="hal-status-cross" title="হালখাতা এখনো সম্পন্ন হয়নি">✕</span>':''}</b><button type="button" class="see-all-btn" data-home-history="${c.id}">সব দেখুন</button></div><small>${esc(c.phone||'')} · বাকি ${money(Math.max(0,dueOf(c)))}</small></div><div class="row-actions"><a class="small-btn call-btn" href="tel:${esc(c.phone)}">📞 কল</a><button class="small-btn" data-home-memo="${c.id}">মেমো</button><button class="small-btn" data-home-pay="${c.id}">জমা</button><button class="small-btn" data-home-hal="${c.id}">হালখাতা</button><button class="small-btn" data-home-history="${c.id}">সব দেখুন</button></div></div>`).join('');$$('[data-home-history]').forEach(b=>b.onclick=()=>openHistory(b.dataset.homeHistory));$$('[data-home-memo]').forEach(b=>b.onclick=()=>{go('memo');selectMemoCustomer(b.dataset.homeMemo)});$$('[data-home-pay]').forEach(b=>b.onclick=()=>{go('payment');selectPayCustomer(b.dataset.homePay)});$$('[data-home-hal]').forEach(b=>b.onclick=()=>{go('hal');selectHalCustomer(b.dataset.homeHal)})}
$('#homeSearch').addEventListener('input',renderHomeResults);
function renderCustomers(){let q=$('#customerSearch').value||'';let a=customerMatches(q);$('#customerList').innerHTML=a.length?a.map(c=>`<div class="customer-card"><div class="customer-main"><div class="customer-name-line"><b>${esc(c.name)}${(activeHalCycle()&&halEligible(c,activeHalCycle())&&!halPaidAfterDate(c,activeHalCycle()))?' <span class="hal-status-cross" title="হালখাতা এখনো সম্পন্ন হয়নি">✕</span>':''}</b><button type="button" class="see-all-btn" data-history="${c.id}">সব দেখুন</button></div><small>পিতা: ${esc(c.father||'—')} · ${esc(c.phone||'—')} · ${esc(c.address||'—')}</small></div><div class="due">${money(Math.max(0,dueOf(c)))}</div><div class="card-actions"><a class="small-btn call-btn" href="tel:${esc(c.phone)}">📞 কল</a><button class="small-btn" data-edit="${c.id}">✏️ Edit</button><button class="small-btn" data-memo="${c.id}">🧾 মেমো</button><button class="small-btn" data-history="${c.id}">সব দেখুন</button></div></div>`).join(''):`<div class="empty">কোনো কাস্টমার পাওয়া যায়নি।</div>`;$$('[data-history]').forEach(b=>b.onclick=()=>openHistory(b.dataset.history));$$('[data-edit]').forEach(b=>b.onclick=()=>editCustomer(b.dataset.edit));$$('[data-memo]').forEach(b=>b.onclick=()=>{go('memo');selectMemoCustomer(b.dataset.memo)})}
$('#customerSearch').addEventListener('input',renderCustomers);
function openHistory(id){historyCustomerId=id;go('history')}
function historySummary(c){
  let totalBill=0,totalPaid=0;
  (c.ledger||[]).forEach(x=>{if(x.memo){totalBill+=Number(x.memo.total||0);totalPaid+=Number(x.memo.paid||0)}else if(x.type==='paid')totalPaid+=Number(x.amount||0)});
  return {totalBill,totalPaid,currentDue:Math.max(0,dueOf(c))};
}
function renderHistory(id){
  const c=findCustomer(id); if(!c){$('#historyArea').innerHTML='<div class="empty">কাস্টমার পাওয়া যায়নি।</div>';return}
  const sum=historySummary(c);
  const rows=(c.ledger||[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||Number(a.id)-Number(b.id));
  $('#historyArea').innerHTML=`<div class="history-head panel"><div><h2>${esc(c.name)}</h2><div class="history-meta">📞 ${esc(c.phone||'—')} · 👨 ${esc(c.father||'—')} · 📍 ${esc(c.address||'—')}</div></div><div class="history-totals"><div><span>মোট বিল</span><b>${money(sum.totalBill)}</b></div><div><span>মোট জমা</span><b>${money(sum.totalPaid)}</b></div><div><span>বর্তমান বাকি</span><b>${money(sum.currentDue)}</b></div></div></div><div class="panel"><div class="panel-title"><h2>সমস্ত হিস্ট্রি</h2></div><div class="history-list">${rows.length?rows.map(x=>{
    if(x.memo){return `<div class="history-row"><div class="history-date">${fmtDMY(x.date)}<small>${weekdayBn(x.date)}</small></div><div class="history-content"><b>🧾 মেমো</b><div class="history-products">${x.memo.items.map(i=>`<span>${esc(i.product)} — ${money(i.price)}</span>`).join('')}</div><small>মোট বিল: ${money(x.memo.total)} · জমা: ${money(x.memo.paid)} · বাকি: ${money(x.memo.due)}</small></div></div>`}
    return `<div class="history-row"><div class="history-date">${fmtDMY(x.date)}<small>${weekdayBn(x.date)}</small></div><div class="history-content"><b>💵 টাকা জমা</b><small>জমা: ${money(x.amount)}${x.note?' · '+esc(x.note):''}</small></div></div>`;
  }).join(''):'<div class="empty">এই কাস্টমারের এখনো কোনো লেনদেন নেই।</div>'}</div></div>`;
}
$('#historyBack').onclick=()=>go('customers');

$('#customerForm').addEventListener('submit',e=>{e.preventDefault();let name=$('#name').value.trim();if(!name)return alert('কাস্টমারের নাম দিন।');if(db.customers.some(c=>c.name.trim().toLowerCase()===name.toLowerCase()))return alert('এই নামে কাস্টমার আগে থেকেই আছে।');db.customers.push({id:Date.now(),name,phone:$('#phone').value.trim(),father:$('#father').value.trim(),address:$('#address').value.trim(),ledger:[]});save();e.target.reset();render();renderCustomers();toast('কাস্টমার যোগ হয়েছে।')});
function editCustomer(id){let c=findCustomer(id);if(!c)return;$('#customerEdit').classList.remove('hidden');$('#customerEdit').innerHTML=`<div class="panel-title"><h2>কাস্টমার Edit</h2><button class="small-btn" id="closeEdit">✕</button></div><form id="editForm" class="form customer-form"><label>কাস্টমারের নাম<input id="en" required value="${esc(c.name)}"></label><label>ফোন নম্বর<input id="ep" value="${esc(c.phone)}"></label><label>পিতার নাম<input id="ef" value="${esc(c.father)}"></label><label>ঠিকানা<input id="ea" value="${esc(c.address)}"></label><button class="primary">তথ্য আপডেট করুন</button></form>`;$('#closeEdit').onclick=()=>$('#customerEdit').classList.add('hidden');$('#editForm').onsubmit=e=>{e.preventDefault();c.name=$('#en').value.trim();c.phone=$('#ep').value.trim();c.father=$('#ef').value.trim();c.address=$('#ea').value.trim();save();render();renderCustomers();$('#customerEdit').classList.add('hidden');toast('কাস্টমারের তথ্য আপডেট হয়েছে।')}}
function pickerResults(inputId,resultId,onSelect){let q=$(inputId).value||'';let a=customerMatches(q);$(resultId).innerHTML=a.map(c=>`<button type="button" class="picker-row" data-pick="${c.id}"><b>${esc(c.name)}</b><span>${esc(c.phone||'')} · বাকি ${money(Math.max(0,dueOf(c)))}</span></button>`).join('')||'<div class="empty">কোনো কাস্টমার পাওয়া যায়নি।</div>';$$(`${resultId} [data-pick]`).forEach(b=>b.onclick=()=>onSelect(b.dataset.pick))}
function selectMemoCustomer(id){let c=findCustomer(id);if(!c)return;$('#memoCustomerId').value=id;$('#selectedMemoCustomer').innerHTML=`<b>✓ ${esc(c.name)}</b> · বর্তমান বাকি ${money(Math.max(0,dueOf(c)))}<small>${esc(c.phone||'')}</small>`;$('#memoCustomerResults').innerHTML='';$('#memoCustomerSearch').value=c.name}
function updateMemoDateDisplay(){let el=$('#memoDateDisplay');if(el)el.textContent=fmtDMY($('#memoDate').value||today)}
function initMemo(){if(!$('#memoDate').value)$('#memoDate').value=today;updateMemoDateDisplay();if(!$('#memoItems').children.length)addMemoItem();updateMemoTotals()}
$('#memoCustomerSearch').addEventListener('input',()=>{if($('#memoCustomerId').value){$('#memoCustomerId').value='';$('#selectedMemoCustomer').textContent='কাস্টমার নির্বাচন করুন'}pickerResults('#memoCustomerSearch','#memoCustomerResults',selectMemoCustomer)});$('#memoDate').addEventListener('change',updateMemoDateDisplay);
function addMemoItem(){let d=document.createElement('div');d.className='memo-item';d.innerHTML=`<input class="item-name" placeholder="পণ্যের নাম" required><input class="item-price" type="number" min="0" step="0.01" placeholder="এই পণ্যের মোট টাকা"><button type="button" class="small-btn remove-item">✕</button>`;d.querySelectorAll('input').forEach(x=>x.addEventListener('input',updateMemoTotals));d.querySelector('.remove-item').onclick=()=>{d.remove();updateMemoTotals()};$('#memoItems').appendChild(d)}
$('#addItem').onclick=addMemoItem;
function memoTotal(){return $$('.memo-item').reduce((s,r)=>s+Number(r.querySelector('.item-price').value||0),0)}
function updateMemoTotals(){let t=memoTotal(),p=Number($('#memoPaid').value||0);$('#memoTotal').textContent=money(t);$('#memoDue').textContent=money(Math.max(0,t-p))}$('#memoPaid').addEventListener('input',updateMemoTotals);
$('#memoForm').addEventListener('submit',e=>{e.preventDefault();let c=findCustomer($('#memoCustomerId').value);if(!c)return alert('আগে কাস্টমার নির্বাচন করুন।');let items=$$('.memo-item').map(r=>({product:r.querySelector('.item-name').value.trim(),price:Number(r.querySelector('.item-price').value||0)})).filter(x=>x.product&&x.price>0);let total=items.reduce((s,x)=>s+x.price,0),paid=Number($('#memoPaid').value||0);if(!items.length||total<=0)return alert('পণ্যের নাম ও দাম দিন।');if(paid>total)paid=total;let due=total-paid;c.ledger.push({id:Date.now(),date:$('#memoDate').value||today,type:'due',amount:due,note:'মেমো: '+items.map(x=>`${x.product} (${money(x.price)})`).join(', '),memo:{items,total,paid,due}});save();toast('মেমো সেভ হয়েছে।');e.target.reset();$('#memoDate').value=today;$('#memoCustomerId').value='';$('#selectedMemoCustomer').textContent='কাস্টমার নির্বাচন করুন';$('#memoItems').innerHTML='';addMemoItem();updateMemoTotals();render()});
function updatePayDateDisplay(){let el=$('#payDateDisplay');if(el)el.textContent='জমার তারিখ: '+fmtDateFull($('#payDate').value||today)}
function resetPayment(){ $('#paySearch').value='';$('#payCustomerId').value='';$('#payResults').innerHTML='';$('#payCustomerInfo').textContent='কাস্টমার নির্বাচন করুন';$('#payCurrent').value=money(0);$('#payDate').value=today;updatePayDateDisplay();$('#payAmount').value='';$('#payNote').value=''}
function selectPayCustomer(id){let c=findCustomer(id);if(!c)return;$('#payCustomerId').value=id;$('#payCustomerInfo').innerHTML=`<b>✓ ${esc(c.name)}</b><small>${esc(c.phone||'')} · ${esc(c.address||'')}</small>`;$('#payCurrent').value=money(Math.max(0,dueOf(c)));$('#paySearch').value=c.name;$('#payResults').innerHTML=''}
$('#paySearch').addEventListener('input',()=>pickerResults('#paySearch','#payResults',selectPayCustomer));$('#payDate').addEventListener('change',updatePayDateDisplay);$('#savePayment').onclick=()=>{let c=findCustomer($('#payCustomerId').value),d=Math.max(0,dueOf(c||{})),a=Number($('#payAmount').value||0),pd=$('#payDate').value||today;if(!c)return alert('কাস্টমার নির্বাচন করুন।');if(d<=0)return alert('এই কাস্টমারের কোনো বাকি নেই।');if(!a||a<=0)return alert('জমার টাকা দিন।');if(a>d)return alert('জমা টাকা বর্তমান বাকি থেকে বেশি হতে পারবে না।');c.ledger.push({id:Date.now(),date:pd,type:'paid',amount:a,note:$('#payNote').value.trim()||'বাকি পরিশোধ'});save();render();renderHalStatusLists();toast('টাকা জমা হয়েছে এবং বাকি কমেছে।');resetPayment()};
function renderHalStatusLists(){
  const date=activeHalCycle();
  $('#halDateText').textContent='নির্ধারিত তারিখ: '+fmtDateFull(halDate());
  if(!date){$('#halPaidCount').textContent='০';$('#halUnpaidCount').textContent='০';$('#halPaidList').innerHTML='<div class="empty">হালখাতার তারিখ এখনো আসেনি।</div>';$('#halUnpaidList').innerHTML='<div class="empty">হালখাতার তারিখ এলে স্বয়ংক্রিয়ভাবে তালিকা তৈরি হবে।</div>';return}
  const eligible=db.customers.filter(c=>halEligible(c,date));
  const paid=eligible.filter(c=>halPaidAfterDate(c,date)), unpaid=eligible.filter(c=>!halPaidAfterDate(c,date));
  $('#halPaidCount').textContent=paid.length.toLocaleString('bn-BD');$('#halUnpaidCount').textContent=unpaid.length.toLocaleString('bn-BD');
  const row=c=>`<div class="hal-status-row"><div><b>${esc(c.name)}</b><small>${esc(c.phone||'')} · মোট বকেয়া ${money(Math.max(0,dueOf(c)))}</small></div><div class="hal-status-actions"><button type="button" class="status-pill ${halPaidAfterDate(c,date)?'paid':'unpaid'}">${halPaidAfterDate(c,date)?'হালখাতা করেছে':'হালখাতা করেনি'}</button><button type="button" class="small-btn" data-hal-pick="${c.id}">সব দেখুন</button></div></div>`;
  const preview=a=>a.slice(0,4).map(row).join('')||'<div class="empty">কোনো কাস্টমার নেই।</div>';
  $('#halPaidList').innerHTML=preview(paid);
  $('#halUnpaidList').innerHTML=preview(unpaid);
  $$('[data-hal-pick]').forEach(b=>b.onclick=()=>openHistory(b.dataset.halPick));
  $('#halPaidAllBtn').onclick=()=>{window.halAllMode='paid';go('hal-all')};
  $('#halUnpaidAllBtn').onclick=()=>{window.halAllMode='unpaid';go('hal-all')};
}
function renderHalAll(){
  const date=activeHalCycle();
  if(!date){$('#halAllTitle').textContent='হালখাতা তালিকা';$('#halAllList').innerHTML='<div class="empty">হালখাতার সক্রিয় তারিখ এখনো আসেনি।</div>';return}
  const eligible=db.customers.filter(c=>halEligible(c,date));
  const paid=eligible.filter(c=>halPaidAfterDate(c,date)), unpaid=eligible.filter(c=>!halPaidAfterDate(c,date));
  const mode=window.halAllMode||'paid'; const arr=mode==='unpaid'?unpaid:paid;
  $('#halAllTitle').textContent=mode==='unpaid'?'❌ হালখাতা করেনি':'✅ হালখাতা করেছে';
  $('#halAllSub').textContent=`মোট ${arr.length.toLocaleString('bn-BD')} জন • ${fmtDateFull(date)}`;
  $('#halAllList').innerHTML=arr.map(c=>`<div class="hal-status-row"><div><b>${esc(c.name)}</b><small>📞 ${esc(c.phone||'—')} · বর্তমান বকেয়া ${money(Math.max(0,dueOf(c)))}</small></div><div class="hal-status-actions"><span class="status-pill ${mode==='unpaid'?'unpaid':'paid'}">${mode==='unpaid'?'হালখাতা করেনি':'হালখাতা করেছে'}</span><button type="button" class="small-btn" data-hal-all-history="${c.id}">সব দেখুন</button></div></div>`).join('')||'<div class="empty">এই তালিকায় কোনো কাস্টমার নেই।</div>';
  $$('[data-hal-all-history]').forEach(b=>b.onclick=()=>openHistory(b.dataset.halAllHistory));
}

function resetHal(){ $('#halSearch').value='';$('#halCustomerId').value='';$('#halResults').innerHTML='';$('#halCustomerInfo').textContent='কাস্টমার নির্বাচন করুন';$('#halCardArea').innerHTML='';$('#halDate').value=halDate();$('#halDateText').textContent='নির্ধারিত তারিখ: '+fmtDateFull(halDate());renderHalStatusLists()}
function selectHalCustomer(id){let c=findCustomer(id);if(!c)return;$('#halCustomerId').value=id;$('#halSearch').value=c.name;$('#halResults').innerHTML='';$('#halCustomerInfo').innerHTML=`<b>${esc(c.name)}</b> · বর্তমান বাকি ${money(Math.max(0,dueOf(c)))}<small>${esc(c.phone||'')}</small>`;renderHal(c)}
$('#halSearch').addEventListener('input',()=>pickerResults('#halSearch','#halResults',selectHalCustomer));
$('#saveHalDate').onclick=()=>{let d=$('#halDate').value||today;let dates=halDates();if(!dates.includes(d))dates.push(d);dates=[...new Set(dates)].sort();db.settings.halKhataDates=dates;db.settings.halKhataDate=d;db.settings.halKhataConfigured=true;save();$('#halDateText').textContent='নির্ধারিত তারিখ: '+fmtDateFull(d);renderHalStatusLists();let c=findCustomer($('#halCustomerId').value);if(c)renderHal(c);toast('হালখাতার তারিখ সেট হয়েছে।')};

function halCardMarkup(c, pdfMode=false){
  const d=halDate();
  const due=Math.max(0,Number(dueOf(c)||0));
  const profile=currentShopProfile();
  const shop=profile.name||'আমাদের প্রতিষ্ঠান';
  const owner=profile.owner||'';
  const phone=profile.phone||'';
  const address=profile.address||'';
  return `<div class="hal-card reference-hal-card${pdfMode?' pdf-reference-hal-card':''}" id="${pdfMode?'':'halCard-'+c.id}">
    <div class="hal-inner">
      <div class="hal-dove hal-dove-left" aria-hidden="true">
        <svg viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 75 C35 48 55 28 78 25 C61 42 61 57 75 68 C58 65 42 58 29 48 C35 67 31 82 15 75Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M72 28 C91 17 112 20 126 34 C110 30 98 36 93 49 C89 40 81 33 72 28Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M76 67 C95 75 111 82 139 79 C126 94 108 99 92 90 C84 85 79 77 76 67Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M126 34 l13 -4 M128 40 l14 2 M126 46 l12 7" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="hal-dove hal-dove-right" aria-hidden="true">
        <svg viewBox="0 0 180 120" xmlns="http://www.w3.org/2000/svg">
          <path d="M165 75 C145 48 125 28 102 25 C119 42 119 57 105 68 C122 65 138 58 151 48 C145 67 149 82 165 75Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M108 28 C89 17 68 20 54 34 C70 30 82 36 87 49 C91 40 99 33 108 28Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M104 67 C85 75 69 82 41 79 C54 94 72 99 88 90 C96 85 101 77 104 67Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M54 34 l-13 -4 M52 40 l-14 2 M54 46 l-12 7" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        </svg>
      </div>

      <div class="hal-bismillah">বিসমিল্লাহির রাহমানির রাহিম</div>
      <div class="hal-main-title">শুভ হালখাতা</div>
      <div class="hal-subtitle">${esc(shop)}</div>
      <div class="hal-owner-line">${esc(owner)}${phone?` &nbsp;•&nbsp; ${esc(phone)}`:''}</div>

      <div class="hal-invite">
        <div class="hal-invite-greet">জনাব,</div>
        <p>আমাদের কর্মময় জীবনে আপনাদের যথেষ্ট সাহায্য ও সহযোগিতা পেয়েছি। সেই ভালোবাসা ও আন্তরিকতার স্মৃতিকে সঙ্গে রেখে নতুন উদ্যমে এগিয়ে চলার প্রত্যয়ে আমাদের হালখাতা অনুষ্ঠানে আপনাকে সাদর আমন্ত্রণ জানাচ্ছি।</p>
        <p class="hal-invite-center">অতএব উক্ত দিনে আপনার উপস্থিতি একান্তভাবে কামনা করছি। আপনার উপস্থিতি আমাদের জন্য অত্যন্ত আনন্দের।</p>
      </div>

      <div class="hal-customer-grid">
        <div><span>কাস্টমারের নাম</span><b>${esc(c.name||'—')}</b></div>
        <div><span>পিতার নাম</span><b>${esc(c.father||'—')}</b></div>
        <div><span>ঠিকানা</span><b>${esc(c.address||'—')}</b></div>
      </div>

      <div class="hal-date-line"><b>হালখাতার তারিখ:</b> ${fmtDMY(d)} <span>(${weekdayBn(d)})</span></div>

      <div class="hal-bottom">
        <div class="hal-due-area">
          <div class="hal-due-caption">হিসাবে বাকি:-</div>
          <div class="hal-due-box">${money(due)}</div>
          <div class="hal-due-note">বি.দ্রঃ বাকি টাকা পরিশোধ করার জন্য অনুরোধ করা হলো।</div>
        </div>
        <div class="hal-flower" aria-hidden="true">
          <svg viewBox="0 0 110 150" xmlns="http://www.w3.org/2000/svg">
            <path d="M53 146 C51 119 58 96 53 72 C49 51 54 28 62 8" fill="none" stroke="currentColor" stroke-width="4"/>
            <path d="M55 101 C39 92 28 82 30 68 C45 70 55 81 55 101Z" fill="none" stroke="currentColor" stroke-width="4"/>
            <path d="M55 119 C71 108 82 98 80 84 C66 86 56 98 55 119Z" fill="none" stroke="currentColor" stroke-width="4"/>
            <path d="M61 47 C43 42 34 32 38 20 C51 21 61 31 61 47Z" fill="none" stroke="currentColor" stroke-width="4"/>
            <circle cx="63" cy="15" r="12" fill="none" stroke="currentColor" stroke-width="4"/>
            <circle cx="51" cy="26" r="9" fill="none" stroke="currentColor" stroke-width="3"/>
            <circle cx="73" cy="27" r="9" fill="none" stroke="currentColor" stroke-width="3"/>
          </svg>
        </div>
        <div class="hal-contact">
          <div class="hal-contact-label">শুভেচ্ছান্তে</div>
          <strong>${esc(owner||shop)}</strong>
          <div>${esc(address)}</div>
          ${phone?`<div>মোবাইল: ${esc(phone)}</div>`:''}
        </div>
      </div>
    </div>
  </div>`;
}
function renderHal(c){
  const d=halDate();
  $('#halCardArea').innerHTML=`<div class="hal-wrap">
    ${halCardMarkup(c,false)}
    <div class="hal-actions no-print">
      <button class="primary" onclick="window.print()">🖨️ প্রিন্ট / PDF</button>
      <button class="secondary" onclick="downloadHalCard('${c.id}')">📸 ইমেজ ডাউনলোড</button>
      <button class="secondary" onclick="shareHalCard('${c.id}')">↗️ শেয়ার</button>
    </div>
  </div>`;
}
async function shareHalCard(id){let c=findCustomer(id),profile=currentShopProfile(),text=`${profile.name||'আমাদের প্রতিষ্ঠান'}\nশুভ হালখাতা\nহালখাতার তারিখ: ${fmtDMY(halDate())}\nবার: ${weekdayBn(halDate())}\nকাস্টমার: ${c.name}\nসমস্ত বকেয়া: ${money(dueOf(c))}`;if(navigator.share){try{await navigator.share({title:'শুভ হালখাতা',text})}catch(e){}}else{try{await navigator.clipboard.writeText(text);toast('হালখাতার তথ্য কপি হয়েছে।')}catch(e){}}}
async function downloadHalCard(id){const card=document.getElementById('halCard-'+id);if(!card)return;try{if(typeof html2canvas==='undefined')throw Error('IMAGE_LIB');const canvas=await html2canvas(card,{scale:3,backgroundColor:'#ffffff',useCORS:true,allowTaint:false,logging:false});const a=document.createElement('a');a.download='হালখাতা-'+(findCustomer(id)?.name||'কার্ড')+'.png';a.href=canvas.toDataURL('image/png',1.0);document.body.appendChild(a);a.click();a.remove();toast('হালখাতা কার্ড সেভ হয়েছে।')}catch(e){console.error(e);alert('হালখাতা কার্ড ডাউনলোড করা যায়নি। Internet চালু রেখে আবার চেষ্টা করুন।')}}

async function downloadAllHalCards(){
  try{
    /* সব বর্তমান বাকি থাকা কাস্টমারের কার্ড অটোমেটিকভাবে নেওয়া হবে।
       Hal Khata date শুধু কার্ডে দেখানোর তারিখ; কার্ডের যোগ্যতা নির্ধারিত হবে বর্তমান বাকি > 0 দিয়ে। */
    const customers=(db.customers||[]).filter(c=>Number(dueOf(c))>0);
    if(!customers.length){alert('বর্তমানে বাকি থাকা কোনো কাস্টমার নেই।');return;}
    if(typeof html2canvas==='undefined'||typeof window.jspdf==='undefined'){
      alert('PDF সুবিধাটি লোড হয়নি। Internet চালু করে আবার চেষ্টা করুন।');return;
    }
    const {jsPDF}=window.jspdf;
    const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const pageW=210,pageH=297,margin=10,gap=7,cardW=pageW-2*margin,slotH=(pageH-2*margin-gap)/2;
    for(let i=0;i<customers.length;i++){
      if(i>0 && i%2===0) pdf.addPage();
      const c=customers[i],holder=document.createElement('div');
      holder.style.cssText='position:fixed;left:-100000px;top:0;width:1000px;background:#fff;padding:0;margin:0;z-index:-1;';
      holder.innerHTML=halCardMarkup(c,true);
      document.body.appendChild(holder);
      const card=holder.querySelector('.hal-card');
      const canvas=await html2canvas(card,{scale:2,backgroundColor:'#ffffff',useCORS:true,allowTaint:false,logging:false});
      const ratio=Math.min(cardW/canvas.width,slotH/canvas.height),w=canvas.width*ratio,h=canvas.height*ratio,x=(pageW-w)/2,slot=(i%2===0)?0:1,y=margin+slot*(slotH+gap)+(slotH-h)/2;
      pdf.addImage(canvas.toDataURL('image/png',1.0),'PNG',x,y,w,h,undefined,'FAST');
      holder.remove();
    }
    pdf.save(`হালখাতা-সব-কার্ড-${fmtDMY(halDate()).replaceAll('-','')}.pdf`);
    toast('সব হালখাতা কার্ড PDF হিসেবে সেভ হয়েছে।');
  }catch(e){console.error(e);alert('সব হালখাতা কার্ডের PDF তৈরি করা যায়নি। আবার চেষ্টা করুন।');}
}


/* =========================================================
   Per-SITE_ID shop profile editor
   ========================================================= */
function installShopProfileUI(){
  if(document.getElementById('shopProfileBtn')) return;
  const nav=document.querySelector('.nav');
  const btn=document.createElement('button');
  btn.type='button';btn.id='shopProfileBtn';btn.className='small-btn';btn.textContent='⚙️ দোকানের তথ্য';
  btn.style.marginLeft='6px';
  (nav||document.body).appendChild(btn);

  const wrap=document.createElement('div');wrap.id='shopProfileModal';wrap.className='profile-modal hidden';
  wrap.innerHTML=`<div class="profile-modal-backdrop"></div><div class="profile-modal-card" role="dialog" aria-modal="true" aria-labelledby="shopProfileTitle">
    <div class="panel-title"><h2 id="shopProfileTitle">🏪 দোকানের তথ্য</h2><button type="button" class="small-btn" id="closeShopProfile">✕</button></div>
    <p class="profile-help">এই তথ্য শুধু এই <b>SITE_ID</b>-এর জন্য ব্যবহার হবে এবং হালখাতা কার্ডে অটোমেটিক বসবে।</p>
    <form id="shopProfileForm" class="form">
      <label>দোকানের নাম<input id="shopProfileName" maxlength="120" placeholder="যেমন: মেসার্স রহমান ট্রেডার্স" required></label>
      <label>দোকানদারের নাম<input id="shopProfileOwner" maxlength="120" placeholder="যেমন: মোঃ রহমান"></label>
      <label>ফোন নম্বর<input id="shopProfilePhone" maxlength="30" inputmode="tel" placeholder="01XXXXXXXXX"></label>
      <label>ঠিকানা<textarea id="shopProfileAddress" rows="3" maxlength="300" placeholder="দোকানের ঠিকানা"></textarea></label>
      <div class="profile-site-id">SITE_ID: <b id="shopProfileSiteId"></b></div>
      <button type="submit" class="primary">💾 তথ্য সংরক্ষণ করুন</button>
    </form>
  </div>`;
  document.body.appendChild(wrap);
  const style=document.createElement('style');style.id='shopProfileStyle';style.textContent=`
    .profile-modal{position:fixed;inset:0;z-index:999998;display:flex;align-items:center;justify-content:center;padding:16px}
    .profile-modal.hidden{display:none}.profile-modal-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.48)}
    .profile-modal-card{position:relative;width:min(520px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.25)}
    .profile-help{margin:0 0 14px;color:#666;line-height:1.55}.profile-site-id{font-size:13px;color:#666;margin:4px 0 12px;padding:10px;border-radius:10px;background:#f5f6f8}
    .profile-modal-card textarea{width:100%;resize:vertical}.profile-modal-card label{display:block;margin-bottom:12px}
  `;document.head.appendChild(style);
  function open(){
    const p=currentShopProfile();
    $('#shopProfileName').value=p.name;$('#shopProfileOwner').value=p.owner;$('#shopProfilePhone').value=p.phone;$('#shopProfileAddress').value=p.address;$('#shopProfileSiteId').textContent=String(window.SITE_ID||SITE_ID||'');
    wrap.classList.remove('hidden');
  }
  function close(){wrap.classList.add('hidden')}
  btn.onclick=open;$('#closeShopProfile').onclick=close;wrap.querySelector('.profile-modal-backdrop').onclick=close;
  $('#shopProfileForm').onsubmit=async e=>{e.preventDefault();const name=$('#shopProfileName').value.trim();if(!name)return alert('দোকানের নাম দিন।');saveShopProfile({name,owner:$('#shopProfileOwner').value,phone:$('#shopProfilePhone').value,address:$('#shopProfileAddress').value});await save();render();if(selectedPage==='hal')resetHal();close();toast('দোকানের তথ্য সংরক্ষণ হয়েছে।')};
  window.openShopProfile=open;
  if(!currentShopProfile().name) setTimeout(open,500);
}


/* =========================================================
   Central subscription/license control
   The license system is intentionally separate from Drive
   backup logic. It NEVER deletes or changes Drive files.
   ========================================================= */
let subscriptionValid = false;
let subscriptionState = 'Checking';
let subscriptionExpiry = '';

// Get the client SITE_ID from the URL.
// Example:
// https://your-site.com/?site_id=client_pabna_01
function getSiteIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return String(params.get('site_id') || '').trim();
}

// Use the URL SITE_ID for this client instance.
SITE_ID = getSiteIdFromUrl();
if (!SITE_ID) {
  setTimeout(() => {
    document.body.innerHTML = `
      <div style="
        position:fixed;
        inset:0;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#fff;
        z-index:999999;
        font-family:Arial,sans-serif;
        text-align:center;
        padding:20px;
      ">
        <div>
          <h2>Access Denied</h2>
          <p>Valid SITE_ID is required.</p>
        </div>
      </div>
    `;
  }, 0);

  throw new Error('SITE_ID is missing from URL');
}

function setSubscriptionLock(locked, reason='') {
  const modal = $('#subscriptionLock');
  if (!modal) return;
  modal.hidden = !locked;
  document.body.classList.toggle('subscription-locked', locked);
  const appRoot = $('.app');
  if (appRoot) {
    appRoot.inert = locked;
    appRoot.setAttribute('aria-hidden', locked ? 'true' : 'false');
  }
  if ($('#lockReason')) $('#lockReason').textContent = reason;
}

function configureSupportLinks() {
  $('#lockBkash').textContent = APP_CONFIG.BKASH_NUMBER || '01XXXXXXXXX';
  $('#lockNagad').textContent = APP_CONFIG.NAGAD_NUMBER || '01XXXXXXXXX';

  const wa = String(APP_CONFIG.WHATSAPP_NUMBER || '').replace(/\D/g, '');
  const btn = $('#whatsappSupport');
  if (!btn) return;
  if (wa.length >= 10) {
    btn.href = 'https://wa.me/' + wa;
    btn.target = '_blank';
  } else {
    btn.href = '#';
    btn.onclick = e => {
      e.preventDefault();
      alert('config.js-এ একটি valid WhatsApp number সেট করুন।');
    };
  }
}

function isExpiryValid(expiry) {
  if (!expiry) return false;
  // Compare YYYY-MM-DD as calendar dates in the browser's local timezone.
  const todayKey = new Date().toLocaleDateString('en-CA');
  return String(expiry).slice(0, 10) >= todayKey;
}

async function checkSubscriptionStatus() {
  subscriptionValid = false;
  subscriptionExpiry = '';
  subscriptionState = 'Checking';

  // Subscription যাচাই না হওয়া পর্যন্ত অ্যাপ লক থাকবে।
  setSubscriptionLock(true, 'Subscription status যাচাই করা হচ্ছে…');

  const url = String(ADMIN_API_URL || '').trim();
  const siteId = String(SITE_ID || '').trim();

  // Subscription API অথবা URL-এর SITE_ID না থাকলে অ্যাপ খুলবে না।
  if (!url || url.includes('PASTE_') || !siteId) {
    subscriptionState = 'Unavailable';
    setSubscriptionLock(
      true,
      'Subscription API অথবা URL-এর SITE_ID পাওয়া যায়নি।'
    );
    return false;
  }

  try {
    // Apps Script-এ URL parameter হিসেবে SITE_ID পাঠানো হবে।
    const endpoint = new URL(url);
    endpoint.searchParams.set('site_id', siteId);

    // পুরোনো cached response ব্যবহার না করার জন্য।
    endpoint.searchParams.set('_ts', Date.now().toString());

    const response = await fetch(endpoint.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Subscription API HTTP ' + response.status);
    }

    const result = await response.json();

    // Apps Script থেকে অবশ্যই status এবং expiry_date আসতে হবে।
    const status = String(result?.status || '')
      .trim()
      .toLowerCase();

    const expiry = String(result?.expiry_date || '')
      .trim()
      .slice(0, 10);

    subscriptionExpiry = expiry;

    // শুধুমাত্র Active + Valid Expiry হলে অ্যাপ খুলবে।
    const active = status === 'active' && isExpiryValid(expiry);

    if (!active) {
      if (status === 'paused') {
        subscriptionState = 'Paused';

        setSubscriptionLock(
          true,
          `Status: Paused${expiry ? ' • Expiry: ' + expiry : ''}`
        );

        return false;
      }

      if (status === 'active' && !isExpiryValid(expiry)) {
        subscriptionState = 'Expired';

        setSubscriptionLock(
          true,
          `Subscription expired${expiry ? ' • Expiry: ' + expiry : ''}`
        );

        return false;
      }

      subscriptionState = 'Unavailable';

      setSubscriptionLock(
        true,
        `Subscription Active নয়${status ? ' • Status: ' + status : ''}`
      );

      return false;
    }

    // এখানে শুধু Active + Valid Expiry হলে অ্যাপ Unlock হবে।
    subscriptionState = 'Active';
    subscriptionValid = true;

    setSubscriptionLock(false);

    return true;

  } catch (error) {
    console.error('Subscription check failed:', error);

    // API/network error হলে নিরাপত্তার জন্য অ্যাপ Locked থাকবে।
    subscriptionState = 'Unavailable';
    subscriptionValid = false;

    setSubscriptionLock(
      true,
      'Subscription status যাচাই করা যায়নি। Internet/API সংযোগ পরীক্ষা করুন।'
    );

    return false;
  }
}

function subscriptionAllows(actionName='এই ফিচার') {
  if (subscriptionValid) return true;
  alert('Subscription Active না থাকায় ' + actionName + ' ব্যবহার করা যাচ্ছে না।');
  return false;
}

function onlineNow(){return navigator.onLine!==false}
function scheduleAutoBackup(){clearTimeout(window.__backupTimer);if(!subscriptionValid||!onlineNow()||!backupDirty)return;window.__backupTimer=setTimeout(()=>autoBackup(),1200)}
function driveReady(){return subscriptionValid && typeof GOOGLE_CLIENT_ID==='string'&&GOOGLE_CLIENT_ID&&!GOOGLE_CLIENT_ID.includes('PASTE_') && Array.isArray(SCOPES.split ? SCOPES.split(/\s+/).filter(Boolean) : SCOPES)}
function loadGIS(cb){if(window.google?.accounts?.oauth2)return cb(true);let s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=()=>cb(true);s.onerror=()=>{updateBackupStatus('Google Sign-In লোড করা যায়নি। Internet প্রয়োজন।');cb(false)};document.head.appendChild(s)}
function updateBackupStatus(t){$('#backupStatus').textContent=t}
function updateDriveConnectionStatus(connected){
  const el=$('#driveConnectionStatus');
  if(!el)return;
  el.classList.toggle('connected',!!connected);
  el.classList.toggle('disconnected',!connected);
  el.textContent=connected?'● Google Drive সংযুক্ত':'● Google Drive সংযুক্ত নয়';
}

function driveToken(manual=true){if(!subscriptionAllows('Google Drive'))return;if(!onlineNow())return alert('Google Drive সংযুক্ত করতে Internet চালু করুন।');loadGIS(ok=>{if(!ok||!driveReady())return alert('Google OAuth Client ID/Google Sign-In পাওয়া যায়নি।');tokenClient=google.accounts.oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID,scope:SCOPES,callback:async r=>{if(r.error){updateBackupStatus('Google Drive সংযোগ করা যায়নি।');return}accessToken=r.access_token;driveConnected=true;localStorage.setItem('shudhu-baki-drive-connected','1');updateDriveConnectionStatus(true);driveTokenExpiresAt=Date.now()+Math.max(1,Number(r.expires_in||3600)-60)*1000;localStorage.setItem('shudhu-baki-drive-expiry',String(driveTokenExpiresAt));updateBackupStatus('Google Drive সংযুক্ত হয়েছে।');updateDriveConnectionStatus(true);await driveBackup(true)}});tokenClient.requestAccessToken({prompt:manual?'consent':'none'})})}
async function ensureDriveAccess(){if(!subscriptionValid||!driveReady()||!onlineNow())return false;if(accessToken&&Date.now()<driveTokenExpiresAt)return true;accessToken=null;return new Promise(resolve=>{loadGIS(ok=>{if(!ok||!driveReady())return resolve(false);tokenClient=google.accounts.oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID,scope:SCOPES,callback:r=>{if(r.error){driveConnected=false;localStorage.setItem('shudhu-baki-drive-connected','0');return resolve(false)}accessToken=r.access_token;driveConnected=true;localStorage.setItem('shudhu-baki-drive-connected','1');updateDriveConnectionStatus(true);driveTokenExpiresAt=Date.now()+Math.max(1,Number(r.expires_in||3600)-60)*1000;localStorage.setItem('shudhu-baki-drive-expiry',String(driveTokenExpiresAt));resolve(true)}});tokenClient.requestAccessToken({prompt:'none'})})})}
async function driveFetch(url,opts={}){let r=await fetch(url,{...opts,headers:{...(opts.headers||{}),Authorization:'Bearer '+accessToken}});if(r.status===401){accessToken=null;throw Error('AUTH')};if(!r.ok)throw Error(await r.text());return r.json()}
async function ensureDriveFolder(){if(driveFolderId)return driveFolderId;let q=encodeURIComponent("name='সহজ হিসাব' and mimeType='application/vnd.google-apps.folder' and trashed=false and 'root' in parents");let f=await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name)`);if(f.files?.length)return driveFolderId=f.files[0].id;let x=await driveFetch('https://www.googleapis.com/drive/v3/files',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'সহজ হিসাব',mimeType:'application/vnd.google-apps.folder',parents:['root']})});return driveFolderId=x.id}
async function uploadOrUpdateDrive(name,mime,blob,folder){let q=encodeURIComponent(`name='${name}' and '${folder}' in parents and trashed=false`),f=await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name)`),old=f.files?.[0];if(old){await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${old.id}?uploadType=media`,{method:'PATCH',headers:{'Content-Type':mime},body:blob});return old.id}let form=new FormData();form.append('metadata',new Blob([JSON.stringify({name,mimeType:mime,parents:[folder]})],{type:'application/json'}));form.append('file',blob);let r=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',{method:'POST',headers:{Authorization:'Bearer '+accessToken},body:form});if(!r.ok)throw Error(await r.text());return (await r.json()).id}
function mergeBackupData(remote,local){
  const out=JSON.parse(JSON.stringify(remote||{customers:[],settings:{}})); out.customers??=[]; out.settings??={};
  const byId=new Map(out.customers.map(c=>[String(c.id),c]));
  (local.customers||[]).forEach(lc=>{
    const key=String(lc.id); const rc=byId.get(key);
    if(!rc){out.customers.push(JSON.parse(JSON.stringify(lc)));byId.set(key,out.customers[out.customers.length-1]);return}
    rc.name=lc.name??rc.name;rc.phone=lc.phone??rc.phone;rc.father=lc.father??rc.father;rc.address=lc.address??rc.address;rc.ledger??=[];
    const ids=new Set(rc.ledger.map(x=>String(x.id)));
    (lc.ledger||[]).forEach(x=>{if(!ids.has(String(x.id))){rc.ledger.push(JSON.parse(JSON.stringify(x)));ids.add(String(x.id))}});
  });
  // Preserve existing remote settings while accepting newly configured Hal Khata dates from the local app.
  out.settings={...out.settings,...(local.settings||{})};
  if(Array.isArray(remote?.settings?.halKhataDates)||Array.isArray(local?.settings?.halKhataDates)) out.settings.halKhataDates=[...new Set([...(remote?.settings?.halKhataDates||[]),...(local?.settings?.halKhataDates||[])])].filter(Boolean).sort();
  return out;
}
async function readDriveBackup(folder){
  const q=encodeURIComponent(`name='sohoj-hisab-backup.json' and '${folder}' in parents and trashed=false`);
  const f=await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)`);
  const file=f.files?.[0]; if(!file)return null;
  return await driveFetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`);
}
async function driveBackup(silent=false){
  if(!subscriptionValid)return false;
  if(driveBusy)return false;
  if(!db.customers.length){updateBackupStatus('অ্যাপে নতুন কোনো হিসাব নেই—Drive-এর পুরোনো Backup অপরিবর্তিত আছে।');if(!silent)toast('অ্যাপ খালি। পুরোনো Backup অপরিবর্তিত আছে।');return false}
  driveBusy=true;
  try{
    if(!await ensureDriveAccess()){if(!silent)alert('Google Drive সংযুক্ত নেই।');return false}
    const folder=await ensureDriveFolder();
    const remote=await readDriveBackup(folder);
    const merged=mergeBackupData(remote?.data,db);
    const payload={app:'শুধু বাকি হিসাব',version:5,updatedAt:new Date().toISOString(),dateFormat:'DD-MM-YYYY',data:merged};
    const jsonBlob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    await uploadOrUpdateDrive('sohoj-hisab-backup.json','application/json',jsonBlob,folder);
    backupDirty=false;localStorage.setItem('shudhu-baki-backup-dirty','0');
    updateBackupStatus('শেষ Backup: '+fmtDMY(today));
    return true;
  }catch(e){console.error(e);updateBackupStatus('Backup ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');if(!silent)alert('Backup করা যায়নি। Internet ও Google Drive অনুমতি পরীক্ষা করুন।');return false}
  finally{driveBusy=false}
}
async function autoBackup(){if(subscriptionValid&&onlineNow()&&backupDirty&&driveConnected)await driveBackup(true)}window.addEventListener('online',()=>scheduleAutoBackup());document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleAutoBackup()});
async function driveRestore(){if(!subscriptionAllows('Restore'))return;if(!await ensureDriveAccess())return alert('আগে Google Drive সংযুক্ত করুন।');try{let folder=await ensureDriveFolder(),r=await readDriveBackup(folder);if(!r?.data?.customers)return alert('Google Drive-এ JSON Backup পাওয়া যায়নি।');if(!confirm('Drive Backup দিয়ে বর্তমান হিসাব প্রতিস্থাপন করবেন?'))return;db=r.data;normalize();localStorage.setItem(KEY,JSON.stringify(db));await saveIDB();backupDirty=false;localStorage.setItem('shudhu-baki-backup-dirty','0');render();renderHalStatusLists();alert('Restore সফল হয়েছে।')}catch(e){console.error(e);alert('Restore করা যায়নি।')}}
$('#backupBtn').onclick=()=>driveBackup(false);$('#connectDrive').onclick=()=>driveToken(true);$('#restoreDrive').onclick=()=>driveRestore();
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Service Worker:',err)));
}

async function bootApp(){
  configureSupportLinks();
  updateDriveConnectionStatus(driveConnected);
  // Lock first. The main application is released only after a valid license response.
  setSubscriptionLock(true, 'Subscription status যাচাই করা হচ্ছে…');
  const allowed = await checkSubscriptionStatus();
  if(!allowed) return;

  go('home');
  await hydrate();
  installShopProfileUI();
  render();
  if(onlineNow() && backupDirty && driveConnected) scheduleAutoBackup();
}

bootApp();

