/// <reference types="vite/client" />

declare module 'sql.js' {
  export interface Statement {
    bind(values?: unknown[]): void;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    run(values?: unknown[]): void;
    free(): void;
  }

  export interface Database {
    run(sql: string): void;
    prepare(sql: string): Statement;
  }

  export interface SqlJsStatic {
    Database: new () => Database;
  }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
  }): Promise<SqlJsStatic>;
}

declare module '*.wasm?url' {
  const assetUrl: string;
  export default assetUrl;
}