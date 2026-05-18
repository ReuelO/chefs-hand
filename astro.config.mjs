// @ts-check
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

import tailwindcss from '@tailwindcss/vite';


import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.chefs-hand.com',
  integrations: [mdx(), sitemap(), react()],

  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),

  vite: {
    plugins: [tailwindcss()],
  },
});
