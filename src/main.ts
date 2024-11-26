import { getOpenSlots } from './scraper';
import { DiscordClient, createTableMessage, createNotificationMessage } from './discord';
import { TABLE_CHANNEL_ID, NOTIFICATION_CHANNEL_ID, HISTORY_CHANNEL_ID } from './config';
import { OpenSlots } from './types';

const getRareSlots = (openSlots: OpenSlots): OpenSlots => {
  const getWeekday = (date: string) => {
    return new Date(date).toLocaleDateString('fi-FI', { weekday: 'short' });
  };
  const rareTimes = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
  const weekdaysShort = ['ma', 'ti', 'ke', 'to'];
  const rareSlots: OpenSlots = {};
  for (const date in openSlots) {
    const weekday = getWeekday(date);
    for (const { time, place } of openSlots[date]) {
      if (rareTimes.includes(time) && weekdaysShort.includes(weekday)) {
        if (!rareSlots[date]) {
          rareSlots[date] = [];
        }
        rareSlots[date].push({ time, place });
      }
    }
  }
  return rareSlots;
};

const findNewRareSlots = (prevRareSlots: OpenSlots, rareSlots: OpenSlots): OpenSlots => {
  return Object.keys(rareSlots).reduce((acc, date) => {
    for (const slot of rareSlots[date]) {
      const prevSlot = prevRareSlots[date]?.find(ps => ps.time === slot.time && ps.place === slot.place);
      if (!prevSlot) {
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(slot);
      }
    }
    return acc;
  }, {} as OpenSlots);
};

export const main = async () => {
  const desiredTimes = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'];
  const openSlots = await getOpenSlots(desiredTimes, 7);
  console.log('Open slots: ', JSON.stringify(openSlots, null, 2));
  const discordClient = new DiscordClient();
  try {
    await discordClient.login();
    const tableMessage = (await discordClient.getMessages(TABLE_CHANNEL_ID, 1))[0];
    if (!tableMessage) {
      // Create table message if it doesn't exist
      await discordClient.sendMessage(createTableMessage(openSlots), TABLE_CHANNEL_ID);
    } else {
      // Update table message instead of creating so that no notification is sent to server participants. This is to prevent notification spam.
      await discordClient.editMessage(createTableMessage(openSlots), tableMessage.id, TABLE_CHANNEL_ID);
    }
    const rareSlots = getRareSlots(openSlots);
    const prevRareSlotsMessage = (await discordClient.getMessages(HISTORY_CHANNEL_ID, 1))[0];
    let newRareSlots = rareSlots;
    if (!prevRareSlotsMessage) {
      await discordClient.sendMessage(JSON.stringify(rareSlots), HISTORY_CHANNEL_ID);
    } else {
      await discordClient.editMessage(JSON.stringify(rareSlots), prevRareSlotsMessage.id, HISTORY_CHANNEL_ID);
      const prevRareSlots = JSON.parse(prevRareSlotsMessage.content) as OpenSlots;
      newRareSlots = findNewRareSlots(prevRareSlots, rareSlots);
    }
    if (Object.keys(newRareSlots).length > 0) {
      const notificationMessage = createNotificationMessage(newRareSlots);
      await discordClient.sendMessage(notificationMessage, NOTIFICATION_CHANNEL_ID);
    }
  } finally {
    await discordClient.destroy();
  }
};

if (process.env.LOCAL === 'true') {
  main();
}
