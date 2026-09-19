/// <reference types="@lynx-js/types" />

interface ImportMeta {
  readonly webpackHot?: {
    accept(callback?: () => void): void;
  };
}
