# pocketbase-to-zod

A lightweight CLI tool to automatically generate **Zod schemas** and **TypeScript types** directly from your **PocketBase** collections.

## Features
* ⚡ **Real-time Generation**: Connects to your PocketBase instance via URL.
* 🛡️ **Type Safety**: Generates both Zod schemas for runtime validation and TS types for compile-time safety.
* 🔄 **Smart Mapping**: Automatically maps PocketBase field types (Select, Relation, File, Date, etc.) to the appropriate Zod logic.
* 📦 **Fullstack Ready**: Perfect for sharing schemas between your backend (Nitro/Node) and your frontend.
* 🏎️ **Lightweight & Fast**: Minimal dependencies for quick setup and execution.

## Installation

```bash
npm install -g pocketbase-to-zod
# or use it via npx
npx pocketbase-to-zod [options]
```

## Usage

```bash
pocketbase-to-zod --url http://localhost:8090 --email admin@example.com --password yourpassword --output ./schemas.ts --split
```

## Options
- `--url <url>`: PocketBase instance URL (default: `http://localhost:8090`) [Required]
- `--email <email>`: Admin email for authentication [Required]
- `--password <password>`: Admin password for authentication [Required]
- `--output <file>`: Output file path for generated schemas (default: `./pocketbase-schemas.ts`) [Optional]
- `--split`: Generate a separate file for each collection [Optional]

## Example Output

```typescript
import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  created: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  updated: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid date format",
  }),
  email: z.string().email(),
  verified: z.boolean(),
  username: z.string().min(3).max(50),
  // ... other fields
});

export type User = z.infer<typeof UserSchema>;
```

## Contributing
Contributions are welcome! Please open an issue or submit a pull request on GitHub.
