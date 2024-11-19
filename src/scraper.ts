import puppeteer, { Page } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { EMAIL, PASSWORD } from './config';
import { Place, OpenSlots, TALI_HALLI_URL, TALI_TENNISKESKUS_URL } from './types';

export const getOpenSlots = async (desiredTimeSlots: string[], numDaysToCheck: number): Promise<OpenSlots> => {
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
  const page = await browser.newPage();
  let openSlots: OpenSlots = {};
  await login(page, Place.TALI_HALLI);
  try {
    openSlots = await getOpenSlotsForPlace(page, Place.TALI_HALLI, desiredTimeSlots, numDaysToCheck);
    const tenniskeskusSlots = await getOpenSlotsForPlace(page, Place.TALI_TENNISKESKUS, desiredTimeSlots, numDaysToCheck);
    for (const [date, slots] of Object.entries(tenniskeskusSlots)) {
      if (!openSlots[date]) {
        openSlots[date] = slots;
      } else {
        openSlots[date] = [...openSlots[date], ...slots];
      }
    }
  } catch (error) {
    await page.screenshot({ path: 'screenshots/error.png' });
    await browser.close();
    throw error;
  }
  await browser.close();
  return openSlots;
};

const getOpenSlotsForPlace = async (page: Page, place: Place, desiredTimeSlots: string[], numDaysToCheck: number): Promise<OpenSlots> => {
  const openSlots: OpenSlots = {};
  await login(page, place);
  const badmintonButtonText = place === Place.TALI_HALLI ? 'Sulkapallo' : 'Tali sulkapallo';
  const badmintonButtonSelector = `::-p-xpath(//button[contains(text(), '${badmintonButtonText}')])`;
  const calendarButtonSelector = "::-p-xpath(//div[contains(span, 'Vaakakalenteri')])";
  await page.waitForSelector(badmintonButtonSelector);
  await page.click(badmintonButtonSelector);
  await page.waitForSelector(calendarButtonSelector);
  await page.click(calendarButtonSelector);
  for (let i = 0; i < numDaysToCheck; i++) {
    const date = await getDateFromReservationPage(page);
    openSlots[date] = [];
    const openSlotsSelector = `td[style*="background: none rgb(0, 123, 255);"]`;
    let noSlots = false;
    try {
      await page.waitForSelector(openSlotsSelector, { timeout: 3000 });
    } catch (error) {
      noSlots = true;
    }
    if (!noSlots) {
      const slotTexts = await page.$$eval(openSlotsSelector, (slots) => slots.map(slot => slot.textContent));
      for (const timeSlot of desiredTimeSlots) {
        const isAvailable = slotTexts.some(slotText => slotText?.includes(timeSlot));
        if (isAvailable) {
          openSlots[date].push({ place, time: timeSlot });
        }
      }
    } else {
      console.log(`No slots found for ${date} in ${place}`);
    }
    await advanceToNextDay(page);
  }
  return openSlots;
}

const login = async (page: Page, place: Place) => {
  await page.goto(`${place === Place.TALI_HALLI ? TALI_HALLI_URL : TALI_TENNISKESKUS_URL}/login`);
  await page.waitForSelector('input[name="email"]');
  await page.type('input[name="email"]', EMAIL);
  await page.type('input[name="password"]', PASSWORD);
  await page.click('.btn-primary');
};

const getDateFromReservationPage = async (page: Page) => {
  const dateString = await page.evaluate(() => {
    const input = document.querySelector('input#date') as HTMLInputElement | null;
    return input?.value;
  });
  if (!dateString) {
    throw new Error('Date not found');
  }
  return dateString
};

const advanceToNextDay = async (page: Page) => {
  await page.click('button[aria-label="next"]');
};