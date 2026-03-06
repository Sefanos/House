export type AuthReducer = "auth.register" | "auth.login";

export type AuthPayload = {
  username: string;
  password: string;
};

export type ReducerResult = {
  ok: true;
  reducer: AuthReducer;
  received: AuthPayload;
  placeholder: true;
  timestamp: string;
};

export async function invokeAuthReducer(
  reducer: AuthReducer,
  payload: AuthPayload
): Promise<ReducerResult> {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return {
    ok: true,
    reducer,
    received: payload,
    placeholder: true,
    timestamp: new Date().toISOString()
  };
}
