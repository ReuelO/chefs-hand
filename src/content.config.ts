import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string(),
		// Transform string to Date object
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional(),
	}),
});

const recipes = defineCollection({
	loader: glob({ base: "./src/content/recipes", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		baseServings: z.number(),
		prepTime: z.number().optional(), // minutes
		cookTime: z.number().optional(), // minutes
		difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
		cuisine: z.string().optional(), // e.g., Italian, Asian, Mexican, African, American
		mealType: z.enum(['breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'side']).optional(),
		cookingMethod: z.enum(['stovetop', 'oven', 'slow-cooker', 'one-pan', 'no-bake', 'grilling', 'air-fryer']).optional(),
		dietaryTags: z.array(z.string()).optional(), // e.g., vegan, gluten-free, dairy-free
		featured: z.boolean().optional(),
		rating: z.number().optional(), // 0-5
		heroImage: z.string().optional(),
		ingredients: z.array(z.object({
			name: z.string(),
			quantity: z.number(),
			unit: z.string(),
			notes: z.string().optional(),
		})),
	}),
});

const brand = defineCollection({
	loader: glob({ base: "./src/content/brand", pattern: "**/*.{md,mdx}" }),
	schema: z.object({
		title: z.string(),
		subtitle: z.string().optional(),
		content: z.string().optional(),
	}),
});

export const collections = { blog, recipes, brand };
