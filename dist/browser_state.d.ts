export declare function isDocumentVisible(): boolean;
export declare function isOnline(): boolean;
export declare function isDocumentFocused(): boolean;
export interface BrowserState {
    online: boolean;
    visible: boolean;
    focused: boolean;
}
export declare function getBrowserState(): BrowserState;
export declare type Unsubscriber = () => void;
export declare function subscribe(cb: (state: BrowserState) => any): Unsubscriber;
//# sourceMappingURL=browser_state.d.ts.map