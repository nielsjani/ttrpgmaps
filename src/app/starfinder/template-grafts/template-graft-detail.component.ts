import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
  safeDescription: SafeHtml = '';

  constructor(
    private route: ActivatedRoute,
    private sf: StarfinderDataService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.sf.getTemplateGrafts().subscribe({
      next: grafts => {
        this.graft = grafts.find(g => g.slug === slug) || null;
        if (!this.graft) {
          this.error = 'Template graft not found.';
        } else if (this.graft.description) {
          // Convert <br/> before bold labels into paragraph breaks for readability
          const html = this.graft.description
            .replace(/<br\s*\/?>\s*(<b>)/gi, '</p><p>$1')
            .replace(/^/, '<p>')
            .replace(/$/, '</p>');
          this.safeDescription = this.sanitizer.bypassSecurityTrustHtml(html);
        }
        this.loading = false;
      },
      error: () => { this.error = 'Failed to load template grafts.'; this.loading = false; }
    });
  }
}
