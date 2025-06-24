
'use server';
import puppeteer from 'puppeteer';
import type { ScrapedData } from '@/types/interview-kit';

export async function scrapeUnstopProfile(url: string): Promise<ScrapedData> {
  if (!url || !url.startsWith('https://unstop.com/')) {
    return { error: 'Invalid Unstop URL provided. It must start with https://unstop.com/.' };
  }

  let browser;
  try {
    browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const data: ScrapedData = await page.evaluate(() => {
      const getText = (selector: string): string | undefined => {
        const element = document.querySelector(selector);
        return element?.textContent?.trim() || undefined;
      }
      
      const getSectionTextByHeading = (headingText: string): string | undefined => {
        const headings = Array.from(document.querySelectorAll('h2, h3, h4, p'));
        const heading = headings.find(h => h.textContent?.trim().toLowerCase() === headingText.toLowerCase());
        return heading?.parentElement?.nextElementSibling?.textContent?.trim() || undefined;
      };

      const name = getText('h1');
      const college = getText('a[href*="/college/"]');

      const skills = getSectionTextByHeading('skills');
      const experience = getSectionTextByHeading('work experience');
      const competitions = getSectionTextByHeading('competitions');

      return { name, college, skills, experience, competitions };
    });

    await browser.close();
    
    if (!data.name && !data.skills && !data.experience) {
        return { error: 'Could not extract meaningful data from the profile. The page might be empty, require a login, or has a structure that is not recognized.' };
    }

    return data;
  } catch (error: any) {
    if (browser) {
      await browser.close();
    }
    console.error(`Scraping error for URL: ${url}`, error);
    return { error: `Failed to scrape profile. Error: ${error.message}` };
  }
}
