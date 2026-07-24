// Pre-hydration anti-flash script. The server renders <html data-theme="bright">;
// this only swaps to "dark" when the user chose it, before paint. Uses a data
// attribute (not a class) so it never conflicts with React's hydration.
// The storage key is inlined so this stays a dependency-free string constant.
export const THEME_SCRIPT = `(function(){try{if(localStorage.getItem('easyeng-theme')==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(_){}})();`;
