{
  "include": [
    "client/src/**/*",
    "shared/**/*",
    "vite.config.ts",
    "vite-plugin-meta-images.ts",
    "client/**/*.d.ts",
    "env.d.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "build",
    "coverage",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx"
  ],
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/typescript/tsbuildinfo",
    "noEmit": true,

    "target": "ESNext",
    "module": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",

    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,

    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,

    "baseUrl": ".",
    "types": ["node", "vite/client"],

    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}
