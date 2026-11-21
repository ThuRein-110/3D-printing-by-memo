export const BOOTSTRAP=`(()=>{const root=document.documentElement;if(root.dataset.theme==='system')root.dataset.theme=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';})();`;
