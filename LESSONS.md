# Lessons

Things you'd only know by being burned. Not in the code, not in the tests.

---

**The Electron main process does not hot-reload in dev mode.**
`npm run dev` compiles main once at startup then watches nothing. Changes to `src/main.ts` or `src/grpc-client.ts` are silently ignored until you restart. We shipped a broken cancel button this way — it appeared to do nothing because the old binary didn't have the IPC handler. Write an E2E test for every new IPC channel before assuming it works.

**Electron wraps IPC rejections with a prefix.**
`ipcMain.handle` rejections arrive in the renderer as `Error invoking remote method 'channel': Error: original message`. Exact string comparisons silently fail. Always use `.includes()`.

**`overflow-y: auto` clips absolutely-positioned children regardless of z-index.**
It creates a stacking and clipping context. Tooltips inside the sidebar were clipped no matter how high the z-index. Fix: React portal into `document.body` with `position: fixed` and `getBoundingClientRect`.

**`Root.fromDescriptor()` calls `resolveAll()` internally as its final step.**
The throw happens inside `fromDescriptor` — the fully-built root is lost before it's returned. You can't catch it after the fact. Fix: patch `Root.prototype.resolveAll` before calling `fromDescriptor`, restore in `finally`.

**Chromium's localStorage LevelDB is UTF-8, not UTF-16.**
The keys look like garbled Chinese characters if you read them as UTF-16 LE. They're UTF-8 with the format `_<origin>\x00\x01<key>` and a `\x01` version prefix on values. The app must not be running when you open the DB — Chromium holds an exclusive lock.

**Playwright can't access `localStorage` until the window has a real origin.**
In tests, Electron loads `about:blank` (Vite dev server isn't running). `localStorage` throws on `about:blank`. Fix: `PLAYWRIGHT=1` env var, branch in `main.ts` to load `dist/renderer/index.html` instead.
