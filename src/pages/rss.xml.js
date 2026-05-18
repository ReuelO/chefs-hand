import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE_TITLE, SITE_DESCRIPTION } from "../consts";

export async function GET(context) {
	const blog = await getCollection("blog");
	const recipes = await getCollection("recipes");
	
	const items = [
		...blog.map((post) => ({
			...post.data,
			link: `/blog/${post.id}/`,
		})),
		...recipes.map((recipe) => ({
			...recipe.data,
			link: `/recipe/${recipe.id}/`,
			pubDate: new Date(), // Recipes don't have pubDate yet, defaulting to now
		})),
	].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items,
	});
}
