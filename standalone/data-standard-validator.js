var j=globalThis,W=j.ShadowRoot&&(j.ShadyCSS===void 0||j.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,re=Symbol(),ve=new WeakMap,P=class{constructor(e,t,r){if(this._$cssResult$=!0,r!==re)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(W&&e===void 0){let r=t!==void 0&&t.length===1;r&&(e=ve.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),r&&ve.set(t,e))}return e}toString(){return this.cssText}},ge=s=>new P(typeof s=="string"?s:s+"",void 0,re),se=(s,...e)=>{let t=s.length===1?s[0]:e.reduce((r,i,n)=>r+(o=>{if(o._$cssResult$===!0)return o.cssText;if(typeof o=="number")return o;throw Error("Value passed to 'css' function must be a 'css' function result: "+o+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+s[n+1],s[0]);return new P(t,s,re)},me=(s,e)=>{if(W)s.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of e){let r=document.createElement("style"),i=j.litNonce;i!==void 0&&r.setAttribute("nonce",i),r.textContent=t.cssText,s.appendChild(r)}},ie=W?s=>s:s=>s instanceof CSSStyleSheet?(e=>{let t="";for(let r of e.cssRules)t+=r.cssText;return ge(t)})(s):s;var{is:qe,defineProperty:Je,getOwnPropertyDescriptor:Ye,getOwnPropertyNames:Ge,getOwnPropertySymbols:Qe,getPrototypeOf:Xe}=Object,V=globalThis,be=V.trustedTypes,Ze=be?be.emptyScript:"",et=V.reactiveElementPolyfillSupport,U=(s,e)=>s,ne={toAttribute(s,e){switch(e){case Boolean:s=s?Ze:null;break;case Object:case Array:s=s==null?s:JSON.stringify(s)}return s},fromAttribute(s,e){let t=s;switch(e){case Boolean:t=s!==null;break;case Number:t=s===null?null:Number(s);break;case Object:case Array:try{t=JSON.parse(s)}catch{t=null}}return t}},$e=(s,e)=>!qe(s,e),xe={attribute:!0,type:String,converter:ne,reflect:!1,useDefault:!1,hasChanged:$e};Symbol.metadata??=Symbol("metadata"),V.litPropertyMetadata??=new WeakMap;var g=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=xe){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let r=Symbol(),i=this.getPropertyDescriptor(e,r,t);i!==void 0&&Je(this.prototype,e,i)}}static getPropertyDescriptor(e,t,r){let{get:i,set:n}=Ye(this.prototype,e)??{get(){return this[t]},set(o){this[t]=o}};return{get:i,set(o){let l=i?.call(this);n?.call(this,o),this.requestUpdate(e,l,r)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??xe}static _$Ei(){if(this.hasOwnProperty(U("elementProperties")))return;let e=Xe(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(U("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(U("properties"))){let t=this.properties,r=[...Ge(t),...Qe(t)];for(let i of r)this.createProperty(i,t[i])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[r,i]of t)this.elementProperties.set(r,i)}this._$Eh=new Map;for(let[t,r]of this.elementProperties){let i=this._$Eu(t,r);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let r=new Set(e.flat(1/0).reverse());for(let i of r)t.unshift(ie(i))}else e!==void 0&&t.push(ie(e));return t}static _$Eu(e,t){let r=t.attribute;return r===!1?void 0:typeof r=="string"?r:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let r of t.keys())this.hasOwnProperty(r)&&(e.set(r,this[r]),delete this[r]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return me(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,r){this._$AK(e,r)}_$ET(e,t){let r=this.constructor.elementProperties.get(e),i=this.constructor._$Eu(e,r);if(i!==void 0&&r.reflect===!0){let n=(r.converter?.toAttribute!==void 0?r.converter:ne).toAttribute(t,r.type);this._$Em=e,n==null?this.removeAttribute(i):this.setAttribute(i,n),this._$Em=null}}_$AK(e,t){let r=this.constructor,i=r._$Eh.get(e);if(i!==void 0&&this._$Em!==i){let n=r.getPropertyOptions(i),o=typeof n.converter=="function"?{fromAttribute:n.converter}:n.converter?.fromAttribute!==void 0?n.converter:ne;this._$Em=i;let l=o.fromAttribute(t,n.type);this[i]=l??this._$Ej?.get(i)??l,this._$Em=null}}requestUpdate(e,t,r,i=!1,n){if(e!==void 0){let o=this.constructor;if(i===!1&&(n=this[e]),r??=o.getPropertyOptions(e),!((r.hasChanged??$e)(n,t)||r.useDefault&&r.reflect&&n===this._$Ej?.get(e)&&!this.hasAttribute(o._$Eu(e,r))))return;this.C(e,t,r)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(e,t,{useDefault:r,reflect:i,wrapped:n},o){r&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,o??t??this[e]),n!==!0||o!==void 0)||(this._$AL.has(e)||(this.hasUpdated||r||(t=void 0),this._$AL.set(e,t)),i===!0&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,n]of this._$Ep)this[i]=n;this._$Ep=void 0}let r=this.constructor.elementProperties;if(r.size>0)for(let[i,n]of r){let{wrapped:o}=n,l=this[i];o!==!0||this._$AL.has(i)||l===void 0||this.C(i,void 0,n,l)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(r=>r.hostUpdate?.()),this.update(t)):this._$EM()}catch(r){throw e=!1,this._$EM(),r}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(e){}firstUpdated(e){}};g.elementStyles=[],g.shadowRootOptions={mode:"open"},g[U("elementProperties")]=new Map,g[U("finalized")]=new Map,et?.({ReactiveElement:g}),(V.reactiveElementVersions??=[]).push("2.1.2");var ae=globalThis,ye=s=>s,F=ae.trustedTypes,_e=F?F.createPolicy("lit-html",{createHTML:s=>s}):void 0,le="$lit$",m=`lit$${Math.random().toFixed(9).slice(2)}$`,de="?"+m,tt=`<${de}>`,w=document,M=()=>w.createComment(""),O=s=>s===null||typeof s!="object"&&typeof s!="function",ce=Array.isArray,Te=s=>ce(s)||typeof s?.[Symbol.iterator]=="function",oe=`[ 	
\f\r]`,L=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,we=/-->/g,Ae=/>/g,y=RegExp(`>|${oe}(?:([^\\s"'>=/]+)(${oe}*=${oe}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),ke=/'/g,Ee=/"/g,Ce=/^(?:script|style|textarea|title)$/i,he=s=>(e,...t)=>({_$litType$:s,strings:e,values:t}),u=he(1),bt=he(2),xt=he(3),f=Symbol.for("lit-noChange"),d=Symbol.for("lit-nothing"),Se=new WeakMap,_=w.createTreeWalker(w,129);function Re(s,e){if(!ce(s)||!s.hasOwnProperty("raw"))throw Error("invalid template strings array");return _e!==void 0?_e.createHTML(e):e}var Pe=(s,e)=>{let t=s.length-1,r=[],i,n=e===2?"<svg>":e===3?"<math>":"",o=L;for(let l=0;l<t;l++){let a=s[l],p,c,h=-1,v=0;for(;v<a.length&&(o.lastIndex=v,c=o.exec(a),c!==null);)v=o.lastIndex,o===L?c[1]==="!--"?o=we:c[1]!==void 0?o=Ae:c[2]!==void 0?(Ce.test(c[2])&&(i=RegExp("</"+c[2],"g")),o=y):c[3]!==void 0&&(o=y):o===y?c[0]===">"?(o=i??L,h=-1):c[1]===void 0?h=-2:(h=o.lastIndex-c[2].length,p=c[1],o=c[3]===void 0?y:c[3]==='"'?Ee:ke):o===Ee||o===ke?o=y:o===we||o===Ae?o=L:(o=y,i=void 0);let x=o===y&&s[l+1].startsWith("/>")?" ":"";n+=o===L?a+tt:h>=0?(r.push(p),a.slice(0,h)+le+a.slice(h)+m+x):a+m+(h===-2?l:x)}return[Re(s,n+(s[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),r]},H=class s{constructor({strings:e,_$litType$:t},r){let i;this.parts=[];let n=0,o=0,l=e.length-1,a=this.parts,[p,c]=Pe(e,t);if(this.el=s.createElement(p,r),_.currentNode=this.el.content,t===2||t===3){let h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(i=_.nextNode())!==null&&a.length<l;){if(i.nodeType===1){if(i.hasAttributes())for(let h of i.getAttributeNames())if(h.endsWith(le)){let v=c[o++],x=i.getAttribute(h).split(m),B=/([.?@])?(.*)/.exec(v);a.push({type:1,index:n,name:B[2],strings:x,ctor:B[1]==="."?q:B[1]==="?"?J:B[1]==="@"?Y:k}),i.removeAttribute(h)}else h.startsWith(m)&&(a.push({type:6,index:n}),i.removeAttribute(h));if(Ce.test(i.tagName)){let h=i.textContent.split(m),v=h.length-1;if(v>0){i.textContent=F?F.emptyScript:"";for(let x=0;x<v;x++)i.append(h[x],M()),_.nextNode(),a.push({type:2,index:++n});i.append(h[v],M())}}}else if(i.nodeType===8)if(i.data===de)a.push({type:2,index:n});else{let h=-1;for(;(h=i.data.indexOf(m,h+1))!==-1;)a.push({type:7,index:n}),h+=m.length-1}n++}}static createElement(e,t){let r=w.createElement("template");return r.innerHTML=e,r}};function A(s,e,t=s,r){if(e===f)return e;let i=r!==void 0?t._$Co?.[r]:t._$Cl,n=O(e)?void 0:e._$litDirective$;return i?.constructor!==n&&(i?._$AO?.(!1),n===void 0?i=void 0:(i=new n(s),i._$AT(s,t,r)),r!==void 0?(t._$Co??=[])[r]=i:t._$Cl=i),i!==void 0&&(e=A(s,i._$AS(s,e.values),i,r)),e}var K=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:r}=this._$AD,i=(e?.creationScope??w).importNode(t,!0);_.currentNode=i;let n=_.nextNode(),o=0,l=0,a=r[0];for(;a!==void 0;){if(o===a.index){let p;a.type===2?p=new E(n,n.nextSibling,this,e):a.type===1?p=new a.ctor(n,a.name,a.strings,this,e):a.type===6&&(p=new G(n,this,e)),this._$AV.push(p),a=r[++l]}o!==a?.index&&(n=_.nextNode(),o++)}return _.currentNode=w,i}p(e){let t=0;for(let r of this._$AV)r!==void 0&&(r.strings!==void 0?(r._$AI(e,r,t),t+=r.strings.length-2):r._$AI(e[t])),t++}},E=class s{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,r,i){this.type=2,this._$AH=d,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=r,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=A(this,e,t),O(e)?e===d||e==null||e===""?(this._$AH!==d&&this._$AR(),this._$AH=d):e!==this._$AH&&e!==f&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):Te(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==d&&O(this._$AH)?this._$AA.nextSibling.data=e:this.T(w.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:r}=e,i=typeof r=="number"?this._$AC(e):(r.el===void 0&&(r.el=H.createElement(Re(r.h,r.h[0]),this.options)),r);if(this._$AH?._$AD===i)this._$AH.p(t);else{let n=new K(i,this),o=n.u(this.options);n.p(t),this.T(o),this._$AH=n}}_$AC(e){let t=Se.get(e.strings);return t===void 0&&Se.set(e.strings,t=new H(e)),t}k(e){ce(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,r,i=0;for(let n of e)i===t.length?t.push(r=new s(this.O(M()),this.O(M()),this,this.options)):r=t[i],r._$AI(n),i++;i<t.length&&(this._$AR(r&&r._$AB.nextSibling,i),t.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let r=ye(e).nextSibling;ye(e).remove(),e=r}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},k=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,r,i,n){this.type=1,this._$AH=d,this._$AN=void 0,this.element=e,this.name=t,this._$AM=i,this.options=n,r.length>2||r[0]!==""||r[1]!==""?(this._$AH=Array(r.length-1).fill(new String),this.strings=r):this._$AH=d}_$AI(e,t=this,r,i){let n=this.strings,o=!1;if(n===void 0)e=A(this,e,t,0),o=!O(e)||e!==this._$AH&&e!==f,o&&(this._$AH=e);else{let l=e,a,p;for(e=n[0],a=0;a<n.length-1;a++)p=A(this,l[r+a],t,a),p===f&&(p=this._$AH[a]),o||=!O(p)||p!==this._$AH[a],p===d?e=d:e!==d&&(e+=(p??"")+n[a+1]),this._$AH[a]=p}o&&!i&&this.j(e)}j(e){e===d?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}},q=class extends k{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===d?void 0:e}},J=class extends k{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==d)}},Y=class extends k{constructor(e,t,r,i,n){super(e,t,r,i,n),this.type=5}_$AI(e,t=this){if((e=A(this,e,t,0)??d)===f)return;let r=this._$AH,i=e===d&&r!==d||e.capture!==r.capture||e.once!==r.once||e.passive!==r.passive,n=e!==d&&(r===d||i);i&&this.element.removeEventListener(this.name,this,r),n&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},G=class{constructor(e,t,r){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=r}get _$AU(){return this._$AM._$AU}_$AI(e){A(this,e)}},Ue={M:le,P:m,A:de,C:1,L:Pe,R:K,D:Te,V:A,I:E,H:k,N:J,U:Y,B:q,F:G},rt=ae.litHtmlPolyfillSupport;rt?.(H,E),(ae.litHtmlVersions??=[]).push("3.3.3");var Le=(s,e,t)=>{let r=t?.renderBefore??e,i=r._$litPart$;if(i===void 0){let n=t?.renderBefore??null;r._$litPart$=i=new E(e.insertBefore(M(),n),n,void 0,t??{})}return i._$AI(s),i};var pe=globalThis,$=class extends g{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Le(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return f}};$._$litElement$=!0,$.finalized=!0,pe.litElementHydrateSupport?.({LitElement:$});var st=pe.litElementPolyfillSupport;st?.({LitElement:$});(pe.litElementVersions??=[]).push("4.2.2");var b={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},Q=s=>(...e)=>({_$litDirective$:s,values:e}),S=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,r){this._$Ct=e,this._$AM=t,this._$Ci=r}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}};var{I:Mt}=Ue;var Me=s=>s.strings===void 0;var it={},Oe=(s,e=it)=>s._$AH=e;var T=Q(class extends S{constructor(s){if(super(s),s.type!==b.PROPERTY&&s.type!==b.ATTRIBUTE&&s.type!==b.BOOLEAN_ATTRIBUTE)throw Error("The `live` directive is not allowed on child or event bindings");if(!Me(s))throw Error("`live` bindings can only contain a single expression")}render(s){return s}update(s,[e]){if(e===f||e===d)return e;let t=s.element,r=s.name;if(s.type===b.PROPERTY){if(e===t[r])return f}else if(s.type===b.BOOLEAN_ATTRIBUTE){if(!!e===t.hasAttribute(r))return f}else if(s.type===b.ATTRIBUTE&&t.getAttribute(r)===e+"")return f;return Oe(s),e}});var N=class extends S{constructor(e){if(super(e),this.it=d,e.type!==b.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(e){if(e===d||e==null)return this._t=void 0,this.it=e;if(e===f)return e;if(typeof e!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(e===this.it)return this._t;this.it=e;let t=[e];return t.raw=t,this._t={_$litType$:this.constructor.resultType,strings:t,values:[]}}};N.directiveName="unsafeHTML",N.resultType=1;var He=Q(N);var nt=/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/([^/]+)\/(.+)$/,ot=/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/;function I(s){let e=nt.exec(s)??ot.exec(s);if(!e)return;let[,t,r,i,n]=e;return{owner:t,repo:r,ref:i,path:n}}function C(s,e){let t=I(s);return t?`https://raw.githubusercontent.com/${t.owner}/${t.repo}/${e??t.ref}/${t.path}`:s}function ue(s){return typeof s.shapes=="string"?[s.shapes]:s.shapes}function Ne(s,e){return{shapes:ue(s).map(t=>C(t,e)),...s.context!==void 0?{context:C(s.context,e)}:{}}}function Ie(s){for(let e of s.standards)for(let t of ue(e)){let r=I(t);if(r)return r}}function D(s){return s.ref??Ie(s)?.ref}function De(s){let e=Ie(s);if(!e)return;let t=`${e.owner}/${e.repo}`;return{name:t,url:`https://github.com/${t}`}}function Z(s){return(s.examples??[]).map(e=>typeof e=="string"?{name:decodeURIComponent(e.replace(/[?#].*$/,"").replace(/^.*\//,"").replace(/\.[^.]+$/,"")),url:e}:e)}function ze(s){let e=new URLSearchParams(s),t=e.get("context"),r=e.get("example");return{shapes:e.getAll("shape").filter(n=>n!==""),...t!==null&&t!==""?{context:t}:{},...r!==null&&r!==""?{example:r}:{}}}function X(s,e){let t=I(s),r=I(e);return t&&r?t.owner===r.owner&&t.repo===r.repo&&t.path===r.path:C(s)===C(e)}function Be(s,e){let{shapes:t,context:r,example:i}=e;if(t.length===0&&r===void 0&&i===void 0)return;let n=(c,h)=>Z(c).some(v=>X(v.url,h)),o=s.standards.findIndex(c=>t.length===0&&r===void 0?n(c,i):t.every(h=>ue(c).some(v=>X(v,h)))&&(r===void 0||c.context!==void 0&&X(c.context,r)));if(o===-1)return;let l=s.standards[o],a=D(s)===void 0?void 0:[...t,...r!==void 0?[r]:[]].map(c=>I(c)?.ref).find(c=>c!==void 0),p=i===void 0?void 0:Z(l).find(c=>X(c.url,i))?.url??i;return{standardIndex:o,...a!==void 0?{ref:a}:{},...p!==void 0?{example:p}:{}}}var at=/("(?:[^"\\\n]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;function ee(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function R(s,e){return`<span class="tok-${s}">${ee(e)}</span>`}function je(s){let e="",t=0;for(let r of s.matchAll(at)){let i=r.index;e+=ee(s.slice(t,i));let[n,o,l,a,p]=r;o!==void 0?l!==void 0?(e+=R(o.startsWith('"@')?"keyword":"key",o),e+=ee(l.slice(0,-1))+R("punct",":")):e+=R("string",o):a!==void 0?e+=R("number",a):p!==void 0?e+=R("literal",p):e+=R("punct",n),t=i+n.length}return e+=ee(s.slice(t)),s.endsWith(`
`)||s===""?`${e} `:e}function fe(s){let e=new Map;for(let t of s){let{jsonPath:r,nodeType:i}=t.location,n=r;if(t.field!==void 0){let h=`.${t.field.term}`;r.endsWith(h)?n=r.slice(0,-h.length):r===t.field.term&&(n="$")}let o=n===""||n==="$",l=i!==void 0&&n.toLowerCase()===i.toLowerCase(),a=i!==void 0?o||l?i:`${i} (${n})`:o?"the document":n,p=`${t.location.document??""}#${n||"$"}`,c=e.get(p);c?c.issues.push(t):e.set(p,{label:a,issues:[t]})}return[...e.values()]}var lt={violation:"Problem",warning:"Warning",info:"Note"};function z(s,e){return u`<div class="banner ${s}">${e}</div>`}function We(s){let e=/(`[^`]+`|\*\*[^*]+\*\*)/g,t=[],r=0;for(let i of s.matchAll(e)){let n=i.index;n>r&&t.push(s.slice(r,n));let o=i[0];t.push(o.startsWith("`")?u`<code>${o.slice(1,-1)}</code>`:u`<strong>${o.slice(2,-2)}</strong>`),r=n+o.length}return r<s.length&&t.push(s.slice(r)),t}function dt(s){if(!s.technical&&s.value===void 0)return d;let e=[["code",s.code],["value",s.value],["constraint",s.technical?.constraint],["property",s.technical?.resultPath],["focus",s.technical?.focusNode],["shape",s.technical?.sourceShape]];return u`
    <details @click=${t=>{t.stopPropagation()}}>
      <summary>Technical detail</summary>
      <dl>${e.map(([t,r])=>r===void 0?d:u`<dt>${t}</dt><dd>${r}</dd>`)}</dl>
    </details>`}function ct(s,e){let t=s.location.line!==void 0?`${s.location.jsonPath}  \xB7  line ${s.location.line}`:s.location.jsonPath,r=()=>{s.location.line!==void 0&&e(s.location.line,s.location.column??1)},i=n=>{(n.key==="Enter"||n.key===" ")&&(n.preventDefault(),r())};return u`
    <article class="issue ${s.severity}" tabindex="0" role="button" @click=${r} @keydown=${i}>
      <p class="issue-title">${We(s.title)}</p>
      <p class="issue-meta">${lt[s.severity]} at ${t}</p>
      ${s.hint!==void 0?u`<p class="issue-hint">${We(s.hint)}</p>`:d}
      ${s.allowedValues!==void 0&&s.allowedValues.length>0?u`<div class="pills">${s.allowedValues.map(n=>u`<span class="pill">${n}</span>`)}</div>`:d}
      ${dt(s)}
    </article>`}function Ve(s){let e=new Set;for(let t of s.documents[0]?.issues??[])t.location.line!==void 0&&t.severity!=="info"&&e.add(t.location.line);return e}function Fe(s,e,t){let r=s.documents[0];if(!r)return u``;let i=r.counts.violation,n=r.counts.warning,o=[e.standard,e.ref!==void 0?`ref ${e.ref}`:""];return n>0&&o.push(`${n} warning${n===1?"":"s"}`),u`
    ${s.setup.warnings.map(l=>z("warning",`${l.title}${l.hint!==void 0?` ${l.hint}`:""}`))}
    <div class="verdict ${r.conforms?"pass":"fail"}">
      <strong>${r.conforms?"This record follows the standard":`${i} problem${i===1?"":"s"} found`}</strong>
      <span class="muted">${o.filter(Boolean).join("  \xB7  ")}</span>
    </div>
    ${fe(r.issues.filter(l=>l.severity!=="info")).map(l=>u`
      <section class="group">
        <h3>${l.label}</h3>
        ${l.issues.map(a=>ct(a,t))}
      </section>`)}
    ${r.issues.filter(l=>l.severity==="info").map(l=>z("info",l.title))}
    ${s.crossChecks.filter(l=>!l.ok).flatMap(l=>l.findings.map(a=>z("error",a.message)))}`}var Ke=se`
:host {
  --bg: var(--dsv-bg, #ffffff);
  --surface: var(--dsv-surface, #ffffff);
  --surface-2: var(--dsv-surface-2, #f4f6f9);
  --border: var(--dsv-border, #cfd6df);
  --text: var(--dsv-text, #152336);
  --text-dim: var(--dsv-text-dim, #4f5b6b);
  --link: var(--dsv-link, #3056a9);
  --link-hover: var(--dsv-link-hover, #386fc4);
  --accent: var(--dsv-accent, #0f4b69);
  --accent-text: var(--dsv-accent-text, #ffffff);
  --accent-soft: var(--dsv-accent-soft, #bce7d3);
  --violation: var(--dsv-violation, #821717);
  --violation-edge: var(--dsv-violation-edge, #e05252);
  --violation-bg: var(--dsv-violation-bg, #fbe9e9);
  --warning: var(--dsv-warning, #574b0f);
  --warning-edge: var(--dsv-warning-edge, #e0cb52);
  --warning-bg: var(--dsv-warning-bg, #fcfaee);
  --info: var(--dsv-info, #152336);
  --info-edge: var(--dsv-info-edge, #7fa3c7);
  --info-bg: var(--dsv-info-bg, #eaf1f8);
  --ok: var(--dsv-ok, #178217);
  --ok-edge: var(--dsv-ok-edge, #52b052);
  --ok-bg: var(--dsv-ok-bg, #e9fbe9);
  --syn-key: var(--dsv-syn-key, #0f4b69);
  --syn-keyword: var(--dsv-syn-keyword, #7a3e9d);
  --syn-string: var(--dsv-syn-string, #1d6b3a);
  --syn-number: var(--dsv-syn-number, #a14a00);
  --syn-literal: var(--dsv-syn-literal, #3056a9);
  --syn-punct: var(--dsv-syn-punct, #6b7684);
  --selection: var(--dsv-selection, rgba(48, 86, 169, 0.22));
  --radius: var(--dsv-radius, 4px);
  --sans: var(--dsv-sans, "Helvetica Neue", Arial, sans-serif);
  --mono: var(--dsv-mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace);
}

@media (prefers-color-scheme: dark) {
  :host(:not([theme="light"])) {
    --bg: var(--dsv-bg, #0e1a24);
    --surface: var(--dsv-surface, #132330);
    --surface-2: var(--dsv-surface-2, #182b3a);
    --border: var(--dsv-border, #2a4152);
    --text: var(--dsv-text, #e8eef4);
    --text-dim: var(--dsv-text-dim, #9fb0c0);
    --link: var(--dsv-link, #8fb4f0);
    --link-hover: var(--dsv-link-hover, #b3cdf6);
    --accent: var(--dsv-accent, #bce7d3);
    --accent-text: var(--dsv-accent-text, #0a121c);
    --violation: var(--dsv-violation, #ffa3a3);
    --violation-edge: var(--dsv-violation-edge, #e05252);
    --violation-bg: var(--dsv-violation-bg, #2c1618);
    --warning: var(--dsv-warning, #f0d77a);
    --warning-edge: var(--dsv-warning-edge, #e0cb52);
    --warning-bg: var(--dsv-warning-bg, #2a2512);
    --info: var(--dsv-info, #c9daea);
    --info-edge: var(--dsv-info-edge, #5f86ad);
    --info-bg: var(--dsv-info-bg, #142636);
    --ok: var(--dsv-ok, #8fe08f);
    --ok-edge: var(--dsv-ok-edge, #52b052);
    --ok-bg: var(--dsv-ok-bg, #12291a);
    --syn-key: var(--dsv-syn-key, #8fc8e8);
    --syn-keyword: var(--dsv-syn-keyword, #d3a6f0);
    --syn-string: var(--dsv-syn-string, #9ad7a8);
    --syn-number: var(--dsv-syn-number, #f0b27a);
    --syn-literal: var(--dsv-syn-literal, #8fb4f0);
    --syn-punct: var(--dsv-syn-punct, #8193a4);
    --selection: var(--dsv-selection, rgba(143, 180, 240, 0.3));
  }
}

:host([theme="dark"]) {
  --bg: var(--dsv-bg, #0e1a24);
  --surface: var(--dsv-surface, #132330);
  --surface-2: var(--dsv-surface-2, #182b3a);
  --border: var(--dsv-border, #2a4152);
  --text: var(--dsv-text, #e8eef4);
  --text-dim: var(--dsv-text-dim, #9fb0c0);
  --link: var(--dsv-link, #8fb4f0);
  --link-hover: var(--dsv-link-hover, #b3cdf6);
  --accent: var(--dsv-accent, #bce7d3);
  --accent-text: var(--dsv-accent-text, #0a121c);
  --violation: var(--dsv-violation, #ffa3a3);
  --violation-edge: var(--dsv-violation-edge, #e05252);
  --violation-bg: var(--dsv-violation-bg, #2c1618);
  --warning: var(--dsv-warning, #f0d77a);
  --warning-edge: var(--dsv-warning-edge, #e0cb52);
  --warning-bg: var(--dsv-warning-bg, #2a2512);
  --info: var(--dsv-info, #c9daea);
  --info-edge: var(--dsv-info-edge, #5f86ad);
  --info-bg: var(--dsv-info-bg, #142636);
  --ok: var(--dsv-ok, #8fe08f);
  --ok-edge: var(--dsv-ok-edge, #52b052);
  --ok-bg: var(--dsv-ok-bg, #12291a);
  --syn-key: var(--dsv-syn-key, #8fc8e8);
  --syn-keyword: var(--dsv-syn-keyword, #d3a6f0);
  --syn-string: var(--dsv-syn-string, #9ad7a8);
  --syn-number: var(--dsv-syn-number, #f0b27a);
  --syn-literal: var(--dsv-syn-literal, #8fb4f0);
  --syn-punct: var(--dsv-syn-punct, #8193a4);
  --selection: var(--dsv-selection, rgba(143, 180, 240, 0.3));
}

:host([hidden]) { display: none; }

:host {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font: 16px/1.55 var(--sans);
}
* { box-sizing: border-box; }
a { color: var(--link); }
a:hover, a:focus { color: var(--link-hover); }

/* ---- Toolbar ----------------------------------------------------------- */

.toolbar {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px 14px;
  padding: 12px 24px 10px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
  position: relative;
}
.field { flex: 0 1 18rem; min-width: 12rem; }
.field label, .advanced-body label {
  display: block;
  font-weight: 700;
  font-size: 0.8rem;
  margin-bottom: 4px;
}
select, .ref-input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 0.95rem;
}
.help { margin: 6px 0 0; font-size: 0.82rem; color: var(--text-dim); }
.toolbar-help { flex: 1 0 100%; margin: 0; }

.actions { display: flex; gap: 8px; }
button {
  font: inherit;
  font-size: 0.95rem;
  padding: 7px 18px;
  border-radius: var(--radius);
  border: 1px solid transparent;
  cursor: pointer;
}
button.primary { background: var(--accent); color: var(--accent-text); font-weight: 700; }
button.primary:hover { filter: brightness(1.12); }
button.primary:disabled { opacity: 0.6; cursor: progress; }
button.ghost { background: var(--surface); border-color: var(--border); color: var(--text); }
button.ghost:hover { border-color: var(--accent); }
button:focus-visible, select:focus-visible, textarea:focus-visible, input:focus-visible,
summary:focus-visible, a:focus-visible, .issue:focus-visible {
  outline: 2px solid var(--link);
  outline-offset: 2px;
}

.advanced { align-self: center; margin-left: auto; }
.advanced summary { cursor: pointer; font-size: 0.85rem; color: var(--text-dim); }
/* Floats over the workspace, so opening it never pushes the panes around. */
.advanced-body {
  position: absolute;
  right: 24px;
  top: calc(100% - 4px);
  z-index: 10;
  width: min(30rem, calc(100vw - 32px));
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.3);
}

/* ---- Workspace: editor | results --------------------------------------- */

.workspace {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}
.pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  padding: 12px 24px 12px;
}
.editor-pane { border-right: 1px solid var(--border); }
.pane-head {
  flex: none;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin: 0 0 8px;
}

.editor {
  flex: 1;
  min-height: 0;
  display: flex;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--surface);
}
.gutter {
  margin: 0;
  /* Extra bottom room so the gutter can always scroll as far as the textarea,
     whose horizontal scrollbar eats into its own height. */
  padding: 12px 8px 32px 12px;
  background: var(--surface-2);
  border-right: 1px solid var(--border);
  color: var(--text-dim);
  font: 13px/1.5 var(--mono);
  text-align: right;
  user-select: none;
  overflow: hidden;
  min-width: 3.2rem;
  white-space: pre;
}
.gutter .flagged { color: var(--violation); font-weight: 700; }
.gutter .current { background: var(--violation-bg); border-radius: 3px; }
/* Colouring is a <pre> painted behind a transparent textarea. The two must
   share every metric that affects where a character lands - font, padding,
   tab size, wrapping - or the colours drift away from the text. */
.code { position: relative; flex: 1; min-width: 0; }
.highlight, .input {
  margin: 0;
  border: 0;
  padding: 12px;
  font: 13px/1.5 var(--mono);
  font-variant-ligatures: none;
  letter-spacing: normal;
  tab-size: 2;
  /* No soft wrapping: the gutter numbers source lines, and jumpToLine assumes
     one visual row per line. */
  white-space: pre;
  overflow-wrap: normal;
}
.highlight {
  position: absolute;
  inset: 0;
  overflow: hidden;
  color: var(--text);
  pointer-events: none;
  /* As with the gutter: room to keep scrolling past the textarea's scrollbar. */
  padding-right: 32px;
  padding-bottom: 32px;
}
.input {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  resize: none;
  overflow: auto;
  background: transparent;
  color: transparent;
  caret-color: var(--text);
}
.input::placeholder { color: var(--text-dim); }
.input::selection { color: transparent; background: var(--selection); }

.tok-key { color: var(--syn-key); }
.tok-keyword { color: var(--syn-keyword); }
.tok-string { color: var(--syn-string); }
.tok-number { color: var(--syn-number); }
.tok-literal { color: var(--syn-literal); }
.tok-punct { color: var(--syn-punct); }
.privacy { flex: none; font-size: 0.78rem; color: var(--text-dim); margin: 6px 2px 0; }

.results-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}
.results .empty {
  margin: 0;
  padding: 18px 16px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  color: var(--text-dim);
  font-size: 0.9rem;
}

/* ---- Result cards ------------------------------------------------------ */

.verdict {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  border-left-width: 5px;
  margin-bottom: 14px;
}
.verdict.pass { background: var(--ok-bg); border-color: var(--ok-edge); }
.verdict.pass strong { color: var(--ok); }
.verdict.fail { background: var(--violation-bg); border-color: var(--violation-edge); }
.verdict.fail strong { color: var(--violation); }
.verdict strong { font-size: 1.05rem; }
.verdict .muted { color: var(--text-dim); font-size: 0.85rem; }

.group { margin-bottom: 16px; }
.group > h3 {
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  font-family: var(--mono);
  color: var(--text-dim);
  margin: 0 0 6px;
}

.issue {
  border: 1px solid var(--border);
  border-left-width: 4px;
  border-radius: var(--radius);
  background: var(--surface);
  padding: 10px 14px;
  margin-bottom: 8px;
  cursor: pointer;
}
.issue.violation { border-left-color: var(--violation-edge); }
.issue.warning { border-left-color: var(--warning-edge); }
.issue.info { border-left-color: var(--info-edge); }
.issue:hover { border-color: var(--accent); }
.issue.violation:hover { border-left-color: var(--violation-edge); }
.issue.warning:hover { border-left-color: var(--warning-edge); }

.issue-title { font-weight: 700; margin: 0 0 4px; }
.issue-title code { font-family: var(--mono); font-size: 0.92em; }
.issue-meta { font-size: 0.8rem; color: var(--text-dim); font-family: var(--mono); margin: 0; }
.issue-hint { margin: 6px 0 0; font-size: 0.9rem; color: var(--text-dim); }

.pills { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.pill {
  font: 0.78rem/1 var(--mono);
  padding: 5px 8px;
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  color: var(--text-dim);
}

.issue details { margin-top: 8px; }
.issue details summary { font-size: 0.8rem; color: var(--text-dim); cursor: pointer; }
.issue details dl {
  margin: 8px 0 0;
  font: 0.78rem/1.5 var(--mono);
  color: var(--text-dim);
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 2px 10px;
}
.issue details dt { font-weight: 700; }
.issue details dd { margin: 0; overflow-wrap: anywhere; }

.banner {
  padding: 10px 14px;
  border-radius: var(--radius);
  margin-bottom: 12px;
  font-size: 0.9rem;
  border: 1px solid;
  border-left-width: 4px;
  color: var(--text);
}
.banner.warning { background: var(--warning-bg); border-color: var(--warning-edge); }
.banner.info { background: var(--info-bg); border-color: var(--info-edge); }
.banner.error { background: var(--violation-bg); border-color: var(--violation-edge); }

/* On narrow screens two half-width panes are unusable, and a fixed height
   would leave the editor a sliver. Stack, and let the page scroll. */
@media (max-width: 860px) {
  .toolbar, .pane { padding-left: 16px; padding-right: 16px; }
  .workspace { grid-template-columns: minmax(0, 1fr); }
  .editor-pane { border-right: 0; border-bottom: 1px solid var(--border); }
  .editor { height: 24rem; flex: none; }
  .results-scroll { overflow: visible; }
  .field { flex: 1 1 100%; }
  .actions { flex: 1; }
  .actions button { flex: 1; }
  .advanced-body { right: 16px; }
}
`;var ht="data-standard-validator:last";function pt(){let s=new URL(import.meta.url);return(s.protocol==="http:"||s.protocol==="https:")&&s.origin!==location.origin}function ut(){let s=import.meta.url.replace(/[^/]*$/,"worker.js"),e=new Blob([`import ${JSON.stringify(s)}
`],{type:"text/javascript"});return new Worker(URL.createObjectURL(e),{type:"module"})}var te=class extends ${static{this.styles=Ke}static{this.properties={config:{attribute:!1},theme:{reflect:!0},standardIndex:{state:!0},exampleUrl:{state:!0},ref:{state:!0},text:{state:!0},flagged:{state:!0},results:{state:!0},busy:{state:!0}}}constructor(){super(),this.requestId=0,this.inFlight={standard:""},this.exampleToken=0,this.restored=!1,this.linked=!1,this.standardIndex=0,this.exampleUrl="",this.ref="",this.text="",this.flagged=new Set,this.busy=!1}connectedCallback(){super.connectedCallback(),this.startWorker()}disconnectedCallback(){super.disconnectedCallback(),this.worker?.terminate(),this.worker=void 0}willUpdate(e){e.has("config")&&(this.standardIndex=0,this.exampleUrl="",this.ref=this.config!==void 0?D(this.config)??"":"",this.restored||this.restoreText(),this.linked||this.applyLink())}updated(){this.syncScroll()}get storageKey(){let e=this.config?.storageKey;return e===!1?void 0:e??ht}restoreText(){this.restored=!0;let e=this.storageKey;if(e!==void 0)try{let t=localStorage.getItem(e);t!==null&&t!==""&&(this.text=t)}catch{}}applyLink(){this.linked=!0;let e=this.config;if(e===void 0||e.urlParams===!1)return;let t=ze(location.search),r=n=>new URL(n,location.href).href,i=Be(e,{shapes:t.shapes.map(r),...t.context!==void 0?{context:r(t.context)}:{},...t.example!==void 0?{example:r(t.example)}:{}});i&&(this.standardIndex=i.standardIndex,i.ref!==void 0&&(this.ref=i.ref),i.example!==void 0&&this.loadExample(i.example))}startWorker(){if(this.worker)return;this.workerFailure=void 0;let e=pt()?ut():new Worker(new URL("./worker.js",import.meta.url),{type:"module"});e.addEventListener("error",t=>{this.workerFailure=t.message!==""?t.message:"the worker script failed to load",this.showWorkerFailure()}),e.addEventListener("message",t=>{let r=t.data;if(r.id===this.requestId){if(r.kind==="status"){this.results={kind:"info",text:r.message};return}if(this.busy=!1,r.kind==="error"){this.results={kind:"error",text:`Could not validate: ${r.message}`};return}this.results={kind:"report",report:r.report,label:this.inFlight},this.flagged=Ve(r.report)}}),this.worker=e}showWorkerFailure(){this.busy=!1,this.results={kind:"error",text:`The validator could not start in this browser: ${this.workerFailure??"unknown error"}`}}get standard(){return this.config?.standards[this.standardIndex]}validate(){if(this.workerFailure!==void 0||!this.worker){this.showWorkerFailure();return}let e=this.standard;if(!e||!this.config)return;if(this.text.trim()===""){this.results={kind:"info",text:"Paste a record above, or load one of the examples."};return}let t=this.storageKey;if(t!==void 0)try{localStorage.setItem(t,this.text)}catch{}this.results={kind:"info",text:"Validating\u2026"},this.busy=!0,this.requestId+=1;let r=D(this.config),i=r===void 0?void 0:this.ref.trim()||r;this.inFlight={standard:e.name,...i!==void 0?{ref:i}:{}};let n={kind:"validate",id:this.requestId,standard:Ne(e,i),...this.config.patterns!==void 0?{patterns:this.config.patterns}:{},...i!==void 0?{ref:i}:{},text:this.text,name:"your record"};this.worker.postMessage(n)}find(e){return this.renderRoot.querySelector(e)}syncScroll(){let e=this.find(".input"),t=this.find(".gutter"),r=this.find(".highlight");!e||!t||!r||(t.scrollTop=e.scrollTop,r.scrollTop=e.scrollTop,r.scrollLeft=e.scrollLeft)}setText(e){this.text=e,this.flagged=new Set}jumpToLine(e,t=1){let r=this.find(".input");if(!r)return;let i=r.value.split(`
`),n=0;for(let a=0;a<e-1&&a<i.length;a++)n+=i[a].length+1;let o=n+t-1;r.focus(),r.setSelectionRange(o,o+Math.max(1,(i[e-1]?.length??1)-t+1));let l=r.scrollHeight/Math.max(i.length,1);r.scrollTop=Math.max(0,(e-4)*l),this.syncScroll()}onSubmit(e){e.preventDefault(),this.validate()}onStandard(e){this.standardIndex=Number(e.target.value),this.exampleUrl=""}onExample(e){this.loadExample(e.target.value)}loadExample(e){if(this.exampleUrl=e,e==="")return;let t=++this.exampleToken;this.results={kind:"info",text:"Loading example\u2026"},(async()=>{try{let r=await fetch(C(e));if(!r.ok)throw new Error(`HTTP ${r.status}`);let i=await r.text();if(t!==this.exampleToken)return;this.setText(i),this.results=void 0,this.validate()}catch(r){if(t!==this.exampleToken)return;this.results={kind:"error",text:`Could not load the example: ${r.message}`}}})()}onClear(){this.exampleToken+=1,this.exampleUrl="",this.setText(""),this.results=void 0}onInput(e){this.setText(e.target.value)}onKeydown(e){(e.metaKey||e.ctrlKey)&&e.key==="Enter"&&(e.preventDefault(),this.validate())}onDrop(e){let t=e.dataTransfer?.files?.[0];t&&(e.preventDefault(),t.text().then(r=>{this.setText(r)}))}renderRefHelp(){let e=this.config!==void 0?De(this.config):void 0;return u`Which revision of ${e?u`<a href=${e.url} rel="noreferrer">${e.name}</a>`:"the shapes repository"} the shapes are read from. A tag pins results; a branch tracks the latest.`}renderGutter(){let e=Math.max(this.text.split(`
`).length,1),t=[];for(let r=1;r<=e;r++)t.push(this.flagged.has(r)?u`<span class="flagged">${r}</span>\n`:u`${r}\n`);return t}renderResults(){let e=this.results;return e?e.kind==="report"?Fe(e.report,e.label,(t,r)=>{this.jumpToLine(t,r)}):z(e.kind,e.text):u`<p class="empty">Validate a record to see what needs fixing. Choose an example above to try it out.</p>`}render(){let e=this.config,t=this.standard,r=e!==void 0&&D(e)!==void 0;return u`
      <form class="toolbar" autocomplete="off" @submit=${this.onSubmit}>
        <div class="field">
          <label for="standard">Standard</label>
          <select id="standard" name="standard" @change=${this.onStandard}>
            ${(e?.standards??[]).map((i,n)=>u`
              <option value=${n} .selected=${T(n===this.standardIndex)}>${i.name}</option>`)}
          </select>
        </div>
        <div class="field">
          <label for="example">Example</label>
          <select id="example" name="example" @change=${this.onExample}>
            <option value="" .selected=${T(this.exampleUrl==="")}>Load an example…</option>
            ${t?Z(t).map(i=>u`
              <option value=${i.url} .selected=${T(i.url===this.exampleUrl)}>${i.name}</option>`):d}
          </select>
        </div>
        <div class="actions">
          <button type="submit" class="primary validate" ?disabled=${this.busy}>${this.busy?"Validating\u2026":"Validate"}</button>
          <button type="button" class="ghost clear" @click=${this.onClear}>Clear</button>
        </div>
        <details class="advanced" ?hidden=${!r}>
          <summary>Advanced</summary>
          <div class="advanced-body">
            <label for="ref">Shapes version (git ref)</label>
            <input id="ref" name="ref" class="ref-input" spellcheck="false"
              .value=${T(this.ref)} @input=${i=>{this.ref=i.target.value}} />
            <p class="help ref-help">${r?this.renderRefHelp():d}</p>
          </div>
        </details>
        ${t?.description!==void 0?u`<p class="help toolbar-help standard-help">${t.description}</p>`:d}
      </form>

      <main class="workspace">
        <section class="pane editor-pane" aria-labelledby="editor-heading">
          <h2 id="editor-heading" class="pane-head">Your data</h2>
          <div class="editor">
            <pre class="gutter" aria-hidden="true">${this.renderGutter()}</pre>
            <div class="code">
              <pre class="highlight" aria-hidden="true">${He(je(this.text))}</pre>
              <textarea name="data" class="input" wrap="off" spellcheck="false"
                aria-label="JSON or JSON-LD to validate"
                placeholder=${e?.placeholder??d}
                .value=${T(this.text)}
                @input=${this.onInput}
                @scroll=${this.syncScroll}
                @keydown=${this.onKeydown}
                @dragover=${i=>{i.preventDefault()}}
                @drop=${this.onDrop}></textarea>
            </div>
          </div>
          <p class="privacy">
            Your data stays in this browser. Only the shape and context files are downloaded.
          </p>
        </section>

        <section class="pane results-pane" aria-labelledby="results-heading">
          <h2 id="results-heading" class="pane-head">Results</h2>
          <div class="results-scroll">
            <div class="results" aria-live="polite">${this.renderResults()}</div>
          </div>
        </section>
      </main>`}};customElements.get("data-standard-validator")||customElements.define("data-standard-validator",te);export{te as DataStandardValidator};
/*! Bundled license information:

@lit/reactive-element/css-tag.js:
  (**
   * @license
   * Copyright 2019 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

@lit/reactive-element/reactive-element.js:
lit-html/lit-html.js:
lit-element/lit-element.js:
lit-html/directive.js:
lit-html/directives/unsafe-html.js:
  (**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/is-server.js:
  (**
   * @license
   * Copyright 2022 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)

lit-html/directive-helpers.js:
lit-html/directives/live.js:
  (**
   * @license
   * Copyright 2020 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   *)
*/
//# sourceMappingURL=data-standard-validator.js.map
