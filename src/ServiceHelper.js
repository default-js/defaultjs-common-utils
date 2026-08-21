/**
 * The url this package was loaded from.
 *
 * @module ServiceHelper
 */
import GLOBAL from "./Global.js";

/**
 * The url of the loaded module, for building paths to files shipped next to it.
 *
 * Resolved once when the module is loaded, from the first source that answers: import.meta.url as a
 * module, the src of the running script as a classic script, and GLOBAL.SERVICEURL as the way to set
 * it by hand where neither is available.
 *
 * @type {URL}
 */
export const SERVICEURL = (() => {
    try{
        return new URL(import.meta.url, location);
    }catch(e){}
    try{
        return new URL(document.currentScript.src, location);
    }catch(e){}
    return new URL(GLOBAL.SERVICEURL, location);
})();