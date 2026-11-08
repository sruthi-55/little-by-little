import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as model from '../model.js';
import {randomUUID} from 'node:crypto';
const code=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*?;\n/,'');
function boot(store=new Map(), options={}) {
 const nodes=new Map();
 const node=s=>{if(!nodes.has(s))nodes.set(s,{textContent:'',innerHTML:'',hidden:false,style:{setProperty(){}},classList:{add(){},remove(){}},addEventListener(){},close(){},showModal(){},children:[],elements:{},getBoundingClientRect(){return {}}});return nodes.get(s)};
 const context=vm.createContext({ ...model,crypto:{randomUUID},console,URL,Blob,Date,Set,Map,JSON,Math,Number,String,Object,Array,Error,Promise,confirm:()=>true,window:{HABIT_CONFIG:options.config||{},addEventListener(){}},document:{querySelector:node,querySelectorAll:()=>[],addEventListener(){},hidden:false},navigator:{onLine:true},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},location:{reload(){}},setTimeout:()=>0,clearTimeout(){},setInterval(){},fetch:options.fetch||(()=>{throw Error('Unexpected network request')})});
 vm.runInContext(code,context);return {run:s=>vm.runInContext(s,context),nodes,store};
}
test('creating and checking a habit survives a page reload',()=>{
 const app=boot();app.run(`add({type:'habit',habit:{id:'read',name:'Read <a book>',goal:'10 pages',emoji:'📖',created:today()}});add({type:'check',id:'read',day:today(),done:true});`);
 assert.equal(app.nodes.get('#daily-count').textContent,'1/1');assert.match(app.nodes.get('#habits').innerHTML,/Read &lt;a book&gt;/);
 const reload=boot(app.store);assert.equal(reload.nodes.get('#daily-count').textContent,'1/1');assert.equal(reload.nodes.get('#total-count').textContent,1);
 reload.run(`add({type:'check',id:'read',day:today(),done:false})`);assert.equal(reload.nodes.get('#total-count').textContent,0);
});
test('sync uploads queued events and replaces local state with server history',async()=>{
 const user={id:'00000000-0000-0000-0000-000000000001',email:'me@example.com'}, store=new Map([['lbl-session',JSON.stringify({user,access_token:'test',expires_at:Date.now()/1000+9999})]]),remote=[];
 const app=boot(store,{config:{supabaseUrl:'https://example.supabase.co',supabaseKey:'public'},fetch:async(url,opts)=>{if(opts.method==='POST'){for(const e of JSON.parse(opts.body))if(!remote.some(r=>r.id===e.id))remote.push({...e,seq:remote.length+1});return {ok:true,text:async()=>''}}return {ok:true,text:async()=>JSON.stringify(remote)}}});
 await app.run('new Promise(resolve => { const poll = () => syncing ? Promise.resolve().then(poll) : resolve(); poll(); })');
 app.run(`add({type:'habit',habit:{id:'walk',name:'Walk',goal:'15 minutes',emoji:'🌿',created:today()}})`);
 await app.run('new Promise(resolve => { const poll = () => syncing ? Promise.resolve().then(poll) : resolve(); poll(); })');
 assert.equal(remote.length,1);assert.equal(app.run('state.pending.length'),0);assert.equal(app.run('state.events.length'),1);
 // Another device adds a check-in; next sync retrieves it.
 remote.push({id:randomUUID(),user_id:user.id,payload:{type:'check',id:'walk',day:model.dayKey(),done:true},seq:2});
 await app.run('sync()');assert.equal(app.nodes.get('#daily-count').textContent,'1/1');
});
test('a failed sync preserves queued changes for retry',async()=>{
 const user={id:'00000000-0000-0000-0000-000000000002',email:'me@example.com'},store=new Map([['lbl-session',JSON.stringify({user,access_token:'test',expires_at:Date.now()/1000+9999})]]);
 const app=boot(store,{config:{supabaseUrl:'https://example.supabase.co',supabaseKey:'public'},fetch:async()=>{throw Error('Offline')}});
 await app.run('new Promise(resolve => { const poll = () => syncing ? Promise.resolve().then(poll) : resolve(); poll(); })');
 app.run(`add({type:'habit',habit:{id:'draw',name:'Draw',goal:'A sketch',emoji:'🎨',created:today()}})`);
 await app.run('new Promise(resolve => { const poll = () => syncing ? Promise.resolve().then(poll) : resolve(); poll(); })');
 assert.equal(app.run('state.pending.length'),1);assert.equal(JSON.parse(store.get('lbl-data-'+user.id)).pending.length,1);assert.equal(app.nodes.get('#sync-label').textContent,'Saved locally · retry sync');
});
