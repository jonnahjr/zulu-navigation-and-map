// Import MapView (could be CJS or ESM); normalize to a default React component
let M: any;
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	M = require('./MapView');
} catch (e) {
	// fallback to import
	// @ts-ignore
	M = (await import('./MapView'))?.default;
}
const MapViewDefault: any = (M && M.default) ? M.default : M;
export default MapViewDefault;
