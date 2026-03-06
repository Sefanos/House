import { schema, table, t } from "spacetimedb/server";

const spacetimedb = schema({
  bootstrapEvents: table(
    { public: true },
    {
      event: t.string(),
      createdAt: t.string()
    }
  )
});

export default spacetimedb;

export const init = spacetimedb.init((ctx) => {
  ctx.db.bootstrapEvents.insert({
    event: "module_initialized",
    createdAt: new Date().toISOString()
  });
});

export const authRegister = spacetimedb.reducer(
  {
    username: t.string(),
    password: t.string()
  },
  (_ctx, _args) => {
    // Placeholder reducer for Plan 01 auth flow smoke checks.
  }
);

export const authLogin = spacetimedb.reducer(
  {
    username: t.string(),
    password: t.string()
  },
  (_ctx, _args) => {
    // Placeholder reducer for Plan 01 auth flow smoke checks.
  }
);
