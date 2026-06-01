import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StarfinderDataService } from '../services/starfinder-data.service';
import { TemplateGraft } from '../types/starfinder.types';

@Component({
  selector: 'app-template-graft-detail',
  templateUrl: './template-graft-detail.component.html',
  styleUrls: ['./template-graft-detail.component.scss']
})
export class TemplateGraftDetailComponent implements OnInit {
  graft: TemplateGraft | null = null;
  loading = true;
  error = '';

  constructor(private route: ActivatedRoute, private sf: StarfinderDataService) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.sf.getTemplateGrafts().subscribe({
      next: grafts => {
        this.graft = grafts.find(g => g.slug === slug) || null;
        if (!this.graft) this.error = 'Template graft not found.';
        this.loading = false;
      },
      error: () => { this.error = 'Failed to load template grafts.'; this.loading = false; }
    });
  }
}
