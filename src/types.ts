export enum Place {
  TALI_HALLI = 'Talihalli',
  TALI_TENNISKESKUS = 'Talin tenniskeskus',
}

export const TALI_HALLI_URL = 'https://talihalli.cintoia.com/'
export const TALI_TENNISKESKUS_URL = 'https://talitaivallahti.feel.cintoia.com/'

export interface OpenSlots {
  [date: string]: {
    place: Place;
    time: string;
  }[];
}