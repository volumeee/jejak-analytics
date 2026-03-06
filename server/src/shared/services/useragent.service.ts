import { UAParser } from 'ua-parser-js';

export interface ParsedUA {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: string;
}

export function parseUserAgent(ua: string | undefined): ParsedUA {
  if (!ua) {
    return { browser: 'Unknown', browserVersion: '', os: 'Unknown', osVersion: '', deviceType: 'desktop' };
  }

  const parser = new UAParser(ua);
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const device = parser.getDevice();

  return {
    browser: browser.name || 'Unknown',
    browserVersion: browser.version || '',
    os: os.name || 'Unknown',
    osVersion: os.version || '',
    deviceType: device.type || 'desktop',
  };
}
