import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { StarfinderDataService } from '../services/starfinder-data.service';
import { TemplateGraft } from '../types/starfinder.types';

const CATEGORY_ORDER = [
  'Class', 'Creature Type', 'Creature Subtype',
  'Environmental', 'Simple', 'Summoning', 'Other'
];

@Component({
  selector: 'app-template-grafts',
  templateUrl: './template-grafts.component.html',
  styleUrls: ['./template-grafts.component.scss']
})
export class TemplateGraftsComponent implements OnInit {
  grafts: TemplateGraft[] = [];
  loading = true;
  error = '';

  searchText = '';
  selectedCategories: Set<string> = new Set();
  categoryDropdownOpen = false;

  readonly categories = CATEGORY_ORDER;

  constructor(private sf: StarfinderDataService, private elRef: ElementRef) {}

  ngOnInit(): void {
    this.sf.getTemplateGrafts().subscribe({
      next: data => { this.grafts = data; this.loading = false; },
      error: () => { this.error = 'Failed to load template grafts.'; this.loading = false; }
    });
  }

  get filteredGrafts(): TemplateGraft[] {
    const q = this.searchText.trim().toLowerCase();
    const cats = this.selectedCategories;
    return this.grafts.filter(g => {
      if (q && !g.name.toLowerCase().includes(q)) return false;
      if (cats.size > 0 && !cats.has(g.category)) return false;
      return true;
    });
  }

  toggleCategory(cat: string): void {
    if (this.selectedCategories.has(cat)) {
      this.selectedCategories.delete(cat);
    } else {
      this.selectedCategories.add(cat);
    }
  }

  isCategorySelected(cat: string): boolean {
    return this.selectedCategories.has(cat);
  }

  get categoryButtonLabel(): string {
    const n = this.selectedCategories.size;
    if (n === 0) return 'All types';
    if (n === 1) return [...this.selectedCategories][0];
    return `${n} types selected`;
  }

  clearCategoryFilter(): void {
    this.selectedCategories.clear();
  }

  toggleDropdown(): void {
    this.categoryDropdownOpen = !this.categoryDropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.categoryDropdownOpen = false;
    }
  }
}
