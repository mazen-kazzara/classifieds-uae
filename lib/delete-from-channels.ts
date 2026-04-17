import { deleteFromFacebook, deleteFromInstagram, deleteFromX } from "@/lib/social-publisher";

interface ChannelIds {
  telegramMessageId?: string | null;
  facebookPostId?: string | null;
  instagramPostId?: string | null;
  twitterPostId?: string | null;
}

/**
 * Deletes an ad from all external channels (Telegram, Facebook, Instagram, X).
 * Returns list of channels where deletion succeeded.
 * Never throws.
 */
export async function deleteFromAllChannels(ad: ChannelIds): Promise<string[]> {
  const results: string[] = [];

  // Telegram — may have multiple message IDs (comma-separated from sendMediaGroup)
  if (ad.telegramMessageId) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (botToken && channelId) {
      const msgIds = ad.telegramMessageId.split(",").map(s => s.trim()).filter(Boolean);
      let anyDeleted = false;
      for (const msgId of msgIds) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/deleteMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: channelId, message_id: Number(msgId) }),
          });
          const json = await res.json();
          if (json?.ok) anyDeleted = true;
          else console.error("TG DELETE failed for msg", msgId, ":", JSON.stringify(json));
        } catch (e) { console.error("TG DELETE error:", e); }
      }
      if (anyDeleted) results.push("telegram");
    }
  }

  // Facebook
  if (ad.facebookPostId) {
    if (await deleteFromFacebook(ad.facebookPostId)) results.push("facebook");
  }

  // Instagram
  if (ad.instagramPostId) {
    if (await deleteFromInstagram(ad.instagramPostId)) results.push("instagram");
  }

  // X (Twitter)
  if (ad.twitterPostId) {
    if (await deleteFromX(ad.twitterPostId)) results.push("x");
  }

  return results;
}
