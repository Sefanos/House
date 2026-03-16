import { spacetimedb, recordEvent } from "./shared.js";

export const init = spacetimedb.init((ctx) => {
  recordEvent(ctx, "module_initialized", "houseplan module bootstrapped");
});
