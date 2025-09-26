declare module 'react-native' {
  // Minimal ambient declarations to satisfy libraries that import new codegen helpers
  // These are intentionally permissive and should be refined if you rely on them directly.
  export function codegenNativeComponent(name: string): any;
  export function codegenNativeCommands(config: any): any;
  export function codegenNativeModule(name: string, options?: any): any;
}
