// The browser state functions here are mostly adapted from the related functions in https://github.com/vercel/swr/tree/master/src/libs
export function isDocumentVisible() {
    if (typeof document !== 'undefined' &&
        typeof document.visibilityState !== 'undefined') {
        return document.visibilityState !== 'hidden';
    }
    // Otherwise assume it's visible.
    return true;
}
export function isOnline() {
    if (typeof navigator.onLine !== 'undefined') {
        return navigator.onLine;
    }
    // Assume it's online if onLine doesn't exist for some reason.
    return true;
}
export function isDocumentFocused() {
    return document.hasFocus();
}
export function getBrowserState() {
    return {
        online: isOnline(),
        visible: isDocumentVisible(),
        focused: isDocumentFocused(),
    };
}
const listeners = [];
function refresh() {
    let state = getBrowserState();
    let error;
    for (let listener of listeners) {
        try {
            listener(state);
        }
        catch (e) {
            // Catch errors and store them away to ensure that we call all the handlers
            // even if one fails.
            error = e;
        }
    }
    if (error) {
        // Throw the error so that any global error handlers will pick it up.
        throw error;
    }
}
function unsubscribe(cb) {
    let index = listeners.indexOf(cb);
    if (index !== -1) {
        listeners.splice(index, 1);
    }
    if (!listeners.length) {
        window.removeEventListener('visibilitychange', refresh);
        window.removeEventListener('focus', refresh);
        window.removeEventListener('blur', refresh);
        window.removeEventListener('online', refresh);
        window.removeEventListener('offline', refresh);
    }
}
export function subscribe(cb) {
    if (!listeners.length) {
        window.addEventListener('visibilitychange', refresh);
        window.addEventListener('focus', refresh);
        window.addEventListener('blur', refresh);
        window.addEventListener('online', refresh);
        window.addEventListener('offline', refresh);
    }
    listeners.push(cb);
    // Call the callback right away with the current state.
    cb(getBrowserState());
    return () => unsubscribe(cb);
}
//# sourceMappingURL=browser_state.js.map