import { ApplicationEmoji, Client, Collection } from "discord.js";
import { Logger } from "./Logger";

/**
 * Singleton class that maintains a cache of application emojis
 */
class EmojiCacheManager {
	private static instance: EmojiCacheManager;
	private emojis: Collection<string, ApplicationEmoji> = new Collection();
	private initialized = false;

	private constructor() {}

	public static getInstance(): EmojiCacheManager {
		if (!EmojiCacheManager.instance) {
			EmojiCacheManager.instance = new EmojiCacheManager();
		}
		return EmojiCacheManager.instance;
	}

	/**
	 * Initialize the emoji cache with a Discord client
	 * @param client Discord client
	 */
	public async initialize(client: Client): Promise<void> {
		if (this.initialized) {
			return;
		}
		if (!client.application) {
			throw new Error("Client application object not available");
		}

		this.emojis = await client.application?.emojis.fetch();
		this.initialized = true;
		Logger.info(`Emoji cache initialized with ${this.emojis.size} emojis`);
	}

	/**
	 * Get emoji by name
	 * @param name Emoji name (case sensitive)
	 * @returns ApplicationEmoji or empty string if not found
	 */
	public getEmoji(name: string): ApplicationEmoji | string {
		return this.emojis.find((emoji) => emoji.name === name) || "";
	}

	/**
	 * Get NHL team emoji by team abbreviation
	 * @param abbrev Team abbreviation
	 * @returns ApplicationEmoji or empty string if not found
	 */
	public getNHLTeamEmoji(abbrev: string): ApplicationEmoji | string {
		return this.emojis.find((emoji) => emoji.name === abbrev.toUpperCase()) || "";
	}

	/**
	 * Get MLB team emoji by team abbreviation
	 * @param abbrev Team abbreviation
	 * @returns ApplicationEmoji or empty string if not found
	 */
	public getMLBTeamEmoji(abbrev: string): ApplicationEmoji | string {
		return this.emojis.find((emoji) => emoji.name === `MLB_${abbrev.toUpperCase()}`) || "";
	}

	/**
	 * Get PWHL team emoji by team abbreviation
	 * @param abbrev Team abbreviation (e.g., "SEA", "TOR", "MTL", "BOS", "MIN", "NYY", "OTT")
	 * @returns ApplicationEmoji or empty string if not found
	 */
	public getPWHLTeamEmoji(abbrev: string): ApplicationEmoji | string {
		return this.emojis.find((emoji) => emoji.name === `PWHL_${abbrev.toUpperCase()}`) || "";
	}

	/**
	 * Get the entire emoji collection
	 */
	public getAllEmojis(): Collection<string, ApplicationEmoji> {
		return this.emojis;
	}

	/**
	 * Check if the cache has been initialized
	 */
	public isInitialized(): boolean {
		return this.initialized;
	}
}

// Export a singleton instance
export const EmojiCache = EmojiCacheManager.getInstance();
