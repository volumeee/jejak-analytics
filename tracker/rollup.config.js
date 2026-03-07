import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/index.ts",
  output: {
    file: "dist/jejak.js",
    format: "iife",
    name: "Jejak",
    exports: "named",
    sourcemap: false,
  },
  plugins: [
    resolve(),
    typescript({ tsconfig: "./tsconfig.json" }),
    terser({
      compress: { passes: 2, drop_console: true },
      mangle: true,
    }),
  ],
};
