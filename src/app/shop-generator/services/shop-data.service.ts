import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ItemData } from '../types/item-data';

export type BookTitles = Record<string, string>;

export interface ShopType {
  file: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class ShopDataService {
  readonly shopTypes: ShopType[] = [
    { file: 'all-adventuring-gear', label: 'Adventuring Gear' },
    { file: 'all-armors-and-shields', label: 'Armors & Shields' },
    { file: 'all-other', label: 'Other' },
    { file: 'all-poisons-and-explosives', label: 'Poisons & Explosives' },
    { file: 'all-potions', label: 'Potions' },
    { file: 'all-scrolls', label: 'Scrolls' },
    { file: 'all-valuables', label: 'Valuables' },
    { file: 'all-vehicles-and-mounts', label: 'Vehicles & Mounts' },
    { file: 'all-weapons', label: 'Weapons' },
    { file: 'all-wondrous-items', label: 'Wondrous Items' },
  ];

  constructor(private http: HttpClient) {}

  getBookTitles(): Observable<BookTitles> {
    return this.http.get<BookTitles>('assets/data/book-titles.json');
  }

  getItems(year: '2014' | '2024', file: string): Observable<ItemData[]> {
    return this.http
      .get<any>(`assets/data/items/${year}/${file}.json`)
      .pipe(
        map(data => {
          if (Array.isArray(data)) return data as ItemData[];
          if (data.item && Array.isArray(data.item)) return data.item as ItemData[];
          return [];
        })
      );
  }
}
