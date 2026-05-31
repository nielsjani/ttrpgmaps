import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StarfinderEntry, StarfinderDetail, UniversalMonsterRule } from '../types/starfinder.types';

@Injectable({ providedIn: 'root' })
export class StarfinderDataService {
  private base = 'assets/data/starfinder';

  constructor(private http: HttpClient) {}

  getIndex(category: 'alien' | 'starship'): Observable<StarfinderEntry[]> {
    return this.http.get<StarfinderEntry[]>(`${this.base}/${category}-index.json`);
  }

  getDetail(category: 'alien' | 'starship', slug: string): Observable<StarfinderDetail> {
    return this.http.get<StarfinderDetail>(
      `${this.base}/${category}/${encodeURIComponent(slug)}.json`
    );
  }

  getUniversalMonsterRules(): Observable<UniversalMonsterRule[]> {
    return this.http.get<UniversalMonsterRule[]>(`${this.base}/universal-monster-rules.json`).pipe(
      map(rules => rules.map(r => ({ ...r, slug: this.toSlug(r.name) })))
    );
  }

  toSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
