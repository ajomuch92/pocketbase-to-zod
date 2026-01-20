#!/usr/bin/env node

import { Command } from 'commander';
import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

const program = new Command();

program
  .name('pocketbase-to-zod')
  .description('Generate Zod schemas from a PocketBase instance')
  .requiredOption('-u, --url <char>', 'PocketBase URL')
  .requiredOption('-e, --email <char>', 'Admin email')
  .requiredOption('-p, --password <char>', 'Admin password')
  .option('-o, --output <char>', 'Output file path', './pocketbase-schema.ts')
  .action(async (options) => {
    const pb = new PocketBase(options.url);

    try {
      console.log('--- Authenticating with PocketBase ---');
      await pb.collection('_superusers').authWithPassword(options.email, options.password);

      console.log('--- Fetching collections ---');
      const collections = await pb.collections.getFullList();

      let fileContent = `import { z } from 'zod';\n\n`;
      const filteredCollections = collections.filter((col) => (col.type === 'base' || col.type === 'auth') && !col.system);

      console.log(`--- Generating schemas for ${filteredCollections.length} collections ---`);

      for (const col of filteredCollections) {
        console.log(`--- Generating schema for collection: ${col.name} ---`);
        fileContent += `// Schema for collection: ${col.name}\n`;
        fileContent += `export const ${col.name}Schema = z.object({\n`;
        
        // Base PocketBase fields
        fileContent += `  id: z.string(),\n`;
        fileContent += `  created: z.string(),\n`;
        fileContent += `  updated: z.string(),\n`;

        for (const field of col.fields) {
          let zodType = 'z.any()';

          switch (field.type) {
            case 'text':
            case 'editor':
            case 'url':
            case 'email':
              zodType = 'z.string()';
              break;
            case 'number':
              zodType = 'z.number()';
              break;
            case 'bool':
              zodType = 'z.boolean()';
              break;
            case 'date':
              zodType = 'z.string().datetime()'; // PocketBase sends dates as ISO strings
              break;
            case 'select':
              if (field.options?.values && Array.isArray(field.options.values) && field.options.values.length > 0) {
                const values = field.options.values.map((v: string) => `'${v}'`).join(', ');
                zodType = `z.enum([${values}])`;
              }
              break;
            case 'relation':
              zodType = field.options?.maxSelect === 1 ? 'z.string()' : 'z.array(z.string())';
              break;
            case 'file':
              zodType = field.options?.maxSelect === 1 ? 'z.string()' : 'z.array(z.string())';
              break;
            case 'json':
              zodType = 'z.unknown()';
              break;
          }

          if (!field.required) {
            zodType += '.optional().nullable()';
          }

          fileContent += `  ${field.name}: ${zodType},\n`;
        }

        fileContent += `});\n\n`;
        fileContent += `export type ${col.name.charAt(0).toUpperCase() + col.name.slice(1)} = z.infer<typeof ${col.name}Schema>;\n\n`;
      }

      const outputPath = path.resolve(process.cwd(), options.output);
      fs.writeFileSync(outputPath, fileContent);
      console.log(`✅ Schemas generated successfully at: ${outputPath}`);

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();