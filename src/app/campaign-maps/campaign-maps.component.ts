import { Component } from '@angular/core';

export interface CampaignMapLink {
  id: string;
  label: string;
}

@Component({
  selector: 'app-campaign-maps',
  templateUrl: './campaign-maps.component.html',
  styleUrls: ['./campaign-maps.component.scss']
})
export class CampaignMapsComponent {
  maps: CampaignMapLink[] = [
    { id: 'sword-coast-leuven', label: 'Sword Coast Leuven' },
    { id: 'bastion-antwerpen', label: 'Bastion Antwerpen' },
  ];
}
