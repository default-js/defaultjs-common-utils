import GLOBAL from "@default-js/defaultjs-common-utils/src/Global";

export const SERVICEURL = (() => {
    try{
        return new URL(import.meta.url, location);
    }catch(e){}
    try{
        return new URL(document.currentScript.src, location);
    }catch(e){}
    return new URL(GLOBAL.SERVICEURL, location);
})();