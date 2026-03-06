export type SpacetimeClientConfig = {
  url: string;
  moduleName: string;
};

export class SpacetimeClient {
  constructor(private readonly config: SpacetimeClientConfig) {}

  getConfig() {
    return this.config;
  }
}

let singleton: SpacetimeClient | null = null;

export function getSpacetimeClient(config: SpacetimeClientConfig): SpacetimeClient {
  if (!singleton) {
    singleton = new SpacetimeClient(config);
  }
  return singleton;
}
