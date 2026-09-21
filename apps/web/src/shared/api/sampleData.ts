/**
 * True while some screens run on stand-in data (DECISIONS.md D-7): development builds only,
 * unless VITE_USE_MOCKS=false. Always false in production builds.
 */
export const USING_SAMPLE_DATA = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS !== "false";
