// CSS files are only used by the web version (global.css, *.module.css). Declaring them
// keeps `tsc --noEmit` clean, so new type errors don't hide among these.
declare module '*.css';

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
