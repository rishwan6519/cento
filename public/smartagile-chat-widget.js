"use strict";var SmartAgileChat=(()=>{var S=Object.defineProperty;var W=Object.getOwnPropertyDescriptor;var G=Object.getOwnPropertyNames;var K=Object.prototype.hasOwnProperty;var J=(a,e,t)=>e in a?S(a,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):a[e]=t;var X=(a,e)=>{for(var t in e)S(a,t,{get:e[t],enumerable:!0})},Y=(a,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of G(e))!K.call(a,n)&&n!==t&&S(a,n,{get:()=>e[n],enumerable:!(s=W(e,n))||s.enumerable});return a};var Q=a=>Y(S({},"__esModule",{value:!0}),a);var r=(a,e,t)=>J(a,typeof e!="symbol"?e+"":e,t);var ce={};X(ce,{ChatWidget:()=>w,init:()=>D});var m=class extends Error{constructor(e){super(e),this.name=new.target.name,Object.setPrototypeOf(this,new.target.prototype)}},b=class extends m{},v=class extends m{constructor(t,s,n){super(`Chat API request failed (${t}) for ${n}: ${V(s)}`);r(this,"status");r(this,"body");r(this,"url");this.status=t,this.body=s,this.url=n}},k=class extends v{},y=class extends m{constructor(t,s){super(t);r(this,"cause");this.cause=s}},E=class extends m{},x=class extends m{};function V(a,e=500){return a.length>e?`${a.slice(0,e)}\u2026`:a}var M=class{constructor(){r(this,"buffer","");r(this,"sawFirstChunk",!1)}feed(e){return this.sawFirstChunk||(this.sawFirstChunk=!0,e.charCodeAt(0)===65279&&(e=e.slice(1))),this.buffer+=e,this.drain(!1)}flush(){return this.drain(!0)}drain(e){let t=[];this.buffer=this.buffer.replace(/\r\n|\r/g,`
`);let s;for(;(s=this.buffer.indexOf(`

`))!==-1;){let n=this.buffer.slice(0,s);this.buffer=this.buffer.slice(s+2);let i=U(n);i&&t.push(i)}if(e&&this.buffer.trim().length>0){let n=U(this.buffer);n&&t.push(n),this.buffer=""}return t}};function U(a){let e=[],t,s,n=!1;for(let o of a.split(`
`)){if(o===""||o.startsWith(":"))continue;let l=o.indexOf(":"),d,c;switch(l===-1?(d=o,c=""):(d=o.slice(0,l),c=o.slice(l+1),c.startsWith(" ")&&(c=c.slice(1))),d){case"data":e.push(c),n=!0;break;case"event":t=c;break;case"id":s=c;break;default:break}}if(!n&&t===void 0)return null;let i={data:e.join(`
`)};return t!==void 0&&(i.event=t),s!==void 0&&(i.id=s),i}async function*N(a,e){var o;if(!a)throw new x("Streaming response had no readable body");let t=a.getReader(),s=new TextDecoder("utf-8"),n=new M,i=()=>{t.cancel().catch(()=>{})};e&&(e.aborted?i():e.addEventListener("abort",i,{once:!0}));try{for(;;){let{done:d,value:c}=await t.read();if(d)break;let p=s.decode(c,{stream:!0});for(let u of n.feed(p)){let f=L(u.data);f&&(yield f)}}let l=s.decode();if(l)for(let d of n.feed(l)){let c=L(d.data);c&&(yield c)}for(let d of n.flush()){let c=L(d.data);c&&(yield c)}}finally{e&&e.removeEventListener("abort",i),(o=t.releaseLock)==null||o.call(t)}}function L(a){let e=a.trim();if(!e||e==="[DONE]")return null;try{let t=JSON.parse(e);return t&&typeof t=="object"&&"type"in t?t:null}catch(t){return null}}var Z=6e4,ee=2,te=new Set([429,502,503,504]),T=class{constructor(e){r(this,"baseUrl");r(this,"pathPrefix");r(this,"apiKey");r(this,"tokenProvider");r(this,"embedToken");r(this,"extraHeaders");r(this,"credentials");r(this,"timeoutMs");r(this,"maxRetries");r(this,"fetchImpl");r(this,"logger");var s,n,i,o,l,d,c,p;if(!e.baseUrl)throw new b("`baseUrl` is required");if(e.apiKey&&se()&&!e.allowBrowserApiKey)throw new b("Refusing to use a raw `sah_` API key in a browser: it is a tenant-wide secret and would be exposed to end users. Use the server proxy (@centelon/smartagile-chat/server) or a `tokenProvider` instead. Set `allowBrowserApiKey: true` only for fully-trusted internal embeds.");!e.apiKey&&!e.tokenProvider&&!e.embedToken&&((s=e.credentials)!=null?s:"same-origin")==="omit"&&((n=e.logger)!=null?n:console).warn("[smartagile-chat] No apiKey, tokenProvider, embedToken, or credentials configured; requests will be unauthenticated."),this.baseUrl=e.baseUrl.replace(/\/+$/,""),this.pathPrefix=e.pathPrefix===void 0?"/api/v1/chat":e.pathPrefix.replace(/\/+$/,""),this.apiKey=e.apiKey,this.tokenProvider=e.tokenProvider,this.embedToken=e.embedToken,this.extraHeaders={...(i=e.headers)!=null?i:{}},this.credentials=(o=e.credentials)!=null?o:"same-origin",this.timeoutMs=(l=e.timeoutMs)!=null?l:Z,this.maxRetries=(d=e.maxRetries)!=null?d:ee,this.logger=(c=e.logger)!=null?c:console;let t=(p=e.fetch)!=null?p:globalThis.fetch;if(typeof t!="function")throw new b("No global `fetch` available. Provide `fetch` in options (Node < 18).");this.fetchImpl=t.bind(globalThis)}url(e){let t=e.startsWith("/")?e:`/${e}`;return`${this.baseUrl}${this.pathPrefix}${t}`}async json(e){let t=await this.send(e);if(t.status===204)return;let s=await t.text();if(s)try{return JSON.parse(s)}catch(n){throw new v(t.status,s,this.url(e.path))}}async stream(e){return this.send({...e,stream:!0})}async send(e){var i,o;let t=this.url(e.path),s=e.stream?1:this.maxRetries+1,n;for(let l=0;l<s;l++){let d=await this.buildHeaders(e),{signal:c,cleanup:p}=this.makeSignal(e);try{let u=await this.fetchImpl(t,{method:e.method,headers:d,body:(i=e.rawBody)!=null?i:e.body!==void 0?JSON.stringify(e.body):void 0,credentials:this.credentials,signal:c});if(p(),u.ok)return u;if(!e.stream&&te.has(u.status)&&l<s-1){await this.backoff(l,u.headers.get("retry-after"));continue}await this.throwForStatus(u,t)}catch(u){if(p(),u instanceof v)throw u;if(ne(u))throw(o=e.signal)!=null&&o.aborted?new E("Request aborted by caller"):new y(`Request to ${t} timed out`,u);if(n=u,!e.stream&&l<s-1){await this.backoff(l,null);continue}throw new y(`Network request to ${t} failed`,u)}}throw new y(`Network request to ${t} failed`,n)}async buildHeaders(e){var s;let t={...this.extraHeaders,...(s=e.headers)!=null?s:{}};if(!e.rawBody&&e.body!==void 0&&!t["Content-Type"]&&(t["Content-Type"]="application/json"),e.stream&&(t.Accept="text/event-stream"),this.embedToken)t["X-Embed-Token"]=this.embedToken;else{let n=await this.resolveToken();n&&(t.Authorization=`Bearer ${n}`)}return t}async resolveToken(){if(this.tokenProvider)try{let e=await this.tokenProvider();if(e)return e}catch(e){throw this.logger.error("[smartagile-chat] tokenProvider threw:",e),new b("tokenProvider failed to supply a token")}return this.apiKey}makeSignal(e){let t=new AbortController,s=()=>t.abort();e.signal&&(e.signal.aborted?t.abort():e.signal.addEventListener("abort",s,{once:!0}));let n;return!e.stream&&this.timeoutMs>0&&(n=setTimeout(()=>t.abort(),this.timeoutMs)),{signal:t.signal,cleanup:()=>{var i;n&&clearTimeout(n),(i=e.signal)==null||i.removeEventListener("abort",s)}}}async throwForStatus(e,t){let s=await ie(e);throw e.status===401||e.status===403?new k(e.status,s,t):new v(e.status,s,t)}async backoff(e,t){let s=Math.min(2e3,250*2**e);if(t){let n=Number(t);Number.isNaN(n)||(s=Math.max(s,n*1e3))}await new Promise(n=>setTimeout(n,s))}};function se(){return typeof window!="undefined"&&typeof window.document!="undefined"}function ne(a){return a instanceof Error&&(a.name==="AbortError"||a.name==="TimeoutError")}async function ie(a){try{return await a.text()}catch(e){return""}}var C=class{constructor(e,t,s=[]){r(this,"sessionId");r(this,"_session");r(this,"_messages");r(this,"client");this.client=e,this._session=t,this.sessionId=t.id,this._messages=[...s]}get session(){return this._session}get messages(){return[...this._messages]}get lastReply(){for(let e=this._messages.length-1;e>=0;e--){let t=this._messages[e];if(t&&t.role==="assistant")return t.content}}async send(e,t={}){var n,i;this._messages.push(j(this.sessionId,"user",e));let s=await this.client.sendMessage(this.sessionId,e,t);return this._messages.push(j(this.sessionId,"assistant",s.content,s.messageId,{citations:s.citations,generated_files:s.generatedFiles,tool_calls:s.toolCalls,model:(n=s.model)!=null?n:null,duration_ms:(i=s.durationMs)!=null?i:null})),s}async confirm(e="yes",t={}){return this.send(e,t)}async reload(e={}){var s;let t=await this.client.getSession(this.sessionId,e);return this._session=t,this._messages.length=0,this._messages.push(...(s=t.messages)!=null?s:[]),this.messages}async rename(e,t){this._session=await this.client.updateSession(this.sessionId,{title:e},t)}async delete(e){await this.client.deleteSession(this.sessionId,e)}};function j(a,e,t,s,n={}){return{id:s!=null?s:`local-${e}-${a}-${re()}`,session_id:a,role:e,content:t,created_at:null,...n}}var ae=0;function re(){return++ae}var P=class{constructor(e){r(this,"transport");r(this,"defaultAgentId");this.transport=new T(e),this.defaultAgentId=e.agentId}async createSession(e={}){var n,i,o;let t={title:(n=e.title)!=null?n:"New Chat",context_mode:(i=e.contextMode)!=null?i:"operations"},s=(o=e.agentId)!=null?o:this.defaultAgentId;return s&&(t.agent_id=s),e.metadata&&(t.metadata=e.metadata),this.transport.json({method:"POST",path:"/sessions",body:t,...e.signal?{signal:e.signal}:{}})}async getSession(e,t={}){return this.transport.json({method:"GET",path:`/sessions/${encodeURIComponent(e)}${z(t)}`,...t.signal?{signal:t.signal}:{}})}async listSessions(e={}){return this.transport.json({method:"GET",path:`/sessions${z(e)}`,...e.signal?{signal:e.signal}:{}})}async updateSession(e,t,s){return this.transport.json({method:"PATCH",path:`/sessions/${encodeURIComponent(e)}`,body:t,...s?{signal:s}:{}})}async deleteSession(e,t){await this.transport.send({method:"DELETE",path:`/sessions/${encodeURIComponent(e)}`,...t?{signal:t}:{}})}async getMessages(e,t={}){var n;return(n=(await this.getSession(e,t)).messages)!=null?n:[]}async*streamMessage(e,t,s={}){var i;let n=await this.transport.stream({method:"POST",path:`/sessions/${encodeURIComponent(e)}/messages`,body:{message:t,stream:!0,attachment_ids:(i=s.attachmentIds)!=null?i:[]},...s.signal?{signal:s.signal}:{}});yield*N(n.body,s.signal)}async sendMessage(e,t,s={}){return s.stream===!1?this.sendNonStreaming(e,t,s):this.sendStreaming(e,t,s)}async sendStreaming(e,t,s){var l,d,c,p,u,f,R,O,H,B;let n={content:"",citations:[],generatedFiles:[],toolCalls:[],events:[],awaitingConfirmation:!1},i="",o={};s.attachmentIds&&(o.attachmentIds=s.attachmentIds),s.signal&&(o.signal=s.signal);for await(let g of this.streamMessage(e,t,o))switch(n.events.push(g),(l=s.onEvent)==null||l.call(s,g),g.type){case"token":{i+=g.token,n.content=i,(d=s.onToken)==null||d.call(s,g.token,i);break}case"tool_call":(c=s.onToolCall)==null||c.call(s,g);break;case"tool_result":(p=s.onToolResult)==null||p.call(s,g);break;case"intent_confirm":{let $=g;n.awaitingConfirmation=!0,n.confirmation=$,(u=s.onConfirm)==null||u.call(s,$);break}case"done":{typeof g.content=="string"&&g.content.length>0&&(n.content=g.content),n.citations=(f=g.citations)!=null?f:[],n.generatedFiles=(R=g.generated_files)!=null?R:[],n.toolCalls=(O=g.tool_calls)!=null?O:[],n.model=(H=g.model)!=null?H:null,n.durationMs=(B=g.duration_ms)!=null?B:null;break}case"persisted":n.messageId=g.message_id;break;case"error":throw new x(g.error||"Stream reported an error");default:break}return n}async sendNonStreaming(e,t,s){var o,l,d,c,p,u,f;let i=(await this.transport.json({method:"POST",path:`/sessions/${encodeURIComponent(e)}/messages`,body:{message:t,stream:!1,attachment_ids:(o=s.attachmentIds)!=null?o:[]},...s.signal?{signal:s.signal}:{}})).assistant_message;return{content:(l=i.content)!=null?l:"",citations:(d=i.citations)!=null?d:[],generatedFiles:(c=i.generated_files)!=null?c:[],toolCalls:(p=i.tool_calls)!=null?p:[],model:(u=i.model)!=null?u:null,durationMs:(f=i.duration_ms)!=null?f:null,messageId:i.id,events:[],awaitingConfirmation:!1}}async uploadAttachment(e,t,s={}){var i,o,l,d;let n=new FormData;return n.append("file",t,(o=(i=s.filename)!=null?i:t.name)!=null?o:"upload.bin"),n.append("save_to_kb",String((l=s.saveToKb)!=null?l:!1)),s.kbTitle&&n.append("kb_title",s.kbTitle),s.kbCategory&&n.append("kb_category",s.kbCategory),n.append("kb_tags",JSON.stringify((d=s.kbTags)!=null?d:[])),this.transport.json({method:"POST",path:`/sessions/${encodeURIComponent(e)}/attachments`,rawBody:n,...s.signal?{signal:s.signal}:{}})}async downloadFile(e,t){return this.transport.send({method:"GET",path:`/files/${encodeURIComponent(e)}`,...t?{signal:t}:{}})}async startConversation(e={}){let t=await this.createSession(e);return new C(this,t)}async resumeConversation(e,t){var n;let s=await this.getSession(e,t?{signal:t}:{});return new C(this,s,(n=s.messages)!=null?n:[])}};function z(a){let e=new URLSearchParams;a.offset!==void 0&&e.set("offset",String(a.offset)),a.limit!==void 0&&e.set("limit",String(a.limit));let t=e.toString();return t?`?${t}`:""}var I=`
:host {
  --sa-accent: #4f46e5;
  --sa-accent-contrast: #ffffff;
  --sa-bg: #ffffff;
  --sa-fg: #1f2430;
  --sa-muted: #6b7280;
  --sa-bot-bubble: #f3f4f6;
  --sa-user-bubble: var(--sa-accent);
  --sa-border: #e5e7eb;
  --sa-radius: 16px;
  --sa-shadow: 0 12px 32px rgba(0,0,0,.18);
  --sa-z: 2147483000;
  --sa-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  all: initial;
}
* { box-sizing: border-box; }

.sa-root {
  position: fixed;
  bottom: 20px;
  z-index: var(--sa-z);
  font-family: var(--sa-font);
  color: var(--sa-fg);
}
.sa-root.sa-right { right: 20px; }
.sa-root.sa-left { left: 20px; }
.sa-root.sa-inline { position: static; }

.sa-launcher {
  width: 60px; height: 60px;
  border-radius: 50%;
  border: none;
  background: var(--sa-accent);
  color: var(--sa-accent-contrast);
  box-shadow: var(--sa-shadow);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: transform .15s ease, box-shadow .15s ease;
}
.sa-launcher:hover { transform: scale(1.06); }
.sa-launcher:focus-visible { outline: 3px solid var(--sa-accent); outline-offset: 2px; }
.sa-launcher svg { width: 28px; height: 28px; }
.sa-hidden { display: none !important; }

.sa-panel {
  display: flex; flex-direction: column;
  width: 380px; max-width: calc(100vw - 40px);
  height: 560px; max-height: calc(100vh - 40px);
  background: var(--sa-bg);
  border: 1px solid var(--sa-border);
  border-radius: var(--sa-radius);
  box-shadow: var(--sa-shadow);
  overflow: hidden;
}
.sa-root.sa-inline .sa-panel { width: 100%; height: 100%; }

.sa-header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px;
  background: var(--sa-accent);
  color: var(--sa-accent-contrast);
}
.sa-header-text { flex: 1; min-width: 0; }
.sa-title { font-size: 15px; font-weight: 600; line-height: 1.2; }
.sa-subtitle { font-size: 12px; opacity: .85; line-height: 1.3; }
.sa-iconbtn {
  background: transparent; border: none; color: inherit;
  cursor: pointer; padding: 4px; border-radius: 8px; display: flex;
}
.sa-iconbtn:hover { background: rgba(255,255,255,.18); }
.sa-iconbtn svg { width: 20px; height: 20px; }

.sa-messages {
  flex: 1; overflow-y: auto;
  padding: 16px; display: flex; flex-direction: column; gap: 10px;
  background: var(--sa-bg);
}
.sa-msg { display: flex; }
.sa-msg.sa-user { justify-content: flex-end; }
.sa-bubble {
  max-width: 82%;
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 14px; line-height: 1.45;
  white-space: pre-wrap; word-wrap: break-word; overflow-wrap: anywhere;
}
.sa-user .sa-bubble {
  background: var(--sa-user-bubble); color: var(--sa-accent-contrast);
  border-bottom-right-radius: 4px;
}
.sa-bot .sa-bubble {
  background: var(--sa-bot-bubble); color: var(--sa-fg);
  border-bottom-left-radius: 4px;
}
.sa-bubble a { color: inherit; text-decoration: underline; }

.sa-status {
  font-size: 12px; color: var(--sa-muted);
  display: flex; align-items: center; gap: 6px; padding: 0 4px;
}
.sa-citations { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px; }
.sa-chip {
  font-size: 11px; color: var(--sa-muted);
  background: var(--sa-bg); border: 1px solid var(--sa-border);
  border-radius: 999px; padding: 2px 8px; cursor: default;
}
.sa-files { margin-top: 6px; display: flex; flex-direction: column; gap: 4px; }
.sa-file {
  font-size: 12px; color: var(--sa-accent);
  text-decoration: none; display: inline-flex; align-items: center; gap: 4px;
}
.sa-file:hover { text-decoration: underline; }

.sa-typing { display: inline-flex; gap: 3px; align-items: center; }
.sa-typing span {
  width: 6px; height: 6px; border-radius: 50%; background: var(--sa-muted);
  animation: sa-blink 1.2s infinite both;
}
.sa-typing span:nth-child(2) { animation-delay: .2s; }
.sa-typing span:nth-child(3) { animation-delay: .4s; }
@keyframes sa-blink { 0%,80%,100% { opacity: .25; } 40% { opacity: 1; } }

.sa-suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 16px 8px; }
.sa-suggestion {
  font-size: 12px; border: 1px solid var(--sa-border); background: var(--sa-bg);
  color: var(--sa-fg); border-radius: 999px; padding: 6px 12px; cursor: pointer;
}
.sa-suggestion:hover { border-color: var(--sa-accent); color: var(--sa-accent); }

.sa-input {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 12px; border-top: 1px solid var(--sa-border); background: var(--sa-bg);
}
.sa-textarea {
  flex: 1; resize: none; border: 1px solid var(--sa-border);
  border-radius: 12px; padding: 10px 12px; font-size: 14px; font-family: inherit;
  color: var(--sa-fg); background: var(--sa-bg);
  max-height: 120px; line-height: 1.4; outline: none;
}
.sa-textarea:focus { border-color: var(--sa-accent); }
.sa-send {
  border: none; border-radius: 12px; width: 40px; height: 40px;
  background: var(--sa-accent); color: var(--sa-accent-contrast);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
}
.sa-send:disabled { opacity: .5; cursor: default; }
.sa-send svg { width: 20px; height: 20px; }

.sa-footer { text-align: center; font-size: 11px; color: var(--sa-muted); padding: 6px; }
.sa-error { color: #b91c1c; }

@media (prefers-color-scheme: dark) {
  :host {
    --sa-bg: #1f2430; --sa-fg: #e8eaf0; --sa-muted: #9aa3b2;
    --sa-bot-bubble: #2b3242; --sa-border: #3a4250;
  }
}
`;var F='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',oe='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',le='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',w=class{constructor(e){r(this,"cfg");r(this,"client");r(this,"conversation",null);r(this,"convoPromise",null);r(this,"host");r(this,"root");r(this,"panel");r(this,"launcher");r(this,"messagesEl");r(this,"textarea");r(this,"sendBtn");r(this,"suggestionsEl");r(this,"statusEl");r(this,"isOpen",!1);r(this,"busy",!1);r(this,"inflight");var s,n,i,o,l,d;if(!e.baseUrl)throw new Error("ChatWidget: `baseUrl` is required");this.cfg={...e,title:(s=e.title)!=null?s:"Assistant",placeholder:(n=e.placeholder)!=null?n:"Type a message\u2026",position:(i=e.position)!=null?i:"bottom-right",branding:(o=e.branding)!=null?o:!0};let t={baseUrl:e.baseUrl,pathPrefix:(l=e.pathPrefix)!=null?l:"",credentials:(d=e.credentials)!=null?d:e.embedToken?"omit":"include"};e.agentId&&(t.agentId=e.agentId),e.tokenProvider&&(t.tokenProvider=e.tokenProvider),e.embedToken&&(t.embedToken=e.embedToken),e.headers&&(t.headers=e.headers),this.client=new P(t)}mount(){if(this.host)return this;if(typeof document=="undefined")throw new Error("ChatWidget.mount() requires a browser DOM");let e=this.resolveTarget();this.host=document.createElement("div"),this.host.setAttribute("data-smartagile-chat",""),this.root=this.host.attachShadow({mode:"open"}),this.injectStyles(this.root);let t=h("div",e?"sa-root sa-inline":`sa-root sa-${this.side()}`);return this.cfg.accentColor&&t.style.setProperty("--sa-accent",this.cfg.accentColor),this.cfg.zIndex!==void 0&&t.style.setProperty("--sa-z",String(this.cfg.zIndex)),this.launcher=this.buildLauncher(),this.panel=this.buildPanel(),e||t.appendChild(this.launcher),t.appendChild(this.panel),this.root.appendChild(t),(e!=null?e:document.body).appendChild(this.host),e||this.cfg.openOnLoad?this.open():this.panel.classList.add("sa-hidden"),this}open(){var e;!this.panel||!this.launcher||(this.isOpen=!0,this.panel.classList.remove("sa-hidden"),this.launcher.classList.add("sa-hidden"),this.renderGreetingOnce(),(e=this.textarea)==null||e.focus())}close(){!this.panel||!this.launcher||(this.isOpen=!1,this.panel.classList.add("sa-hidden"),this.resolveTarget()||this.launcher.classList.remove("sa-hidden"))}toggle(){this.isOpen?this.close():this.open()}async send(e){this.textarea&&(this.textarea.value=""),await this.handleSend(e)}destroy(){var e,t;(e=this.inflight)==null||e.abort(),(t=this.host)==null||t.remove(),this.host=void 0}side(){return this.cfg.position==="bottom-left"?"left":"right"}resolveTarget(){let e=this.cfg.target;return e?typeof e=="string"?document.querySelector(e):e:null}injectStyles(e){try{let t=new CSSStyleSheet;t.replaceSync(I),e.adoptedStyleSheets=[...e.adoptedStyleSheets,t]}catch(t){let s=document.createElement("style");s.textContent=I,e.appendChild(s)}}buildLauncher(){let e=document.createElement("button");return e.className="sa-launcher",e.setAttribute("aria-label",`Open ${this.cfg.title}`),e.innerHTML=F,e.addEventListener("click",()=>this.open()),e}buildPanel(){let e=h("div","sa-panel");e.setAttribute("role","dialog"),e.setAttribute("aria-label",this.cfg.title);let t=h("div","sa-header"),s=h("div","sa-header-text"),n=h("div","sa-title");if(n.textContent=this.cfg.title,s.appendChild(n),this.cfg.subtitle){let o=h("div","sa-subtitle");o.textContent=this.cfg.subtitle,s.appendChild(o)}let i=document.createElement("button");if(i.className="sa-iconbtn",i.setAttribute("aria-label","Close"),i.innerHTML=oe,i.addEventListener("click",()=>this.close()),t.append(this.headerIcon(),s,i),e.appendChild(t),this.messagesEl=h("div","sa-messages"),this.messagesEl.setAttribute("role","log"),this.messagesEl.setAttribute("aria-live","polite"),e.appendChild(this.messagesEl),this.suggestionsEl=h("div","sa-suggestions"),this.renderSuggestions(),e.appendChild(this.suggestionsEl),e.appendChild(this.buildInput()),this.cfg.branding){let o=h("div","sa-footer");o.textContent="Powered by SmartAgile Hub",e.appendChild(o)}return e.addEventListener("keydown",o=>{o.key==="Escape"&&!this.resolveTarget()&&this.close()}),e}headerIcon(){let e=h("span","sa-iconbtn");return e.style.pointerEvents="none",e.innerHTML=F,e}buildInput(){let e=h("div","sa-input"),t=document.createElement("textarea");t.className="sa-textarea",t.rows=1,t.placeholder=this.cfg.placeholder,t.setAttribute("aria-label","Message"),t.addEventListener("input",()=>this.autoGrow(t)),t.addEventListener("keydown",n=>{let i=n;i.key==="Enter"&&!i.shiftKey&&(i.preventDefault(),this.submitFromInput())}),this.textarea=t;let s=document.createElement("button");return s.className="sa-send",s.setAttribute("aria-label","Send"),s.innerHTML=le,s.addEventListener("click",()=>{this.submitFromInput()}),this.sendBtn=s,e.append(t,s),e}renderSuggestions(){var t;if(!this.suggestionsEl)return;this.suggestionsEl.replaceChildren();let e=(t=this.cfg.suggestions)!=null?t:[];if(!e.length){this.suggestionsEl.classList.add("sa-hidden");return}this.suggestionsEl.classList.remove("sa-hidden");for(let s of e){let n=document.createElement("button");n.className="sa-suggestion",n.textContent=s,n.addEventListener("click",()=>{var i;(i=this.suggestionsEl)==null||i.classList.add("sa-hidden"),this.handleSend(s)}),this.suggestionsEl.appendChild(n)}}renderGreetingOnce(){!this.messagesEl||this.messagesEl.childElementCount>0||this.cfg.greeting&&this.addBubble("bot",this.cfg.greeting)}autoGrow(e){e.style.height="auto",e.style.height=`${Math.min(e.scrollHeight,120)}px`}async submitFromInput(){let e=this.textarea;if(!e)return;let t=e.value.trim();t&&(e.value="",this.autoGrow(e),await this.handleSend(t))}async ensureConversation(){var e;if(this.conversation)return this.conversation;if(!this.convoPromise){let t={title:(e=this.cfg.sessionTitle)!=null?e:this.cfg.title};this.cfg.metadata&&(t.metadata=this.cfg.metadata),this.convoPromise=this.client.startConversation(t).then(s=>(this.conversation=s,s))}return this.convoPromise}async handleSend(e){var s,n;if(this.busy)return;(s=this.suggestionsEl)==null||s.classList.add("sa-hidden"),this.addBubble("user",e);let t=this.addBubble("bot","");this.setBusy(!0),this.setStatus("typing"),this.inflight=new AbortController;try{let i=await this.ensureConversation(),o=!1,l=await i.send(e,{signal:this.inflight.signal,onToken:(d,c)=>{o=!0,this.clearStatus(),t.bubble.textContent=c,this.scrollToBottom()},onToolCall:d=>this.setStatus("tool",d.tool_name),onToolResult:()=>this.setStatus("typing"),onEvent:d=>{d.type==="intent_stage"&&"stage"in d&&this.setStatus("working",String(d.stage))}});this.clearStatus(),o||(t.bubble.textContent=l.content||"(no response)"),l.awaitingConfirmation&&l.confirmation&&this.renderConfirmation(t.container,(n=l.confirmation.plan)==null?void 0:n.description),this.renderCitations(t.container,l.citations),this.renderFiles(t.container,l.generatedFiles)}catch(i){this.clearStatus();let o=i instanceof Error&&i.name==="ChatbotAbortError"?"(cancelled)":"Sorry \u2014 something went wrong. Please try again.";t.bubble.classList.add("sa-error"),t.bubble.textContent=o}finally{this.setBusy(!1),this.inflight=void 0,this.scrollToBottom()}}renderConfirmation(e,t){let s=h("div","sa-status");s.textContent=t?`Confirm to proceed: ${t}`:"Reply 'yes' to confirm this action.",e.appendChild(s)}renderCitations(e,t){if(!(t!=null&&t.length))return;let s=h("div","sa-citations");for(let n of t){let i=h("span","sa-chip");i.textContent=n.article_title||n.article_id,i.title=n.article_id,s.appendChild(i)}e.appendChild(s)}renderFiles(e,t){if(!(t!=null&&t.length))return;let s=h("div","sa-files");for(let n of t){let i=document.createElement("a");i.className="sa-file",i.textContent=`\u2B07 ${n.file_name}`,i.href=this.absoluteUrl(n.download_url),i.target="_blank",i.rel="noopener noreferrer",s.appendChild(i)}e.appendChild(s)}absoluteUrl(e){var n;if(/^https?:\/\//.test(e))return e;let t=this.cfg.baseUrl.replace(/\/+$/,"");return((n=this.cfg.pathPrefix)!=null?n:"")===""&&e.startsWith("/api/v1/chat")?t+e.slice(12):t+e}addBubble(e,t){var i;let s=h("div",`sa-msg sa-${e}`),n=h("div","sa-bubble");return e==="bot"&&t===""?n.appendChild(this.typingDots()):n.textContent=t,s.appendChild(n),(i=this.messagesEl)==null||i.appendChild(s),this.scrollToBottom(),{container:s,bubble:n}}typingDots(){let e=h("span","sa-typing");return e.append(h("span",""),h("span",""),h("span","")),e}setStatus(e,t){if(!this.messagesEl)return;this.clearStatus();let s=h("div","sa-status");e==="typing"?s.appendChild(this.typingDots()):s.textContent=e==="tool"?`Using ${t}\u2026`:`${t!=null?t:"Working"}\u2026`,this.statusEl=s,this.messagesEl.appendChild(s),this.scrollToBottom()}clearStatus(){var e;(e=this.statusEl)==null||e.remove(),this.statusEl=void 0}setBusy(e){this.busy=e,this.sendBtn&&(this.sendBtn.disabled=e),this.textarea&&(this.textarea.disabled=e)}scrollToBottom(){this.messagesEl&&(this.messagesEl.scrollTop=this.messagesEl.scrollHeight)}};function h(a,e){let t=document.createElement(a);return e&&(t.className=e),t}function D(a){return new w(a).mount()}var A=typeof document!="undefined"?document.currentScript:null;function de(a){let e=a.dataset;if(!e.baseUrl)return null;let t={baseUrl:e.baseUrl};return e.pathPrefix!==void 0&&(t.pathPrefix=e.pathPrefix),e.agentId&&(t.agentId=e.agentId),e.embedToken&&(t.embedToken=e.embedToken),e.title&&(t.title=e.title),e.subtitle&&(t.subtitle=e.subtitle),e.greeting&&(t.greeting=e.greeting),e.placeholder&&(t.placeholder=e.placeholder),e.accentColor&&(t.accentColor=e.accentColor),(e.position==="bottom-left"||e.position==="bottom-right")&&(t.position=e.position),e.target&&(t.target=e.target),e.credentials&&(t.credentials=e.credentials),e.sessionTitle&&(t.sessionTitle=e.sessionTitle),e.openOnLoad!==void 0&&(t.openOnLoad=_(e.openOnLoad)),e.branding!==void 0&&(t.branding=_(e.branding)),e.zIndex&&(t.zIndex=Number(e.zIndex)),e.suggestions&&(t.suggestions=e.suggestions.split(",").map(s=>s.trim()).filter(Boolean)),t}function _(a){return a===""||a==="true"||a==="1"||a==="yes"}function q(){var e;if(!A||_((e=A.dataset.auto)!=null?e:"true")===!1)return;let a=de(A);a&&D(a)}typeof document!="undefined"&&(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",q,{once:!0}):q());return Q(ce);})();
//# sourceMappingURL=widget.global.js.map