import { DISCORD_TOKEN } from './config';
import { Client, GatewayIntentBits, TextChannel, EmbedBuilder, AttachmentBuilder, Message } from 'discord.js';
import { Place, OpenSlots, TALI_HALLI_URL, TALI_TENNISKESKUS_URL } from './types';
import { createCanvas } from 'canvas';

export class DiscordClient {
  private client: Client;

  constructor() {
    this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
  }

  async login() {
    await this.client.login(DISCORD_TOKEN);
  }

  async destroy() {
    await this.client.destroy();
  }

  private async getChannel(channelId: string) {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) {
      throw new Error(`Channel ${channelId} not found or is not a text channel`);
    }
    return channel as TextChannel;
  }

  async sendMessage(message: string | { embed: EmbedBuilder, attachment: AttachmentBuilder }, channelId: string) {
    const channel = await this.getChannel(channelId);
    if (typeof message === 'string') {
      await channel.send(message);
    } else {
      await channel.send({ 
        embeds: [message.embed], 
        files: [message.attachment] 
      });
    }
  }

  async editMessage(message: { embed: EmbedBuilder, attachment: AttachmentBuilder }, messageId: string, channelId: string) {
    const channel = await this.getChannel(channelId);
    await channel.messages.edit(messageId, {
      embeds: [message.embed],
      files: [message.attachment]
    });
  }

  async getMessages(channelId: string, count: number): Promise<Message[]> {
    const channel = await this.getChannel(channelId);
    const messages = await channel.messages.fetch({ limit: count });
    return Array.from(messages.values());
  }
}

export const createNotificationMessage = (openSlots: OpenSlots, previousMessages: Message[]): string => {
  const getWeekday = (date: string) => {
    return new Date(date).toLocaleDateString('fi-FI', { weekday: 'short' });
  };
  const lines: string[] = [];
  for (const date in openSlots) {
    const weekday = getWeekday(date);
    for (const { time, place } of openSlots[date]) {
      const dateString = new Date(date).toLocaleDateString('fi-FI', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\./g, '/');
      lines.push(`${place} **${weekday}** ${dateString} kello **${time}**`);
    }
  }
  const linesInChannel = previousMessages.flatMap(message => message.content.split('\n'));
  return lines.filter(line => !linesInChannel.includes(line)).join('\n');
};

export const createTableMessage = (openSlots: OpenSlots) => {
  // Calculate dimensions
  const cellHeight = 35;
  const timeWidth = 70;
  const columnWidth = 60;
  const padding = 15;
  
  // Get data arrays
  const allTimes = new Set<string>();
  Object.values(openSlots).forEach(slots => 
    slots.forEach(slot => allTimes.add(slot.time))
  );
  const sortedTimes = Array.from(allTimes).sort();
  const dates = Object.keys(openSlots).sort();
  const daysOfWeek = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];

  // Calculate canvas size
  const width = timeWidth + (dates.length * columnWidth) + padding * 2;
  const height = cellHeight * (sortedTimes.length + 1) + padding * 2;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#2f3136'; // Slightly lighter than Discord's dark theme
  ctx.fillRect(0, 0, width, height);

  // Draw grid
  ctx.strokeStyle = '#40444b'; // Subtle grid lines
  ctx.lineWidth = 1;

  // Vertical lines
  for (let i = 0; i <= dates.length; i++) {
    const x = timeWidth + (i * columnWidth) + padding;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
  }

  // Horizontal lines
  for (let i = 0; i <= sortedTimes.length; i++) {
    const y = i * cellHeight + padding;
    ctx.beginPath();
    ctx.moveTo(padding + timeWidth, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Header separator
  ctx.strokeStyle = '#5865f2'; // Discord blue
  ctx.lineWidth = 2;
  const headerY = cellHeight + padding;
  ctx.beginPath();
  ctx.moveTo(padding + timeWidth, headerY);
  ctx.lineTo(width - padding, headerY);
  ctx.stroke();

  // Text settings
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Draw header
  ctx.fillStyle = '#ffffff';
  dates.forEach((date, i) => {
    const d = new Date(date);
    const day = daysOfWeek.find(day => {
      const weekday = d.toLocaleDateString('fi-FI', { weekday: 'short' });
      return weekday.toLowerCase() === day.toLowerCase();
    });
    const x = timeWidth + (i * columnWidth) + columnWidth/2 + padding;
    ctx.fillText(day || '', x, cellHeight/2 + padding);
  });

  // Draw time slots and data
  ctx.font = '14px Arial'; // Regular weight for content
  sortedTimes.forEach((time, rowIndex) => {
    const y = (rowIndex + 1) * cellHeight + cellHeight/2 + padding;
    
    // Draw time
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.fillText(time, timeWidth - 10 + padding, y);
    ctx.textAlign = 'center';

    // Draw slots
    dates.forEach((date, colIndex) => {
      const x = timeWidth + (colIndex * columnWidth) + columnWidth/2 + padding;
      const slots = openSlots[date]
        .filter(slot => slot.time === time)
        .map(slot => slot.place === Place.TALI_HALLI ? 'Ha' : 'Te');
      
      if (slots.length > 0) {
        // Add subtle highlight for cells with data
        ctx.fillStyle = '#3f4147';
        ctx.fillRect(
          timeWidth + (colIndex * columnWidth) + padding + 1,
          (rowIndex + 1) * cellHeight + padding + 1,
          columnWidth - 2,
          cellHeight - 2
        );
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(slots.join(','), x, y);
      } else {
        ctx.fillStyle = '#72767d'; // Lighter gray for empty cells
        ctx.fillText('-', x, y);
      }
    });
  });
  const buffer = canvas.toBuffer();
  const attachment = new AttachmentBuilder(buffer, { name: 'table.png' });

  const date = new Date().toLocaleString('fi-FI', { 
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\./g, '/');
  const time = new Date().toLocaleString('fi-FI', {
    timeZone: 'Europe/Helsinki',
    hour: '2-digit',
    minute: '2-digit'
  }).replace('.', ':');

  const embed = new EmbedBuilder()
    .setTitle(`Available Tennis Court Slots (${date} ${time})`)
    .setDescription(`[Talihalli](${TALI_HALLI_URL})\n[Talin tenniskeskus](${TALI_TENNISKESKUS_URL})`)
    .setColor('#5865f2')
    .setImage('attachment://table.png');

  return { embed, attachment };
};
