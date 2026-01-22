#!/usr/bin/env node

import { Command } from 'commander';
import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

const program = new Command();

program
  .name('pocketbase-to-zod')
  .description('Generate Zod schemas from a PocketBase instance')
  .requiredOption('-u, --url <char>', 'PocketBase URL')
  .requiredOption('-e, --email <char>', 'Admin email')
  .requiredOption('-p, --password <char>', 'Admin password')
  .option('-o, --output <char>', 'Output file path', './pocketbase-schema.ts')
  .option('-s, --split', 'Generate a file per collection', false)
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
        fileContent += `export const ${capitalizeFirstLetter(col.name)}Schema = z.object({\n`;
        
        // Base PocketBase fields
        fileContent += `  id: z.string(),\n`;
        fileContent += `  created: z.date(),\n`;
        fileContent += `  updated: z.date(),\n`;

        for (const field of col.fields) {
          let zodType = 'z.any()';

          if (field.hidden) continue;

          if (['id', 'created', 'updated'].includes(field.name)) {
            continue; // Skip specific fields if needed
          }

          console.log(`  - Processing field: ${field.name} (type: ${field.type})`);

          switch (field.type) {
            case 'text':
            case 'editor':
            case 'url':
            case 'password':
                zodType = 'z.string()';
                break;
            case 'email':
                zodType = 'z.email()';
                break;
            case 'number':
              zodType = 'z.number()';
              break;
            case 'bool':
              zodType = 'z.boolean()';
              break;
            case 'date':
            case 'autodate':
              zodType = 'z.date()';
              break;
            case 'select':
              if (field.values && Array.isArray(field.values) && field.values.length > 0) {
                const values = field.values.map((v: string) => `'${v}'`).join(', ');
                zodType = `z.enum([${values}])`;
              }
              break;
            case 'relation':
              zodType = field?.maxSelect === 1 ? 'z.string()' : 'z.array(z.string())';
              break;
            case 'file':
              zodType = field?.maxSelect === 1 ? 'z.url()' : 'z.array(z.url())';
              break;
            case 'json':
              zodType = 'z.unknown()';
              break;
          }

          if (field.min && Number.isFinite(field.min)) {
            zodType += `.min(${field.min})`;
          }

          if (field.max && Number.isFinite(field.max)) {
            zodType += `.max(${field.max})`;
          }

          if (field.autogeneratePattern || field.pattern) {
            const pattern = field.autogeneratePattern || field.pattern;
            zodType += `.regex(new RegExp('${pattern}'))`;
          }

          if (!field.required) {
            zodType += '.optional().nullable()';
          }

          fileContent += `  ${field.name}: ${zodType},\n`;
        }

        fileContent += `});\n\n`;
        fileContent += `export type ${capitalizeFirstLetter(col.name)} = z.infer<typeof ${capitalizeFirstLetter(col.name)}Schema>;\n\n`;

        if (options.split) {
          const outputDir = path.resolve(process.cwd(), path.dirname(options.output));
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          const outputPath = path.resolve(outputDir, `${col.name}-schema.ts`);
          fs.writeFileSync(outputPath, fileContent);
          console.log(`✅ Schema for collection '${col.name}' generated at: ${outputPath}`);
          fileContent = `import { z } from 'zod';\n\n`; // Reset for next file
        }
      }

      if (!options.split) {
        const outputPath = path.resolve(process.cwd(), options.output);
        fs.writeFileSync(outputPath, fileContent);
        console.log(`✅ Schemas generated successfully at: ${outputPath}`);
      }

    } catch (error: any) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();