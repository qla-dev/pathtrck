import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {writeFile,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// The app keeps these dialogs mounted with a null load after authentication.
// Exercise the real render path: a draft context must not dereference that null.
const dom=new JSDOM('<!doctype html><html><body></body></html>');
for(const key of ['window','document','navigator','HTMLElement','Element','Node'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
const runtime=new URL(`.closed-render-${process.pid}.mjs`,import.meta.url);
after(async()=>{dom.window.close();await unlink(runtime).catch(()=>{});});
const text={welcome:{general:'Welcome',load:'Load',load_named:'Load'},ui:{},steps:{},form_fields:{},location:{},draft_created:'Draft',option_descriptions:{}};
const catalog={version:1,welcome_actions:[],option_groups:{},locales:Object.fromEntries(['en','de','bs','hr','sr'].map(locale=>[locale,text]))};
const result=await build({stdin:{contents:`import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {installLenaCatalog} from '../../lib/lenaCatalog';const fixture=${JSON.stringify(catalog)};fixture.option_groups=new Proxy({},{get:(_,key)=>key==="CURRENCY_OPTIONS"?["EUR"]:[]});installLenaCatalog(fixture);const {LoadDetails}=await import('./LoadDetails');const {LoadDetailsPrebook}=await import('./LoadDetailsPrebook');export function renderClosed(name){return renderToStaticMarkup(React.createElement(name==='LoadDetails'?LoadDetails:LoadDetailsPrebook,{open:false,load:null,lang:'en',onClose(){}}));}`,resolveDir:fileURLToPath(new URL('.',import.meta.url)),loader:'tsx'},bundle:true,write:false,platform:'node',format:'esm',packages:'external',jsx:'automatic',define:{'import.meta.env':JSON.stringify({DEV:false})},plugins:[{name:'styles',setup(b){b.onResolve({filter:/\.css$/},()=>({path:'style',namespace:'empty-style'}));b.onLoad({filter:/.*/,namespace:'empty-style'},()=>({contents:'',loader:'js'}));}}]});
await writeFile(runtime,result.outputFiles[0].text);
const {renderClosed}=await import(runtime.href);
for(const name of ['LoadDetails','LoadDetailsPrebook'])test(`${name} safely stays closed without a selected load`,()=>assert.equal(renderClosed(name),''));
