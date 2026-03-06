export type ReducerInput = Record<string, unknown>;

export type ReducerResult = {
  ok: true;
  reducer: string;
  placeholder: true;
  input: ReducerInput;
};

export function placeholder(reducer: string, input: ReducerInput): ReducerResult {
  return {
    ok: true,
    reducer,
    placeholder: true,
    input
  };
}
