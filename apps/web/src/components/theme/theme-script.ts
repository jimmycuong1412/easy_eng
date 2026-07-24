export const THEME_STORAGE_KEY = 'easyeng-theme';

// Runs before hydration to set the initial <html> class and avoid a flash.
export const THEME_SCRIPT = `(function(){try{
var t=localStorage.getItem('${THEME_STORAGE_KEY}');
if(t!=='dark'){t='bright';}
var e=document.documentElement;
e.classList.remove('bright','dark');
e.classList.add(t);
}catch(_){document.documentElement.classList.add('bright');}})();`;
