// Los imports de efecto secundario de hojas de estilo (`import './App.css'`) no
// tienen módulo que resolver: el bundle los inyecta y no exportan nada. Desde
// TypeScript 6 la comprobación de estos imports está activada por defecto
// (`noUncheckedSideEffectImports`), así que sin esta declaración el typecheck
// falla con TS2882 aunque el import sea legítimo.
declare module '*.css';
